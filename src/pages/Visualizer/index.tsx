import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAlgorithmStore, type AIHistoryEntry } from '@/store/algorithmStore'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { resolveScript } from '@/hooks/resolveScript'
import { getApiConfig, parseInputData } from '@/ai'
import { useAIGenerator } from '@/hooks/useAIGenerator'
import type { AnimationScript } from '@/types/animation'
import { compileAndValidateCode } from '@/utils/codeCompiler'
import {
  parseAlgorithmInput,
  getLeetCodeDefault,
} from '@/utils/inputParser'
import {
  ALGORITHM_DEFAULT_INPUTS,
  getCodeTemplate,
  type CodeLang,
} from '@/data/algorithms'
import PlaybackControls from '@/components/Controls/PlaybackControls'
import { REQUEST_AI_REPAIR_EVENT } from '@/components/ErrorBoundary'
import { getOperationsForAlgo } from '@/presets/operationPresets'
import { useResizablePanels } from './useResizablePanels'
import { useCodeScope } from './useCodeScope'
import InfoPanel from './InfoPanel'
import WorkspacePanel from './WorkspacePanel'
import CanvasPanel from './CanvasPanel'

let currentAnalysisController: AbortController | null = null

export default function Visualizer() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'

  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm)
  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)
  const aiStatus = useAlgorithmStore((s) => s.aiStatus)
  const aiError = useAlgorithmStore((s) => s.aiError)
  const aiRawResponse = useAlgorithmStore((s) => s.aiRawResponse)
  const setAIStatus = useAlgorithmStore((s) => s.setAIStatus)
  const addAIHistory = useAlgorithmStore((s) => s.addAIHistory)

  const [codeLanguage, setCodeLanguage] = useState<CodeLang>(() => {
    return (localStorage.getItem('algoviz-editor-code-lang') as CodeLang) || 'python'
  })
  const [inputDataByScope, setInputDataByScope] = useState<Record<string, string>>({})
  const [inputFormat, setInputFormat] = useState<'leetcode' | 'json'>(() => {
    return (localStorage.getItem('algoviz-input-format') as 'leetcode' | 'json') || 'leetcode'
  })
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [showDefinition, setShowDefinition] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [operationIdByAlgo, setOperationIdByAlgo] = useState<Record<string, string>>({})
  const [operationParam, setOperationParam] = useState<string>('5')

  const operations = selectedAlgorithm ? getOperationsForAlgo(selectedAlgorithm.id) : undefined
  const hasOperations = operations && operations.length > 0

  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])
  const prevAlgoId = useRef<string | null>(null)
  const {
    leftWidth,
    rightWidth,
    editorHeight,
    isDesktop,
    handleLeftResizeStart,
    handleRightResizeStart,
    handleEditorHeightResizeStart,
  } = useResizablePanels(editorRef)

  const {
    visualState,
    currentStepData,
    isPlaying,
    speed,
    currentStep,
    totalSteps,
    setSpeed,
    stepForward,
    stepBackward,
    reset,
    goToEnd,
    goToStep,
    togglePlay,
    loadScript,
  } = useAnimationEngine(animationScript)

  const currentPhase = useMemo(() => {
    if (!animationScript || currentStep === 0) return undefined
    for (let i = Math.min(currentStep, animationScript.steps.length) - 1; i >= 0; i--) {
      const phase = animationScript.steps[i].phase
      if (phase) return lang === 'zh' ? phase.zh : phase.en
    }
    return undefined
  }, [animationScript, currentStep, lang])

  const hasApiConfig = getApiConfig() !== null

  const inputScopeKey = `${selectedAlgorithm?.id ?? 'none'}:${inputFormat}`
  const defaultInputData = selectedAlgorithm?.id
    ? inputFormat === 'leetcode'
      ? (getLeetCodeDefault(selectedAlgorithm.id) ?? '')
      : (ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]?.value ?? '')
    : ''
  const inputData = inputDataByScope[inputScopeKey] ?? defaultInputData
  const setInputData = useCallback(
    (nextValue: string) => {
      setInputDataByScope((prev) =>
        prev[inputScopeKey] === nextValue ? prev : { ...prev, [inputScopeKey]: nextValue }
      )
    },
    [inputScopeKey]
  )

  const defaultOperationId = (() => {
    if (!selectedAlgorithm) return ''
    if (selectedAlgorithm.id.endsWith('_insert') || selectedAlgorithm.id === 'avl_insert')
      return 'insert'
    if (selectedAlgorithm.id.endsWith('_delete')) return 'delete'
    if (selectedAlgorithm.id.endsWith('_search')) return 'search'
    if (selectedAlgorithm.id === 'btree' || selectedAlgorithm.id === 'bplus_tree')
      return operations?.[0]?.id ?? ''
    return ''
  })()
  const currentOperationId = selectedAlgorithm
    ? (operationIdByAlgo[selectedAlgorithm.id] ?? defaultOperationId)
    : ''
  const setCurrentOperationId = useCallback(
    (nextValue: string) => {
      if (!selectedAlgorithm?.id) return
      setOperationIdByAlgo((prev) =>
        prev[selectedAlgorithm.id] === nextValue
          ? prev
          : { ...prev, [selectedAlgorithm.id]: nextValue }
      )
    },
    [selectedAlgorithm]
  )
  const currentOperation = currentOperationId
    ? operations?.find((op) => op.id === currentOperationId)
    : undefined
  const codeScopeKey = `${selectedAlgorithm?.id ?? 'none'}:${currentOperationId || 'main'}:${codeLanguage}`
  const defaultCode = currentOperation
    ? currentOperation.code[codeLanguage] || currentOperation.code.python || ''
    : selectedAlgorithm
      ? getCodeTemplate(selectedAlgorithm.id, codeLanguage)
      : ''
  const { code, setCode, isCodeDirty } = useCodeScope({ scopeKey: codeScopeKey, defaultCode })
  const codeDiagnostics = useMemo(() => {
    if (!code.trim()) return []
    const result = compileAndValidateCode(code, codeLanguage)
    return [...result.errors, ...result.warnings]
  }, [code, codeLanguage])

  // Parse input data from text — returns the natural type for the algorithm
  const parsedInput = useCallback((): unknown => {
    if (!selectedAlgorithm?.id) return [5, 3, 8, 1, 9, 2]
    if (!inputData.trim()) {
      const def = selectedAlgorithm?.id ? ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id] : null
      if (def) {
        try {
          return JSON.parse(def.value)
        } catch {
          /* ignore */
        }
      }
      return [5, 3, 8, 1, 9, 2]
    }
    return parseAlgorithmInput(inputData, inputFormat, selectedAlgorithm.id)
  }, [inputData, selectedAlgorithm, inputFormat])

  // Raw-string variant of parsedInput for the shared AI generator hook (it parses
  // an explicit string — the current box or the AI's @sample — not just state).
  const parseInputRaw = useCallback(
    (raw: string): { valid: boolean; value: unknown } => {
      const trimmed = raw.trim()
      if (!trimmed) return { valid: false, value: null }
      if (inputFormat === 'json') {
        try {
          return { valid: true, value: JSON.parse(trimmed) }
        } catch {
          return { valid: false, value: null }
        }
      }
      // LeetCode format never throws; treat any non-empty input as parseable.
      return {
        valid: true,
        value: parseAlgorithmInput(trimmed, inputFormat, selectedAlgorithm?.id ?? ''),
      }
    },
    [inputFormat, selectedAlgorithm]
  )

  // Live mode (recognized built-in or AI generator) + input-driven live regen.
  // applyScript also loadScript()s so the playback engine picks up the new script.
  const {
    liveAlgoId,
    generator,
    analyze: analyzeGenerator,
    reset: resetGenerator,
  } = useAIGenerator({
    inputData,
    parseInput: parseInputRaw,
    applyScript: useCallback(
      (s: AnimationScript) => {
        setAnimationScript(s)
        loadScript(s)
      },
      [setAnimationScript, loadScript]
    ),
    setStatus: setAIStatus,
  })

  const aiLiveActive = Boolean(liveAlgoId || generator)
  const showCodeDesync = isCodeDirty && !aiLiveActive

  // Mirror live mode in a ref so the preset effect can detect it without taking
  // liveAlgoId/generator as deps (which would re-run the preset path on analysis).
  const liveModeRef = useRef(false)
  useEffect(() => {
    liveModeRef.current = liveAlgoId !== null || generator !== null
  }, [liveAlgoId, generator])

  // Load preset or regenerate when algorithm or input changes
  useEffect(() => {
    if (!selectedAlgorithm) return

    // In AI live mode, an input change is handled by the useAIGenerator hook (it
    // re-runs the recognized preset / AI generator). Skip the built-in preset path
    // so it doesn't overwrite the AI result or reset the 'success' status. When the
    // user switches to a different algorithm, fall through and clear live mode.
    const algoChanged = prevAlgoId.current !== selectedAlgorithm.id
    if (liveModeRef.current && !algoChanged) return
    if (liveModeRef.current && algoChanged) resetGenerator()

    setAIStatus('idle')

    // Set default input when switching to a different algorithm
    if (algoChanged) {
      prevAlgoId.current = selectedAlgorithm.id
    }

    const script = resolveScript({
      selectedAlgorithm,
      currentOperationId,
      operations,
      parsedInput,
      operationParam,
    })
    setAnimationScript(script)
  }, [
    selectedAlgorithm,
    inputData,
    operationParam,
    setAnimationScript,
    parsedInput,
    currentOperationId,
    operations,
    resetGenerator,
    setAIStatus,
  ])

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  // Update Monaco editor decorations based on current step
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !animationScript) return

    // 脱钩状态下模板行号对编辑后的代码无意义:清空所有行高亮,避免箭头指错行。
    if (showCodeDesync) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      return
    }

    const steps = animationScript.steps
    const currentCodeLine = steps[currentStep - 1]?.codeLine ?? -1

    const newDecorations: Parameters<typeof editor.deltaDecorations>[1] = []

    // Visited lines (before current)
    const visitedLines = new Set<number>()
    const maxIdx = Math.min(currentStep - 1, steps.length)
    for (let i = 0; i < maxIdx; i++) {
      if (steps[i]) visitedLines.add(steps[i].codeLine)
    }

    for (const line of visitedLines) {
      if (line !== currentCodeLine) {
        newDecorations.push({
          range: {
            startLineNumber: line + 1,
            startColumn: 1,
            endLineNumber: line + 1,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: 'visited-line',
            glyphMarginClassName: 'visited-glyph',
          },
        })
      }
    }

    // Current active line
    if (currentCodeLine >= 0) {
      newDecorations.push({
        range: {
          startLineNumber: currentCodeLine + 1,
          startColumn: 1,
          endLineNumber: currentCodeLine + 1,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'active-line',
          glyphMarginClassName: 'active-glyph',
        },
      })
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
  }, [currentStep, animationScript, showCodeDesync])
  const handleAIAnalyze = useCallback(async () => {
    const compResult = compileAndValidateCode(code, codeLanguage)
    if (!compResult.success) {
      setAIStatus(
        'error',
        `[${compResult.errors[0].type}] ${compResult.errors[0].message} (第 ${compResult.errors[0].line} 行)${compResult.errors[0].context ? `\n\n代码上下文:\n\`\`\`\n${compResult.errors[0].context}\n\`\`\`` : ''}`
      )
      setAnimationScript(null)
      return
    }

    if (!hasApiConfig) {
      setAIStatus('error', t('controls.aiConfigureHint'))
      return
    }

    currentAnalysisController?.abort()
    const controller = new AbortController()
    currentAnalysisController = controller

    setAIStatus('analyzing')

    const currentValid = inputData.trim() !== '' && parseInputData(inputData).valid

    try {
      const result = await analyzeGenerator(
        {
          code,
          language: codeLanguage,
          inputData,
          algorithmName: selectedAlgorithm?.name,
          signal: controller.signal,
        },
        currentValid,
        setInputData
      )

      if (controller.signal.aborted) return
      currentAnalysisController = null

      if (!result.ok) {
        // analyze() already set the error status; nothing recorded in history on failure.
        if (result.error === 'AbortError') return
        return
      }

      const entry: AIHistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        algorithmId: selectedAlgorithm?.id ?? 'unknown',
        algorithmName: selectedAlgorithm?.name ?? '未知算法',
        code,
        language: codeLanguage,
        // Record the input the animation was actually generated from (may be the
        // AI @sample when the box was empty/invalid), so restore stays consistent.
        inputData: result.usedInput ?? inputData,
        status: 'success',
        script: result.script,
        ...(result.generatorBody
          ? { generatorBody: result.generatorBody, generatorType: result.generatorType }
          : {}),
      }
      addAIHistory(entry)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setAIStatus('error', e instanceof Error ? e.message : t('common.error'))
    }
  }, [
    addAIHistory,
    analyzeGenerator,
    code,
    codeLanguage,
    hasApiConfig,
    inputData,
    selectedAlgorithm,
    setAIStatus,
    setAnimationScript,
    setInputData,
    t,
  ])

  useEffect(() => {
    const handleRepairRequest = () => {
      void handleAIAnalyze()
    }
    window.addEventListener(REQUEST_AI_REPAIR_EVENT, handleRepairRequest)
    return () => window.removeEventListener(REQUEST_AI_REPAIR_EVENT, handleRepairRequest)
  }, [handleAIAnalyze])

  // ── 动画全屏 ──
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), [])
  useEffect(() => {
    if (!isFullscreen) return
    // 尽力而为地进入原生全屏(失败也无妨,CSS 覆盖层已覆盖整个视口)。
    const el = fullscreenRef.current
    if (el && document.fullscreenElement == null && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    const onFsChange = () => { if (document.fullscreenElement == null) setIsFullscreen(false) }
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFsChange)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [isFullscreen])

  if (!selectedAlgorithm) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="code2" size={28} className="text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-slate-600 mb-2">
            {t('visualizer.emptyTitle')}
          </h2>
          <p className="text-sm text-muted max-w-xs">{t('visualizer.emptySubtitle')}</p>
        </div>
      </div>
    )
  }

  const complexity = animationScript?.complexity

  // 画布与播放控件的属性集中定义,使其既能在常规三栏布局里渲染,也能在全屏覆盖层里渲染
  // (同一时刻只渲染其一,不会双实例)。
  const canvasPanelProps = {
    hasOperations, operations, currentOperationId, setCurrentOperationId,
    setOperationParam, animationScript, visualState, currentStepData, speed, lang,
    isFullscreen, onToggleFullscreen: toggleFullscreen,
  }
  const playbackControlsProps = {
    isPlaying, currentStep, totalSteps, speed,
    onReset: reset, onStepBackward: stepBackward, onTogglePlay: togglePlay,
    onStepForward: stepForward, onGoToEnd: goToEnd, onSpeedChange: setSpeed,
    onSeek: goToStep, currentPhase,
    labels: {
      reset: t('controls.reset'), prevStep: t('controls.prevStep'), play: t('controls.play'),
      pause: t('controls.pause'), nextStep: t('controls.nextStep'), end: t('controls.end'),
      speed: t('controls.speed'), progress: t('controls.progress'),
    },
    extraActions: (
      <button
        onClick={handleAIAnalyze}
        disabled={aiStatus === 'analyzing' || !hasApiConfig}
        className="flex items-center gap-1.5 px-2 sm:px-3 h-8 rounded-lg text-xs sm:text-sm font-medium
                   bg-gradient-to-r from-violet-500 to-purple-600 text-white
                   hover:from-violet-600 hover:to-purple-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all cursor-pointer border-none shadow-sm"
        title={!hasApiConfig ? t('controls.aiConfigureHint') : t('controls.aiAnalyze')}
      >
        {aiStatus === 'analyzing' ? (
          <Icon name="loader2" size={14} className="animate-spin" />
        ) : (
          <Icon name="brain" size={14} />
        )}
        <span className="hidden sm:inline">{t('controls.aiAnalyze')}</span>
      </button>
    ),
  }

  return (
    <div className="h-full flex flex-col">
      {/* Three-column layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Left: Code Editor (35%) */}
        <div
          id="left-workspace-panel"
          className="xl:flex-none h-[42%] xl:h-auto border-b xl:border-b-0 border-border flex flex-col bg-white min-w-0 min-h-0"
          style={isDesktop ? { width: `${leftWidth}%` } : undefined}
        >
          <WorkspacePanel
            selectedAlgorithm={selectedAlgorithm}
            code={code}
            defaultCode={defaultCode}
            codeLanguage={codeLanguage}
            setCodeLanguage={setCodeLanguage}
            setCode={setCode}
            codeDiagnostics={codeDiagnostics}
            showCodeDesync={showCodeDesync}
            aiAnalyzing={aiStatus === 'analyzing'}
            onAIAnalyze={handleAIAnalyze}
            onEditorMount={handleEditorMount}
            editorHeight={editorHeight}
            isDesktop={isDesktop}
            inputFormat={inputFormat}
            setInputFormat={setInputFormat}
            inputData={inputData}
            setInputData={setInputData}
            hasOperations={hasOperations}
            currentOperationId={currentOperationId}
            operationParam={operationParam}
            setOperationParam={setOperationParam}
            animationScript={animationScript}
            visualState={visualState}
            currentStep={currentStep}
            totalSteps={totalSteps}
            lang={lang}
            t={t}
            handleEditorHeightResizeStart={handleEditorHeightResizeStart}
          />
        </div>

        {/* Left-Center Resizer Bar */}
        <div
          onMouseDown={handleLeftResizeStart}
          className="hidden xl:flex w-[6px] hover:w-[10px] h-full cursor-col-resize hover:bg-primary/10 hover:border-r hover:border-l hover:border-primary/20 transition-all shrink-0 select-none items-center justify-center bg-slate-50 border-r border-l border-border group"
          title={lang === 'zh' ? '拖动调整宽度' : 'Drag to resize'}
        >
          <div className="w-[1.5px] h-5 bg-slate-300 group-hover:bg-primary rounded-full transition-all" />
        </div>

        {/* Center: Canvas (45%) */}
        <div
          className="flex-1 xl:flex-none border-b xl:border-b-0 border-border min-w-0 min-h-0 flex flex-col"
          style={isDesktop ? { width: `${100 - leftWidth - rightWidth}%` } : undefined}
        >
          {isFullscreen ? (
            <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-slate-400 select-none">
              {lang === 'zh' ? '动画已全屏显示，按 Esc 或点击退出返回' : 'Animation is in fullscreen — press Esc to return'}
            </div>
          ) : (
            <CanvasPanel {...canvasPanelProps} />
          )}
        </div>

        {/* Center-Right Resizer Bar */}
        <div
          onMouseDown={handleRightResizeStart}
          className="hidden xl:flex w-[6px] hover:w-[10px] h-full cursor-col-resize hover:bg-primary/10 hover:border-r hover:border-l hover:border-primary/20 transition-all shrink-0 select-none items-center justify-center bg-slate-50 border-r border-l border-border group"
          title={lang === 'zh' ? '拖动调整宽度' : 'Drag to resize'}
        >
          <div className="w-[1.5px] h-5 bg-slate-300 group-hover:bg-primary rounded-full transition-all" />
        </div>

        {/* Right: Info Panel (20%) */}
        <div
          className="xl:flex-none h-44 xl:h-auto flex flex-col bg-white min-w-0 shrink-0"
          style={isDesktop ? { width: `${rightWidth}%` } : undefined}
        >
          <InfoPanel
            animationScript={animationScript}
            currentStep={currentStep}
            currentStepData={currentStepData}
            goToStep={goToStep}
            lang={lang}
            selectedAlgorithm={selectedAlgorithm}
            complexity={complexity}
            aiStatus={aiStatus}
            aiError={aiError}
            aiRawResponse={aiRawResponse}
            showRawResponse={showRawResponse}
            setShowRawResponse={setShowRawResponse}
            showDefinition={showDefinition}
            setShowDefinition={setShowDefinition}
            onCancelAI={() => {
              currentAnalysisController?.abort()
              currentAnalysisController = null
              setAIStatus('idle')
            }}
            t={t}
          />
        </div>
      </div>

      {/* Bottom: Control Bar(全屏时移入覆盖层) */}
      {!isFullscreen && <PlaybackControls {...playbackControlsProps} />}

      {/* 全屏覆盖层:画布 + 播放控件占满整个视口 */}
      {isFullscreen && createPortal(
        <div ref={fullscreenRef} className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="flex-1 min-h-0">
            <CanvasPanel {...canvasPanelProps} />
          </div>
          <PlaybackControls {...playbackControlsProps} />
        </div>,
        document.body,
      )}

      <style>{`
        .active-line {
          background: rgba(245, 158, 11, 0.12) !important;
          border-left: 3px solid #F59E0B;
        }
        .visited-line {
          background: rgba(37, 99, 235, 0.04) !important;
          border-left: 3px solid #93C5FD;
        }
        .active-glyph {
          background: transparent !important;
          width: 18px !important;
          margin-left: 2px;
        }
        .active-glyph::after {
          content: '▶';
          position: absolute;
          left: 1px;
          top: 50%;
          transform: translateY(-50%);
          color: #F59E0B;
          font-size: 10px;
          animation: arrow-blink 0.8s ease-in-out infinite alternate;
        }
        .visited-glyph {
          background: #93C5FD;
          width: 3px !important;
          margin-left: 4px;
          border-radius: 2px;
        }
        @keyframes arrow-blink {
          from { opacity: 1; transform: translateY(-50%) scale(1); }
          to { opacity: 0.6; transform: translateY(-50%) scale(1.1); }
        }
        @keyframes pulse-glow {
          from { opacity: 0.8; r: 1; }
          to { opacity: 0.1; r: 1.2; }
        }
      `}</style>
    </div>
  )
}
