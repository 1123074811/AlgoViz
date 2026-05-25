import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/icons'
import { useAlgorithmStore } from '@/store/algorithmStore'
import { getPreset } from '@/presets'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import VisualizationCanvas from '@/components/Canvas/VisualizationCanvas'

export default function Visualizer() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'

  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm)
  const animationScript = useAlgorithmStore((s) => s.animationScript)
  const setAnimationScript = useAlgorithmStore((s) => s.setAnimationScript)

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
  } = useAnimationEngine(animationScript)

  // Load preset when algorithm is selected
  useEffect(() => {
    if (selectedAlgorithm?.hasPreset) {
      const preset = getPreset(selectedAlgorithm.id)
      setAnimationScript(preset ?? null)
    } else {
      setAnimationScript(null)
    }
  }, [selectedAlgorithm, setAnimationScript])

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
          <div className="h-9 border-b border-border flex items-center px-3 bg-surface shrink-0">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Icon name="code2" size={14} />
              {selectedAlgorithm.name} — Python
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="font-code text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              <code>
                {selectedAlgorithm.defaultCode.split('\n').map((line, idx) => {
                  const currentCodeLine = steps[currentStep - 1]?.codeLine ?? -1
                  const visitedLines = new Set(
                    steps
                      .filter((s) => s.stepId <= currentStep)
                      .map((s) => s.codeLine)
                  )
                  const isActive = currentCodeLine === idx
                  const isVisited = visitedLines.has(idx) && !isActive

                  let lineClass = ''
                  if (isActive) {
                    lineClass = 'bg-warning-50 border-l-2 border-warning'
                  } else if (isVisited) {
                    lineClass = 'bg-primary-50 border-l-2 border-primary-200'
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex ${lineClass} transition-colors duration-200`}
                    >
                      <span className="text-muted text-xs w-8 text-right pr-3 select-none shrink-0 py-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1 py-0.5">{line}</span>
                    </div>
                  )
                })}
              </code>
            </pre>
          </div>
          <div className="h-32 border-t border-border bg-surface p-3 shrink-0">
            <div className="text-xs font-medium text-slate-500 mb-1.5">
              输入数据
            </div>
            <textarea
              className="w-full h-[calc(100%-1.5rem)] resize-none rounded-md border border-border
                         bg-white p-2 text-sm font-code outline-none focus:border-primary
                         focus:ring-1 focus:ring-primary-200 transition-colors"
              value={animationScript ? JSON.stringify(animationScript.initialState.data) : ''}
              readOnly
              placeholder="[5, 3, 8, 1, 9, 2]"
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
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Control Bar */}
      <div className="h-14 border-t border-border bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-1">
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
        </div>

        <div className="flex items-center gap-4">
          {/* Step Counter */}
          <span className="text-xs text-slate-400 font-code w-[72px] text-right">
            {currentStep} / {totalSteps}
          </span>
          {/* Progress Bar */}
          <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Speed Control */}
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
      `}</style>
    </div>
  )
}
