import { Icon } from '@/icons'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  speed: number
  onReset: () => void
  onStepBackward: () => void
  onTogglePlay: () => void
  onStepForward: () => void
  onGoToEnd: () => void
  onSpeedChange: (speed: number) => void
  /** 进度条拖拽/点击跳步。不传则进度条保持纯展示。 */
  onSeek?: (step: number) => void
  /** 当前阶段名，显示在步数旁。 */
  currentPhase?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  extraActions?: React.ReactNode
  labels?: {
    reset: string
    prevStep: string
    play: string
    pause: string
    nextStep: string
    end: string
    speed: string
    progress?: string
  }
}

const defaultLabels = {
  reset: 'Reset',
  prevStep: 'Previous',
  play: 'Play',
  pause: 'Pause',
  nextStep: 'Next',
  end: 'End',
  speed: 'Speed',
  progress: 'Progress',
}

export default function PlaybackControls({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  onReset,
  onStepBackward,
  onTogglePlay,
  onStepForward,
  onGoToEnd,
  onSpeedChange,
  onSeek,
  currentPhase,
  disabled = false,
  compact = false,
  className = '',
  extraActions,
  labels = defaultLabels,
}: PlaybackControlsProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  return (
    <div className={`min-h-14 border-t border-border bg-white flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 shrink-0 ${className}`}>
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button className="playback-btn" onClick={onReset} title={labels.reset} aria-label={labels.reset} disabled={disabled}>
          <Icon name="rotate-ccw" size={compact ? 16 : 18} />
        </button>
        <button className="playback-btn" onClick={onStepBackward} title={labels.prevStep} aria-label={labels.prevStep} disabled={disabled}>
          <Icon name="chevron-left" size={compact ? 16 : 18} />
        </button>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer border-none shrink-0"
          onClick={onTogglePlay}
          title={isPlaying ? labels.pause : labels.play}
          aria-label={isPlaying ? labels.pause : labels.play}
          disabled={disabled}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={compact ? 16 : 18} />
        </button>
        <button className="playback-btn" onClick={onStepForward} title={labels.nextStep} aria-label={labels.nextStep} disabled={disabled}>
          <Icon name="chevron-right" size={compact ? 16 : 18} />
        </button>
        <button className="playback-btn" onClick={onGoToEnd} title={labels.end} aria-label={labels.end} disabled={disabled}>
          <Icon name="fast-forward" size={compact ? 16 : 18} />
        </button>
        {extraActions && (
          <>
            <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
            <div className="flex items-center gap-2 min-w-0">{extraActions}</div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 sm:flex-none justify-center order-3 sm:order-none w-full sm:w-auto">
        {currentPhase && (
          <span className="hidden sm:inline max-w-24 truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            {currentPhase}
          </span>
        )}
        <span className="text-[11px] sm:text-xs text-slate-400 font-code min-w-[58px] sm:min-w-[72px] text-right">
          {currentStep} / {totalSteps}
        </span>
        {onSeek ? (
          <input
            type="range"
            min={0}
            max={totalSteps}
            step={1}
            value={currentStep}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            disabled={disabled || totalSteps === 0}
            aria-label={labels.progress ?? 'Progress'}
            className="seek-bar flex-1 sm:w-28 md:w-32 max-w-48 h-1.5 cursor-pointer accent-primary"
          />
        ) : (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex-1 sm:w-28 md:w-32 max-w-48">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden md:inline text-[10px] text-slate-400 uppercase tracking-wide">{labels.speed}</span>
        <input
          type="range"
          min={0.25}
          max={4}
          step={0.25}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-16 md:w-20 h-1 accent-primary cursor-pointer"
          disabled={disabled}
          aria-label={labels.speed}
        />
        <span className="text-[11px] sm:text-xs font-code text-slate-500 w-8">{speed}x</span>
      </div>

      <style>{`
        .playback-btn { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:none; background:transparent; color:#64748B; cursor:pointer; transition:all .15s; flex-shrink:0; }
        .playback-btn:hover:not(:disabled) { background:#F1F5F9; color:#1E293B; }
        .playback-btn:disabled { opacity:.45; cursor:not-allowed; }
        .seek-bar { -webkit-appearance:none; appearance:none; background:#F1F5F9; border-radius:9999px; outline:none; }
        .seek-bar::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:var(--color-primary,#3B82F6); border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,.25); cursor:grab; }
        .seek-bar::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:var(--color-primary,#3B82F6); border:2px solid #fff; cursor:grab; }
        .seek-bar:disabled { opacity:.45; cursor:not-allowed; }
      `}</style>
    </div>
  )
}
