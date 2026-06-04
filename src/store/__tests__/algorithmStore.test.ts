import { describe, it, expect, beforeEach } from 'vitest'
import { createAlgorithmStore, type AIHistoryEntry } from '../algorithmStore'
import type { AnimationScript } from '@/types/animation'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const minimalScript: AnimationScript = {
  algorithm: 'bubble_sort',
  complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' },
  initialState: { type: 'array', data: [1, 2, 3] },
  steps: [],
}

function makeEntry(id: string): AIHistoryEntry {
  return {
    id,
    timestamp: Date.now(),
    algorithmId: 'bubble_sort',
    algorithmName: '冒泡排序',
    code: 'def sort(): pass',
    language: 'python',
    inputData: '[1,2,3]',
    script: minimalScript,
  }
}

describe('algorithmStore — AI 状态', () => {
  let store: ReturnType<typeof createAlgorithmStore>
  beforeEach(() => {
    localStorageMock.clear()
    store = createAlgorithmStore()
  })

  it('初始 aiStatus 为 idle', () => {
    expect(store.getState().aiStatus).toBe('idle')
  })

  it('setAIStatus 更新状态、错误和原始响应', () => {
    store.getState().setAIStatus('error', '接口超时', '{}')
    const s = store.getState()
    expect(s.aiStatus).toBe('error')
    expect(s.aiError).toBe('接口超时')
    expect(s.aiRawResponse).toBe('{}')
  })

  it('setAIStatus 不传 error/rawResponse 时清空对应字段', () => {
    store.getState().setAIStatus('error', '旧错误')
    store.getState().setAIStatus('analyzing')
    const s = store.getState()
    expect(s.aiError).toBe('')
    expect(s.aiRawResponse).toBe('')
  })
})

describe('algorithmStore — AI 历史', () => {
  let store: ReturnType<typeof createAlgorithmStore>
  beforeEach(() => {
    localStorageMock.clear()
    store = createAlgorithmStore()
  })

  it('addAIHistory 将条目置于列表头部', () => {
    store.getState().addAIHistory(makeEntry('a'))
    store.getState().addAIHistory(makeEntry('b'))
    expect(store.getState().aiHistory[0].id).toBe('b')
    expect(store.getState().aiHistory[1].id).toBe('a')
  })

  it('addAIHistory 超过 20 条时裁剪尾部', () => {
    for (let i = 0; i < 22; i++) {
      store.getState().addAIHistory(makeEntry(String(i)))
    }
    expect(store.getState().aiHistory).toHaveLength(20)
    expect(store.getState().aiHistory[0].id).toBe('21')
  })

  it('addAIHistory 后写入 localStorage', () => {
    store.getState().addAIHistory(makeEntry('x'))
    const saved = JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')
    expect(saved[0].id).toBe('x')
  })

  it('clearAIHistory 清空列表并清 localStorage', () => {
    store.getState().addAIHistory(makeEntry('y'))
    store.getState().clearAIHistory()
    expect(store.getState().aiHistory).toHaveLength(0)
    expect(JSON.parse(localStorageMock.getItem('algoviz-ai-history') ?? '[]')).toHaveLength(0)
  })

  it('新建 store 时从 localStorage 恢复历史', () => {
    store.getState().addAIHistory(makeEntry('restore'))
    const store2 = createAlgorithmStore()
    expect(store2.getState().aiHistory[0].id).toBe('restore')
  })
})
