import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ErrorBoundary'
import type { AnimationScript, AnimationStep } from '@/types/animation'
import { deriveSceneState } from './SceneEngine'
import { useSceneTransition } from './useSceneTransition'
import { MOTION } from './tokens'
import AutomatonView from './primitives/AutomatonView'
import CellView from './primitives/CellView'
import ContainerView from './primitives/ContainerView'
import { DPTableView } from './primitives/DPTableView'
import EdgeView from './primitives/EdgeView'
import BitsetView from './primitives/BitsetView'
import HashTableView from './primitives/HashTableView'
import GeometryView from './primitives/GeometryView'
import HeapView from './primitives/HeapView'
import LabelView from './primitives/LabelView'
import NodeView, { NodeStyles } from './primitives/NodeView'
import PointerView from './primitives/PointerView'
import DistributionView from './primitives/DistributionView'
import RegionView from './primitives/RegionView'
import SetView from './primitives/SetView'
import StringView from './primitives/StringView'
import VariablesView from './primitives/VariablesView'
import GraphAnalysisView from './primitives/GraphAnalysisView'
import AlgorithmOverlays from './overlays/AlgorithmOverlays'
import ColorLegend from './ColorLegend'
import { SEMANTIC_COLORS, NEUTRALS } from './tokens'
import { EDGE_FLOW_KEYFRAMES } from './primitives/sharedMotion'
import type { SceneCell, SceneEntity, SceneNode, SceneState } from './types'
import type { DPTableModel } from './overlays'

interface SceneCanvasProps {
  script: AnimationScript | null
  currentStep: number
  currentStepData?: AnimationStep | null
  speed?: number
}

interface SceneCanvasInnerProps {
  script: AnimationScript
  currentStep: number
  currentStepData?: AnimationStep | null
  speed?: number
}

/** 播放速度→补间时长：慢放更舒缓、快放更利落。 */
function durationForSpeed(speedMultiplier: number): number {
  if (speedMultiplier <= 0.5) return MOTION.duration.slow
  if (speedMultiplier >= 2) return MOTION.duration.fast
  return MOTION.duration.base
}

/** 结构性大动作放慢，旁注类加快，让位移看得清、说明不拖节奏。 */
export function durationForStep(speedMultiplier: number, actionType: string | undefined): number {
  const base = durationForSpeed(speedMultiplier)
  if (actionType === 'swap' || actionType === 'move' || actionType === 'insert' || actionType === 'delete') {
    return Math.round(base * 1.35)
  }
  if (actionType === 'annotate' || actionType === 'mark') {
    return Math.round(base * 0.7)
  }
  return base
}

