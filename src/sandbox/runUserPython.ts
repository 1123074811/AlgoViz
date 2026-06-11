export interface PyExecResult { ok: boolean; value?: unknown; error?: string }

function toPyLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(toPyLiteral).join(', ')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${JSON.stringify(key)}: ${toPyLiteral(item)}`)
    return `{${entries.join(', ')}}`
  }
  return 'None'
}

export function buildPyCallSource(userCode: string, input: unknown): string | null {
  const match = userCode.match(/def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/)
  if (!match) return null
  const name = match[1]
  const params = match[2]
    .split(',')
    .map(param => param.trim().split(/[=:\s]/)[0])
    .filter(param => param && param !== 'self')

  let args: unknown[]
  if (
    input !== null &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    params.length > 0 &&
    params.every(param => param in (input as Record<string, unknown>))
  ) {
    args = params.map(param => (input as Record<string, unknown>)[param])
  } else {
    args = [input]
  }

  return `import json\n${userCode}\njson.dumps(${name}(${args.map(toPyLiteral).join(', ')}))`
}

let workerSingleton: Worker | null = null
let firstCallDone = false

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!workerSingleton) {
    try {
      workerSingleton = new Worker(new URL('./pythonWorker.ts', import.meta.url), { type: 'classic' })
    } catch {
      return null
    }
  }
  return workerSingleton
}

export function runUserPySandboxed(userCode: string, input: unknown): Promise<PyExecResult> {
  const source = buildPyCallSource(userCode, input)
  if (!source) return Promise.resolve({ ok: false, error: '未找到可调用的 def 入口' })

  const worker = getWorker()
  if (!worker) return Promise.resolve({ ok: false, error: 'Worker 不可用' })

  const timeoutMs = firstCallDone ? 8000 : 25000
  return new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timer)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
    }
    const timer = setTimeout(() => {
      cleanup()
      workerSingleton?.terminate()
      workerSingleton = null
      resolve({ ok: false, error: `Python 执行超时(>${timeoutMs}ms)` })
    }, timeoutMs)
    const onMessage = (ev: MessageEvent<PyExecResult>) => {
      cleanup()
      firstCallDone = true
      resolve(ev.data)
    }
    const onError = () => {
      cleanup()
      workerSingleton?.terminate()
      workerSingleton = null
      resolve({ ok: false, error: 'Python Worker 崩溃' })
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ source })
  })
}
