import { useMemo } from 'react'
import type { VisualState } from '@/hooks/useAnimationEngine'

interface TreeNode {
  id: number
  value: number
  children: number[]
  x: number
  y: number
  depth: number
}

interface TreeRendererProps {
  visualState: VisualState
}

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

function buildTreeLayout(data: number[]): TreeNode[] {
  if (data.length === 0) return []

  const nodes: TreeNode[] = data.map((value, i) => ({
    id: i,
    value,
    children: [] as number[],
    x: 0,
    y: 0,
    depth: 0,
  }))

  // Build binary tree children
  for (let i = 0; i < nodes.length; i++) {
    const left = 2 * i + 1
    const right = 2 * i + 2
    if (left < nodes.length) nodes[i].children.push(left)
    if (right < nodes.length) nodes[i].children.push(right)
  }

  // Calculate depths using BFS
  const queue = [0]
  while (queue.length > 0) {
    const idx = queue.shift()!
    for (const child of nodes[idx].children) {
      nodes[child].depth = nodes[idx].depth + 1
      queue.push(child)
    }
  }

  // Calculate positions
  const maxDepth = Math.max(...nodes.map((n) => n.depth), 0)
  const depthCount = new Array(maxDepth + 1).fill(0)
  for (const node of nodes) {
    node.y = 10 + (node.depth / Math.max(maxDepth, 1)) * 80
    const count = depthCount[node.depth]
    node.x = 10 + (count + 0.5) * (90 / Math.max(depthCount[node.depth] + 1, 1))
    depthCount[node.depth]++
  }

  return nodes
}

export default function TreeRenderer({ visualState }: TreeRendererProps) {
  const { arrayData, colorMap } = visualState

  const treeNodes = useMemo(() => buildTreeLayout(arrayData), [arrayData])

  if (treeNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No tree data to visualize
      </div>
    )
  }

  // Build edges
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (const node of treeNodes) {
    for (const childIdx of node.children) {
      const child = treeNodes[childIdx]
      edges.push({ x1: node.x, y1: node.y, x2: child.x, y2: child.y })
    }
  }

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {/* Edges */}
      {edges.map((edge, i) => (
        <line
          key={i}
          x1={`${edge.x1}%`}
          y1={`${edge.y1}%`}
          x2={`${edge.x2}%`}
          y2={`${edge.y2}%`}
          stroke="var(--color-muted)"
          strokeWidth="0.5"
          style={{ transition: 'all 300ms ease' }}
        />
      ))}

      {/* Nodes */}
      {treeNodes.map((node) => {
        const color = COLOR_MAP[colorMap.get(node.id) || 'primary'] || COLOR_MAP.primary

        return (
          <g key={node.id}>
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="0.8"
              style={{ transition: 'fill 300ms ease' }}
            />
            <text
              x={`${node.x}%`}
              y={`${node.y + 0.5}%`}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="3"
              fontWeight="600"
              fill="white"
              fontFamily="var(--font-code)"
            >
              {node.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
