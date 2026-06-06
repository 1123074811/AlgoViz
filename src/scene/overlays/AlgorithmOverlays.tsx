import { CallStackView } from '../primitives/CallStackView'
import { DPTableView } from '../primitives/DPTableView'
import { GridView } from '../primitives/GridView'
import type { AlgorithmOverlayState } from './overlayCompiler'

interface AlgorithmOverlaysProps {
  overlays?: Partial<AlgorithmOverlayState>
  className?: string
}

export function AlgorithmOverlays({ overlays, className = '' }: AlgorithmOverlaysProps) {
  const callStack = overlays?.callStack
  const dpTables = Object.values(overlays?.dpTables ?? {})
  const grids = Object.values(overlays?.grids ?? {})

  if (!callStack && dpTables.length === 0 && grids.length === 0) return null

  return (
    <div className={`pointer-events-none absolute inset-3 z-20 flex flex-col gap-3 ${className}`}>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="pointer-events-auto min-w-0 flex-1 space-y-3 overflow-auto">
          {grids.map((grid) => (
            <GridView key={grid.gridId} model={grid} />
          ))}
          {dpTables.map((table) => (
            <DPTableView key={table.id} model={table} />
          ))}
        </div>
        {callStack ? (
          <div className="pointer-events-auto w-72 max-w-[36%] shrink-0 overflow-auto">
            <CallStackView model={callStack} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AlgorithmOverlays
