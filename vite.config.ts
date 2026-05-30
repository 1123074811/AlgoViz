import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

// CORS-free AI API proxy — browser sends to /api/chat on same origin,
// dev server forwards to real API, completely avoiding browser CORS checks.
function apiProxyMiddleware() {
  return {
    name: 'api-proxy',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405).end('Method Not Allowed')
          return
        }

        // Read the target base URL and API key from custom headers
        const baseUrl = (req.headers['x-proxy-target'] as string) || 'https://api.deepseek.com'
        const apiKey = (req.headers['x-proxy-key'] as string) || ''
        const apiUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`

        // Read the body
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        const body = Buffer.concat(chunks).toString()

        try {
          const upstream = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
            },
            body,
          })

          res.writeHead(upstream.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          const text = await upstream.text()
          res.end(text)
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: { message: `代理请求失败: ${(e as Error).message}` } }))
        }
      })

      // CORS preflight
      server.middlewares.use('/api/chat', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Target, X-Proxy-Key',
          })
          res.end()
          return
        }
        next()
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
