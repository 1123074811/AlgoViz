import type { UserCodeResult } from './userCodeWorker'
import { normalizeRuntimeValue } from '@/workbench/runtimeContract'

export type { UserCodeResult }

/**
 * 从用户 JS 代码中找到入口函数，拼出"定义 + 调用"源码。
 * 入参派发规则：input 是对象且函数形参名全部能在对象上找到 → 按形参顺序展开；
 * 否则整个 input 作为唯一实参。找不到入口返回 null（调用方按 skipped 处理）。
 */
export function buildJsCallSource(userCode: string, input: unknown): string | null {
  const solveDecl = userCode.match(/function\s+(solve)\s*\(([^)]*)\)/)
  const fnDecl = solveDecl ?? userCode.match(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/)
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
    args = [unwrapSingleArgument(input, params)]
  }

  let argSource: string
  try {
    argSource = args.map(a => JSON.stringify(a) ?? 'undefined').join(', ')
  } catch {
    return null
  }
  return `${userCode}\n;return ${name}(${argSource});`
}

function unwrapSingleArgument(input: unknown, params: string[]): unknown {
  if (params.length !== 1 || input === null || typeof input !== 'object' || Array.isArray(input)) return input
  const object = input as Record<string, unknown>
  if (params[0] in object) return object[params[0]]
  if (/^(?:input|inputData|input_data)$/.test(params[0])) return input
  for (const key of ['source', 'root', 'nums', 'data', 'grid', 'words', 'keys']) {
    if (object[key] !== undefined) return object[key]
  }
  return input
}

function executeInline(source: string): UserCodeResult {
  try {
    const fn = new Function(source) as () => unknown
    return { ok: true, value: normalizeRuntimeValue(fn()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** 在 Worker 中执行用户 JS（超时 3s）；仅测试环境允许无 Worker 时内联执行。 */
export function runUserJsSandboxed(
  userCode: string,
  input: unknown,
  timeoutMs = 3000,
  allowUnsafeInline = import.meta.env.MODE === 'test',
): Promise<UserCodeResult> {
  const source = buildJsCallSource(userCode, input)
  if (!source) return Promise.resolve({ ok: false, error: '未找到可调用的入口函数' })

  const unavailable = { ok: false as const, error: '当前环境无法创建安全的 Web Worker，已拒绝执行用户代码' }
  if (typeof Worker === 'undefined') {
    return Promise.resolve(allowUnsafeInline ? executeInline(source) : unavailable)
  }
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./userCodeWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(allowUnsafeInline ? executeInline(source) : unavailable)
      return
    }
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({ ok: false, error: `用户代码执行超时(>${timeoutMs}ms)` })
    }, timeoutMs)
    worker.onmessage = (ev: MessageEvent<UserCodeResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(ev.data.ok ? { ...ev.data, value: normalizeRuntimeValue(ev.data.value) } : ev.data)
    }
    worker.onerror = () => {
      clearTimeout(timer)
      worker.terminate()
      resolve({ ok: false, error: '用户代码在沙箱中崩溃' })
    }
    worker.postMessage({ source })
  })
}