/** 可视化画布：处理空状态、外层卡片容器与渲染错误边界，渲染主体委托给 SceneCanvasInner。 */
export default function SceneCanvas({ script, currentStep, currentStepData, speed = 1 }: SceneCanvasProps) {
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
          resetKeys={[script.algorithm, script.steps.length, currentStep]}
          FallbackComponent={(props) => (
            <ErrorFallback
              {...props}
              title="场景渲染失败"
              description="动画场景的数据或 SVG 渲染遇到异常，可以重试，或把当前错误回发给 AI 重新修复。"
              allowAIRepair
            />
          )}
        >
          <SceneCanvasInner script={script} currentStep={currentStep} currentStepData={currentStepData} speed={speed} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

function SceneCanvasInner({ script, currentStep, currentStepData, speed = 1 }: SceneCanvasInnerProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language as 'zh' | 'en'

  const targetScene = deriveSceneState(script, currentStep)
  // 逻辑步骤 key：补间只在「脚本或步骤」变化时重启，避免 deriveSceneState 每帧新引用
  // 导致动画反复重启而抖动。
  const transitionKey = `${script.algorithm}|${script.steps.length}|${currentStep}`
  const scene = useSceneTransition(targetScene, durationForStep(speed, currentStepData?.action?.type), transitionKey)
  const entities = Object.values(scene.entities)
  const edges = Object.values(scene.edges)
  const pointers = Object.values(scene.pointers)
  const labels = Object.values(scene.labels)
  const dpTables = Object.values(scene.overlays?.dpTables ?? {})
  const dpPanels = createDPPanelEntities(entities, dpTables)
  const latestNote = scene.notes?.[scene.notes.length - 1]
  const hasOverlays = Boolean(
    scene.overlays?.callStack ||
    Object.keys(scene.overlays?.grids ?? {}).length > 0,
  )
  const isEmpty = entities.length === 0 && edges.length === 0 && pointers.length === 0 && labels.length === 0 && dpPanels.length === 0 && !hasOverlays

  // 1. Zoom and Pan state
  const [viewport, setViewport] = useState(() => ({
    script,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  }))
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const initialPanOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const activeViewport = viewport.script === script
    ? viewport
    : { script, zoom: 1, panOffset: { x: 0, y: 0 } }
  const { zoom, panOffset } = activeViewport

  const updateViewport = (
    updater: (state: typeof activeViewport) => typeof activeViewport,
  ) => {
    setViewport((prev) => {
      const base = prev.script === script
        ? prev
        : { script, zoom: 1, panOffset: { x: 0, y: 0 } }
      return updater(base)
    })
  }

  // 2. Compute viewBox dimensions (centered on content with 1.6 aspect ratio)
  const { xStart, yStart, width, height } = computeViewBoxDimensions([...entities, ...dpPanels], labels)

  // Apply zoom to width/height
  const viewBoxWidth = width / zoom
  const viewBoxHeight = height / zoom

  // Apply pan to start position
  const viewBoxX = xStart + (width - viewBoxWidth) / 2 + panOffset.x
  const viewBoxY = yStart + (height - viewBoxHeight) / 2 + panOffset.y

  const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`

  // 3. Zoom / Pan handlers
  const handleZoomIn = () => {
    updateViewport((state) => ({ ...state, zoom: Math.min(4.0, state.zoom * 1.2) }))
  }

  const handleZoomOut = () => {
    updateViewport((state) => ({ ...state, zoom: Math.max(0.5, state.zoom / 1.2) }))
  }

  const handleReset = () => {
    updateViewport((state) => ({ ...state, zoom: 1, panOffset: { x: 0, y: 0 } }))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click drags
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    initialPanOffset.current = panOffset
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    const rect = containerRef.current.getBoundingClientRect()
    const ratioX = viewBoxWidth / (rect.width || 1)
    const ratioY = viewBoxHeight / (rect.height || 1)

    updateViewport((state) => ({
      ...state,
      panOffset: {
        x: initialPanOffset.current.x - dx * ratioX,
        y: initialPanOffset.current.y - dy * ratioY,
      },
    }))
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    // We prevent default wheel scrolling to avoid page jumping
    e.preventDefault()
    const zoomFactor = 1.15
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor
    updateViewport((state) => ({ ...state, zoom: Math.max(0.5, Math.min(4.0, nextZoom)) }))
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onWheel={handleWheel}
      className={`relative h-full w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <svg viewBox={viewBox} className="h-full w-full pointer-events-none">
        <defs>
          <filter id="sceneShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor={NEUTRALS.shadow} floodOpacity="0.12" />
          </filter>
          {/* Academic open chevron arrowheads — minimalist, no fill */}
          <marker id="sceneArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M1,1 L9,4 L1,7" fill="none" stroke={NEUTRALS.labelText} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="sceneDependencyArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M1,1 L9,4 L1,7" fill="none" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="scenePointerArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M1,1 L9,4 L1,7" fill="none" stroke="#93C5FD" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          {/* Trajectory arrow markers — even thinner, more subtle for animated paths */}
          <marker id="sceneTrajectorySuccess" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M1,0.5 L7,3 L1,5.5" fill="none" stroke={SEMANTIC_COLORS.success.stroke} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="sceneTrajectoryDanger" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M1,0.5 L7,3 L1,5.5" fill="none" stroke={SEMANTIC_COLORS.danger.stroke} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="sceneTrajectoryPrimary" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M1,0.5 L7,3 L1,5.5" fill="none" stroke={SEMANTIC_COLORS.primary.stroke} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <NodeStyles />
        {Object.values(scene.groups).filter(g => g.id.startsWith('region_')).map(g => (
          <RegionView key={g.id} region={g} />
        ))}
        {renderContainers(entities, Object.values(scene.groups).some(g => g.id.startsWith('region_')))}
        {renderArrayWindowOverlay(entities, 'backdrop')}
        {(() => {
          const geoCells = entities.filter((e): e is SceneCell => e.type === 'cell' && e.id.startsWith('geo_'))
          return geoCells.length > 0 ? <GeometryView cells={geoCells} /> : null
        })()}
        <g className="pointer-events-auto">
          {edges.map((edge) => <EdgeView key={edge.id} edge={edge} scene={scene} />)}
          {renderArrayIndexAxis(targetScene)}
          {entities.map((entity) => entity.type === 'cell' ? <CellView key={entity.id} cell={entity} /> : null)}
          {(() => {
            const autoCells = entities.filter((e): e is SceneCell => e.type === 'cell' && e.id.startsWith('auto_'))
            return autoCells.length > 0 ? <AutomatonView cells={autoCells} /> : null
          })()}
          {renderArrayWindowOverlay(entities, 'boundary')}
          {entities.map((entity) => entity.type === 'node' ? <NodeView key={entity.id} node={entity} /> : null)}
          {(() => {
            const probCells = entities.filter((e): e is SceneCell => e.type === 'cell' && e.id.startsWith('prob_'))
            return probCells.length > 0 ? <DistributionView cells={probCells} /> : null
          })()}
          {labels.map((label) => <LabelView key={label.id} label={label} />)}
          {pointers.map((pointer, index) => <PointerView key={pointer.id} pointer={pointer} scene={scene} index={index} />)}
          {dpPanels.map((panel) => (
            <foreignObject
              key={panel.id}
              x={panel.position.x - panel.size.width / 2}
              y={panel.position.y - panel.size.height / 2}
              width={panel.size.width}
              height={panel.size.height}
              className="pointer-events-auto"
            >
              <div className="h-full w-full">
                <DPTableView model={panel.model} />
              </div>
            </foreignObject>
          ))}
          {scene.entities['gan_marker']?.type === 'cell' && (
            <GraphAnalysisView marker={scene.entities['gan_marker'] as SceneCell} scene={scene} />
          )}
        </g>
        <style>{EDGE_FLOW_KEYFRAMES}</style>
      </svg>
      <AlgorithmOverlays overlays={scene.overlays} />
      {!isEmpty && <ColorLegend />}

      {/* Floating Zoom / Pan Controls */}
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        className="absolute top-4 right-4 flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md z-10 select-none"
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <div className="h-4 w-px bg-slate-200 mx-0.5" />
        <button
          onClick={handleReset}
          title="Reset View"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-center text-sm text-slate-500 shadow-sm pointer-events-auto">
            当前步骤尚未生成场景对象
          </div>
        </div>
      )}
      {(() => {
        const descriptionText = currentStepData
          ? (lang === 'zh' ? currentStepData.description.zh : currentStepData.description.en)
          : latestNote
        
        return descriptionText ? (
          <div className="absolute bottom-5 left-1/2 max-w-xl w-[90%] md:w-auto -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-sm text-center pointer-events-none transition-all duration-300 z-50">
            {descriptionText}
          </div>
        ) : null
      })()}
    </div>
  )
}

