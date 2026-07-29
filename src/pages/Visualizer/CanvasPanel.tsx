import { Icon } from '@/icons'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { VisualState } from '@/hooks/useAnimationEngine'
import SceneCanvas from '@/scene/SceneCanvas'
import type { OperationDef } from '@/presets/operationPresets'

interface CanvasPanelProps {
  hasOperations: boolean | undefined
  operations: OperationDef[] | undefined
  currentOperationId: string
  setCurrentOperationId: (id: OperationDef['id']) => void
  setOperationParam: (value: string) => void
  animationScript: AnimationScript | null
  visualState: VisualState
  currentStepData: AnimationStep | null
  speed: number
  lang: 'zh' | 'en'
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  blocked?: boolean
  blockedMessage?: string
}

export default function CanvasPanel({
  hasOperations,
  operations,
  currentOperationId,
  setCurrentOperationId,
  setOperationParam,
  animationScript,
  visualState,
  currentStepData,
  speed,
  lang,
  isFullscreen,
  onToggleFullscreen,
  blocked = false,
  blockedMessage,
}: CanvasPanelProps) {
  return (
    <>
      {hasOperations && operations && (
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
      <div className="flex-1 min-h-0 relative">
        <SceneCanvas
          script={animationScript}
          currentStep={visualState.currentStep}
          currentStepData={currentStepData}
          speed={speed}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
        {blocked && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px]">
            <div className="max-w-sm rounded-lg border border-amber-300/40 bg-slate-950/90 px-4 py-3 text-center text-xs font-medium text-amber-100 shadow-xl">
              <Icon name="pause" size={16} className="mx-auto mb-1.5 text-amber-300" />
              {blockedMessage ?? (lang === 'zh'
                ? '动画已冻结；完成输入并运行后重新生成'
                : 'Animation frozen; complete the input and run again')}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
