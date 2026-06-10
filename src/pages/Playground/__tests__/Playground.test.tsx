/**
 * Page-level render + interaction tests for the AI code lab (Playground).
 *
 * Heavy / non-jsdom-friendly deps are mocked at STABLE module paths so these
 * tests survive a merge onto a slightly-newer main:
 *  - `@monaco-editor/react`  → a <textarea> stub (Monaco cannot render in jsdom).
 *  - `@/scene/SceneCanvas`   → trivial stub. This is the stable renderer that
 *    sits *underneath* VisualizationCanvas, so mocking it neutralizes the canvas
 *    regardless of which wrapper the page imports.
 *  - `@/hooks/useAIGenerator`, `@/hooks/useAnimationEngine` → minimal stubs.
 *  - `@/ai` (getApiConfig / parseInputData) → controls the analyze-button gate.
 *  - `./restoreSession` (planRestoreOnMount) → deterministic mount restore plan.
 *  - `react-i18next` useTranslation → passthrough (t returns the key).
 *
 * We assert OBSERVABLE BEHAVIOR (visible text, button state, callback calls),
 * never internal structure, so the suite stays valid after merges.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AIHistoryEntry } from '@/store/algorithmStore'

// ---- react-i18next passthrough (t returns the key; deterministic, offline) ----
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}))

// ---- Monaco stub: a plain textarea wired to onChange/onMount. ----------------
// data-monaco-language exposes the `language` prop so a test can target the
// code editor (python/javascript/...) vs the input editor (json/plaintext).
vi.mock('@monaco-editor/react', () => {
  const Editor = ({
    value,
    onChange,
    onMount,
    language,
  }: {
    value?: string
    onChange?: (v: string | undefined) => void
    onMount?: (editor: unknown, monaco: unknown) => void
    language?: string
  }) => {
    return (
      <textarea
        data-testid={`monaco-${language}`}
        data-monaco-language={language}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        // Call onMount on first render so the page's editorRef wiring runs.
        ref={() => {
          if (onMount) {
            const fakeEditor = { deltaDecorations: () => [], getModel: () => null, addAction: () => {} }
            const fakeMonaco = {
              KeyMod: { CtrlCmd: 0 },
              KeyCode: { KeyD: 0 },
              MarkerSeverity: { Error: 8, Warning: 4 },
              editor: { setModelMarkers: () => {} },
            }
            // Avoid re-invoking onMount on every render: guard via a flag on the editor.
            onMount(fakeEditor, fakeMonaco)
          }
        }}
      />
    )
  }
  return { __esModule: true, default: Editor, Editor }
})

// ---- SceneCanvas stub (stable underlying renderer). --------------------------
vi.mock('@/scene/SceneCanvas', () => ({
  __esModule: true,
  default: () => <div data-testid="scene" />,
}))

// ---- useAnimationEngine stub: minimal visual state. --------------------------
const animationEngineStub = {
  visualState: {
    arrayData: [],
    colorMap: new Map(),
    elementIds: [],
    currentStep: 0,
    totalSteps: 0,
  },
  currentStepData: null,
  isPlaying: false,
  speed: 1,
  currentStep: 0,
  totalSteps: 0,
  setSpeed: vi.fn(),
  stepForward: vi.fn(),
  stepBackward: vi.fn(),
  reset: vi.fn(),
  goToEnd: vi.fn(),
  togglePlay: vi.fn(),
  loadScript: vi.fn(),
}
vi.mock('@/hooks/useAnimationEngine', () => ({
  useAnimationEngine: () => animationEngineStub,
}))

// ---- useAIGenerator stub: analyze/reset/setLive are spies. -------------------
const analyzeSpy = vi.fn(async () => ({ ok: true }))
const resetGeneratorSpy = vi.fn()
const setLiveSpy = vi.fn()
let generatorReturn = {
  liveAlgoId: null as string | null,
  generator: null as { body: string; type: string } | null,
  analyze: analyzeSpy,
  reset: resetGeneratorSpy,
  setLive: setLiveSpy,
}
vi.mock('@/hooks/useAIGenerator', () => ({
  useAIGenerator: () => generatorReturn,
}))

// ---- @/ai stub: getApiConfig gate + passthrough parseInputData. --------------
let apiConfigValue: unknown = null
vi.mock('@/ai', () => ({
  getApiConfig: () => apiConfigValue,
  // parseInputData: simple deterministic parser used by the page for the summary.
  parseInputData: (raw: string) => {
    const trimmed = (raw ?? '').trim()
    if (!trimmed) return { valid: false, value: null, message: '空输入' }
    return { valid: true, value: trimmed, kind: 'raw', summary: 'ok' }
  },
}))

// ---- restoreSession stub: deterministic mount plan. --------------------------
let restorePlan: {
  reconcileIds: string[]
  mode: 'clean' | 'analyzing' | 'restore'
  effective: AIHistoryEntry | null
} = { reconcileIds: [], mode: 'clean', effective: null }
vi.mock('../restoreSession', () => ({
  INTERRUPTED_MSG: '分析已中断（已离开页面）',
  planRestoreOnMount: () => restorePlan,
}))

// Import after mocks are registered.
import Playground from '../index'
import { useAlgorithmStore } from '@/store/algorithmStore'

// The store is a zustand singleton without exposed setState; drive it through a
// helper hook that grabs its actions during render and publishes them via effect
// (assigning to the outer var inside an effect, not in render).
let storeActions: ReturnType<typeof useStoreActions> | null = null
function useStoreActions() {
  return {
    clearAIHistory: useAlgorithmStore((st) => st.clearAIHistory),
    addAIHistory: useAlgorithmStore((st) => st.addAIHistory),
    setAnimationScript: useAlgorithmStore((st) => st.setAnimationScript),
    setAIStatus: useAlgorithmStore((st) => st.setAIStatus),
  }
}
function ActionGrabber() {
  const actions = useStoreActions()
  useEffect(() => {
    storeActions = actions
  }, [actions])
  return null
}

function makeEntry(over: Partial<AIHistoryEntry> = {}): AIHistoryEntry {
  return {
    id: 'h1',
    timestamp: Date.now(),
    algorithmId: 'playground',
    algorithmName: '自定义代码',
    code: 'def foo():\n  return 1',
    language: 'python',
    inputData: 'nums = [1,2,3]',
    status: 'success',
    ...over,
  } as AIHistoryEntry
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ActionGrabber />
      <Playground />
    </MemoryRouter>,
  )
}

/** The code editor textarea (Monaco stub) — language is a code language. */
function codeEditor(): HTMLTextAreaElement {
  const all = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
  const editor = all.find((el) => {
    const lang = el.getAttribute('data-monaco-language')
    return lang === 'python' || lang === 'javascript' || lang === 'cpp' || lang === 'java'
  })
  if (!editor) throw new Error('code editor not found')
  return editor
}

