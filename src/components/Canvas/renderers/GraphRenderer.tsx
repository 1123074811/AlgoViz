import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import type { VisualState } from '@/hooks/useAnimationEngine'

interface GraphNode {
  id: string
  label?: string
  x?: number
  y?: number
  fx?: number
  fy?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  weight?: number
}

interface GraphRendererProps {
  visualState: VisualState & { nodes?: { id: string; label?: string }[]; edges?: { source: string; target: string; weight?: number }[] }
}

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

export default function GraphRenderer({ visualState }: GraphRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { colorMap } = visualState
  const nodes = visualState.nodes || []
  const edges = visualState.edges || []

  const graphData = useMemo(() => {
    if (nodes.length === 0) return null

    const nodeList: GraphNode[] = nodes.map((n) => ({ ...n }))
    const linkList: GraphLink[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }))

    return { nodes: nodeList, links: linkList }
  }, [nodes, edges])

  useEffect(() => {
    if (!svgRef.current || !graphData) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const g = svg.append('g')

    // Force simulation
    const simulationNodes = graphData.nodes.map((n) => ({ ...n })) as d3.SimulationNodeDatum[]
    const simulationLinks = graphData.links.map((l) => ({
      source: l.source,
      target: l.target,
      weight: l.weight,
    })) as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[]

    d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: d3.SimulationNodeDatum) => (d as GraphNode).id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20))
      .stop()
      .tick(120)

    // Draw edges
    const linkGroup = g.append('g')
    const edgesSelection = linkGroup.selectAll<SVGLineElement, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>('line')
      .data(simulationLinks)

    edgesSelection.enter()
      .append('line')
      .attr('x1', (d) => (d.source as d3.SimulationNodeDatum).x ?? 0)
      .attr('y1', (d) => (d.source as d3.SimulationNodeDatum).y ?? 0)
      .attr('x2', (d) => (d.target as d3.SimulationNodeDatum).x ?? 0)
      .attr('y2', (d) => (d.target as d3.SimulationNodeDatum).y ?? 0)
      .attr('stroke', 'var(--color-muted)')
      .attr('stroke-width', 2)

    // Draw nodes
    const nodeGroup = g.append('g')
    const nodeSelection = nodeGroup.selectAll<SVGGElement, d3.SimulationNodeDatum>('g')
      .data(simulationNodes)

    const nodeEnter = nodeSelection.enter().append('g')

    nodeEnter.append('circle')
      .attr('r', 18)
      .attr('cx', (d) => d.x ?? 0)
      .attr('cy', (d) => d.y ?? 0)
      .attr('fill', (_d, i) => {
        return COLOR_MAP[colorMap.get(i) || 'primary'] || COLOR_MAP.primary
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('transition', 'fill 300ms ease')

    nodeEnter.append('text')
      .attr('x', (d) => d.x ?? 0)
      .attr('y', (d) => (d.y ?? 0) + 1)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '11')
      .attr('font-family', 'var(--font-code)')
      .attr('font-weight', '600')
      .attr('fill', 'white')
      .text((d) => (d as GraphNode).label || (d as GraphNode).id)
  }, [graphData, colorMap])

  if (!graphData || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No graph data to visualize
      </div>
    )
  }

  return (
    <svg ref={svgRef} className="w-full h-full" />
  )
}
