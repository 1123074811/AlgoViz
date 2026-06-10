import { createStore, useStore } from 'zustand'
import type { AnimationScript } from '@/types/animation'
import {
  DEFAULT_ALGORITHMS,
  type AlgorithmType,
  type AlgorithmCategory,
  type Difficulty,
} from '@/data/algorithms'

export type { AlgorithmType, AlgorithmCategory, Difficulty }

export type AIHistoryStatus = 'analyzing' | 'success' | 'error'

export type AIStatus = 'idle' | 'analyzing' | 'success' | 'error'

export interface AIHistoryEntry {
  id: string
  timestamp: number
  algorithmId: string
  algorithmName: string
  code: string
  language: string
  inputData: string
  status: AIHistoryStatus
  script?: AnimationScript
  error?: string
  generatorBody?: string
  generatorType?: 'array' | 'graph' | 'tree' | 'linked_list' | 'union_find'
}

const AI_HISTORY_KEY = 'algoviz-ai-history'
const AI_HISTORY_MAX = 20

function loadAIHistory(): AIHistoryEntry[] {
  try {
    const raw = localStorage.getItem(AI_HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AIHistoryEntry[]
  } catch {
    return []
  }
}

function saveAIHistory(history: AIHistoryEntry[]): void {
  localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history))
}

export interface AlgorithmState {
  selectedAlgorithm: AlgorithmType | null
  algorithms: AlgorithmType[]
  animationScript: AnimationScript | null
  searchQuery: string
  activeCategory: AlgorithmCategory | 'all'
  language: 'zh' | 'en'
  aiStatus: AIStatus
  aiError: string
  aiRawResponse: string
  aiHistory: AIHistoryEntry[]
}

export interface AlgorithmActions {
  setSelectedAlgorithm: (algo: AlgorithmType | null) => void
  setAnimationScript: (script: AnimationScript | null) => void
  setSearchQuery: (query: string) => void
  setActiveCategory: (cat: AlgorithmCategory | 'all') => void
  setLanguage: (lang: 'zh' | 'en') => void
  setAIStatus: (status: AIStatus, error?: string, rawResponse?: string) => void
  addAIHistory: (entry: AIHistoryEntry) => void
  clearAIHistory: () => void
  updateAIHistory: (id: string, patch: Partial<Omit<AIHistoryEntry, 'id'>>) => void
  removeAIHistory: (id: string) => void
}

export const createAlgorithmStore = () =>
  createStore<AlgorithmState & AlgorithmActions>((set) => ({
    selectedAlgorithm: null,
    algorithms: DEFAULT_ALGORITHMS,
    animationScript: null,
    searchQuery: '',
    activeCategory: 'all',
    language: (() => {
      try {
        return (localStorage.getItem('algoviz-lang') as 'zh' | 'en') || 'zh'
      } catch {
        return 'zh'
      }
    })(),
    aiStatus: 'idle' as AIStatus,
    aiError: '',
    aiRawResponse: '',
    aiHistory: loadAIHistory(),

    setSelectedAlgorithm: (algo) => set({ selectedAlgorithm: algo }),
    setAnimationScript: (script) => set({ animationScript: script }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setActiveCategory: (cat) => set({ activeCategory: cat }),
    setLanguage: (lang) => {
      localStorage.setItem('algoviz-lang', lang)
      set({ language: lang })
    },

    setAIStatus: (status, error = '', rawResponse = '') =>
      set({ aiStatus: status, aiError: error, aiRawResponse: rawResponse }),

    addAIHistory: (entry) =>
      set((state) => {
        const next = [entry, ...state.aiHistory].slice(0, AI_HISTORY_MAX)
        saveAIHistory(next)
        return { aiHistory: next }
      }),

    clearAIHistory: () => {
      saveAIHistory([])
      set({ aiHistory: [] })
    },

    updateAIHistory: (id, patch) =>
      set((state) => {
        const idx = state.aiHistory.findIndex((e) => e.id === id)
        if (idx === -1) return state
        const next = [...state.aiHistory]
        next[idx] = { ...next[idx], ...patch }
        saveAIHistory(next)
        return { aiHistory: next }
      }),

    removeAIHistory: (id) =>
      set((state) => {
        const next = state.aiHistory.filter((e) => e.id !== id)
        saveAIHistory(next)
        return { aiHistory: next }
      }),
  }))

const algorithmStore = createAlgorithmStore()

export function useAlgorithmStore<T>(selector: (state: AlgorithmState & AlgorithmActions) => T): T {
  return useStore(algorithmStore, selector)
}
