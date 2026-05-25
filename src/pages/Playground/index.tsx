import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { analyzeCode, getApiConfig, type AIResult } from '@/ai'
import type { AnimationScript } from '@/types/animation'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'

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

export default function Playground() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [code, setCode] = useState(DEFAULT_CODE)
  const [codeLanguage, setCodeLanguage] = useState('python')
  const [inputData, setInputData] = useState('[5, 3, 8, 1, 9, 2]')
  const [animationScript, setAnimationScript] = useState<AnimationScript | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [aiError, setAiError] = useState('')
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)

  const hasApiConfig = getApiConfig() !== null

  const {
    visualState, currentStepData,
    isPlaying, speed, currentStep, totalSteps,
    setSpeed, stepForward, stepBackward, reset, goToEnd, togglePlay,
  } = useAnimationEngine(animationScript)

  const handleEditorMount: OnMount = useCallback((editor) => { editorRef.current = editor }, [])

  const handleAnalyze = async () => {
    if (!hasApiConfig) { navigate('/settings'); return }
    setAiStatus('analyzing'); setAiError('')
    const result: AIResult = await analyzeCode({
      code, language: codeLanguage, inputData,
      algorithmName: '用户自定义代码',
    })
    if (result.success && result.script) {
      setAnimationScript(result.script); setAiStatus('success')
    } else {
      setAiError(result.error || '分析失败'); setAiStatus('error')
    }
  }

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const steps = animationScript?.steps ?? []
  const complexity = animationScript?.complexity

  useEffect(() => { document.title = 'AI Playground — AlgoViz' }, [])

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header bar */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 shrink-0 bg-surface">
        <div className="flex items-center gap-3">
          <Icon name="brain" size={16} className="text-primary" />
          <span className="font-semibold text-sm text-slate-700">AI 代码实验室</span>
          <span className="text-[10px] text-muted">粘贴或编写代码，AI 分析并生成可视化动画</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={codeLanguage}
            onChange={(e) => setCodeLanguage(e.target.value)}
            className="text-[11px] font-medium px-2 py-1 rounded border border-border bg-white text-slate-600 outline-none cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={aiStatus === 'analyzing'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border-none cursor-pointer transition-all ${
              !hasApiConfig ? 'bg-slate-100 text-slate-400' :
              aiStatus === 'analyzing' ? 'bg-violet-100 text-violet-600' :
              'bg-violet-500 text-white hover:bg-violet-600 shadow-sm'
            }`}
          >
            {aiStatus === 'analyzing' ? (
              <><Icon name="loader2" size={12} className="animate-spin" /> 分析中...</>
            ) : !hasApiConfig ? (
              '⚙ 先配置 API Key'
            ) : (
              <><Icon name="zap" size={12} /> AI 分析代码</>
            )}
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code editor */}
        <div className="w-[40%] border-r border-border flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={codeLanguage === 'cpp' ? 'cpp' : codeLanguage === 'javascript' ? 'javascript' : codeLanguage === 'java' ? 'java' : 'python'}
              value={code}
              onChange={(val) => setCode(val ?? '')}
              onMount={handleEditorMount}
              theme="light"
              options={{
                fontSize: 13, fontFamily: 'var(--font-code)', lineNumbers: 'on',
                minimap: { enabled: false }, scrollBeyondLastLine: false,
                wordWrap: 'on', padding: { top: 8 }, glyphMargin: true,
                folding: true, renderLineHighlight: 'line',
              }}
            />
          </div>
          <div className="h-28 border-t border-border bg-surface p-3 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">输入数据</span>
              <span className="text-[10px] text-muted">JSON 数组格式，如 [5,3,8,1,9,2]</span>
            </div>
            <textarea
              className="w-full h-[calc(100%-1.8rem)] resize-none rounded-md border border-border
                         bg-white p-2 text-sm font-code outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary-200 transition-colors"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="[5, 3, 8, 1, 9, 2]"
              disabled={aiStatus === 'analyzing'}
            />
          </div>
        </div>

        {/* Right: Visualization + Info */}
        <div className="w-[60%] flex flex-col min-w-0">
          {/* Canvas */}
          <div className="flex-1 min-h-0">
            <VisualizationCanvas script={animationScript} visualState={visualState} currentStepData={currentStepData} />
          </div>

          {/* Controls */}
          <div className="h-12 border-t border-border bg-white flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-1">
              <button className="ctrl-btn" onClick={reset} title="Reset"><Icon name="rotate-ccw" size={16} /></button>
              <button className="ctrl-btn" onClick={stepBackward} title="Prev"><Icon name="chevron-left" size={16} /></button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-700 transition-colors cursor-pointer border-none" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                <Icon name={isPlaying ? 'pause' : 'play'} size={15} />
              </button>
              <button className="ctrl-btn" onClick={stepForward} title="Next"><Icon name="chevron-right" size={16} /></button>
              <button className="ctrl-btn" onClick={goToEnd} title="End"><Icon name="fast-forward" size={16} /></button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-code">{currentStep}/{totalSteps}</span>
              <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Speed</span>
              <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-16 h-1 accent-primary cursor-pointer" />
              <span className="text-[11px] font-code text-slate-500 w-7">{speed}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Status overlay */}
      {aiStatus === 'error' && (
        <div className="absolute bottom-14 right-4 max-w-sm p-3 rounded-lg border border-red-100 bg-red-50 shadow-lg z-50">
          <div className="flex items-start gap-2">
            <Icon name="alert-circle" size={14} className="text-red-500 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-600">AI 分析失败</p>
              <p className="text-[11px] text-red-500 mt-0.5">{aiError}</p>
              <button onClick={() => setAiStatus('idle')} className="text-[10px] text-red-400 underline cursor-pointer border-none bg-transparent mt-1">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Info panel (right side overlay) */}
      {animationScript && currentStepData && (
        <div className="absolute top-10 right-4 w-56 max-h-[calc(100%-8rem)] overflow-y-auto p-3 rounded-lg border border-border bg-white/95 shadow-lg backdrop-blur z-50 space-y-2 text-xs">
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
                <div>时间: {complexity.time.best} / {complexity.time.average} / {complexity.time.worst}</div>
                <div>空间: {complexity.space}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .ctrl-btn { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:7px; border:none; background:transparent; color:#64748B; cursor:pointer; transition:all .15s; }
        .ctrl-btn:hover { background:#F1F5F9; color:#1E293B; }
      `}</style>
    </div>
  )
}