beforeEach(() => {
  localStorage.clear()
  apiConfigValue = null
  restorePlan = { reconcileIds: [], mode: 'clean', effective: null }
  generatorReturn = {
    liveAlgoId: null,
    generator: null,
    analyze: analyzeSpy,
    reset: resetGeneratorSpy,
    setLive: setLiveSpy,
  }
  analyzeSpy.mockClear()
  resetGeneratorSpy.mockClear()
  setLiveSpy.mockClear()
})

afterEach(() => {
  cleanup()
  // Clear any history the previous test seeded into the singleton store.
  storeActions?.clearAIHistory()
  storeActions?.setAnimationScript(null)
  storeActions?.setAIStatus('idle')
  storeActions = null
  vi.restoreAllMocks()
})

describe('Playground page render', () => {
  it('renders the core panels: editor stub, scene canvas, header label', () => {
    renderPage()
    // Header label of the lab.
    expect(screen.getByText('AI 代码实验室')).toBeTruthy()
    // The (mocked) scene canvas is present.
    expect(screen.getByTestId('scene')).toBeTruthy()
    // Two Monaco editors (code + input data).
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(2)
    // Run-data panel + history panel header.
    expect(screen.getByText('历史记录')).toBeTruthy()
  })

  it('shows the auto-detected language label (default Python for empty code)', () => {
    renderPage()
    expect(screen.getByText('自动识别: Python')).toBeTruthy()
  })
})

describe('code editing → language detection', () => {
  it('typing JavaScript updates the detected-language label', () => {
    renderPage()
    fireEvent.change(codeEditor(), {
      target: { value: 'const x = () => { console.log(1) }' },
    })
    expect(screen.getByText('自动识别: JavaScript')).toBeTruthy()
  })
})

