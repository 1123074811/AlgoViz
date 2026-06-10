import type { UserCodeResult } from './userCodeWorker'

export type { UserCodeResult }

/**
 * 从用户 JS 代码中找到入口函数，拼出"定义 + 调用"源码。
 * 入参派发规则：input 是对象且函数形参名全部能在对象上找到 → 按形参顺序展开；
 * 否则整个 input 作为唯一实参。找不到入口返回 null（调用方按 skipped 处理）。
 */
export function buildJsCallSource(userCode: string, input: unknown): string | null {
  const fnDecl = userCode.match(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/)
  const arrowDecl = userCode.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/)
  const match = fnDecl ?? arrowDecl
  if (!match) return null
  const name = match[1]
  const params = match[2]
    .split(',')
    .map(p => p.trim().split(/[=:\s]/)[0])
    .filter(Boolean)

  let args: unknown[]
  if (
    input !== null && typeof input === 'object' && !Array.isArray(input) &&
    params.length > 0 && params.every(p => p in (input as Record<string, unknown>))
  ) {
    args = params.map(p => (input as Record<string, unknown>)[p])
  } else {
    args = [input]
  }

  let argSource: string
  try {
    argSource = args.map(a => JSON.stringify(a) ?? 'undefined').join(', ')
  } catch {
    return null
  }
  return `${userCode}\n;return ${name}(${argSource});`
}

function executeInline(source: string): UserCodeResult {
  try {
    const fn = new Function(source) as () => unknown
    return { ok: true, value: fn() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** 在 Worker 沙箱中真实执行用户 JS 函数（超时 3s）；无 Worker 环境内联执行。 */
export function runUserJsSandboxed(userCode: string, input: unknown, timeoutMs = 3000): Promise<UserCodeResult> {
  const source = buildJsCallSource(userCode, input)
  if (!source) return Promise.resolve({ ok: false, error: '未找到可调用的入口函数' })

  if (typeof Worker === 'undefined') {
    return Promise.resolve(executeInline(source))
  }
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./userCodeWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(executeInline(source))
      return
    }
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({ ok: false, error: `用户代码执行超时(>${timeoutMs}ms)` })
    }, timeoutMs)
    worker.onmessage = (ev: MessageEvent<UserCodeResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(ev.data)
    }
    worker.onerror = () => {
      clearTimeout(timer)
      worker.terminate()
      resolve({ ok: false, error: '用户代码在沙箱中崩溃' })
    }
    worker.postMessage({ source })
  })
}
