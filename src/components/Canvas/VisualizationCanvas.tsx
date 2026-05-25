import type { AnimationScript } from '@/types/animation'
import type { VisualState } from '@/hooks/useAnimationEngine'
import ArrayRenderer from './renderers/ArrayRenderer'
import GraphRenderer from './renderers/GraphRenderer'
import TreeRenderer from './renderers/TreeRenderer'
import MatrixRenderer from './renderers/MatrixRenderer'

interface VisualizationCanvasProps {
  script: AnimationScript | null
  visualState: VisualState
}

export default function VisualizationCanvas({ script, visualState }: VisualizationCanvasProps) {
  if (!script || visualState.arrayData.length === 0) {
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
          <p className="text-sm text-muted">
            {script ? 'No data to render' : 'Select an algorithm to visualize'}
          </p>
        </div>
      </div>
    )
  }

  const rendererType = script.initialState.type

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rendererMap: Record<string, React.ComponentType<any>> = {
    array: ArrayRenderer,
    graph: GraphRenderer,
    tree: TreeRenderer,
    matrix: MatrixRenderer,
  }

  const Renderer = rendererMap[rendererType] || ArrayRenderer

  return (
    <div className="h-full p-6 bg-slate-50">
      <div className="h-full bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Renderer visualState={visualState} />
      </div>
    </div>
  )
}
