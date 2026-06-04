import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeCode } from '../client'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const validConfig = JSON.stringify({
  apiKey: 'test-key',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-pro',
})

describe('analyzeCode — AbortSignal', () => {
  beforeEach(() => {
    localStorageMock.clear()
    localStorageMock.setItem('algoviz-api-config', validConfig)
  })

  it('signal 在调用前已 abort 时立即返回，不发 fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    const controller = new AbortController()
    controller.abort()

    const result = await analyzeCode(
      { code: 'def sort(): pass', language: 'python', inputData: '[1,2,3]' },
      { signal: controller.signal },
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
    fetchSpy.mockRestore()
  })

  it('fetch 抛出 AbortError 时 analyzeCode 重新抛出', async () => {
    const abortError = new DOMException('AbortError', 'AbortError')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)

    await expect(
      analyzeCode(
        { code: 'def sort(): pass', language: 'python', inputData: '[1,2,3]' },
        { signal: new AbortController().signal },
      )
    ).rejects.toThrow('AbortError')

    vi.restoreAllMocks()
  })
})