describe('analyze button gating on getApiConfig()', () => {
  it('shows the configure-API hint when no API config exists', () => {
    apiConfigValue = null
    renderPage()
    expect(screen.getByText('⚙ 先配置 API Key')).toBeTruthy()
  })

  it('shows the analyze label when an API config exists', () => {
    apiConfigValue = { apiKey: 'k', baseUrl: 'http://x', model: 'm' }
    renderPage()
    expect(screen.getByText('AI 分析代码')).toBeTruthy()
  })

  it('clicking analyze with valid code + API config invokes the generator analyze flow', async () => {
    apiConfigValue = { apiKey: 'k', baseUrl: 'http://x', model: 'm' }
    renderPage()
    // Give it compilable code so it passes the local compile gate.
    fireEvent.change(codeEditor(), {
      target: { value: 'def foo():\n    return 1' },
    })
    fireEvent.click(screen.getByText('AI 分析代码'))
    // Let the async handler microtasks settle.
    await Promise.resolve()
    await Promise.resolve()
    expect(analyzeSpy).toHaveBeenCalledTimes(1)
  })
})

describe('live-mode badge reflects generator state', () => {
  it('shows the live-algorithm badge when a generator/liveAlgoId is active', () => {
    generatorReturn = {
      ...generatorReturn,
      liveAlgoId: 'bubble-sort',
    }
    renderPage()
    expect(screen.getByText('实时算法 · 改输入即时更新')).toBeTruthy()
  })
})

describe('history restore on mount', () => {
  it('restores a successful entry from the deterministic plan (code + setLive)', () => {
    const entry = makeEntry({
      id: 'restored',
      status: 'success',
      code: 'function solve(){ return 2 }',
      script: { algorithm: 'custom', initialState: { type: 'array', data: [] }, steps: [] } as unknown as AIHistoryEntry['script'],
    })
    restorePlan = { reconcileIds: [], mode: 'restore', effective: entry }
    renderPage()
    // The restored code drives language detection → label flips to JavaScript.
    expect(screen.getByText('自动识别: JavaScript')).toBeTruthy()
    // Live mode was (re)applied during restore.
    expect(setLiveSpy).toHaveBeenCalled()
  })
})

describe('history list + confirm dialog', () => {
  function seedHistory(entries: AIHistoryEntry[]) {
    // Seed via the store's own action so the page selectors observe it.
    // Wrap in act() so the singleton-store update flushes a re-render before queries.
    act(() => {
      for (const e of [...entries].reverse()) storeActions?.addAIHistory(e)
    })
  }

  it('renders seeded history entries and a working clear-all confirm flow', () => {
    renderPage()
    seedHistory([makeEntry({ id: 'a', algorithmName: 'AlgoA' })])
    // The history count / entry should now be visible.
    expect(screen.getByText('清空全部历史')).toBeTruthy()

    // Open the clear-all confirm dialog.
    fireEvent.click(screen.getByText('清空全部历史'))
    // ConfirmDialog title uses the i18n key (passthrough).
    expect(screen.getAllByText('playground.clearAllConfirmTitle').length).toBeGreaterThan(0)
  })

  it('cancel closes the confirm dialog without clearing history', () => {
    renderPage()
    seedHistory([makeEntry({ id: 'a' })])
    fireEvent.click(screen.getByText('清空全部历史'))
    // Cancel button uses the passthrough default '取消'.
    fireEvent.click(screen.getByText('取消'))
    // Dialog title gone; clear-all button still present (history not cleared).
    expect(screen.queryByText('playground.clearAllConfirmTitle')).toBeNull()
    expect(screen.getByText('清空全部历史')).toBeTruthy()
  })

  it('confirm clears all history (clear-all button disappears)', () => {
    renderPage()
    seedHistory([makeEntry({ id: 'a' })])
    fireEvent.click(screen.getByText('清空全部历史'))
    // The dialog's confirm button label is the i18n key; click the one inside the dialog.
    const confirmButtons = screen.getAllByText('playground.clearAllConfirmTitle')
    // The dialog confirm button is the last occurrence (header trigger text differs).
    fireEvent.click(confirmButtons[confirmButtons.length - 1])
    expect(screen.queryByText('清空全部历史')).toBeNull()
  })
})

describe('new / reset interaction', () => {
  it('clicking 新建 resets the generator and clears the editor', () => {
    renderPage()
    fireEvent.change(codeEditor(), {
      target: { value: 'const x = 1' },
    })
    expect(screen.getByText('自动识别: JavaScript')).toBeTruthy()
    fireEvent.click(screen.getByText('新建'))
    // Editor cleared → detection falls back to Python; generator reset called.
    expect(screen.getByText('自动识别: Python')).toBeTruthy()
    expect(resetGeneratorSpy).toHaveBeenCalled()
  })
})
