import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { VisualState } from '@/hooks/useAnimationEngine'

interface GraphRendererProps {
  visualState: VisualState
}

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)', success: 'var(--color-success)',
  warning: 'var(--color-warning)', danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

const layoutCache = new Map<string, Map<string, { x: number; y: number }>>()

function stableKey(nodes: { id: string }[]): string {
  return nodes.map(n => n.id).sort().join(',')
}

export default function GraphRenderer({ visualState }: GraphRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { colorMap, edgeColorMap, teachingState } = visualState
  const nodes = visualState.nodes || []
  const edges = visualState.edges || []

  const gState = teachingState?.graph
  const queue = gState?.queue
  const stack = gState?.stack
  const distances = gState?.distances
  const output = gState?.output
  const sets = gState?.sets
  const nodeStates = gState?.nodeStates
  const edgeStates = gState?.edgeStates

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 400
    const height = svgRef.current.clientHeight || 300

    const hasExplicitPosition = nodes.every((n) => n.x !== undefined && n.y !== undefined)
    const key = stableKey(nodes)
    let posMap = hasExplicitPosition ? new Map<string, { x: number; y: number }>() : layoutCache.get(key)
    if (hasExplicitPosition) {
      for (const node of nodes) {
        const rawX = node.x ?? 0
        const rawY = node.y ?? 0
        posMap!.set(node.id, {
          x: rawX <= 100 ? (rawX / 100) * width : rawX,
          y: rawY <= 100 ? (rawY / 100) * height : rawY,
        })
      }
    } else if (!posMap || posMap.size !== nodes.length) {
      posMap = new Map()
      const margin = 40
      const cx = width / 2, cy = height / 2
      const r = Math.min(width - 2 * margin, height - 2 * margin) / 2 * 0.75
      nodes.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
        posMap!.set(n.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
      })
      layoutCache.set(key, posMap)
    }

    // Arrowhead marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 22).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', 'var(--color-muted)')

    const g = svg.append('g')

    // Edges
    edges.forEach((e) => {
      const sp = posMap!.get(String(e.source)), tp = posMap!.get(String(e.target))
      if (!sp || !tp) return
      const edgeKey = `${e.source}->${e.target}`
      const revKey = `${e.target}->${e.source}`
      const teachingEdge = edgeStates?.find((state) =>
        (state.source === e.source && state.target === e.target) ||
        (!state.directed && state.source === e.target && state.target === e.source),
      )
      const ecKey = teachingEdge?.color ?? edgeColorMap?.get(edgeKey) ?? edgeColorMap?.get(revKey)
      const ec = ecKey ? (COLOR_MAP[ecKey] ?? 'var(--color-warning)') : 'var(--color-muted)'
      const sw = teachingEdge ? 3 : ecKey ? 2.5 : 1.2

      g.append('line')
        .attr('x1', sp.x).attr('y1', sp.y)
        .attr('x2', tp.x).attr('y2', tp.y)
        .attr('stroke', ec).attr('stroke-width', sw)
        .attr('marker-end', 'url(#arrow)')
        .style('transition', 'stroke 0.3s ease')

      // Weight label — offset perpendicular to edge
      if (e.weight !== undefined) {
        const mx = (sp.x + tp.x) / 2, my = (sp.y + tp.y) / 2
        const dx = tp.x - sp.x, dy = tp.y - sp.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const offX = (-dy / len) * 10, offY = (dx / len) * 10
        g.append('rect')
          .attr('x', mx + offX - 10).attr('y', my + offY - 9)
          .attr('width', 20).attr('height', 16).attr('rx', 3)
          .attr('fill', 'white').attr('fill-opacity', 0.85)
        g.append('text')
          .attr('x', mx + offX).attr('y', my + offY + 2)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', '11').attr('font-family', 'var(--font-code)')
          .attr('font-weight', '600').attr('fill', 'var(--color-muted)')
          .text(String(e.weight))
      }
    })

    // Nodes
    nodes.forEach((n, i) => {
      const p = posMap!.get(n.id)
      if (!p) return
      const ns = nodeStates?.find(s => s.id === n.id)
      const role = ns?.role
      const colorKey = ns?.color ?? colorMap.get(i) ?? 'primary'
      const fill = COLOR_MAP[colorKey] || COLOR_MAP.primary
      const nodeR = 18

      const ng = g.append('g').attr('transform', `translate(${p.x},${p.y})`)

      // Pulse ring for active roles
      if (role === 'current' || role === 'queued' || role === 'stacked') {
        ng.append('circle').attr('r', nodeR + 5).attr('fill', 'none')
          .attr('stroke', fill).attr('stroke-width', 2.5).attr('opacity', 0.5)
          .attr('class', 'pulse-ring')
      }

      ng.append('circle').attr('r', nodeR).attr('fill', fill)
        .attr('stroke', 'white').attr('stroke-width', 2)
        .style('transition', 'fill 0.3s ease')

      const label = n.label || n.id
      const fs = label.length > 2 ? 10 : 12
      ng.append('text').attr('y', 1).attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', fs).attr('font-family', 'var(--font-code)')
        .attr('font-weight', '600').attr('fill', 'white')
        .text(label)

      // Role label outside ring
      if (role) {
        ng.append('text').attr('y', -(nodeR + 8)).attr('text-anchor', 'middle')
          .attr('font-size', '8').attr('font-family', 'var(--font-code)')
          .attr('font-weight', '700').attr('fill', fill)
          .text(role.toUpperCase())
      }

      // Distance below node
      const dist = distances?.[n.id]
      if (dist !== undefined && dist !== '∞') {
        ng.append('text').attr('y', nodeR + 12).attr('text-anchor', 'middle')
          .attr('font-size', '9').attr('font-family', 'var(--font-code)')
          .attr('font-weight', '600').attr('fill', fill)
          .text(String(dist))
      }
    })
  }, [nodes, edges, colorMap, edgeColorMap, teachingState])

  if (nodes.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted text-sm">No graph data to visualize</div>
  }

  const hasPanels = !!(queue || stack || output || distances || (sets && Object.keys(sets).length > 0))

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />

      {hasPanels && (
        <div className="absolute bottom-1 left-1 right-1 flex gap-1 flex-wrap text-[10px] font-code max-h-[40%] overflow-y-auto">
          {queue && (
            <span className="bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 inline-flex items-baseline gap-1">
              <span className="text-blue-500 font-semibold shrink-0">队列</span>
              <span className="text-blue-700 truncate max-w-[200px]">{queue.join(' → ') || '空'}</span>
            </span>
          )}
          {stack && (
            <span className="bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 inline-flex items-baseline gap-1">
              <span className="text-purple-500 font-semibold shrink-0">栈</span>
              <span className="text-purple-700 truncate max-w-[200px]">{stack.join(' → ') || '空'}</span>
            </span>
          )}
          {output && output.length > 0 && (
            <span className="bg-green-50 border border-green-200 rounded px-1.5 py-0.5 inline-flex items-baseline gap-1">
              <span className="text-green-500 font-semibold shrink-0">输出</span>
              <span className="text-green-700 truncate max-w-[200px]">{output.join(', ')}</span>
            </span>
          )}
          {sets && Object.entries(sets).map(([name, members]) => (
            <span key={name} className="bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-flex items-baseline gap-1">
              <span className="text-amber-500 font-semibold shrink-0">{name}</span>
              <span className="text-amber-700 truncate max-w-[200px]">{members.join(' ')}</span>
            </span>
          ))}
          {distances && (
            <span className="bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 inline-flex items-baseline gap-1">
              <span className="text-orange-500 font-semibold shrink-0">距离</span>
              <span className="text-orange-700 truncate max-w-[200px]">
                {Object.entries(distances).filter(([,v]) => v !== '∞').map(([k,v]) => `${k}:${v}`).join(' ')}
              </span>
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-ring-anim {
          0% { opacity: 0.5; } 100% { opacity: 0; }
        }
        .pulse-ring { animation: pulse-ring-anim 0.8s ease-out infinite alternate; }
      `}</style>
    </div>
  )
}
