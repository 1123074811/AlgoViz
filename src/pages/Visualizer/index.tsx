import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
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
  getLeetCodePlaceholder,
} from '@/utils/inputParser'
import {
  ALGORITHM_DEFS,
  ALGORITHM_DEFAULT_INPUTS,
  getAlgorithmDescription,
  getCodeTemplate,
  type CodeLang,
} from '@/data/algorithms'
import SceneCanvas from '@/scene/SceneCanvas'
import PlaybackControls from '@/components/Controls/PlaybackControls'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import InputDataPanel from '@/components/Editor/InputDataPanel'
import RunDataPanel from '@/components/Editor/RunDataPanel'
import { REQUEST_AI_REPAIR_EVENT } from '@/components/ErrorBoundary'
import { getSceneDiagnosticSummary, getSceneEventStats, usesSceneEngine } from '@/scene'
import { getOperationsForAlgo } from '@/presets/operationPresets'
import DefinitionCard from './DefinitionCard'
import { VerificationNotice } from './VerificationNotice'
import { useResizablePanels } from './useResizablePanels'

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

  const [codeByScope, setCodeByScope] = useState<Record<string, string>>({})
  const [codeLanguage, setCodeLanguage] = useState<CodeLang>(() => {
    return (localStorage.getItem('algoviz-editor-code-lang') as CodeLang) || 'python'
  })
  const [inputDataByScope, setInputDataByScope] = useState<Record<string, string>>({})
  const [inputFormat, setInputFormat] = useState<'leetcode' | 'json'>(() => {
    return (localStorage.getItem('algoviz-input-format') as 'leetcode' | 'json') || 'leetcode'
  })
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [showDefinition, setShowDefinition] = useState(false)
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
    togglePlay,
    loadScript,
  } = useAnimationEngine(animationScript)

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
  const code = codeByScope[codeScopeKey] ?? defaultCode
  const setCode = useCallback(
    (nextValue: string) => {
      setCodeByScope((prev) =>
        prev[codeScopeKey] === nextValue ? prev : { ...prev, [codeScopeKey]: nextValue }
      )
    },
    [codeScopeKey]
  )
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
  }, [currentStep, animationScript])
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
  const isSceneEngineActive = usesSceneEngine(animationScript)
  const sceneEventStats = getSceneEventStats(animationScript)
  const sceneDiagnosticSummary = getSceneDiagnosticSummary(animationScript)

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
          {/* Top: Code Editor Panel */}
          <div
            className="flex-1 xl:flex-none flex flex-col min-h-0"
            style={isDesktop ? { height: `${editorHeight}%` } : undefined}
          >
            <CodeEditorPanel
              value={code}
              language={codeLanguage}
              onChange={setCode}
              onMount={handleEditorMount}
              diagnostics={codeDiagnostics}
              disabled={aiStatus === 'analyzing'}
              title={selectedAlgorithm.name}
              className="flex-1"
              rightSlot={
                <>
                  {/* Language selector */}
                  <select
                    value={codeLanguage}
                    onChange={(e) => {
                      const lang = e.target.value as CodeLang
                      setCodeLanguage(lang)
                      localStorage.setItem('algoviz-editor-code-lang', lang)
                    }}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border
                             bg-white text-slate-600 outline-none cursor-pointer
                             focus:border-primary"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                  {selectedAlgorithm.hasPreset && (
                    <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                      {t('sidebar.presetBadge')}
                    </span>
                  )}
                </>
              }
            />
          </div>

          {/* Horizontal Drag Resizer Bar */}
          <div
            onMouseDown={handleEditorHeightResizeStart}
            className="hidden xl:flex h-[6px] hover:h-[10px] w-full cursor-row-resize hover:bg-primary/10 hover:border-t hover:border-b hover:border-primary/20 transition-all shrink-0 select-none items-center justify-center bg-slate-50 border-t border-b border-border group"
            title={lang === 'zh' ? '拖动调整高度' : 'Drag to resize'}
          >
            <div className="h-[1.5px] w-5 bg-slate-300 group-hover:bg-primary rounded-full transition-all" />
          </div>

          {/* Bottom: Inputs and Outputs Container */}
          <div
            className="xl:flex-none flex flex-col xl:overflow-hidden overflow-y-auto shrink-0 min-h-0"
            style={isDesktop ? { height: `${100 - editorHeight}%` } : undefined}
          >
            <div className="flex-1 flex flex-col min-h-0">
              {/* Format Selector */}
              <div className="flex items-center gap-1.5 px-1.5 py-1 border-b border-border bg-muted/30 shrink-0">
                <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                  {lang === 'zh' ? '格式' : 'Fmt'}
                </span>
                <select
                  value={inputFormat}
                  onChange={(e) => {
                    const fmt = e.target.value as 'leetcode' | 'json'
                    setInputFormat(fmt)
                    localStorage.setItem('algoviz-input-format', fmt)
                    // Update input data to match new format
                    if (selectedAlgorithm?.id) {
                      if (fmt === 'leetcode') {
                        const lcDefault = getLeetCodeDefault(selectedAlgorithm.id)
                        if (lcDefault) setInputData(lcDefault)
                      } else {
                        const defInput = ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]
                        if (defInput) setInputData(defInput.value)
                      }
                    }
                  }}
                  className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="leetcode">LeetCode</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              {hasOperations ? (
                <div className="flex flex-col gap-2 flex-1 min-h-0 p-1">
                  <InputDataPanel
                    value={inputData}
                    onChange={setInputData}
                    title={
                      lang === 'zh' ? '原始数据 (初始结构)' : 'Original Data (Initial Structure)'
                    }
                    helperText={
                      lang === 'zh'
                        ? '用于构建初始数据结构的数组'
                        : 'Initial elements for building the data structure'
                    }
                    placeholder={
                      selectedAlgorithm?.id
                        ? inputFormat === 'leetcode'
                          ? getLeetCodePlaceholder(selectedAlgorithm.id)
                          : (ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]?.value ??
                            '[5, 3, 8, 1, 9, 2]')
                        : '[5, 3, 8, 1, 9, 2]'
                    }
                    disabled={aiStatus === 'analyzing'}
                    className="h-24 xl:flex-1 xl:h-auto xl:min-h-0"
                  />
                  <InputDataPanel
                    value={operationParam}
                    onChange={setOperationParam}
                    title={(() => {
                      if (currentOperationId === 'insert')
                        return lang === 'zh'
                          ? '操作输入 (插入节点的值)'
                          : 'Operation Parameter (Value to Insert)'
                      if (currentOperationId === 'delete')
                        return lang === 'zh'
                          ? '操作输入 (删除节点的值)'
                          : 'Operation Parameter (Value to Delete)'
                      if (currentOperationId === 'range_query')
                        return lang === 'zh'
                          ? '操作输入 (范围查询 low, high)'
                          : 'Operation Parameter (Range Query low, high)'
                      return lang === 'zh'
                        ? '操作输入 (查找节点的值)'
                        : 'Operation Parameter (Value to Search)'
                    })()}
                    helperText={
                      currentOperationId === 'range_query'
                        ? lang === 'zh'
                          ? '输入范围，如 30, 60'
                          : 'Enter range, e.g. 30, 60'
                        : lang === 'zh'
                          ? '输入一个具体的数值'
                          : 'Enter a specific numeric value'
                    }
                    placeholder={currentOperationId === 'range_query' ? '30, 60' : '5'}
                    disabled={aiStatus === 'analyzing'}
                    className="h-20 xl:h-24 xl:shrink-0"
                  />
                  <RunDataPanel
                    script={animationScript}
                    visualState={visualState}
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    lang={lang}
                    title={lang === 'zh' ? '操作输出' : 'Operation Output'}
                    className="h-20 xl:h-24 xl:shrink-0"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2 flex-1 min-h-0 p-1">
                  <InputDataPanel
                    value={inputData}
                    onChange={setInputData}
                    title={t('visualizer.inputData')}
                    helperText={(() => {
                      const def = selectedAlgorithm?.id
                        ? ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]
                        : null
                      if (def) return def.hint
                      const info = parseInputData(inputData)
                      return info.valid
                        ? `类型: ${info.kind} · ${info.summary}`
                        : '支持数组、字符串、JSON 对象'
                    })()}
                    placeholder={(() => {
                      if (inputFormat === 'leetcode' && selectedAlgorithm?.id)
                        return getLeetCodePlaceholder(selectedAlgorithm.id)
                      const def = selectedAlgorithm?.id
                        ? ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]
                        : null
                      return def?.value ?? '[5, 3, 8, 1, 9, 2]'
                    })()}
                    disabled={aiStatus === 'analyzing'}
                    className="h-28 xl:flex-1 xl:h-auto xl:min-h-0"
                  />
                  <RunDataPanel
                    script={animationScript}
                    visualState={visualState}
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    lang={lang}
                    className="h-20 xl:h-24 xl:shrink-0"
                  />
                </div>
              )}
            </div>
          </div>
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
          {hasOperations && (
            <div className="bg-surface border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Icon name="workflow" size={14} className="text-primary animate-pulse" />
                {lang === 'zh' ? '数据结构操作演示' : 'Data Structure Operations'}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {operations.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => {
                      setCurrentOperationId(op.id)
                      if (op.id === 'insert') setOperationParam('5')
                      else if (op.id === 'delete') setOperationParam('14')
                      else if (op.id === 'search') setOperationParam('10')
                      else if (op.id === 'range_query') setOperationParam('30, 60')
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all border
                      ${
                        currentOperationId === op.id
                          ? 'bg-primary text-white border-primary shadow-sm font-semibold'
                          : 'bg-white text-slate-600 border-border hover:bg-slate-50'
                      }`}
                  >
                    {lang === 'zh' ? op.label : op.labelEn}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <SceneCanvas
              script={animationScript}
              currentStep={visualState.currentStep}
              currentStepData={currentStepData}
              speed={speed}
            />
          </div>
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
          <div className="h-9 border-b border-border flex items-center px-3 bg-surface shrink-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Icon name="info" size={14} />
              {t('visualizer.algorithmInfo')}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <VerificationNotice verification={animationScript?.verification} />

            {/* AI Status Banner */}
            {aiStatus !== 'idle' && (
              <div
                className={`p-3 rounded-lg border ${
                  aiStatus === 'analyzing'
                    ? 'border-warning-50 bg-warning-50'
                    : aiStatus === 'success'
                      ? 'border-green-100 bg-green-50'
                      : 'border-red-100 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {aiStatus === 'analyzing' && (
                      <Icon name="loader2" size={14} className="text-warning animate-spin" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        aiStatus === 'analyzing'
                          ? 'text-warning'
                          : aiStatus === 'success'
                            ? 'text-green-600'
                            : 'text-red-500'
                      }`}
                    >
                      {aiStatus === 'analyzing'
                        ? t('controls.aiAnalyzing')
                        : aiStatus === 'success'
                          ? t('controls.aiSuccess')
                          : t('controls.aiFailed')}
                    </span>
                  </div>
                  {aiStatus === 'analyzing' && (
                    <button
                      onClick={() => {
                        currentAnalysisController?.abort()
                        currentAnalysisController = null
                        setAIStatus('idle')
                      }}
                      className="text-[10px] text-warning underline cursor-pointer border-none bg-transparent"
                    >
                      取消
                    </button>
                  )}
                </div>
                {aiError && (
                  <>
                    <p className="text-[11px] text-red-500 leading-relaxed mt-1">{aiError}</p>
                    {aiRawResponse && (
                      <button
                        onClick={() => setShowRawResponse(!showRawResponse)}
                        className="text-[10px] text-slate-400 underline cursor-pointer border-none bg-transparent mt-1"
                      >
                        {showRawResponse ? '隐藏原始响应' : '查看原始响应'}
                      </button>
                    )}
                    {showRawResponse && aiRawResponse && (
                      <pre className="text-[10px] text-slate-500 mt-1 p-2 bg-slate-100 rounded max-h-32 overflow-auto whitespace-pre-wrap">
                        {aiRawResponse.slice(0, 2000)}
                      </pre>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Current Step Description */}
            {currentStepData && (
              <div className="p-3 rounded-lg border border-warning-50 bg-warning-50">
                <div className="text-[10px] text-warning uppercase tracking-wide font-semibold mb-1">
                  {t('visualizer.stepLabel')} {currentStepData.stepId}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {lang === 'zh' ? currentStepData.description.zh : currentStepData.description.en}
                </p>
              </div>
            )}

            {/* Render Engine */}
            <div className="p-3 rounded-lg border border-border bg-surface">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                {lang === 'zh' ? '渲染引擎' : 'Render Engine'}
              </h4>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSceneEngineActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {isSceneEngineActive
                    ? lang === 'zh'
                      ? '物理场景引擎'
                      : 'Scene Engine'
                    : lang === 'zh'
                      ? '经典渲染器'
                      : 'Classic Renderer'}
                </span>
                {animationScript?.presentation?.module && (
                  <span className="text-[10px] font-code text-slate-400">
                    {animationScript.presentation.module}
                  </span>
                )}
              </div>
              {isSceneEngineActive && (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-slate-400">
                        {lang === 'zh' ? '动画帧数' : 'event steps'}
                      </div>
                      <div className="font-code font-semibold text-slate-700">
                        {sceneEventStats.eventSteps}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-1.5">
                      <div className="text-slate-400">
                        {lang === 'zh' ? '动作指令数' : 'events'}
                      </div>
                      <div className="font-code font-semibold text-slate-700">
                        {sceneEventStats.totalEvents}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <span
                      className={`rounded-full px-2 py-0.5 ${sceneDiagnosticSummary.errors > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                    >
                      {lang === 'zh' ? '错误' : 'errors'} {sceneDiagnosticSummary.errors}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${sceneDiagnosticSummary.warnings > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
                    >
                      {lang === 'zh' ? '警告' : 'warnings'} {sceneDiagnosticSummary.warnings}
                    </span>
                  </div>
                  {sceneDiagnosticSummary.diagnostics.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {sceneDiagnosticSummary.diagnostics.slice(0, 2).map((diagnostic) => (
                        <div
                          key={`${diagnostic.stepId}-${diagnostic.eventIndex}-${diagnostic.message}`}
                          className="rounded-lg bg-red-50 px-2 py-1 text-[10px] text-red-600"
                        >
                          {lang === 'zh'
                            ? `第 ${diagnostic.stepId} 步`
                            : `Step ${diagnostic.stepId}`}
                          : {diagnostic.message}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stats */}
            <div className="p-3 rounded-lg border border-border bg-surface">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                {t('visualizer.liveStats')}
              </h4>
              <div className="space-y-1.5">
                {[
                  {
                    label: t('visualizer.comparisons'),
                    value: currentStepData?.stats.comparisons ?? 0,
                  },
                  { label: t('visualizer.swaps'), value: currentStepData?.stats.swaps ?? 0 },
                  { label: t('visualizer.accesses'), value: currentStepData?.stats.accesses ?? 0 },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">{stat.label}</span>
                    <span className="text-xs font-code font-medium text-slate-700">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Complexity */}
            {complexity && (
              <div className="p-3 rounded-lg border border-border bg-surface">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">
                  {t('visualizer.complexity')}
                </h4>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('visualizer.best')}</span>
                    <span className="font-code text-green-600">{complexity.time.best}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('visualizer.average')}</span>
                    <span className="font-code text-yellow-600">{complexity.time.average}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('visualizer.worst')}</span>
                    <span className="font-code text-red-500">{complexity.time.worst}</span>
                  </div>
                  <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between">
                    <span className="text-slate-400">{t('visualizer.space')}</span>
                    <span className="font-code text-slate-600">{complexity.space}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Algorithm Info */}
            <div className="p-3 rounded-lg border border-border bg-surface">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                {selectedAlgorithm.name}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {getAlgorithmDescription(selectedAlgorithm.id, lang)}
              </p>
            </div>

            {/* Detailed Algorithm Definition (collapsible) */}
            {ALGORITHM_DEFS[selectedAlgorithm.id] && (
              <DefinitionCard
                def={ALGORITHM_DEFS[selectedAlgorithm.id]}
                lang={lang}
                expanded={showDefinition}
                onToggle={() => setShowDefinition(!showDefinition)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Control Bar */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentStep={currentStep}
        totalSteps={totalSteps}
        speed={speed}
        onReset={reset}
        onStepBackward={stepBackward}
        onTogglePlay={togglePlay}
        onStepForward={stepForward}
        onGoToEnd={goToEnd}
        onSpeedChange={setSpeed}
        labels={{
          reset: t('controls.reset'),
          prevStep: t('controls.prevStep'),
          play: t('controls.play'),
          pause: t('controls.pause'),
          nextStep: t('controls.nextStep'),
          end: t('controls.end'),
          speed: t('controls.speed'),
        }}
        extraActions={
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
        }
      />

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
