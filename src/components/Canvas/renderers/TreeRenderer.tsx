import { useMemo } from 'react'
import type { VisualState } from '@/hooks/useAnimationEngine'

interface TreeNode {
  id: string; value: string | number; children: string[]
  x: number; y: number; depth: number
  label?: string; metadata?: Record<string, string | number | boolean | null>
}

interface TreeRendererProps { visualState: VisualState }

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)', success: 'var(--color-success)',
  warning: 'var(--color-warning)', danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

function layoutTreeNodes(nodes: TreeNode[], rootId?: string | number, childrenMap?: Record<string, Array<string | number>>): TreeNode[] {
  if (nodes.length === 0) return []

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const root = nodeMap.get(String(rootId ?? nodes[0].id)) ?? nodes[0]
  const q = [root]
  const seen = new Set<string>([root.id])
  const depthGroups: TreeNode[][] = []

  root.depth = 0
  while (q.length > 0) {
    const node = q.shift()!
    if (!depthGroups[node.depth]) depthGroups[node.depth] = []
    depthGroups[node.depth].push(node)
    const childIds = childrenMap?.[node.id] ?? node.children
    node.children = childIds.map(String).filter(childId => nodeMap.has(childId))
    for (const childId of node.children) {
      if (seen.has(childId)) continue
      const child = nodeMap.get(childId)
      if (child) {
        child.depth = node.depth + 1
        seen.add(childId)
        q.push(child)
      }
    }
  }

  const maxDepth = Math.max(...depthGroups.map((_, i) => i), 0)
  const maxPerLevel = Math.max(...depthGroups.map(g => g?.length ?? 0), 1)
  const vPad = 85 / Math.max(maxDepth, 1)
  const hBase = 90 / Math.max(maxPerLevel + 0.5, 1)
  for (let d = 0; d <= maxDepth; d++) {
    const group = depthGroups[d] || []
    const totalWidth = group.length * hBase
    const startX = (100 - totalWidth) / 2 + hBase / 2
    group.forEach((node, i) => {
      node.x = node.x || startX + i * hBase
      node.y = node.y || 8 + d * vPad
    })
  }

  return nodes
}

function buildExplicitTreeLayout(visualState: VisualState): TreeNode[] {
  const treeNodes = visualState.treeNodes
  if (!treeNodes || treeNodes.length === 0) return []

  const nodes = treeNodes.map((node) => ({
    id: String(node.id),
    value: node.value,
    label: node.label,
    metadata: node.metadata,
    children: (visualState.children?.[String(node.id)] ?? []).map(String),
    x: node.x ?? 0,
    y: node.y ?? 0,
    depth: 0,
  }))

  return layoutTreeNodes(nodes, visualState.root, visualState.children)
}

function buildTreeLayout(arrayData: number[]): TreeNode[] {
  if (arrayData.length === 0) return []

  const nodes: TreeNode[] = arrayData.map((value, i) => ({
    id: String(i), value, children: [] as string[], x: 0, y: 0, depth: 0,
  }))

  for (let i = 0; i < nodes.length; i++) {
    const left = 2 * i + 1, right = 2 * i + 2
    if (left < nodes.length && arrayData[left] !== 0) nodes[i].children.push(String(left))
    if (right < nodes.length && arrayData[right] !== 0) nodes[i].children.push(String(right))
  }

  return layoutTreeNodes(nodes)
}

// Only show tree nodes that actually have children or are non-zero
function visibleNodes(allNodes: TreeNode[]): TreeNode[] {
  // In complete binary tree mode, filter out zero-value leaf nodes that have no children
  // But keep root and internal nodes
  return allNodes.filter(n => {
    if (n.value === 0 && n.children.length === 0) return false
    return true
  })
}

