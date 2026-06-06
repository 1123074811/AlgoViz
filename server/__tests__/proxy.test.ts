import http from 'node:http'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  buildAllowedBaseUrls,
  createProxyServer,
  normalizeBaseUrl,
  resolveProxyTarget,
  resolveStaticFilePath,
} = require('../proxy.cjs')

const servers: http.Server[] = []
const tempDirs: string[] = []

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

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => close(server)))
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { force: true, recursive: true })))
})

describe('proxy target allow-list', () => {
  it('normalizes base URLs before comparing them', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1///?ignored=1#hash')).toBe('https://api.example.com/v1')
  })

  it('keeps default providers and adds configured providers', () => {
    const allowed = buildAllowedBaseUrls('http://127.0.0.1:4567/custom/')

    expect(allowed.has('https://api.deepseek.com')).toBe(true)
    expect(allowed.has('http://127.0.0.1:4567/custom')).toBe(true)
  })

  it('rejects targets outside the allow-list', () => {
    const allowed = new Set(['https://api.deepseek.com'])

    expect(resolveProxyTarget('https://example.invalid', allowed)).toBeNull()
    expect(resolveProxyTarget('https://api.deepseek.com/', allowed)).toBe('https://api.deepseek.com')
  })
})

describe('createProxyServer', () => {
  it('rejects disallowed proxy targets before reading the body', async () => {
    const server = createProxyServer({
      allowedBaseUrls: ['http://127.0.0.1:1'],
      maxBodyBytes: 1024,
    })
    const port = await listen(server)

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

  it('rejects declared request bodies over the configured byte limit', async () => {
    const server = createProxyServer({
      allowedBaseUrls: ['http://127.0.0.1:1'],
      maxBodyBytes: 4,
    })
    const port = await listen(server)

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '5',
        'X-Proxy-Target': 'http://127.0.0.1:1',
      },
    }, '12345')

    expect(result.status).toBe(413)
    expect(result.body).toContain('请求体过大')
  })

  it('rejects streamed request bodies over the configured byte limit', async () => {
    const server = createProxyServer({
      allowedBaseUrls: ['http://127.0.0.1:1'],
      maxBodyBytes: 4,
    })
    const port = await listen(server)

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Target': 'http://127.0.0.1:1',
      },
    }, '12345')

    expect(result.status).toBe(413)
    expect(result.body).toContain('请求体过大')
  })

  it('forwards allowed requests to the upstream chat completions endpoint', async () => {
    let upstreamPath = ''
    let upstreamAuthorization = ''
    let upstreamBody = ''

    const upstream = http.createServer((req, res) => {
      upstreamPath = req.url ?? ''
      upstreamAuthorization = String(req.headers.authorization ?? '')
      req.on('data', (chunk) => {
        upstreamBody += Buffer.from(chunk).toString('utf8')
      })
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
    })
    const upstreamPort = await listen(upstream)
    const upstreamBaseUrl = `http://127.0.0.1:${upstreamPort}/v1`

    const server = createProxyServer({
      allowedBaseUrls: [upstreamBaseUrl],
      maxBodyBytes: 1024,
    })
    const port = await listen(server)

    const result = await request(port, {
      method: 'POST',
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Key': 'test-key',
        'X-Proxy-Target': upstreamBaseUrl,
      },
    }, '{"messages":[]}')

    expect(result.status).toBe(200)
    expect(result.body).toBe('{"ok":true}')
    expect(upstreamPath).toBe('/v1/chat/completions')
    expect(upstreamAuthorization).toBe('Bearer test-key')
    expect(upstreamBody).toBe('{"messages":[]}')
  })
})

describe('static file serving', () => {
  it('resolves SPA routes inside the dist directory', () => {
    const distDir = path.join(os.tmpdir(), 'algoviz-dist')

    expect(resolveStaticFilePath('/visualizer', distDir)).toBe(path.join(path.resolve(distDir), 'index.html'))
    expect(resolveStaticFilePath('/assets/app.js', distDir)).toBe(path.join(path.resolve(distDir), 'assets', 'app.js'))
  })

  it('rejects path traversal outside the dist directory', () => {
    const distDir = path.join(os.tmpdir(), 'algoviz-dist')

    expect(resolveStaticFilePath('/%2e%2e/package.json', distDir)).toBeNull()
  })

  it('returns 403 for static path traversal attempts', async () => {
    const distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'algoviz-proxy-'))
    tempDirs.push(distDir)
    await fs.writeFile(path.join(distDir, 'index.html'), '<main>AlgoViz</main>')

    const server = createProxyServer({ distDir })
    const port = await listen(server)

    const result = await request(port, {
      method: 'GET',
      path: '/%2e%2e/package.json',
    })

    expect(result.status).toBe(403)
    expect(result.body).toBe('Forbidden')
  })
})
