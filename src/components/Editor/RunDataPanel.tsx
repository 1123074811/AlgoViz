import type { AnimationScript } from '@/types/animation'
import type { VisualState } from '@/hooks/useAnimationEngine'
import { inferOutputDisplay } from '@/utils/animationDisplay'

interface RunDataPanelProps {
  script: AnimationScript | null
  visualState?: Pick<VisualState, 'arrayData' | 'matrix' | 'teachingState'>
  currentStep: number
  totalSteps: number
  lang?: 'zh' | 'en'
  title?: string
  className?: string
}

export default function RunDataPanel({
  script,
  visualState,
  currentStep,
  totalSteps,
  lang = 'zh',
  title,
  className = '',
}: RunDataPanelProps) {
  const output = inferOutputDisplay(script, visualState, currentStep, totalSteps)
  const outputTitle = title ?? (lang === 'zh' ? '输出结果' : 'Output')
  const helperText = output.status === 'ready'
    ? output.label
    : (lang === 'zh' ? '算法返回值' : 'Algorithm return value')
  const displayValue = output.status === 'ready' ? output.value : ''

  return (
    <div className={`border-t border-border bg-surface p-3 flex flex-col min-h-0 shrink-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-1.5 shrink-0">
        <span className="text-xs font-medium text-slate-500 shrink-0">{outputTitle}</span>
        <span className="text-[10px] text-muted truncate">{helperText}</span>
      </div>
      <div className="flex-1 min-h-0 relative border border-border rounded-md overflow-hidden bg-white">
        <pre className="h-full w-full p-2 text-xs font-code text-slate-700 leading-relaxed whitespace-pre-wrap break-all overflow-auto">
          {displayValue}
        </pre>
      </div>
    </div>
  )
}
