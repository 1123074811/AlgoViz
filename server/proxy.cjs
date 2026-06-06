/**
 * AlgoViz API Proxy — 微型后端，解决浏览器 CORS 限制
 *
 * 浏览器请求 → localhost:3001/api/chat → 转发到允许列表内的 OpenAI 兼容 API
 * 默认支持 OpenAI / DeepSeek / Anthropic / Gemini，可通过环境变量扩展
 *
 * 启动: node server/proxy.cjs
 * 端口: 3001
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const PORT = process.env.PORT || 3001
const DIST_DIR = path.join(__dirname, '..', 'dist')
const DEFAULT_ALLOWED_BASE_URLS = [
  'https://api.deepseek.com',
  'https://api.openai.com/v1',
  'https://generativelanguage.googleapis.com/v1beta/openai',
  'https://api.anthropic.com/v1',
]
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

function parseByteLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function splitConfiguredBaseUrls(value) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function normalizeBaseUrl(value) {
  const target = new URL(String(value || '').trim())
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    throw new Error('仅支持 http/https 目标')
  }
  target.hash = ''
  target.search = ''
  target.pathname = target.pathname.replace(/\/+$/, '')
  return target.toString().replace(/\/+$/, '')
}

function buildAllowedBaseUrls(value = process.env.PROXY_ALLOWED_BASE_URLS) {
  const configured = splitConfiguredBaseUrls(value)
  const allowed = new Set()

  for (const baseUrl of [...DEFAULT_ALLOWED_BASE_URLS, ...configured]) {
    try {
      allowed.add(normalizeBaseUrl(baseUrl))
    } catch (e) {
      console.warn(`忽略无效代理允许地址 ${baseUrl}: ${e.message}`)
    }
  }

  return allowed
}

function resolveProxyTarget(rawTarget, allowedBaseUrls = buildAllowedBaseUrls(), defaultBaseUrl = DEFAULT_ALLOWED_BASE_URLS[0]) {
  const normalized = normalizeBaseUrl(rawTarget || DEFAULT_ALLOWED_BASE_URLS[0])
  const fallback = normalizeBaseUrl(defaultBaseUrl)
  const target = rawTarget ? normalized : fallback
  if (!allowedBaseUrls.has(target)) {
    return null
  }
  return target
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function resolveStaticFilePath(requestUrl, distDir = DIST_DIR) {
  const distRoot = path.resolve(distDir)
  let pathname
  try {
    const rawPath = String(requestUrl || '/').split(/[?#]/, 1)[0] || '/'
    pathname = decodeURIComponent(rawPath).replace(/\\/g, '/')
  } catch {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.includes('..')) {
    return null
  }

  const requestedPath = segments.length === 0 ? 'index.html' : segments.join(path.sep)
  let filePath = path.resolve(distRoot, requestedPath)
  const relativePath = path.relative(distRoot, filePath)
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  // SPA fallback: non-file routes → index.html
  const ext = path.extname(filePath)
  if (!ext || !MIME[ext]) filePath = path.join(distRoot, 'index.html')
  return filePath
}

function serveStatic(req, res, distDir = DIST_DIR) {
  const filePath = resolveStaticFilePath(req.url, distDir)
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('Forbidden')
    return
  }

  const contentType = MIME[path.extname(filePath)] || 'text/html'
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('Not Found')
    } else {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(data)
    }
  })
}

function createProxyServer(options = {}) {
  const distDir = options.distDir || DIST_DIR
  const maxBodyBytes = options.maxBodyBytes ?? parseByteLimit(process.env.PROXY_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES)
  const allowedBaseUrls = options.allowedBaseUrls
    ? new Set(options.allowedBaseUrls.map(normalizeBaseUrl))
    : buildAllowedBaseUrls(options.allowedBaseUrlsEnv)
  const defaultBaseUrl = options.defaultBaseUrl || DEFAULT_ALLOWED_BASE_URLS[0]

  return http.createServer((req, res) => {
    // CORS — 允许前端任意来源
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Target, X-Proxy-Key')

    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }

    // API 代理
    if (req.method === 'POST' && req.url.startsWith('/api/chat')) {
      return handleProxy(req, res, { allowedBaseUrls, defaultBaseUrl, maxBodyBytes })
    }

    // 静态文件（生产模式）或健康检查
    if (fs.existsSync(distDir)) {
      return serveStatic(req, res, distDir)
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('AlgoViz Proxy — 开发模式请用 npm run dev')
  })
}

function handleProxy(req, res, options = {}) {
  const allowedBaseUrls = options.allowedBaseUrls || buildAllowedBaseUrls()
  const defaultBaseUrl = options.defaultBaseUrl || DEFAULT_ALLOWED_BASE_URLS[0]
  const maxBodyBytes = options.maxBodyBytes ?? parseByteLimit(process.env.PROXY_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES)

  let baseUrl
  try {
    baseUrl = resolveProxyTarget(req.headers['x-proxy-target'], allowedBaseUrls, defaultBaseUrl)
  } catch (e) {
    sendJson(res, 400, { error: { message: `无效代理目标: ${e.message}` } })
    req.resume()
    return
  }

  if (!baseUrl) {
    sendJson(res, 403, { error: { message: '代理目标不在允许列表中' } })
    req.resume()
    return
  }

  const declaredLength = Number.parseInt(req.headers['content-length'] || '', 10)
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    sendJson(res, 413, { error: { message: `请求体过大，最大允许 ${maxBodyBytes} 字节` } })
    req.resume()
    return
  }

  const apiKey = req.headers['x-proxy-key'] || ''
  const apiUrl = `${baseUrl}/chat/completions`

  const chunks = []
  let totalBytes = 0
  let tooLarge = false

  req.on('data', c => {
    if (tooLarge) return
    totalBytes += c.length
    if (totalBytes > maxBodyBytes) {
      tooLarge = true
      sendJson(res, 413, { error: { message: `请求体过大，最大允许 ${maxBodyBytes} 字节` } })
      req.resume()
      return
    }
    chunks.push(c)
  })
  req.on('end', () => {
    if (tooLarge) return
    const body = Buffer.concat(chunks).toString()
    try {
      const target = new URL(apiUrl)
      const transport = target.protocol === 'https:' ? https : http
      const upstream = transport.request(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
      }, (upRes) => {
        res.writeHead(upRes.statusCode, { 'Content-Type': 'application/json' })
        upRes.pipe(res)
      })
      upstream.on('error', (e) => {
        sendJson(res, 502, { error: { message: `代理请求失败: ${e.message}` } })
      })
      upstream.write(body)
      upstream.end()
    } catch (e) {
      sendJson(res, 500, { error: { message: `代理错误: ${e.message}` } })
    }
  })
}

if (require.main === module) {
  const server = createProxyServer()
  server.listen(PORT, () => {
    console.log(`✅ AlgoViz API Proxy 已启动 → http://localhost:${PORT}`)
    console.log(`   前端请求 /api/chat → 代理转发到目标 API（OpenAI/DeepSeek/Anthropic 等）`)
  })
}

module.exports = {
  DEFAULT_ALLOWED_BASE_URLS,
  DEFAULT_MAX_BODY_BYTES,
  parseByteLimit,
  splitConfiguredBaseUrls,
  normalizeBaseUrl,
  buildAllowedBaseUrls,
  resolveProxyTarget,
  resolveStaticFilePath,
  createProxyServer,
  handleProxy,
}
