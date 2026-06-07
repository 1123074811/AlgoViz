import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

const DEFAULT_ALLOWED_BASE_URLS = [
  'https://api.deepseek.com',
  'https://api.openai.com/v1',
  'https://generativelanguage.googleapis.com/v1beta/openai',
  'https://api.anthropic.com/v1',
]
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024

export function parseByteLimit(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function splitConfiguredBaseUrls(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export function normalizeBaseUrl(value: string): string {
  const target = new URL(value.trim())
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    throw new Error('仅支持 http/https 目标')
  }
  target.hash = ''
  target.search = ''
  target.pathname = target.pathname.replace(/\/+$/, '')
  return target.toString().replace(/\/+$/, '')
}

export function buildAllowedBaseUrls(value = process.env.PROXY_ALLOWED_BASE_URLS): Set<string> {
  const configured = splitConfiguredBaseUrls(value)
  const allowed = new Set<string>()

  for (const baseUrl of [...DEFAULT_ALLOWED_BASE_URLS, ...configured]) {
    try {
      allowed.add(normalizeBaseUrl(baseUrl))
    } catch (e) {
      console.warn(`忽略无效代理允许地址 ${baseUrl}: ${(e as Error).message}`)
    }
  }

  return allowed
}

export function resolveProxyTarget(rawTarget: string | undefined, allowedBaseUrls: Set<string>): string | null {
  const normalized = normalizeBaseUrl(rawTarget || DEFAULT_ALLOWED_BASE_URLS[0])
  return allowedBaseUrls.has(normalized) ? normalized : null
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(payload))
}

export async function readRequestBody(req: IncomingMessage, maxBodyBytes: number): Promise<string> {
  const chunks: Buffer[] = []
  let totalBytes = 0

  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    totalBytes += buffer.length
    if (totalBytes > maxBodyBytes) {
      throw new Error(`请求体过大，最大允许 ${maxBodyBytes} 字节`)
    }
    chunks.push(buffer)
  }

  return Buffer.concat(chunks).toString()
}

// CORS-free AI API proxy — browser sends to /api/chat on same origin,
// dev server forwards to real API, completely avoiding browser CORS checks.
interface ApiProxyMiddlewareOptions {
  allowedBaseUrls?: string[]
  allowedBaseUrlsEnv?: string
  maxBodyBytes?: number
  fetchImpl?: typeof fetch
}

// Exported for focused regression tests; default config below uses production defaults.
export function apiProxyMiddleware(options: ApiProxyMiddlewareOptions = {}) {
  const allowedBaseUrls = options.allowedBaseUrls
    ? new Set(options.allowedBaseUrls.map(normalizeBaseUrl))
    : buildAllowedBaseUrls(options.allowedBaseUrlsEnv)
  const maxBodyBytes = options.maxBodyBytes ?? parseByteLimit(process.env.PROXY_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES)
  const fetchImpl = options.fetchImpl ?? fetch

  return {
    name: 'api-proxy',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use('/api/chat', async (req, res, _next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Target, X-Proxy-Key',
          })
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.writeHead(405).end('Method Not Allowed')
          return
        }

        let baseUrl: string | null
        try {
          baseUrl = resolveProxyTarget(req.headers['x-proxy-target'] as string | undefined, allowedBaseUrls)
        } catch (e) {
          sendJson(res, 400, { error: { message: `无效代理目标: ${(e as Error).message}` } })
          req.resume()
          return
        }

        if (!baseUrl) {
          sendJson(res, 403, { error: { message: '代理目标不在允许列表中' } })
          req.resume()
          return
        }

        const declaredLength = Number.parseInt(String(req.headers['content-length'] ?? ''), 10)
        if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
          sendJson(res, 413, { error: { message: `请求体过大，最大允许 ${maxBodyBytes} 字节` } })
          req.resume()
          return
        }

        const apiKey = (req.headers['x-proxy-key'] as string) || ''
        const apiUrl = `${baseUrl}/chat/completions`

        try {
          const body = await readRequestBody(req, maxBodyBytes)
          const upstream = await fetchImpl(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
            },
            body,
          })

          // Read the full body BEFORE writing headers: if upstream.text() throws
          // (connection drop mid-body) we must still be able to send an error
          // response. Writing headers first would make the catch's writeHead crash
          // with ERR_HTTP_HEADERS_SENT.
          const text = await upstream.text()
          res.writeHead(upstream.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(text)
        } catch (e) {
          // If the response already started, we can't write a new status — just end.
          if (res.headersSent) {
            res.end()
            return
          }
          if ((e as Error).message.startsWith('请求体过大')) {
            sendJson(res, 413, { error: { message: (e as Error).message } })
            return
          }
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: `代理请求失败: ${(e as Error).message}` } }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiProxyMiddleware()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