export default function TreeRenderer({ visualState }: TreeRendererProps) {
  const teachingState = visualState.teachingState
  const tState = teachingState?.tree
  const nodeStates = tState?.nodeStates
  const edgeStates = tState?.edgeStates
  const traversalPath = tState?.traversalPath
  const rotation = tState?.rotation
  const { colorMap } = visualState

  const allNodes = useMemo(() => {
    const explicitNodes = buildExplicitTreeLayout(visualState)
    return explicitNodes.length > 0 ? explicitNodes : buildTreeLayout(visualState.arrayData)
  }, [visualState])
  const treeNodes = useMemo(() => visualState.treeNodes ? allNodes : visibleNodes(allNodes), [allNodes, visualState.treeNodes])

  if (treeNodes.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted text-sm">No tree data to visualize</div>
  }

  // Edges
  const edges: { id: string; x1: number; y1: number; x2: number; y2: number; source: string; target: string }[] = []
  for (const node of allNodes) {
    for (const childId of node.children) {
      const child = allNodes.find(n => n.id === childId)
      if (child) edges.push({ id: `${node.id}-${childId}`, x1: node.x, y1: node.y, x2: child.x, y2: child.y, source: node.id, target: childId })
    }
  }

  const getEdgeColor = (src: string, tgt: string): string => {
    const es = edgeStates?.find(e => (e.source === src && e.target === tgt) || (e.source === tgt && e.target === src))
    if (es?.color) return COLOR_MAP[es.color] ?? COLOR_MAP.muted
    return 'var(--color-muted)'
  }
  const getEdgeWidth = (src: string, tgt: string): number => {
    const es = edgeStates?.find(e => (e.source === src && e.target === tgt) || (e.source === tgt && e.target === src))
    return es ? 1.5 : 0.6
  }

  // Dynamically size nodes based on count
  const nodeCount = treeNodes.length
  const r = nodeCount > 20 ? 2.5 : nodeCount > 12 ? 3.2 : 4
  const labelSize = nodeCount > 20 ? '1.8' : nodeCount > 12 ? '2.3' : '2.8'
  const metaSize = nodeCount > 20 ? '1.2' : '1.5'

  // Truncate traversal path
  const pathStr = traversalPath && traversalPath.length > 0
    ? traversalPath.map(String).join(' → ')
    : ''
  const showPath = pathStr.length > 40 ? pathStr.slice(0, 38) + '…' : pathStr

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {/* Edges */}
      {edges.map((edge) => (
        <line key={edge.id}
          x1={`${edge.x1}%`} y1={`${edge.y1}%`} x2={`${edge.x2}%`} y2={`${edge.y2}%`}
          stroke={getEdgeColor(edge.source, edge.target)}
          strokeWidth={getEdgeWidth(edge.source, edge.target)}
          style={{ transition: 'stroke 0.3s ease' }}
        />
      ))}

      {/* Rotation indicator */}
      {rotation && (
        <g>
          <rect x="68" y="1.5" width="30" height="6" rx="1.2" fill="var(--color-surface)" />
          <text x="83" y="4" textAnchor="middle" fontSize="2.2" fontWeight="700"
            fill={COLOR_MAP.danger} fontFamily="var(--font-code)">
            {rotation.type.replace('-', '/').toUpperCase()}
          </text>
          <text x="83" y="6.5" textAnchor="middle" fontSize="1.6"
            fill="var(--color-muted)" fontFamily="var(--font-code)">
            pivot:{rotation.pivot}{rotation.child ? ` child:${rotation.child}` : ''}
          </text>
        </g>
      )}

      {/* Traversal path footer */}
      {showPath && (
        <g>
          <rect x="1" y="95.5" width="98" height="4.5" rx="1.5" fill="var(--color-surface)" />
          <text x="50" y="98.2" textAnchor="middle" fontSize="1.8" fill="var(--color-muted)"
            fontFamily="var(--font-code)">
            {showPath}
          </text>
        </g>
      )}

      {/* Nodes */}
      {treeNodes.map((node) => {
        const idx = parseInt(node.id, 10)
        const ns = nodeStates?.find(s => String(s.id) === node.id)
        const colorKey = ns?.color ?? colorMap.get(isNaN(idx) ? 0 : idx) ?? 'primary'
        const fill = COLOR_MAP[colorKey] || COLOR_MAP.primary
        const isInPath = traversalPath?.some(p => String(p) === node.id)

        return (
          <g key={node.id}>
            {isInPath && (
              <circle cx={`${node.x}%`} cy={`${node.y}%`} r={r + 2}
                fill="none" stroke={fill} strokeWidth="0.6" opacity="0.35" />
            )}
            <circle cx={`${node.x}%`} cy={`${node.y}%`} r={r}
              fill={ns?.rbColor === 'black' ? '#333' : ns?.rbColor === 'red' ? COLOR_MAP.danger : fill}
              stroke={ns?.rbColor ? '#666' : 'white'} strokeWidth={ns?.rbColor ? 1.2 : 0.6}
              style={{ transition: 'fill 0.3s ease' }} />
            <text x={`${node.x}%`} y={`${node.y + 0.4}%`}
              textAnchor="middle" dominantBaseline="central"
              fontSize={labelSize} fontWeight="600" fill="white" fontFamily="var(--font-code)">
              {String(node.value).slice(0, 4)}
            </text>
            {ns && (ns.height !== undefined || ns.balanceFactor !== undefined) && (
              <text x={`${node.x}%`} y={`${node.y + r + 1.8}%`}
                textAnchor="middle" fontSize={metaSize} fill="var(--color-muted)" fontFamily="var(--font-code)">
                {ns.height !== undefined ? `h=${ns.height}` : ''}
                {ns.balanceFactor !== undefined ? ` bf=${ns.balanceFactor}` : ''}
              </text>
            )}
            {node.metadata?.end && (
              <text x={`${node.x}%`} y={`${node.y - r - 1.2}%`}
                textAnchor="middle" fontSize={metaSize} fill={COLOR_MAP.success} fontFamily="var(--font-code)" fontWeight="700">
                END
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
