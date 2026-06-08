import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ErrorBoundary'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { VisualState } from '@/hooks/useAnimationEngine'
import SceneCanvas from '@/scene/SceneCanvas'

interface VisualizationCanvasProps {
  script: AnimationScript | null
  visualState: VisualState
  currentStepData: AnimationStep | null
  speed?: number
}

export default function VisualizationCanvas({ script, visualState, currentStepData, speed = 1 }: VisualizationCanvasProps) {
  if (!script) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </div>
          <p className="text-sm text-muted">Select an algorithm to visualize</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6 bg-slate-50">
      <div className="h-full bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <ErrorBoundary
          resetKeys={[script.algorithm, script.steps.length, visualState.currentStep]}
          FallbackComponent={(props) => (
            <ErrorFallback
              {...props}
              title="场景渲染失败"
              description="动画场景的数据或 SVG 渲染遇到异常，可以重试，或把当前错误回发给 AI 重新修复。"
              allowAIRepair
            />
          )}
        >
          <SceneCanvas script={script} currentStep={visualState.currentStep} currentStepData={currentStepData} speed={speed} />
        </ErrorBoundary>
      </div>
    </div>
  )
}