/**
 * 数组下标轴:从「目标场景」(未补间、位置固定)绘制每个数组格的下标标签。
 * 值互换动画里格子会滑动交叉,但下标代表的是固定槽位,必须钉在原处不跟着滑——
 * 因此独立于会滑动的 CellView,直接按目标位置绘制。
 */
function renderArrayIndexAxis(targetScene: SceneState) {
  const cells = Object.values(targetScene.entities).filter(
    (e): e is SceneCell => e.type === 'cell' && /^arr_\d+$/.test(e.id) && e.row === undefined && e.col !== undefined,
  )
  if (cells.length === 0) return null
  return (
    <g aria-hidden="true">
      {cells.map((cell) => {
        const h = cell.size?.height ?? 44
        return (
          <text
            key={`idxaxis_${cell.id}`}
            x={cell.position.x}
            y={cell.position.y + h / 2 + 14}
            textAnchor="middle"
            fontSize="10"
            fill="#94A3B8"
            fontFamily="monospace"
          >
            {cell.col}
          </text>
        )
      })}
    </g>
  )
}

function renderArrayWindowOverlay(entities: SceneEntity[], layer: 'backdrop' | 'boundary') {
  const windowCells = entities
    .filter((entity): entity is SceneCell =>
      entity.type === 'cell' &&
      /^arr_\d+$/.test(entity.id) &&
      entity.state?.role === 'window'
    )
    .sort((a, b) => parseInt(a.id.replace('arr_', '')) - parseInt(b.id.replace('arr_', '')))

  if (windowCells.length === 0) return null

  const segments: SceneCell[][] = []
  for (const cell of windowCells) {
    const index = parseInt(cell.id.replace('arr_', ''))
    const lastSegment = segments[segments.length - 1]
    const previous = lastSegment?.[lastSegment.length - 1]
    const previousIndex = previous ? parseInt(previous.id.replace('arr_', '')) : null
    if (!lastSegment || previousIndex === null || index !== previousIndex + 1) {
      segments.push([cell])
    } else {
      lastSegment.push(cell)
    }
  }

  return (
    <g className="array-window-overlays" pointerEvents="none">
      {segments.map((segment, segmentIndex) => {
        const first = segment[0]
        const last = segment[segment.length - 1]
        const firstWidth = first.size?.width ?? 44
        const lastWidth = last.size?.width ?? 44
        const height = Math.max(...segment.map(cell => cell.size?.height ?? 44))
        const left = first.position.x - firstWidth / 2
        const right = last.position.x + lastWidth / 2
        const top = first.position.y - height / 2
        const overlayWidth = right - left
        const color = first.state?.color === 'success'
          ? { stroke: SEMANTIC_COLORS.success.stroke, fill: '#D1FAE5', rail: '#6EE7B7' }
          : { stroke: '#2563EB', fill: '#DBEAFE', rail: '#93C5FD' }
        const railY = height + 8
        const boundaryTop = -2
        const boundaryBottom = height + 10

        return (
          <g
            key={`array-window-${layer}-${segmentIndex}`}
            className="array-window-overlay"
            style={{ transform: `translate(${left}px, ${top}px)` }}
          >
            {layer === 'backdrop' && (
              <>
                <rect
                  x={-3}
                  y={-4}
                  width={overlayWidth + 6}
                  height={height + 8}
                  rx={10}
                  fill={color.fill}
                  opacity={0.34}
                />
                <line
                  x1={-4}
                  y1={railY}
                  x2={overlayWidth + 4}
                  y2={railY}
                  stroke={color.rail}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.58}
                />
              </>
            )}
            {layer === 'boundary' && (
              <>
                <line
                  x1={-5}
                  y1={boundaryTop}
                  x2={-5}
                  y2={boundaryBottom}
                  stroke={color.stroke}
                  strokeWidth={3.4}
                  strokeLinecap="round"
                  className="array-window-boundary"
                />
                <line
                  x1={overlayWidth + 5}
                  y1={boundaryTop}
                  x2={overlayWidth + 5}
                  y2={boundaryBottom}
                  stroke={color.stroke}
                  strokeWidth={3.4}
                  strokeLinecap="round"
                  className="array-window-boundary"
                />
              </>
            )}
          </g>
        )
      })}
      <style>{`
        .array-window-overlay {
          transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .array-window-boundary {
          filter: drop-shadow(0 2px 4px rgb(37 99 235 / 0.22));
        }
      `}</style>
    </g>
  )
}

