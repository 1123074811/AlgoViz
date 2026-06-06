import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { analyzeCodeGenerator, getApiConfig, parseInputData, type AIErrorReport, type AIRepairAttempt } from '@/ai'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'
import type { AnimationScript } from '@/types/animation'
import { compileAndValidateCode } from '@/utils/codeCompiler'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'
import Header from '@/components/Layout/Header'
import PlaybackControls from '@/components/Controls/PlaybackControls'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import InputDataPanel from '@/components/Editor/InputDataPanel'
import { useAlgorithmStore, type AIHistoryEntry } from '@/store/algorithmStore'
import { generatePreset } from '@/presets'
import { recognizeAlgorithm } from '@/presets/recognize'

let playgroundAnalysisController: AbortController | null = null

const DEFAULT_CODE = ''

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
]

export default function Playground() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [code, setCode] = useState(DEFAULT_CODE)
  const [codeLanguage, setCodeLanguage] = useState(() => {
    return localStorage.getItem('algoviz-editor-code-lang') || 'python'
  })
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
  // Live mode: when the AI recognizes a built-in algorithm, the animation is
  // generated locally from the current input — changing input re-runs the
  // generator without another AI call. Null for unrecognized custom algorithms.
  const [liveAlgoId, setLiveAlgoId] = useState<string | null>(null)
  // Phase 2: AI-generated generator for custom (unrecognized) algorithms.
  const [generator, setGenerator] = useState<{ body: string; type: 'array' | 'graph' | 'tree' | 'linked_list' } | null>(null)
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)

  const hasApiConfig = getApiConfig() !== null

  const inputInfo = useMemo(() => parseInputData(inputData), [inputData])

  const {
    visualState, currentStepData,
    isPlaying, speed, currentStep, totalSteps,
    setSpeed, stepForward, stepBackward, reset, goToEnd, togglePlay,
  } = useAnimationEngine(animationScript)

  const handleNew = useCallback(() => {
    playgroundAnalysisController?.abort()
    playgroundAnalysisController = null
    setCode(DEFAULT_CODE)
    setInputData('')
    setLiveAlgoId(null)
    setGenerator(null)
    setAnimationScript(null)
    setAIStatus('idle')
    setAiErrorReport(null)
    setAiRepairHistory(null)
  }, [setAnimationScript, setAIStatus])

  const handleEditorMount: OnMount = useCallback((editor) => { editorRef.current = editor }, [])

  // Build an animation locally from a recognized built-in generator + current input.
  // Returns null when input is invalid or generation fails (keeps last animation).
  const buildLiveScript = useCallback((algoId: string, rawInput: string): AnimationScript | null => {
    const parsed = parseInputData(rawInput)
    if (!parsed.valid) return null
    try {
      return generatePreset(algoId, parsed.value) ?? null
    } catch {
      return null
    }
  }, [])

  // 输入变化 → 本地重生成（Phase 1 内置生成器 或 Phase 2 AI 生成器），不调 AI
  useEffect(() => {
    if (liveAlgoId) {
      const handle = setTimeout(() => {
        const script = buildLiveScript(liveAlgoId, inputData)
        if (script) { setAnimationScript(script); setAIStatus('success') }
      }, 400)
      return () => clearTimeout(handle)
    }
    if (generator) {
      let cancelled = false
      const handle = setTimeout(async () => {
        const parsed = parseInputData(inputData)
        if (!parsed.valid) return
        const result = await runGeneratorSandboxed(generator.body, parsed.value, { algorithm: 'custom', type: generator.type })
        if (cancelled) return
        if (result.ok && result.script) { setAnimationScript(result.script); setAIStatus('success') }
      }, 400)
      return () => { cancelled = true; clearTimeout(handle) }
    }
  }, [inputData, liveAlgoId, generator, buildLiveScript, setAnimationScript, setAIStatus])

  const handleAnalyze = async () => {
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

    // Create history entry immediately with status 'analyzing'
    const historyId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    addAIHistory({
      id: historyId,
      timestamp: Date.now(),
      algorithmId: 'playground',
      algorithmName: '自定义代码',
      code,
      language: codeLanguage,
      inputData,
      status: 'analyzing',
    })

    setAIStatus('analyzing')
    setAiErrorReport(null)
    setAiRepairHistory(null)
    setShowRawResponse(false)
    // Clear any previous animation/live-mode so a stale result (e.g. from another
    // page sharing the store) doesn't linger if this analysis fails.
    setAnimationScript(null)
    setLiveAlgoId(null)
    setGenerator(null)

    try {
      const result = await analyzeCodeGenerator({
        code, language: codeLanguage, inputData,
        algorithmName: '用户自定义代码',
      }, { signal: controller.signal })

      if (controller.signal.aborted) return
      playgroundAnalysisController = null

      if (!result.success || !result.generator) {
        setAIStatus('error', result.error || '分析失败', result.rawResponse)
        setAiErrorReport(result.errorReport ?? null)
        updateAIHistory(historyId, { status: 'error', error: result.error || '分析失败' })
        return
      }

      const gen = result.generator
      const recognized = recognizeAlgorithm(gen.algorithm)

      // The AI infers the expected input format and supplies a sample. Auto-fill
      // it only when the current input box is empty/invalid (respect user input).
      const currentValid = inputData.trim() !== '' && parseInputData(inputData).valid
      const effectiveInput = currentValid ? inputData : (gen.sampleInput ?? inputData)
      if (!currentValid && gen.sampleInput) {
        setInputData(gen.sampleInput)
      }

      if (recognized) {
        // Phase 1: 内置生成器
        setLiveAlgoId(recognized)
        setGenerator(null)
        const liveScript = buildLiveScript(recognized, effectiveInput)
        if (liveScript) setAnimationScript(liveScript)
        setAIStatus('success')
        updateAIHistory(historyId, { status: 'success', script: liveScript ?? undefined })
      } else {
        // Phase 2: AI 生成器
        const genType = gen.type === 'matrix' ? 'array' : gen.type
        setLiveAlgoId(null)
        setGenerator({ body: gen.body, type: genType })
        const parsed = parseInputData(effectiveInput)
        let sandboxResult = parsed.valid
          ? await runGeneratorSandboxed(gen.body, parsed.value, { algorithm: gen.algorithm, type: genType })
          : { ok: false, error: '输入数据无效' }
        // If the generator crashed (often a stale/wrong-shaped leftover input),
        // retry with the AI's own sample input, which matches the expected format.
        if (!sandboxResult.ok && gen.sampleInput && gen.sampleInput !== effectiveInput) {
          const sp = parseInputData(gen.sampleInput)
          if (sp.valid) {
            const retry = await runGeneratorSandboxed(gen.body, sp.value, { algorithm: gen.algorithm, type: genType })
            if (retry.ok) { sandboxResult = retry; setInputData(gen.sampleInput) }
          }
        }
        if (sandboxResult.ok && sandboxResult.script) {
          setAnimationScript(sandboxResult.script)
          setAIStatus('success')
          updateAIHistory(historyId, { status: 'success', script: sandboxResult.script, generatorBody: gen.body, generatorType: genType })
        } else {
          // Surface the generator source so "查看原始响应 / 复制错误详情" can show
          // the actual AI-written code for diagnosis (e.g. an infinite loop).
          setAIStatus('error', sandboxResult.error || '生成器执行失败', gen.body)
          updateAIHistory(historyId, { status: 'error', error: sandboxResult.error || '生成器执行失败', generatorBody: gen.body, generatorType: genType })
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        removeAIHistory(historyId)
        return
      }
      const msg = e instanceof Error ? e.message : '未知错误'
      setAIStatus('error', msg)
      updateAIHistory(historyId, { status: 'error', error: msg })
    }
  }

  const handleRestore = (entry: AIHistoryEntry) => {
    setCode(entry.code)
    setCodeLanguage(entry.language)
    setInputData(entry.inputData)
    if (entry.status === 'success' && entry.script) {
      const recognized = recognizeAlgorithm(entry.script.algorithm)
      if (recognized) {
        setLiveAlgoId(recognized)
        setGenerator(null)
      } else if (entry.generatorBody && entry.generatorType) {
        setLiveAlgoId(null)
        setGenerator({ body: entry.generatorBody, type: entry.generatorType })
      } else {
        setLiveAlgoId(null)
        setGenerator(null)
      }
      setAnimationScript(entry.script)
      setAIStatus('success')
    } else {
      setLiveAlgoId(null)
      setGenerator(null)
      setAnimationScript(null)
      setAIStatus('idle')
    }
    setAiErrorReport(null)
    setAiRepairHistory(null)
  }

  const handleDelete = (id: string) => {
    removeAIHistory(id)
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const copyErrorDetails = () => {
    if (!aiErrorReport) return
    const md = [
      '## AI Error Report',
      `- Stage: ${aiErrorReport.stage}`,
      `- Title: ${aiErrorReport.title}`,
      '',
      '### Issues',
      ...aiErrorReport.issues.map(i => `1. \`${i.path}\`\n   - Code: ${i.code}\n   - Message: ${i.message}${i.suggestion ? `\n   - Suggestion: ${i.suggestion}` : ''}`),
      aiRawResponse ? `\n\n### Raw Response\n\`\`\`json\n${aiRawResponse.slice(0, 2000)}${aiRawResponse.length > 2000 ? '\n...(truncated)' : ''}\n\`\`\`` : '',
    ].join('\n')
    navigator.clipboard.writeText(md).catch(() => {})
  }

  const complexity = animationScript?.complexity

  useEffect(() => { document.title = 'AI Playground — AlgoViz' }, [])

  return (
    <div className="h-full flex flex-col bg-white">
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
          <button onClick={handleNew}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-white text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
            <Icon name="code2" size={12} />
            新建
          </button>
          <select value={codeLanguage} onChange={(e) => {
            const lang = e.target.value
            setCodeLanguage(lang)
            localStorage.setItem('algoviz-editor-code-lang', lang)
          }} className="text-[11px] font-medium px-2 py-1 rounded border border-border bg-white text-slate-600 outline-none cursor-pointer">
            {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button onClick={handleAnalyze} disabled={aiStatus === 'analyzing'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border-none cursor-pointer transition-all ${
              !hasApiConfig ? 'bg-slate-100 text-slate-400' :
              aiStatus === 'analyzing' ? 'bg-violet-100 text-violet-600' :
              'bg-violet-500 text-white hover:bg-violet-600 shadow-sm'}`}>
            {aiStatus === 'analyzing' ? <><Icon name="loader2" size={12} className="animate-spin" /> 分析中...</>
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
              <span className="text-xs font-semibold text-slate-600">历史记录</span>
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
                <button onClick={() => clearAIHistory()}
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
            disabled={aiStatus === 'analyzing'}
            className="flex-1"
          />
          <InputDataPanel
            value={inputData}
            onChange={setInputData}
            title={(
              <div className="flex items-center justify-between w-full">
                <span>输入数据{inputInfo.valid ? ` · ${inputInfo.summary}` : ''}</span>
                <span className="text-[10px] text-muted">格式由 AI 分析后自动给出</span>
              </div>
            )}
            helperText={inputInfo.valid ? `类型: ${inputInfo.kind} · 改输入动画即时更新` : inputInfo.message ?? 'JSON 解析错误'}
            placeholder="[5, 3, 8, 1, 9, 2]"
            disabled={aiStatus === 'analyzing'}
            className="h-28"
          />
        </div>

        {/* Visualization */}
        <div className="flex-[1.5] flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0">
            <VisualizationCanvas script={animationScript} visualState={visualState} currentStepData={currentStepData} />
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

      {/* Info overlay */}
      {animationScript && currentStepData && (
        <div className="absolute top-[7.5rem] right-4 w-56 max-h-[calc(100%-10rem)] overflow-y-auto p-3 rounded-lg border border-border bg-white/95 shadow-lg backdrop-blur z-50 space-y-2 text-xs">
          <div className="p-2 rounded bg-warning-50">
            <div className="text-[10px] text-warning font-semibold mb-0.5">步骤 {currentStepData.stepId}</div>
            <p className="text-[11px] text-slate-700">{currentStepData.description.zh}</p>
          </div>
          <div className="p-2 rounded bg-surface">
            <div className="text-[10px] font-semibold text-slate-600 mb-1">统计</div>
            <div className="flex gap-3 text-[10px] text-slate-500">
              <span>比较:{currentStepData.stats.comparisons}</span>
              <span>交换:{currentStepData.stats.swaps}</span>
              <span>访问:{currentStepData.stats.accesses}</span>
            </div>
          </div>
          {complexity && (
            <div className="p-2 rounded bg-surface">
              <div className="text-[10px] font-semibold text-slate-600 mb-1">复杂度</div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>时间: {complexity.time.best}/{complexity.time.average}/{complexity.time.worst}</div>
                <div>空间: {complexity.space}</div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
