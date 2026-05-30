import type { AnimationScript } from '@/types/animation'
import { getStepDiagnostics } from './diagnostics'

interface EventTimelineProps {
  script: AnimationScript
  currentStep: number
}

export default function EventTimeline({ script, currentStep }: EventTimelineProps) {
  const step = script.steps[Math.max(0, Math.min(currentStep, script.steps.length) - 1)]
  const events = step?.events ?? []
  const diagnostics = getStepDiagnostics(script, currentStep)

  return (
    <div className="absolute right-5 top-5 w-64 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">事件时间轴</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{currentStep}/{script.steps.length}</span>
      </div>
      <div className="mb-2 line-clamp-2 text-xs text-slate-600">{step?.description.zh ?? '等待开始播放'}</div>
      {events.length > 0 ? (
        <div className="space-y-1.5">
          {events.slice(0, 5).map((event, index) => (
            <div key={`${event.type}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
              <div className="truncate font-mono text-[11px] font-semibold text-blue-700">{event.type}</div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{summarizeEvent(event)}</div>
            </div>
          ))}
          {events.length > 5 && <div className="text-[10px] text-slate-400">+{events.length - 5} more</div>}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-2 py-2 text-center text-[11px] text-slate-400">当前步骤无 events</div>
      )}
      {diagnostics.length > 0 && (
        <div className="mt-2 space-y-1">
          {diagnostics.slice(0, 3).map((diagnostic) => (
            <div key={`${diagnostic.stepId}-${diagnostic.eventIndex}-${diagnostic.message}`} className={`rounded-lg px-2 py-1 text-[10px] ${diagnostic.severity === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
              {diagnostic.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function summarizeEvent(event: NonNullable<AnimationScript['steps'][number]['events']>[number]) {
  const payload = Object.entries(event)
    .filter(([key]) => key !== 'type')
    .slice(0, 2)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(' · ')
  return payload || 'semantic event'
}

function formatValue(value: unknown) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `[${value.length}]`
  if (typeof value === 'object') return '{...}'
  return String(value)
}
