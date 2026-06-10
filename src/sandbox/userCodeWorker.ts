/** 执行用户 JS 代码取真实返回值的微型 Worker。source 已由 buildJsCallSource 拼好调用。 */
export interface UserCodeRequest { source: string }
export interface UserCodeResult { ok: boolean; value?: unknown; error?: string }

self.onmessage = (ev: MessageEvent<UserCodeRequest>) => {
  const post = (r: UserCodeResult) => (self as unknown as Worker).postMessage(r)
  try {
    const fn = new Function(ev.data.source) as () => unknown
    post({ ok: true, value: fn() })
  } catch (e) {
    post({ ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