function renderContainers(entities: SceneEntity[], composite: boolean) {
  const cells = entities.filter(e => e.type === 'cell') as SceneCell[]
  const nodes = entities.filter(e => e.type === 'node') as SceneNode[]
  const stackCells = cells.filter(c => c.id.startsWith('stack_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const queueCells = cells.filter(c => c.id.startsWith('queue_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const dequeCells = cells.filter(c => c.id.startsWith('deque_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const setCells = cells.filter(c => c.id.startsWith('set_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const mapNodes = nodes.filter(n => n.id.startsWith('map_') && !n.id.startsWith('phantom_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const auxCells = cells.filter(c => c.id.startsWith('aux_'))
  const hashBuckets = cells.filter(c => c.id.startsWith('hashbucket_'))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const hashEntries = cells.filter(c => c.id.startsWith('hashentry_'))
  const loadFactorCell = cells.find(c => c.id === 'hashtable_loadfactor')
  // heap_<i> tree nodes (digit-suffixed only — excludes heap_variant marker)
  const heapNodes = cells.filter(c => /^heap_\d+$/.test(c.id))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const mathVars = cells.filter(c => c.id.startsWith('mathvar_'))
    .sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  // Precise s_<row>_<index> match — avoids colliding with set_/stack_/etc.
  const stringCells = cells.filter(c => /^s_\d+_\d+$/.test(c.id))
  const bitCells = cells.filter(c => /^bit_\d+$/.test(c.id))
    .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]))
  const bitsetLabelCell = cells.find(c => c.id === 'bitset_label')
  return (
    <>
      {stackCells.length > 0 && <ContainerView type="stack" cells={stackCells} />}
      {queueCells.length > 0 && <ContainerView type="queue" cells={queueCells} />}
      {dequeCells.length > 0 && <ContainerView type="queue" cells={dequeCells} />}
      {setCells.length > 0 && <SetView cells={setCells} hideTitle={composite} />}
      {mapNodes.length > 0 && <ContainerView type="map" cells={[]} nodes={mapNodes} />}
      {auxCells.length > 0 && <ContainerView type="auxiliary" cells={auxCells} />}
      {hashBuckets.length > 0 && <HashTableView buckets={hashBuckets} entries={hashEntries} loadFactorCell={loadFactorCell} hideTitle={composite} />}
      {heapNodes.length > 0 && <HeapView nodes={heapNodes} hideTitle={composite} />}
      {mathVars.length > 0 && <VariablesView vars={mathVars} hideTitle={composite} />}
      {stringCells.length > 0 && <StringView cells={stringCells} hideTitle={composite} />}
      {bitCells.length > 0 && <BitsetView bits={bitCells} labelCell={bitsetLabelCell} hideTitle={composite} />}
    </>
  )
}

type DPPanelEntity = {
  id: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  model: DPTableModel
}

function createDPPanelEntities(entities: SceneEntity[], tables: DPTableModel[]): DPPanelEntity[] {
  if (tables.length === 0) return []

  const positioned = entities.filter(
    (e): e is SceneEntity & { position: { x: number; y: number } } =>
      'position' in e && !!e.position,
  )
  const bounds = positioned.length > 0 ? boundsFor(positioned) : { minX: 120, minY: 120, maxX: 360, maxY: 320 }
  const startX = bounds.maxX + 430
  const startY = Math.min(bounds.minY + 160, 260)

  let cursorY = startY
  return tables.map((model) => {
    const formulaRows = Math.max(1, Math.ceil(Math.max(model.formulas.length, 1) / 4))
    const focusHeight = model.formulas.length > 0 ? 118 : 0
    const footerHeight = model.formulas.length > 0 ? 38 + formulaRows * 34 : 0
    const width = Math.max(560, model.colCount * 108 + 170)
    const height = 64 + focusHeight + 24 + model.rowCount * 58 + footerHeight
    const panel: DPPanelEntity = {
      id: `dp_panel_${model.id}`,
      position: { x: startX, y: cursorY + height / 2 },
      size: { width, height },
      model,
    }
    cursorY += height + 28
    return panel
  })
}

function boundsFor(entities: Array<SceneEntity & { position: { x: number; y: number } }>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const e of entities) {
    const w = ('size' in e ? e.size?.width : 80) ?? 80
    const h = ('size' in e ? e.size?.height : 60) ?? 60
    const hw = w / 2
    const hh = h / 2
    minX = Math.min(minX, e.position.x - hw)
    minY = Math.min(minY, e.position.y - hh)
    maxX = Math.max(maxX, e.position.x + hw)
    maxY = Math.max(maxY, e.position.y + hh)
  }
  return { minX, minY, maxX, maxY }
}

function computeViewBoxDimensions(
  entities: Array<SceneEntity | DPPanelEntity>,
  labels: SceneEntity[]
): { xStart: number; yStart: number; width: number; height: number } {
  const positioned = [...entities, ...labels].filter(
    (e): e is SceneEntity & { position: { x: number; y: number } } =>
      'position' in e && !!e.position
  )
  
  if (positioned.length === 0) {
    return { xStart: 0, yStart: 0, width: 1000, height: 620 }
  }

  const padding = 60
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  for (const e of positioned) {
    const w = ('size' in e ? e.size?.width : 80) ?? 80
    const h = ('size' in e ? e.size?.height : 60) ?? 60
    const hw = w / 2
    const hh = h / 2
    if (e.position.x - hw < minX) minX = e.position.x - hw
    if (e.position.y - hh < minY) minY = e.position.y - hh
    if (e.position.x + hw > maxX) maxX = e.position.x + hw
    if (e.position.y + hh > maxY) maxY = e.position.y + hh
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const contentWidth = maxX - minX
  const contentHeight = maxY - minY

  // Target aspect ratio of 1.6 (approx 16:10 or 1000:620)
  const targetRatio = 1.6
  
  let viewBoxWidth = contentWidth + padding * 2
  let viewBoxHeight = contentHeight + padding * 2

  if (viewBoxWidth / viewBoxHeight > targetRatio) {
    // Width is the limiting dimension, grow height to match aspect ratio
    viewBoxHeight = viewBoxWidth / targetRatio
  } else {
    // Height is the limiting dimension, grow width to match aspect ratio
    viewBoxWidth = viewBoxHeight * targetRatio
  }

  // Minimum dimensions to prevent excessive zoom-in on tiny contents
  const minWidth = 720
  const minHeight = minWidth / targetRatio // 450

  const finalWidth = Math.max(minWidth, viewBoxWidth)
  const finalHeight = Math.max(minHeight, viewBoxHeight)

  const xStart = centerX - finalWidth / 2
  const yStart = centerY - finalHeight / 2

  return { xStart, yStart, width: finalWidth, height: finalHeight }
}
