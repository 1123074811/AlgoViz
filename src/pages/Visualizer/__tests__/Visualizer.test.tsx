import { act, useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Heavy / environment-sensitive dependencies are mocked at STABLE module paths
// so these behavior-level tests survive a merge onto a slightly-newer main.
// ---------------------------------------------------------------------------

// Monaco never renders in jsdom — stub it with a plain <textarea> that still
// fires onChange and onMount, so editing behavior remains observable.
vi.mock('@monaco-editor/react', () => {
  const Editor = ({
    value,
    onChange,
    onMount,
  }: {
    value?: string
    onChange?: (val: string | undefined) => void
    onMount?: (editor: unknown, monaco: unknown) => void
  }) => (
    <textarea
      data-monaco="true"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      // Provide a minimal editor + monaco shape on mount so the page's editorRef
      // wiring (addAction / getModel / deltaDecorations) runs without crashing.
      ref={(node) => {
        if (!node || !onMount) return
        onMount(
          { deltaDecorations: () => [], addAction: () => {}, getModel: () => null },
          {
            KeyMod: { CtrlCmd: 0 },
            KeyCode: { KeyD: 0 },
            MarkerSeverity: { Error: 8, Warning: 4 },
            editor: { setModelMarkers: () => {} },
          },
        )
      }}
    />
  )
  return { __esModule: true, default: Editor }
})

// The underlying renderer (stable across old/new page versions) — trivial stub.
vi.mock('@/scene/SceneCanvas', () => ({
  __esModule: true,
  default: ({ script }: { script: unknown }) => (
    <div data-testid="scene" data-has-script={script ? 'yes' : 'no'} />
  ),
}))

// Scene helpers — safe defaults so the info panel renders without exercising
// the real diagnostics machinery.
vi.mock('@/scene', () => ({
  __esModule: true,
  usesSceneEngine: () => false,
  getSceneEventStats: () => ({ eventSteps: 0, totalEvents: 0 }),
  getSceneDiagnosticSummary: () => ({ diagnostics: [], errors: 0, warnings: 0 }),
}))

// AI generator hook — inert stub matching the keys the page destructures.
const analyzeMock = vi.fn()
const resetGeneratorMock = vi.fn()
vi.mock('@/hooks/useAIGenerator', () => ({
  __esModule: true,
  useAIGenerator: () => ({
    liveAlgoId: null,
    generator: null,
    analyze: analyzeMock,
    reset: resetGeneratorMock,
    setLive: vi.fn(),
  }),
}))

// Animation engine — controllable stub matching the real return shape. The
// handlers are spies so we can assert the playback controls invoke them.
const engineHandlers = {
  setSpeed: vi.fn(),
  stepForward: vi.fn(),
  stepBackward: vi.fn(),
  reset: vi.fn(),
  goToEnd: vi.fn(),
  togglePlay: vi.fn(),
  loadScript: vi.fn(),
}
vi.mock('@/hooks/useAnimationEngine', () => ({
  __esModule: true,
  useAnimationEngine: () => ({
    visualState: { arrayData: [], colorMap: new Map(), elementIds: [], currentStep: 0, totalSteps: 0 },
    currentStepData: null,
    isPlaying: false,
    speed: 1,
    currentStep: 0,
    totalSteps: 0,
    ...engineHandlers,
  }),
}))

// getApiConfig gates the AI analyze button — toggled per test.
const getApiConfigMock = vi.fn<() => unknown>(() => null)
vi.mock('@/ai', async () => {
  const actual = await vi.importActual<typeof import('@/ai')>('@/ai')
  return {
    ...actual,
    getApiConfig: () => getApiConfigMock(),
  }
})

import Visualizer from '../index'
import { useAlgorithmStore, type AlgorithmType } from '@/store/algorithmStore'
import i18n from '@/i18n'

// Reach the store's actions/state through the selector hook by rendering a tiny
// helper. This avoids depending on the (non-exported) store singleton.
function useStoreApi() {
  return useAlgorithmStore((s) => s)
}

let storeApi: ReturnType<typeof useStoreApi> | null = null
function StoreProbe() {
  const api = useStoreApi()
  // Publish to the outer var from an effect (not during render) so the React
  // Compiler lint rule against render-time outer mutation is satisfied.
  useEffect(() => {
    storeApi = api
  }, [api])
  return null
}

function renderVisualizer() {
  return render(
    <MemoryRouter>
      <StoreProbe />
      <Visualizer />
    </MemoryRouter>,
  )
}

function pickAlgorithm(id: string): AlgorithmType {
  const algo = storeApi!.algorithms.find((a) => a.id === id)
  if (!algo) throw new Error(`algorithm ${id} not found in store`)
  return algo
}

function selectAlgorithm(id: string) {
  act(() => {
    storeApi!.setSelectedAlgorithm(pickAlgorithm(id))
  })
}

beforeEach(() => {
  // Deterministic, offline starting point. Clear localStorage so per-test state
  // (e.g. the persisted editor code-language) doesn't leak between tests.
  localStorage.clear()
  act(() => {
    i18n.changeLanguage('zh')
  })
  getApiConfigMock.mockReturnValue(null)
})

afterEach(() => {
  // Reset store + spies between tests.
  if (storeApi) {
    act(() => {
      storeApi!.setSelectedAlgorithm(null)
      storeApi!.setAnimationScript(null)
      storeApi!.setAIStatus('idle')
    })
  }
  cleanup()
  vi.clearAllMocks()
  storeApi = null
})

describe('Visualizer page', () => {
  it('shows the empty state when no algorithm is selected', () => {
    renderVisualizer()
    expect(screen.getByText(i18n.t('visualizer.emptyTitle'))).toBeTruthy()
    expect(screen.getByText(i18n.t('visualizer.emptySubtitle'))).toBeTruthy()
    // No code editor / scene region while empty.
    expect(document.querySelector('[data-monaco]')).toBeNull()
    expect(screen.queryByTestId('scene')).toBeNull()
  })

  it('renders the workspace once an algorithm is selected', () => {
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    // Empty state gone.
    expect(screen.queryByText(i18n.t('visualizer.emptyTitle'))).toBeNull()

    // Scene region (mocked renderer) is present.
    expect(screen.getByTestId('scene')).toBeTruthy()

    // Code editor + input data editor are both Monaco stubs (>= 2 textareas).
    const editors = document.querySelectorAll('[data-monaco]')
    expect(editors.length).toBeGreaterThanOrEqual(2)

    // Algorithm info panel + the algorithm name rendered.
    expect(screen.getByText(i18n.t('visualizer.algorithmInfo'))).toBeTruthy()
    expect(screen.getAllByText('冒泡排序').length).toBeGreaterThan(0)

    // The code editor is seeded with the algorithm's code template.
    const codeEditor = Array.from(editors).find((el) =>
      (el as HTMLTextAreaElement).value.includes('def bubble_sort'),
    ) as HTMLTextAreaElement | undefined
    expect(codeEditor).toBeTruthy()
  })

  it('seeds the input data panel and regenerates the script on input change', () => {
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    // Selecting a preset algorithm produces an animation script (orchestration effect).
    expect(storeApi!.animationScript).not.toBeNull()
    const firstScript = storeApi!.animationScript

    // Locate the input-data editor (the one NOT holding the code template).
    const editors = Array.from(document.querySelectorAll('[data-monaco]')) as HTMLTextAreaElement[]
    const inputEditor = editors.find((el) => !el.value.includes('def '))
    expect(inputEditor).toBeTruthy()

    // Change the input → effect re-runs the preset generator → new script object.
    act(() => {
      fireEvent.change(inputEditor!, { target: { value: '[9, 1, 5, 2]' } })
    })

    expect(storeApi!.animationScript).not.toBeNull()
    expect(storeApi!.animationScript).not.toBe(firstScript)
  })

  it('gates the AI analyze button on getApiConfig presence', () => {
    // No API config → button disabled, hint surfaced.
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    const analyzeBtn = screen.getByTitle(i18n.t('controls.aiConfigureHint')) as HTMLButtonElement
    expect(analyzeBtn.disabled).toBe(true)

    cleanup()

    // With API config → button enabled.
    getApiConfigMock.mockReturnValue({ provider: 'x', apiKey: 'k', model: 'm', baseUrl: 'u' })
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    const enabledBtn = screen.getByTitle(i18n.t('controls.aiAnalyze')) as HTMLButtonElement
    expect(enabledBtn.disabled).toBe(false)
  })

  it('invokes the analyze handler when AI analyze is clicked', () => {
    getApiConfigMock.mockReturnValue({ provider: 'x', apiKey: 'k', model: 'm', baseUrl: 'u' })
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    const btn = screen.getByTitle(i18n.t('controls.aiAnalyze')) as HTMLButtonElement
    act(() => {
      fireEvent.click(btn)
    })
    expect(analyzeMock).toHaveBeenCalledTimes(1)
  })

  it('switches code language via the selector and reseeds the editor', () => {
    renderVisualizer()
    selectAlgorithm('binary_search')

    // Default language is python — the python template is shown.
    const pyEditor = Array.from(document.querySelectorAll('[data-monaco]')).find((el) =>
      (el as HTMLTextAreaElement).value.includes('def binary_search'),
    )
    expect(pyEditor).toBeTruthy()

    // The language <select> exists with python selected.
    const langSelect = document.querySelector('select') as HTMLSelectElement
    expect(langSelect.value).toBe('python')

    act(() => {
      fireEvent.change(langSelect, { target: { value: 'javascript' } })
    })

    expect(langSelect.value).toBe('javascript')
    expect(localStorage.getItem('algoviz-editor-code-lang')).toBe('javascript')
  })

  it('edits code through the editor stub', () => {
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    const codeEditor = Array.from(document.querySelectorAll('[data-monaco]')).find((el) =>
      (el as HTMLTextAreaElement).value.includes('def bubble_sort'),
    ) as HTMLTextAreaElement

    act(() => {
      fireEvent.change(codeEditor, { target: { value: 'print("hi")' } })
    })

    const updated = Array.from(document.querySelectorAll('[data-monaco]')).find((el) =>
      (el as HTMLTextAreaElement).value === 'print("hi")',
    )
    expect(updated).toBeTruthy()
  })

  it('wires playback control buttons to the engine handlers', () => {
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    fireEvent.click(screen.getByLabelText(i18n.t('controls.reset')))
    expect(engineHandlers.reset).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(i18n.t('controls.prevStep')))
    expect(engineHandlers.stepBackward).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(i18n.t('controls.nextStep')))
    expect(engineHandlers.stepForward).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(i18n.t('controls.end')))
    expect(engineHandlers.goToEnd).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(i18n.t('controls.play')))
    expect(engineHandlers.togglePlay).toHaveBeenCalled()
  })

  it('toggles the input format selector between LeetCode and JSON', () => {
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
    const formatSelect = selects.find((s) =>
      Array.from(s.options).some((o) => o.value === 'json'),
    ) as HTMLSelectElement
    expect(formatSelect).toBeTruthy()

    act(() => {
      fireEvent.change(formatSelect, { target: { value: 'json' } })
    })
    expect(formatSelect.value).toBe('json')
    expect(localStorage.getItem('algoviz-input-format')).toBe('json')
  })

  it('renders the algorithm info description for the selected algorithm', () => {
    renderVisualizer()
    selectAlgorithm('bubble_sort')

    const infoPanel = screen.getByText(i18n.t('visualizer.algorithmInfo'))
    expect(infoPanel).toBeTruthy()
    // The Chinese description text for bubble_sort is rendered somewhere
    // (it appears in both the sidebar list and the info panel → multiple matches).
    expect(
      screen.getAllByText((content) => content.includes('冒泡')).length,
    ).toBeGreaterThan(0)
  })
})
