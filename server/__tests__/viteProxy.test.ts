import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiProxyMiddleware } from '../../vite.config'

type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

const servers: http.Server[] = []

function listen(server: http.Server): Promise<number> {
  servers.push(server)
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address === 'object' && address) {
        resolve(address.port)
      } else {
        reject(new Error('Expected TCP server address'))
      }
    })
  })
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

function request(port: number, options: http.RequestOptions, body = ''): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, ...options }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function startMiddleware(handler: MiddlewareHandler): Promise<number> {
  const server = http.createServer((req, res) => {
    handler(req, res, () => {
      res.writeHead(404).end('Not Found')
    })
  })
  return listen(server)
}

function createHandler(options: Parameters<typeof apiProxyMiddleware>[0] = {}): MiddlewareHandler {
  let capturedHandler: MiddlewareHandler | null = null
  const plugin = apiProxyMiddleware(options)
  plugin.configureServer({
    middlewares: {
      use: (_path, handler) => {
        capturedHandler = handler
      },
    },
  })

  if (!capturedHandler) {
    throw new Error('Expected API proxy middleware registration')
  }

  return capturedHandler
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(servers.splice(0).map((server) => close(server)))
})

describe('vite apiProxyMiddleware', () => {
  it('handles CORS preflight before method validation', async () => {
    const port = await startMiddleware(createHandler())

    const result = await request(port, {
      method: 'OPTIONS',
      path: '/api/chat',
    })

    expect(result.status).toBe(204)
  })

  it('rejects proxy targets outside the allow-list', async () => {
    const port = await startMiddleware(createHandler({ allowedBaseUrls: ['https://api.deepseek.com'] }))

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Target': 'https://example.invalid',
      },
    }, '{}')

    expect(result.status).toBe(403)
    expect(result.body).toContain('代理目标不在允许列表中')
  })

  it('rejects declared bodies over the configured byte limit', async () => {
    const port = await startMiddleware(createHandler({
      allowedBaseUrls: ['https://api.deepseek.com'],
      maxBodyBytes: 4,
    }))

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '5',
        'X-Proxy-Target': 'https://api.deepseek.com',
      },
    }, '12345')

    expect(result.status).toBe(413)
    expect(result.body).toContain('请求体过大')
  })

  it('rejects streamed bodies over the configured byte limit', async () => {
    const port = await startMiddleware(createHandler({
      allowedBaseUrls: ['https://api.deepseek.com'],
      maxBodyBytes: 4,
    }))

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Target': 'https://api.deepseek.com',
      },
    }, '12345')

    expect(result.status).toBe(413)
    expect(result.body).toContain('请求体过大')
  })

  it('forwards allowed requests through the injected fetch implementation', async () => {
    let forwardedUrl = ''
    let forwardedBody: BodyInit | null | undefined
    let forwardedAuth = ''
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      forwardedUrl = String(url)
      forwardedBody = init?.body
      forwardedAuth = String((init?.headers as Record<string, string>).Authorization ?? '')
      return new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const port = await startMiddleware(createHandler({
      allowedBaseUrls: ['https://api.deepseek.com'],
      fetchImpl,
      maxBodyBytes: 1024,
    }))

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Key': 'test-key',
        'X-Proxy-Target': 'https://api.deepseek.com/',
      },
    }, '{"messages":[]}')

    expect(result.status).toBe(202)
    expect(result.body).toBe('{"ok":true}')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(forwardedUrl).toBe('https://api.deepseek.com/chat/completions')
    expect(forwardedAuth).toBe('Bearer test-key')
    expect(forwardedBody).toBe('{"messages":[]}')
  })

  it('returns 502 (not ERR_HTTP_HEADERS_SENT) when reading the upstream body fails', async () => {
    // Simulate a connection drop mid-body: status is known but text() rejects.
    const fetchImpl = vi.fn(async () => ({
      status: 200,
      async text() { throw new Error('socket hang up') },
    }) as unknown as Response)

    const port = await startMiddleware(createHandler({
      allowedBaseUrls: ['https://api.deepseek.com'],
      fetchImpl,
      maxBodyBytes: 1024,
    }))

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Target': 'https://api.deepseek.com',
      },
    }, '{"messages":[]}')

    expect(result.status).toBe(502)
    expect(result.body).toContain('代理请求失败')
  })
})
