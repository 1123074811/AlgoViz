export interface PyRequest { source: string }
export interface PyResult { ok: boolean; value?: unknown; error?: string }

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'

interface PyodideLike {
  runPythonAsync: (code: string) => Promise<unknown>
}

let pyodidePromise: Promise<PyodideLike> | null = null

function ensurePyodide(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      ;(self as unknown as { importScripts: (url: string) => void }).importScripts(PYODIDE_URL)
      const loadPyodide = (self as unknown as {
        loadPyodide: (opts: { indexURL: string }) => Promise<PyodideLike>
      }).loadPyodide
      return loadPyodide({ indexURL: PYODIDE_URL.replace(/\/pyodide\.js$/, '/') })
    })()
  }
  return pyodidePromise
}

self.onmessage = async (ev: MessageEvent<PyRequest>) => {
  const post = (result: PyResult) => (self as unknown as Worker).postMessage(result)
  try {
    const pyodide = await ensurePyodide()
    const raw = await pyodide.runPythonAsync(ev.data.source)
    post({ ok: true, value: typeof raw === 'string' ? JSON.parse(raw) : raw })
  } catch (e) {
    post({ ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
