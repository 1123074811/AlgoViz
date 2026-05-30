import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { analyzeCode, getApiConfig, parseInputData, type AIResult, type AIErrorReport, type AIRepairAttempt } from '@/ai'
import type { AnimationScript } from '@/types/animation'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'
import Header from '@/components/Layout/Header'
import PlaybackControls from '@/components/Controls/PlaybackControls'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import InputDataPanel from '@/components/Editor/InputDataPanel'

interface HistoryEntry {
  id: string
  code: string
  language: string
  inputData: string
  script: AnimationScript
  timestamp: number
}

const DEFAULT_CODE = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
]

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem('algoviz-playground-history') || '[]') }
  catch { return [] }
}
function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem('algoviz-playground-history', JSON.stringify(entries.slice(0, 50)))
}

export default function Playground() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [code, setCode] = useState(DEFAULT_CODE)
  const [codeLanguage, setCodeLanguage] = useState(() => {
    return localStorage.getItem('algoviz-editor-code-lang') || 'python'
  })
  const [inputData, setInputData] = useState('[5, 3, 8, 1, 9, 2]')
  const [animationScript, setAnimationScript] = useState<AnimationScript | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [aiError, setAiError] = useState('')
  const [aiErrorReport, setAiErrorReport] = useState<AIErrorReport | null>(null)
  const [aiRawResponse, setAiRawResponse] = useState('')
  const [aiRepairHistory, setAiRepairHistory] = useState<AIRepairAttempt[] | null>(null)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [showHistory, setShowHistory] = useState(true)
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)

  const hasApiConfig = getApiConfig() !== null

  const inputInfo = useMemo(() => parseInputData(inputData), [inputData])

  const {
    visualState, currentStepData,
    isPlaying, speed, currentStep, totalSteps,
    setSpeed, stepForward, stepBackward, reset, goToEnd, togglePlay,
  } = useAnimationEngine(animationScript)

  const handleEditorMount: OnMount = useCallback((editor) => { editorRef.current = editor }, [])

  const handleAnalyze = async () => {
    if (!hasApiConfig) { navigate('/settings'); return }
    setAiStatus('analyzing'); setAiError(''); setAiErrorReport(null)
    setAiRawResponse(''); setAiRepairHistory(null); setShowRawResponse(false)
    const result: AIResult = await analyzeCode({
      code, language: codeLanguage, inputData,
      algorithmName: '用户自定义代码',
    })
    if (result.success && result.script) {
      setAnimationScript(result.script); setAiStatus('success')
      if (result.repaired) setAiRepairHistory(result.repairHistory ?? null)
      const entry: HistoryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        code, language: codeLanguage, inputData,
        script: result.script,
        timestamp: Date.now(),
      }
      const updated = [entry, ...history].slice(0, 50)
      setHistory(updated)
      saveHistory(updated)
    } else {
      setAiError(result.error || '分析失败')
      setAiErrorReport(result.errorReport ?? null)
      setAiRawResponse(result.rawResponse ?? '')
      setAiRepairHistory(result.repairHistory ?? null)
      setAiStatus('error')
    }
  }

  const handleRestore = (entry: HistoryEntry) => {
    setCode(entry.code)
    setCodeLanguage(entry.language)
    setInputData(entry.inputData)
    setAnimationScript(entry.script)
    setAiStatus('success')
  }

  const handleDelete = (id: string) => {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    saveHistory(updated)
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

  const insertExample = (kind: string) => {
    const examples: Record<string, string> = {
      array: '[5, 3, 8, 1, 9, 2]',
      graph: '{"nodes":[{"id":"A"},{"id":"B"},{"id":"C"}],"edges":[{"source":"A","target":"B","weight":1},{"source":"B","target":"C","weight":2}],"start":"A"}',
      tree: '{"root":"8","children":{"8":["3","10"],"3":["1","6"],"10":[],"1":[],"6":[]}}',
      matrix: '[[1, 2, 3], [4, 5, 6], [7, 8, 9]]',
      linked_list: '{"values":[1,2,3,4],"head":0}',
    }
    if (examples[kind]) {
      setInputData(examples[kind])
    }
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
        </div>
        <div className="flex items-center gap-2">
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
              <span className="text-[10px] text-muted">{history.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-8 px-3">
                  暂无记录<br/>AI 分析后自动保存
                </p>
              ) : (
                <div className="p-1.5 space-y-0.5">
                  {history.map(entry => {
                    const algoName = entry.script.algorithm || '自定义代码'
                    const codePreview = entry.code.split('\n').slice(0, 2).join(' ').slice(0, 40)
                    return (
                      <button key={entry.id} onClick={() => handleRestore(entry)}
                        className="w-full text-left p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent group">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] font-semibold text-primary truncate">{algoName}</span>
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
            {history.length > 0 && (
              <div className="p-2 border-t border-border">
                <button onClick={() => { setHistory([]); saveHistory([]) }}
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
                <select
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-white text-slate-500 outline-none cursor-pointer"
                  value=""
                  onChange={(e) => { if (e.target.value) insertExample(e.target.value) }}
                  disabled={aiStatus === 'analyzing'}
                  title="加载示例数据"
                >
                  <option value="" disabled>▼ 示例数据</option>
                  <option value="array">数组: [5,3,8,1]</option>
                  <option value="graph">图: nodes + edges</option>
                  <option value="tree">树: root + children</option>
                  <option value="matrix">矩阵: 二维数组</option>
                  <option value="linked_list">链表: values + head</option>
                </select>
              </div>
            )}
            helperText={inputInfo.valid ? `类型: ${inputInfo.kind} · 支持数组、图(nodes+edges)、树(root+children)、矩阵` : inputInfo.message ?? 'JSON 解析错误'}
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
            <button onClick={() => { setAiStatus('idle'); setAiErrorReport(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent">
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
            <div className="text-[10px] text-warning font-semibold mb-0.5">Step {currentStepData.stepId}</div>
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
