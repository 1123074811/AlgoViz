import { Icon } from '@/icons'
import StepListPanel from '@/components/Controls/StepListPanel'
import type { AIStatus, AlgorithmType } from '@/store/algorithmStore'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import { ALGORITHM_DEFS, getAlgorithmDescription } from '@/data/algorithms'
import type { SceneDiagnostic } from '@/scene/diagnostics'
import DefinitionCard from './DefinitionCard'
import { VerificationNotice } from './VerificationNotice'

interface InfoPanelProps {
  animationScript: AnimationScript | null
  currentStep: number
  currentStepData: AnimationStep | null
  goToStep: (step: number) => void
  lang: 'zh' | 'en'
  selectedAlgorithm: AlgorithmType
  complexity: AnimationScript['complexity'] | null | undefined
  isSceneEngineActive: boolean
  sceneEventStats: { eventSteps: number; totalEvents: number }
  sceneDiagnosticSummary: {
    diagnostics: SceneDiagnostic[]
    errors: number
    warnings: number
  }
  aiStatus: AIStatus
  aiError: string
  aiRawResponse: string
  showRawResponse: boolean
  setShowRawResponse: (show: boolean) => void
  showDefinition: boolean
  setShowDefinition: (show: boolean) => void
  onCancelAI: () => void
  t: (key: string, options?: Record<string, unknown>) => string
}

export default function InfoPanel({
  animationScript,
  currentStep,
  currentStepData,
  goToStep,
  lang,
  selectedAlgorithm,
  complexity,
  isSceneEngineActive,
  sceneEventStats,
  sceneDiagnosticSummary,
  aiStatus,
  aiError,
  aiRawResponse,
  showRawResponse,
  setShowRawResponse,
  showDefinition,
  setShowDefinition,
  onCancelAI,
  t,
}: InfoPanelProps) {
  return (
    <>
      <div className="h-9 border-b border-border flex items-center px-3 bg-surface shrink-0">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
          <Icon name="info" size={14} />
          {t('visualizer.algorithmInfo')}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <VerificationNotice verification={animationScript?.verification} />

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
                  onClick={onCancelAI}
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

        {animationScript && animationScript.steps.length > 1 && (
          <div className="p-3 rounded-lg border border-border bg-surface">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">
              {t('visualizer.stepList.title')}
            </h4>
            <StepListPanel
              steps={animationScript.steps}
              currentStep={currentStep}
              lang={lang === 'zh' ? 'zh' : 'en'}
              onJump={goToStep}
            />
          </div>
        )}

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
                      {lang === 'zh' ? `第 ${diagnostic.stepId} 步` : `Step ${diagnostic.stepId}`}
                      : {diagnostic.message}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 rounded-lg border border-border bg-surface">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">
            {t('visualizer.liveStats')}
          </h4>
          <div className="space-y-1.5">
            {[
              { label: t('visualizer.comparisons'), value: currentStepData?.stats.comparisons ?? 0 },
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

        <div className="p-3 rounded-lg border border-border bg-surface">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">
            {selectedAlgorithm.name}
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {getAlgorithmDescription(selectedAlgorithm.id, lang)}
          </p>
        </div>

        {ALGORITHM_DEFS[selectedAlgorithm.id] && (
          <DefinitionCard
            def={ALGORITHM_DEFS[selectedAlgorithm.id]}
            lang={lang}
            expanded={showDefinition}
            onToggle={() => setShowDefinition(!showDefinition)}
          />
        )}
      </div>
    </>
  )
}
