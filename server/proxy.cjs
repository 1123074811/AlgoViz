/**
 * AlgoViz API Proxy — 微型后端，解决浏览器 CORS 限制
 *
 * 浏览器请求 → localhost:3001/api/chat → 转发到任意 OpenAI 兼容 API
 * 支持 OpenAI / DeepSeek / Anthropic / Gemini 等所有服务
 *
 * 启动: node server/proxy.js
 * 端口: 3001
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const PORT = process.env.PORT || 3001
const DIST_DIR = path.join(__dirname, '..', 'dist')

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url)
  // SPA fallback: non-file routes → index.html
  const ext = path.extname(filePath)
  if (!ext || !MIME[ext]) filePath = path.join(DIST_DIR, 'index.html')

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

const server = http.createServer((req, res) => {
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
    return handleProxy(req, res)
  }

  // 静态文件（生产模式）或健康检查
  if (fs.existsSync(DIST_DIR)) {
    return serveStatic(req, res)
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('AlgoViz Proxy — 开发模式请用 npm run dev')
})

function handleProxy(req, res) {
  const baseUrl = (req.headers['x-proxy-target'] || 'https://api.deepseek.com').replace(/\/+$/, '')
  const apiKey  = req.headers['x-proxy-key'] || ''
  const apiUrl  = `${baseUrl}/chat/completions`

  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
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
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: `代理请求失败: ${e.message}` } }))
      })
      upstream.write(body)
      upstream.end()
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: `代理错误: ${e.message}` } }))
    }
  })
}

server.listen(PORT, () => {
  console.log(`✅ AlgoViz API Proxy 已启动 → http://localhost:${PORT}`)
  console.log(`   前端请求 /api/chat → 代理转发到目标 API（OpenAI/DeepSeek/Anthropic 等）`)
})
