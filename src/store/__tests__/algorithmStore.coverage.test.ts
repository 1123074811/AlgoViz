import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createAlgorithmStore,
  useAlgorithmStore,
  type AIHistoryEntry,
} from '@/store/algorithmStore'
import type { AnimationScript } from '@/types/animation'
import { renderHook, act } from '@testing-library/react'

// 独立的 localStorage 替身，按测试清空，afterEach 还原。
const realLocalStorage = globalThis.localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
  }
})()

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  })
  localStorageMock.clear()
})

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: realLocalStorage,
    configurable: true,
  })
})

const sampleScript: AnimationScript = {
  algorithm: 'bubble_sort',
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
  },
  initialState: { type: 'array', data: [3, 1, 2] },
  steps: [],
}

describe('algorithmStore — 选择 / 脚本 / 搜索 / 分类 actions', () => {
  let store: ReturnType<typeof createAlgorithmStore>
  beforeEach(() => {
    store = createAlgorithmStore()
  })

  it('初始状态合理', () => {
    const s = store.getState()
    expect(s.selectedAlgorithm).toBeNull()
    expect(s.animationScript).toBeNull()
    expect(s.searchQuery).toBe('')
    expect(s.activeCategory).toBe('all')
    expect(Array.isArray(s.algorithms)).toBe(true)
    expect(s.algorithms.length).toBeGreaterThan(0)
  })

  it('setSelectedAlgorithm 设置并可清空所选算法', () => {
    const algo = store.getState().algorithms[0]
    store.getState().setSelectedAlgorithm(algo)
    expect(store.getState().selectedAlgorithm).toBe(algo)
    store.getState().setSelectedAlgorithm(null)
    expect(store.getState().selectedAlgorithm).toBeNull()
  })

  it('setAnimationScript 设置并可清空动画脚本', () => {
    store.getState().setAnimationScript(sampleScript)
    expect(store.getState().animationScript).toBe(sampleScript)
    store.getState().setAnimationScript(null)
    expect(store.getState().animationScript).toBeNull()
  })

  it('setSearchQuery 更新查询字符串', () => {
    store.getState().setSearchQuery('quick')
    expect(store.getState().searchQuery).toBe('quick')
  })

  it('setActiveCategory 更新当前分类', () => {
    store.getState().setActiveCategory('sorting')
    expect(store.getState().activeCategory).toBe('sorting')
    store.getState().setActiveCategory('all')
    expect(store.getState().activeCategory).toBe('all')
  })
})

describe('algorithmStore — 语言持久化', () => {
  it('setLanguage 更新状态并写入 localStorage', () => {
    const store = createAlgorithmStore()
    store.getState().setLanguage('en')
    expect(store.getState().language).toBe('en')
    expect(localStorageMock.getItem('algoviz-lang')).toBe('en')

    store.getState().setLanguage('zh')
    expect(store.getState().language).toBe('zh')
    expect(localStorageMock.getItem('algoviz-lang')).toBe('zh')
  })

  it('默认语言为 zh（无存储时）', () => {
    expect(createAlgorithmStore().getState().language).toBe('zh')
  })

  it('新建 store 从 localStorage 恢复语言', () => {
    localStorageMock.setItem('algoviz-lang', 'en')
    expect(createAlgorithmStore().getState().language).toBe('en')
  })
})

describe('algorithmStore — AI 历史持久化与裁剪', () => {
  let store: ReturnType<typeof createAlgorithmStore>
  const makeEntry = (id: string): AIHistoryEntry => ({
    id,
    timestamp: Date.now(),
    algorithmId: 'bubble_sort',
    algorithmName: '冒泡排序',
    code: 'def f(): pass',
    language: 'python',
    inputData: '[1,2,3]',
    status: 'success',
  })

  beforeEach(() => {
    store = createAlgorithmStore()
  })

  it('addAIHistory 持久化整个列表到 localStorage', () => {
    store.getState().addAIHistory(makeEntry('a'))
    store.getState().addAIHistory(makeEntry('b'))
    const saved = JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')
    expect(saved.map((e: AIHistoryEntry) => e.id)).toEqual(['b', 'a'])
  })

  it('超过上限时裁剪并同步持久化', () => {
    for (let i = 0; i < 25; i++) store.getState().addAIHistory(makeEntry(String(i)))
    const saved = JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')
    expect(saved).toHaveLength(20)
    expect(saved[0].id).toBe('24')
    expect(saved[19].id).toBe('5')
  })

  it('updateAIHistory 持久化更新结果', () => {
    store.getState().addAIHistory(makeEntry('u'))
    store.getState().updateAIHistory('u', { status: 'error', error: 'boom' })
    const saved = JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')
    expect(saved[0].status).toBe('error')
    expect(saved[0].error).toBe('boom')
  })

  it('removeAIHistory 持久化删除结果', () => {
    store.getState().addAIHistory(makeEntry('x'))
    store.getState().addAIHistory(makeEntry('y'))
    store.getState().removeAIHistory('x')
    const saved = JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')
    expect(saved.map((e: AIHistoryEntry) => e.id)).toEqual(['y'])
  })

  it('clearAIHistory 持久化空列表', () => {
    store.getState().addAIHistory(makeEntry('z'))
    store.getState().clearAIHistory()
    expect(JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')).toEqual([])
  })

  it('loadAIHistory 容错：损坏的 JSON 视为空历史', () => {
    localStorageMock.setItem('algoviz-ai-history', '{not valid json')
    expect(createAlgorithmStore().getState().aiHistory).toEqual([])
  })
})

describe('useAlgorithmStore — 单例 hook', () => {
  it('选择器读取状态并随 action 重新渲染', () => {
    // 分别选择，避免每次返回新对象引发的快照缓存问题
    const query = renderHook(() => useAlgorithmStore((s) => s.searchQuery))
    const setter = renderHook(() => useAlgorithmStore((s) => s.setSearchQuery))
    act(() => setter.result.current('hook-query'))
    expect(query.result.current).toBe('hook-query')
    // 复位
    act(() => setter.result.current(''))
    expect(query.result.current).toBe('')
  })
})
