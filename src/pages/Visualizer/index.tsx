import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Icon } from '@/icons'
import { useAlgorithmStore } from '@/store/algorithmStore'
import { getPreset } from '@/presets'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { analyzeCode, getApiConfig, type AIResult } from '@/ai'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'

type AIStatus = 'idle' | 'analyzing' | 'success' | 'error'

export default function Visualizer() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'

  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm)
  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)

  const [code, setCode] = useState('')
  const [inputData, setInputData] = useState('[5, 3, 8, 1, 9, 2]')
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [aiError, setAiError] = useState('')
  const [aiRawResponse, setAiRawResponse] = useState('')

  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])

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

  // Load preset or reset when algorithm is selected
  useEffect(() => {
    if (!selectedAlgorithm) return
    setCode(selectedAlgorithm.defaultCode)
    setAiStatus('idle')
    setAiError('')
    setAiRawResponse('')

    if (selectedAlgorithm.hasPreset) {
      const preset = getPreset(selectedAlgorithm.id)
      if (preset) {
        setAnimationScript(preset)
        setInputData(JSON.stringify(preset.initialState.data))
        return
      }
    }
    setAnimationScript(null)
  }, [selectedAlgorithm, setAnimationScript])

  // Update Monaco editor decorations based on current step
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !animationScript) return

    const steps = animationScript.steps
    const currentCodeLine = steps[currentStep - 1]?.codeLine ?? -1

    const newDecorations: Parameters<typeof editor.deltaDecorations>[1] = []

    // Visited lines (before current)
    const visitedLines = new Set<number>()
    for (let i = 0; i < currentStep - 1; i++) {
      visitedLines.add(steps[i].codeLine)
    }

    for (const line of visitedLines) {
      if (line !== currentCodeLine) {
        newDecorations.push({
          range: { startLineNumber: line + 1, startColumn: 1, endLineNumber: line + 1, endColumn: 1 },
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
        range: { startLineNumber: currentCodeLine + 1, startColumn: 1, endLineNumber: currentCodeLine + 1, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'active-line',
          glyphMarginClassName: 'active-glyph',
        },
      })
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
  }, [currentStep, animationScript])

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const handleAIAnalyze = async () => {
    if (!hasApiConfig) {
      setAiError('请先在设置页面配置 API Key')
      setAiStatus('error')
      return
    }

    setAiStatus('analyzing')
    setAiError('')
    setAiRawResponse('')

    const result: AIResult = await analyzeCode({
      code,
      language: selectedAlgorithm?.defaultLanguage || 'python',
      inputData,
      algorithmName: selectedAlgorithm?.name,
    })

    if (result.success && result.script) {
      setAiStatus('success')
      setAnimationScript(result.script)
      loadScript(result.script)
    } else {
      setAiStatus('error')
      setAiError(result.error || '未知错误')
      setAiRawResponse(result.rawResponse || '')
    }
  }

  if (!selectedAlgorithm) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="code2" size={28} className="text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-slate-600 mb-2">
            {t('app.name')}
          </h2>
          <p className="text-sm text-muted max-w-xs">
            从左侧边栏选择一个算法，开始你的可视化学习之旅
          </p>
        </div>
      </div>
    )
  }

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const steps = animationScript?.steps ?? []
  const complexity = animationScript?.complexity

  return (
    <div className="h-full flex flex-col">
      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code Editor (35%) */}
        <div className="w-[35%] border-r border-border flex flex-col bg-white min-w-0">
          <div className="h-9 border-b border-border flex items-center justify-between px-3 bg-surface shrink-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Icon name="code2" size={14} />
              {selectedAlgorithm.name} — {selectedAlgorithm.defaultLanguage === 'python' ? 'Python' : selectedAlgorithm.defaultLanguage}
            </span>
            {selectedAlgorithm.hasPreset && (
              <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                预制动画
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={selectedAlgorithm.defaultLanguage === 'cpp' ? 'cpp' : selectedAlgorithm.defaultLanguage}
              value={code}
              onChange={(val) => setCode(val ?? '')}
              onMount={handleEditorMount}
              theme="light"
              options={{
                fontSize: 13,
                fontFamily: 'var(--font-code)',
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 8 },
                glyphMargin: true,
                folding: false,
                lineDecorationsWidth: 4,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'none',
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>
          <div className="h-32 border-t border-border bg-surface p-3 shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-1.5">
              输入数据
            </div>
            <textarea
              className="w-full h-[calc(100%-1.5rem)] resize-none rounded-md border border-border
                         bg-white p-2 text-sm font-code outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary-200 transition-colors"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="[5, 3, 8, 1, 9, 2]"
              disabled={aiStatus === 'analyzing'}
            />
          </div>
        </div>

        {/* Center: Canvas (45%) */}
        <div className="w-[45%] border-r border-border min-w-0">
          <VisualizationCanvas
            script={animationScript}
            visualState={visualState}
          />
        </div>

        {/* Right: Info Panel (20%) */}
        <div className="w-[20%] flex flex-col bg-white min-w-0">
          <div className="h-9 border-b border-border flex items-center px-3 bg-surface shrink-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Icon name="info" size={14} />
              算法信息
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* AI Status Banner */}
            {aiStatus !== 'idle' && (
              <div className={`p-3 rounded-lg border ${
                aiStatus === 'analyzing' ? 'border-warning-50 bg-warning-50' :
                aiStatus === 'success' ? 'border-green-100 bg-green-50' :
                'border-red-100 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {aiStatus === 'analyzing' && (
                    <Icon name="loader2" size={14} className="text-warning animate-spin" />
                  )}
                  <span className={`text-xs font-semibold ${
                    aiStatus === 'analyzing' ? 'text-warning' :
                    aiStatus === 'success' ? 'text-green-600' :
                    'text-red-500'
                  }`}>
                    {aiStatus === 'analyzing' ? 'AI 分析中...' :
                     aiStatus === 'success' ? 'AI 分析完成' : 'AI 分析失败'}
                  </span>
                </div>
                {aiError && (
                  <p className="text-[11px] text-red-500 leading-relaxed">{aiError}</p>
                )}
              </div>
            )}

            {/* Current Step Description */}
            {currentStepData && (
              <div className="p-3 rounded-lg border border-warning-50 bg-warning-50">
                <div className="text-[10px] text-warning uppercase tracking-wide font-semibold mb-1">
                  Step {currentStepData.stepId}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {lang === 'zh' ? currentStepData.description.zh : currentStepData.description.en}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="p-3 rounded-lg border border-border bg-surface">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">实时统计</h4>
              <div className="space-y-1.5">
                {[
                  { label: '比较次数', value: currentStepData?.stats.comparisons ?? 0 },
                  { label: '交换次数', value: currentStepData?.stats.swaps ?? 0 },
                  { label: '访问次数', value: currentStepData?.stats.accesses ?? 0 },
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
                <h4 className="text-xs font-semibold text-slate-700 mb-2">复杂度</h4>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">最好</span>
                    <span className="font-code text-green-600">{complexity.time.best}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">平均</span>
                    <span className="font-code text-yellow-600">{complexity.time.average}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">最坏</span>
                    <span className="font-code text-red-500">{complexity.time.worst}</span>
                  </div>
                  <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between">
                    <span className="text-slate-400">空间</span>
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
                {selectedAlgorithm.name === '冒泡排序'
                  ? '重复遍历数列，依次比较相邻元素，如果顺序错误则交换位置。每轮将最大值"冒泡"到末尾。'
                  : selectedAlgorithm.name === '选择排序'
                  ? '每次从未排序区间选择最小的元素，放到已排序区间的末尾。'
                  : selectedAlgorithm.name === '插入排序'
                  ? '将未排序元素依次插入到已排序序列的合适位置，类似整理扑克牌。'
                  : selectedAlgorithm.name === '归并排序'
                  ? '分治法：将数组递归二分，排序后合并两个有序子数组。'
                  : selectedAlgorithm.name === '快速排序'
                  ? '选取基准元素，将数组分为小于和大于基准的两部分，递归排序。'
                  : selectedAlgorithm.name === '二分查找'
                  ? '在有序数组中每次取中间值比较，将搜索范围缩小一半。'
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Control Bar */}
      <div className="h-14 border-t border-border bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button className="control-btn" onClick={reset} title={t('controls.reset')}>
            <Icon name="rotate-ccw" size={18} />
          </button>
          <button className="control-btn" onClick={stepBackward} title={t('controls.prevStep')}>
            <Icon name="chevron-left" size={18} />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white
                       hover:bg-primary-700 transition-colors cursor-pointer border-none"
            onClick={togglePlay}
            title={isPlaying ? t('controls.pause') : t('controls.play')}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
          </button>
          <button className="control-btn" onClick={stepForward} title={t('controls.nextStep')}>
            <Icon name="chevron-right" size={18} />
          </button>
          <button className="control-btn" onClick={goToEnd} title={t('controls.end')}>
            <Icon name="fast-forward" size={18} />
          </button>

          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* AI Analysis Button */}
          <button
            onClick={handleAIAnalyze}
            disabled={aiStatus === 'analyzing' || !hasApiConfig}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium
                       bg-gradient-to-r from-violet-500 to-purple-600 text-white
                       hover:from-violet-600 hover:to-purple-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all cursor-pointer border-none shadow-sm"
            title={!hasApiConfig ? '请先在设置页面配置 API Key' : 'AI 分析当前代码'}
          >
            {aiStatus === 'analyzing' ? (
              <Icon name="loader2" size={14} className="animate-spin" />
            ) : (
              <Icon name="brain" size={14} />
            )}
            AI 分析
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-code w-[72px] text-right">
            {currentStep} / {totalSteps}
          </span>
          <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">
            {t('controls.speed')}
          </span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-20 h-1 accent-primary cursor-pointer"
          />
          <span className="text-xs font-code text-slate-500 w-8 text-right">
            {speed}x
          </span>
        </div>
      </div>

      <style>{`
        .control-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #64748B;
          cursor: pointer;
          transition: all 0.15s;
        }
        .control-btn:hover {
          background: #F1F5F9;
          color: #1E293B;
        }
        .control-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: transparent;
        }
        .active-line {
          background: rgba(245, 158, 11, 0.15) !important;
          border-left: 3px solid #F59E0B;
        }
        .visited-line {
          background: rgba(37, 99, 235, 0.06) !important;
          border-left: 3px solid #93C5FD;
        }
        .active-glyph {
          background: #F59E0B;
          width: 4px !important;
          margin-left: 3px;
        }
        .visited-glyph {
          background: #93C5FD;
          width: 4px !important;
          margin-left: 3px;
        }
      `}</style>
    </div>
  )
}
