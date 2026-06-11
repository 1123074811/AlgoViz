import { Fragment, useEffect, useRef } from 'react'
import type { AnimationStep } from '@/types/animation'

interface StepListPanelProps {
  steps: AnimationStep[]
  /** 1-based 当前步；0 表示未开始。 */
  currentStep: number
  lang: 'zh' | 'en'
  /** 点击某行时跳到该步，传 1-based 步号。 */
  onJump: (step: number) => void
  /** 面板最大高度，默认 16rem。 */
  maxHeight?: string
}

export default function StepListPanel({
  steps,
  currentStep,
  lang,
  onJump,
  maxHeight = '16rem',
}: StepListPanelProps) {
  const currentRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [currentStep])

  if (steps.length === 0) return null

  return (
    <ul
      role="list"
      className="overflow-y-auto rounded-lg border border-border divide-y divide-slate-100 bg-white"
      style={{ maxHeight }}
    >
      {steps.map((step, i) => {
        const isCurrent = i === currentStep - 1
        return (
          <Fragment key={step.stepId}>
            {step.phase && (
              <li
                role="presentation"
                className="sticky top-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500"
              >
                {lang === 'zh' ? step.phase.zh : step.phase.en}
              </li>
            )}
            <li
              ref={isCurrent ? currentRef : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onJump(i + 1)}
              className={`flex items-start gap-2 px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                isCurrent ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`shrink-0 font-code text-[10px] mt-0.5 w-7 text-right ${isCurrent ? 'text-blue-500 font-semibold' : 'text-slate-300'}`}>
                {step.stepId}
              </span>
              <span className="leading-relaxed">
                {lang === 'zh' ? step.description.zh : step.description.en}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ul>
  )
}
