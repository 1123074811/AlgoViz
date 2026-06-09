import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { getApiConfig, parseInputData, type AIErrorReport, type AIRepairAttempt } from '@/ai'
import { compileAndValidateCode } from '@/utils/codeCompiler'
import { detectCodeLanguage, getCodeLanguageLabel } from '@/utils/languageDetector'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'
import Header from '@/components/Layout/Header'
import PlaybackControls from '@/components/Controls/PlaybackControls'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import InputDataPanel from '@/components/Editor/InputDataPanel'
import RunDataPanel from '@/components/Editor/RunDataPanel'
import ConfirmDialog from '@/components/Common/ConfirmDialog'
import { REQUEST_AI_REPAIR_EVENT } from '@/components/ErrorBoundary'
import { useAlgorithmStore, type AIHistoryEntry } from '@/store/algorithmStore'
import { recognizeAlgorithm } from '@/presets/recognize'
import { useAIGenerator } from '@/hooks/useAIGenerator'
import { planRestoreOnMount, INTERRUPTED_MSG } from './restoreSession'

let playgroundAnalysisController: AbortController | null = null

const DEFAULT_CODE = ''

export default function Playground() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'
  const navigate = useNavigate()

  const [code, setCode] = useState(DEFAULT_CODE)
  const codeLanguage = useMemo(() => detectCodeLanguage(code), [code])
  // Starts empty: the AI infers the expected format and fills a sample on analysis.
  const [inputData, setInputData] = useState('')

  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)
  const aiStatus = useAlgorithmStore((s) => s.aiStatus)
  const aiError = useAlgorithmStore((s) => s.aiError)
  const aiRawResponse = useAlgorithmStore((s) => s.aiRawResponse)
  const setAIStatus = useAlgorithmStore((s) => s.setAIStatus)
  const aiHistory = useAlgorithmStore((s) => s.aiHistory)
  const addAIHistory = useAlgorithmStore((s) => s.addAIHistory)
  const updateAIHistory = useAlgorithmStore((s) => s.updateAIHistory)
  const removeAIHistory = useAlgorithmStore((s) => s.removeAIHistory)
  const clearAIHistory = useAlgorithmStore((s) => s.clearAIHistory)
  const [showHistory, setShowHistory] = useState(true)

  const [aiErrorReport, setAiErrorReport] = useState<AIErrorReport | null>(null)
  const [aiRepairHistory, setAiRepairHistory] = useState<AIRepairAttempt[] | null>(null)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [confirmState, setConfirmState] = useState<{ type: 'delete'; id: string } | { type: 'clearAll' } | null>(null)
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])

  const hasApiConfig = getApiConfig() !== null
  const hasTrackedAnalysis = !!playgroundAnalysisController && !playgroundAnalysisController.signal.aborted
  const isAnalyzing = aiStatus === 'analyzing' || (hasTrackedAnalysis && aiHistory.some(entry => entry.status === 'analyzing'))

  const inputInfo = useMemo(() => parseInputData(inputData), [inputData])
  const codeDiagnostics = useMemo(() => {
    if (!code.trim()) return []
    const result = compileAndValidateCode(code, codeLanguage)
    return [...result.errors, ...result.warnings]
  }, [code, codeLanguage])
  const activeAnimationScript = code.trim() || activeHistoryId ? animationScript : null

  // Live mode (recognized built-in or AI generator) + input-driven live regen.
  const { liveAlgoId, generator, analyze: analyzeGenerator, reset: resetGenerator, setLive: setLiveGenerator } = useAIGenerator({
    inputData,
    parseInput: parseInputData,
    applyScript: setAnimationScript,
    setStatus: setAIStatus,
  })

  const {
    visualState, currentStepData,
    isPlaying, speed, currentStep, totalSteps,
    setSpeed, stepForward, stepBackward, reset, goToEnd, togglePlay,
  } = useAnimationEngine(activeAnimationScript)

  useEffect(() => {
    if (hasTrackedAnalysis) return
    const orphanIds = aiHistory.filter(entry => entry.status === 'analyzing').map(entry => entry.id)
    for (const id of orphanIds) {
      updateAIHistory(id, { status: 'error', error: INTERRUPTED_MSG })
    }
    if (orphanIds.length > 0 && aiStatus === 'analyzing') {
      setAIStatus('error', INTERRUPTED_MSG)
    }
  }, [aiHistory, aiStatus, hasTrackedAnalysis, setAIStatus, updateAIHistory])

  const handleNew = useCallback(() => {
    playgroundAnalysisController?.abort()
    playgroundAnalysisController = null
    setCode(DEFAULT_CODE)
    setInputData('')
    resetGenerator()
    setAnimationScript(null)
    setAIStatus('idle')
    setAiErrorReport(null)
    setAiRepairHistory(null)
    setActiveHistoryId(null)
  }, [setAnimationScript, setAIStatus, resetGenerator])

  const handleEditorMount: OnMount = useCallback((editor) => { editorRef.current = editor }, [])

  // Highlight the source line the current animation step maps to (step.codeLine,
  // set by b.line() in the generator). Mirrors the Visualizer's code-line arrow.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !activeAnimationScript) {
      if (editor) decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      return
    }
    const steps = activeAnimationScript.steps
    const currentCodeLine = steps[currentStep - 1]?.codeLine ?? -1
    const decos: Parameters<typeof editor.deltaDecorations>[1] = []
    const visited = new Set<number>()
    for (let i = 0; i < Math.min(currentStep - 1, steps.length); i++) {
      const cl = steps[i]?.codeLine ?? -1
      if (cl >= 0) visited.add(cl)
    }
    for (const line of visited) {
      if (line !== currentCodeLine) {
        decos.push({ range: { startLineNumber: line + 1, startColumn: 1, endLineNumber: line + 1, endColumn: 1 },
          options: { isWholeLine: true, className: 'visited-line', glyphMarginClassName: 'visited-glyph' } })
      }
    }
    if (currentCodeLine >= 0) {
      decos.push({ range: { startLineNumber: currentCodeLine + 1, startColumn: 1, endLineNumber: currentCodeLine + 1, endColumn: 1 },
        options: { isWholeLine: true, className: 'active-line', glyphMarginClassName: 'active-glyph' } })
    }
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decos)
  }, [currentStep, activeAnimationScript])

  const handleAnalyze = useCallback(async () => {
    const compResult = compileAndValidateCode(code, codeLanguage)

    if (compResult.warnings.length > 0) {
      const warnLines = compResult.warnings.map(w => `  ⚠ L${w.line}: [${w.type}] ${w.message}`)
      console.warn(`代码检查发现 ${compResult.warnings.length} 个警告:\n${warnLines.join('\n')}`)
    }

    if (!compResult.success) {
      const firstErr = compResult.errors[0]
      const allErrors = compResult.errors.map(e =>
        `[${e.type}] L${e.line}: ${e.message}${e.context ? '\n  → ' + e.context : ''}`
      ).join('\n\n')
      const warnNote = compResult.warnings.length > 0
        ? `\n\n(${compResult.warnings.length} 个警告)` : ''
      setAIStatus('error', `发现 ${compResult.errors.length} 个编译错误:\n\n${allErrors}${warnNote}`)
      setAiErrorReport({
        stage: 'compilation',
        title: `代码编译错误 (${compResult.errors.length} 个) / Compilation Errors`,
        message: firstErr.message,
        issues: compResult.errors.map(e => ({
          code: 'COMP_ERR',
          path: `line ${e.line}`,
          message: `[${e.type}] ${e.message}${e.context ? '\n上下文: ' + e.context : ''}`,
          suggestion: '请修正以上语法错误后再试。',
          severity: 'error' as const,
          recoverable: false
        })),
        suggestions: compResult.errors.map(e => `修正第 ${e.line} 行: ${e.message}`),
        canRetry: false
      })
      setAnimationScript(null)
      return
    }

    if (!hasApiConfig) { navigate('/settings'); return }

    // Cancel any previous in-flight request
    playgroundAnalysisController?.abort()
    const controller = new AbortController()
    playgroundAnalysisController = controller

    // Re-analyzing a restored or identical entry should update that history item,
    // not create an indistinguishable duplicate each time the button is clicked.
    const activeEntry = activeHistoryId ? aiHistory.find(entry => entry.id === activeHistoryId) : null
    const reusableEntry = activeEntry && activeEntry.code === code && activeEntry.language === codeLanguage
      ? activeEntry
      : aiHistory.find(entry =>
        entry.code === code &&
        entry.language === codeLanguage &&
        entry.inputData === inputData
      )
    const previousEntry = reusableEntry ? { ...reusableEntry } : null
    const historyId = reusableEntry?.id ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const analyzingPatch = {
      timestamp: Date.now(),
      algorithmId: 'playground',
      algorithmName: '自定义代码',
      code,
      language: codeLanguage,
      inputData,
      status: 'analyzing' as const,
      error: undefined,
    }
    if (reusableEntry) {
      updateAIHistory(historyId, analyzingPatch)
    } else {
      addAIHistory({
        id: historyId,
        ...analyzingPatch,
      })
    }
    setActiveHistoryId(historyId)

    setAIStatus('analyzing')
    setAiErrorReport(null)
    setAiRepairHistory(null)
    setShowRawResponse(false)
    // Clear any previous animation so a stale result (e.g. from another page
    // sharing the store) doesn't linger if this analysis fails.
    setAnimationScript(null)

    const currentValid = inputData.trim() !== '' && parseInputData(inputData).valid

    try {
      const result = await analyzeGenerator(
        { code, language: codeLanguage, inputData, algorithmName: '用户自定义代码', signal: controller.signal },
        currentValid,
        setInputData,
      )

      if (controller.signal.aborted) return
      playgroundAnalysisController = null

      if (!result.ok) {
        setAiErrorReport(result.errorReport ?? null)
        updateAIHistory(historyId, {
          status: 'error',
          error: result.error || '分析失败',
          ...(result.generatorBody ? { generatorBody: result.generatorBody, generatorType: result.generatorType } : {}),
        })
        return
      }

      updateAIHistory(historyId, {
        status: 'success',
        script: result.script,
        // Persist the input the animation was actually generated from so a later
        // restore shows matching box + animation (not the pre-analysis stale input).
        ...(result.usedInput !== undefined ? { inputData: result.usedInput } : {}),
        ...(result.generatorBody ? { generatorBody: result.generatorBody, generatorType: result.generatorType } : {}),
      })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        if (previousEntry) {
          updateAIHistory(historyId, previousEntry)
        } else {
          removeAIHistory(historyId)
        }
        return
      }
      const msg = e instanceof Error ? e.message : '未知错误'
      setAIStatus('error', msg)
      updateAIHistory(historyId, { status: 'error', error: msg })
    }
  }, [
    activeHistoryId,
    addAIHistory,
    aiHistory,
    analyzeGenerator,
    code,
    codeLanguage,
    hasApiConfig,
    inputData,
    navigate,
    removeAIHistory,
    setAIStatus,
    setAnimationScript,
    setInputData,
    updateAIHistory,
  ])

  useEffect(() => {
    const handleRepairRequest = () => {
      void handleAnalyze()
    }
    window.addEventListener(REQUEST_AI_REPAIR_EVENT, handleRepairRequest)
    return () => window.removeEventListener(REQUEST_AI_REPAIR_EVENT, handleRepairRequest)
  }, [handleAnalyze])

  const handleRestore = (entry: AIHistoryEntry) => {
    setCode(entry.code)
    setInputData(entry.inputData)
    setActiveHistoryId(entry.id)
    if (entry.status === 'success' && entry.script) {
      const recognized = recognizeAlgorithm(entry.script.algorithm)
      if (recognized) {
        setLiveGenerator({ algoId: recognized })
      } else if (entry.generatorBody && entry.generatorType) {
        setLiveGenerator({ generator: { body: entry.generatorBody, type: entry.generatorType } })
      } else {
        setLiveGenerator(null)
      }
      setAnimationScript(entry.script)
      setAIStatus('success')
    } else {
      // Non-success entries: surface the error (don't silently blank the page).
      setLiveGenerator(
        entry.generatorBody && entry.generatorType
          ? { generator: { body: entry.generatorBody, type: entry.generatorType } }
          : null,
      )
      setAnimationScript(null)
      if (entry.status === 'error') setAIStatus('error', entry.error)
      else if (entry.status === 'analyzing') {
        if (hasTrackedAnalysis) {
          setAIStatus('analyzing')
        } else {
          updateAIHistory(entry.id, { status: 'error', error: INTERRUPTED_MSG })
          setAIStatus('error', INTERRUPTED_MSG)
        }
      } else setAIStatus('idle')
    }
    setAiErrorReport(null)
    setAiRepairHistory(null)
  }

  // 进入页面时不要清空:恢复最近一次会话(结果/错误/进行中)。
  // 分析后切到别的页面再回来,因为本页是独立路由会被卸载重挂,旧逻辑会把共享的
  // animationScript/aiStatus 清空导致空白;这里改为恢复最近历史项。
  // 同时把因离开页面而残留在"分析中"的历史项标记为已中断(其请求已不再被跟踪)。
  const didRestoreOnMountRef = useRef(false)
  useLayoutEffect(() => {
    if (didRestoreOnMountRef.current) return
    didRestoreOnMountRef.current = true
    // 挂载时一次性恢复会话,须在绘制前同步落状态以避免空白闪烁(故用 useLayoutEffect)。
    // mount-once + React18 对 effect 内 setState 自动批处理,不会触发级联渲染,
    // 因此豁免 set-state-in-effect 性能启发式规则。
    /* eslint-disable react-hooks/set-state-in-effect */
    const plan = planRestoreOnMount(aiHistory, !!playgroundAnalysisController)
    for (const id of plan.reconcileIds) {
      updateAIHistory(id, { status: 'error', error: INTERRUPTED_MSG })
    }
    if (plan.mode === 'clean') {
      // 无历史:清成干净状态(覆盖可能来自其它页面的共享脚本)。
      setAnimationScript(null)
      setAIStatus('idle')
      setActiveHistoryId(null)
    } else if (plan.mode === 'analyzing' && plan.effective) {
      // 仍在后台分析:保留进行中状态,完成后会通过 store 自动反映结果。
      setCode(plan.effective.code)
      setInputData(plan.effective.inputData)
      setActiveHistoryId(plan.effective.id)
      setAIStatus('analyzing')
    } else if (plan.effective) {
      handleRestore(plan.effective)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // 仅在挂载时执行一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = (id: string) => {
    setConfirmState({ type: 'delete', id })
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const copyErrorDetails = () => {
    // Works for both schema/compile errors (aiErrorReport) and sandbox/timeout
    // failures (just an error message + generator source in aiRawResponse).
    const parts: string[] = ['## AI 错误详情', `- 错误: ${aiError || aiErrorReport?.message || '未知'}`]
    if (aiErrorReport) {
      parts.push(`- Stage: ${aiErrorReport.stage}`, `- Title: ${aiErrorReport.title}`, '', '### Issues',
        ...aiErrorReport.issues.map(i => `- \`${i.path}\` [${i.code}] ${i.message}${i.suggestion ? ` (建议: ${i.suggestion})` : ''}`))
    }
    if (aiRawResponse) {
      parts.push('', '### 原始响应 / 生成器源码', '```', aiRawResponse.slice(0, 6000) + (aiRawResponse.length > 6000 ? '\n...(已截断)' : ''), '```')
    }
    const md = parts.join('\n')
    navigator.clipboard.writeText(md).then(
      () => { /* copied */ },
      () => {
        // Clipboard API can fail (insecure context / permissions): fall back to showing it.
        setShowRawResponse(true)
      },
    )
  }

  useEffect(() => { document.title = 'AI Playground — AlgoViz' }, [])

  return (
    <div className="h-full flex flex-col bg-white">
      <style>{`
        .active-line { background: rgba(245, 158, 11, 0.12) !important; border-left: 3px solid #F59E0B; }
        .visited-line { background: rgba(37, 99, 235, 0.04) !important; border-left: 3px solid #93C5FD; }
        .active-glyph { background: transparent !important; width: 18px !important; margin-left: 2px; }
        .active-glyph::after { content: '▶'; position: absolute; left: 1px; top: 50%; transform: translateY(-50%); color: #F59E0B; font-size: 10px; }
        .visited-glyph { background: #93C5FD; width: 3px !important; margin-left: 4px; border-radius: 2px; }
      `}</style>
      <Header />
      {/* Sub-header bar */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 shrink-0 bg-surface">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer border-none bg-transparent px-1">
            <Icon name={showHistory ? 'chevron-left' : 'chevron-right'} size={12} />
            <Icon name="brain" size={14} className="text-primary" />
            AI 代码实验室
          </button>
          <span className="text-[10px] text-muted hidden sm:inline">粘贴或编写代码，AI 分析并生成可视化动画</span>
          {(liveAlgoId || generator) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium flex items-center gap-1 shrink-0">
              <Icon name="zap" size={10} />
              {liveAlgoId ? '实时算法 · 改输入即时更新' : 'AI 逻辑生成器 · 改输入即时更新'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-white text-[11px] font-medium text-slate-600"
            title="根据当前代码自动识别语言，用于编辑器高亮、代码检查和 AI 分析"
          >
            <Icon name="brain" size={11} className="text-primary" />
            <span>自动识别: {getCodeLanguageLabel(codeLanguage)}</span>
          </div>
          <button onClick={handleAnalyze} disabled={isAnalyzing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border-none cursor-pointer transition-all ${
              !hasApiConfig ? 'bg-slate-100 text-slate-400' :
              isAnalyzing ? 'bg-violet-100 text-violet-600' :
              'bg-violet-500 text-white hover:bg-violet-600 shadow-sm'}`}>
            {isAnalyzing ? <><Icon name="loader2" size={12} className="animate-spin" /> 分析中...</>
            : !hasApiConfig ? '⚙ 先配置 API Key'
            : <><Icon name="zap" size={12} /> AI 分析代码</>}
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* History panel */}
        {showHistory && (
          <div className="w-full lg:w-52 h-40 lg:h-auto border-b lg:border-b-0 lg:border-r border-border bg-surface flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">历史记录</span>
                <button onClick={handleNew}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-white text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Icon name="code2" size={10} />
                  新建
                </button>
              </div>
              <span className="text-[10px] text-muted">{aiHistory.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {aiHistory.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-8 px-3">
                  暂无记录<br/>AI 分析后自动保存
                </p>
              ) : (
                <div className="p-1.5 space-y-0.5">
                  {aiHistory.map(entry => {
                    const algoName = (entry.status === 'success' && entry.script?.algorithm) ? entry.script.algorithm : (entry.algorithmName || '自定义代码')
                    const codePreview = entry.code.split('\n').slice(0, 2).join(' ').slice(0, 40)
                    return (
                      <button key={entry.id} onClick={() => handleRestore(entry)}
                        className="w-full text-left p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent group">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {entry.status === 'analyzing' && <Icon name="loader2" size={10} className="text-violet-400 animate-spin shrink-0" />}
                            {entry.status === 'error' && <Icon name="alert-circle" size={10} className="text-red-400 shrink-0" />}
                            <span className="text-[10px] font-semibold text-primary truncate">{algoName}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                            className="shrink-0 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-muted hover:text-red-500 cursor-pointer border-none bg-transparent" title="删除">
                            <Icon name="x" size={10} />
                          </button>
                        </div>
                        <p className="text-[9px] text-muted mt-0.5 truncate">{codePreview}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-slate-300 font-code">{entry.language}</span>
                          <span className="text-[9px] text-slate-300">{formatTime(entry.timestamp)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {aiHistory.length > 0 && (
              <div className="p-2 border-t border-border">
                <button onClick={() => setConfirmState({ type: 'clearAll' })}
                  className="w-full text-[10px] text-slate-400 hover:text-red-500 cursor-pointer border-none bg-transparent text-center">
                  清空全部历史
                </button>
              </div>
            )}
          </div>
        )}

        {/* Code editor */}
        <div className="flex-1 lg:border-r border-border flex flex-col min-w-0 min-h-0">
          <CodeEditorPanel
            value={code}
            language={codeLanguage}
            onChange={setCode}
            onMount={handleEditorMount}
            diagnostics={codeDiagnostics}
            disabled={isAnalyzing}
            className="flex-1"
          />
          <InputDataPanel
            value={inputData}
            onChange={setInputData}
            title={(
              <div className="flex items-center justify-between w-full">
                <span>输入数据{inputInfo.valid ? ` · ${inputInfo.summary}` : ''}</span>
                <span className="text-[10px] text-muted">支持 JSON / LeetCode：root = [1,2,null]</span>
              </div>
            )}
            helperText={inputInfo.valid ? `类型: ${inputInfo.kind} · 改输入动画即时更新` : inputInfo.message ?? '输入格式错误'}
            placeholder={'root = [1,2,2,3,4,4,3]\n或 {"nums":[2,7,11,15],"target":9}'}
            error={!inputInfo.valid ? inputInfo.message ?? '输入格式错误，修正后会自动同步动画' : null}
            disabled={isAnalyzing}
            className="h-28"
          />
          <RunDataPanel
            script={activeAnimationScript}
            visualState={visualState}
            currentStep={currentStep}
            totalSteps={totalSteps}
            lang={lang}
            className="h-24"
          />
        </div>

        {/* Visualization */}
        <div className="flex-[1.5] flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0">
            <VisualizationCanvas script={activeAnimationScript} visualState={visualState} currentStepData={currentStepData} speed={speed} />
          </div>
          <PlaybackControls
            compact
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
          />
        </div>
      </div>

      {/* Enhanced Error overlay */}
      {aiStatus === 'error' && (
        <div className="absolute bottom-4 right-4 max-w-md p-4 rounded-xl border border-red-200 bg-red-50 shadow-xl z-50 text-xs space-y-2 max-h-[60%] overflow-y-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon name="alert-circle" size={14} className="text-red-500" />
              <span className="font-bold text-red-700">
                {aiErrorReport?.title || 'AI 分析失败'}
              </span>
            </div>
            <button onClick={() => { setAIStatus('idle'); setAiErrorReport(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent">
              <Icon name="x" size={12} />
            </button>
          </div>

          <p className="text-[11px] text-red-600">{aiErrorReport?.message || aiError}</p>

          {/* Repair history */}
          {aiRepairHistory && aiRepairHistory.length > 0 && (
            <div className="p-2 rounded bg-white border border-red-100 text-[10px]">
              <span className="font-semibold text-slate-500">修复记录: </span>
              {aiRepairHistory.map((h, i) => (
                <span key={i} className={h.success ? 'text-green-600' : 'text-red-500'}>
                  {h.type === 'local' ? '本地修复' : 'AI修复'}
                  {h.success ? ' ✓' : ' ✗'}
                  {i < aiRepairHistory.length - 1 ? ' → ' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Issues list */}
          {aiErrorReport?.issues && aiErrorReport.issues.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-slate-600">问题详情 ({aiErrorReport.issues.length}):</div>
              {aiErrorReport.issues.slice(0, 8).map((issue, i) => (
                <div key={i} className={`p-1.5 rounded ${issue.severity === 'error' ? 'bg-red-100' : 'bg-yellow-50'} text-[10px]`}>
                  <span className="font-mono text-slate-500">{issue.path}</span>
                  <span className={`ml-1 font-semibold ${issue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                    [{issue.severity === 'error' ? '错误' : '警告'}]
                  </span>
                  <div className="text-slate-600 mt-0.5">{issue.message}</div>
                  {issue.suggestion && <div className="text-slate-400 mt-0.5">💡 {issue.suggestion}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {aiErrorReport?.suggestions && aiErrorReport.suggestions.length > 0 && (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-600">可尝试:</div>
              {aiErrorReport.suggestions.map((s, i) => (
                <div key={i} className="text-[10px] text-slate-500">• {s}</div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1 flex-wrap">
            <button onClick={handleAnalyze} className="px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500 text-white hover:bg-violet-600 cursor-pointer border-none">重新分析</button>
            {aiRawResponse && (
              <button onClick={() => setShowRawResponse(!showRawResponse)}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer">
                {showRawResponse ? '隐藏原始响应' : '查看原始响应'}
              </button>
            )}
            <button onClick={copyErrorDetails}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer">
              复制错误详情
            </button>
          </div>

          {/* Raw response */}
          {showRawResponse && aiRawResponse && (
            <div className="p-2 rounded bg-white border border-slate-200 max-h-32 overflow-y-auto">
              <pre className="text-[10px] text-slate-500 whitespace-pre-wrap font-mono break-all">{aiRawResponse}</pre>
            </div>
          )}
        </div>
      )}

      {/* Repair success toast */}
      {aiRepairHistory && aiStatus === 'success' && (
        <div className="absolute bottom-4 left-4 max-w-xs p-2 rounded-lg border border-green-200 bg-green-50 shadow z-50 text-xs text-green-700">
          <div className="flex items-center gap-1.5">
            <Icon name="check" size={12} className="text-green-500" />
            <span>已自动修复格式并生成动画</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.type === 'delete' ? t('playground.deleteConfirmTitle') : t('playground.clearAllConfirmTitle')}
        message={confirmState?.type === 'delete' ? t('playground.deleteConfirmMessage') : t('playground.clearAllConfirmMessage')}
        confirmLabel={confirmState?.type === 'delete' ? t('playground.deleteConfirmTitle') : t('playground.clearAllConfirmTitle')}
        variant="danger"
        onConfirm={() => {
          if (!confirmState) return
          if (confirmState.type === 'delete') {
            removeAIHistory(confirmState.id)
            if (activeHistoryId === confirmState.id) setActiveHistoryId(null)
          } else {
            // Clearing all history → also reset the current view for a clean slate
            // (the animation lives in the shared store and would otherwise linger).
            clearAIHistory()
            setAnimationScript(null)
            setAIStatus('idle')
            resetGenerator()
            setActiveHistoryId(null)
          }
          setConfirmState(null)
        }}
        onCancel={() => setConfirmState(null)}
      />

    </div>
  )
}
