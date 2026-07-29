import type { ActionColor, AnimationScript } from '@/types/animation'
import { makeStep } from './utils'

type TreeValue = number | null
type TreeEdge = { parentId: string; childId: string; port: 'left' | 'right' }

const DEFAULT_TREE: TreeValue[] = [8, 3, 10, 1, 6, null, 14, 4, 7, 13]

export function generateBinaryTree(arr?: TreeValue[]): AnimationScript {
  const serialized = arr?.length ? [...arr] : DEFAULT_TREE
  const nodes: Array<{ id: string; value: number }> = []
  const edges: TreeEdge[] = []
  const children = new Map<string, { left?: string; right?: string }>()
  const values = new Map<string, number>()
  const queue: string[] = []

  if (serialized[0] !== null && serialized[0] !== undefined) {
    nodes.push({ id: '0', value: serialized[0] })
    values.set('0', serialized[0])
    children.set('0', {})
    queue.push('0')
  }

  let cursor = 1
  while (queue.length > 0 && cursor < serialized.length) {
    const parentId = queue.shift()!
    const childPair = children.get(parentId) ?? {}
    for (const port of ['left', 'right'] as const) {
      if (cursor >= serialized.length) break
      const value = serialized[cursor]
      const childId = String(cursor++)
      if (value === null || value === undefined) continue
      nodes.push({ id: childId, value })
      values.set(childId, value)
      children.set(childId, {})
      childPair[port] = childId
      edges.push({ parentId, childId, port })
      queue.push(childId)
    }
    children.set(parentId, childPair)
  }

  const rootId = nodes[0]?.id ?? '0'
  const inorder = traversal(rootId, children, 'inorder')
  const preorder = traversal(rootId, children, 'preorder')
  const postorder = traversal(rootId, children, 'postorder')
  const levelOrder = breadthFirst(rootId, children)
  const result = levelOrder.map(id => values.get(id)!)
  const steps: AnimationScript['steps'] = []
  let sid = 1

  steps.push(makeStep(
    sid++,
    0,
    `构建二叉树：高=${treeHeight(rootId, children)}，共 ${nodes.length} 个节点`,
    `Build the binary tree: height=${treeHeight(rootId, children)}, ${nodes.length} nodes`,
    'highlight',
    nodes.length ? [Number(rootId)] : [],
    'primary',
    0,
    0,
    0,
    nodes.length
      ? { tree: { nodeStates: [{ id: rootId, role: 'root', color: 'primary' as ActionColor }] } }
      : undefined,
  ))
  steps[0].events = [
    { type: 'tree.create', variant: 'binary', rootId, nodes, edges },
    { type: 'scene.seq_clear' },
  ]

  appendTraversal('中序遍历', 'Inorder traversal', 'L→根→R', 'L→Root→R', inorder, 3, 'warning')
  appendTraversal('先序遍历', 'Preorder traversal', '根→L→R', 'Root→L→R', preorder, 4, 'primary')
  appendTraversal('后序遍历', 'Postorder traversal', 'L→R→根', 'L→R→Root', postorder, 5, 'warning')
  appendTraversal('层序遍历（BFS）', 'Level-order traversal (BFS)', '从上到下、从左到右', 'top-to-bottom and left-to-right', levelOrder, 6, 'success')

  return {
    algorithm: 'binary_tree',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(h)' },
    presentation: { engine: 'scene', module: 'tree' },
    initialState: { type: 'tree', data: serialized.map(value => value ?? 0) },
    result,
    steps,
  }

  function appendTraversal(
    zhName: string,
    enName: string,
    zhOrder: string,
    enOrder: string,
    path: string[],
    codeLine: number,
    color: ActionColor,
  ) {
    steps.push(makeStep(
      sid++,
      codeLine,
      `${zhName}（${zhOrder}）开始`,
      `${enName} (${enOrder}) starts`,
      'highlight',
      [],
      'primary',
      0,
      0,
      0,
      { tree: { traversalPath: [] } },
    ))
    steps[steps.length - 1].events = [{ type: 'scene.seq_clear' }]

    path.forEach((nodeId, index) => {
      const value = values.get(nodeId)!
      const visited = path.slice(0, index + 1)
      steps.push(makeStep(
        sid++,
        codeLine,
        `${zhName}：访问 ${value}，当前序列 [${visited.map(id => values.get(id)).join(', ')}]`,
        `${enName}: visit ${value}; sequence [${visited.map(id => values.get(id)).join(', ')}]`,
        'mark',
        [Number(nodeId)],
        color,
        0,
        0,
        index + 1,
        { tree: { traversalPath: visited, nodeStates: [{ id: nodeId, role: 'current', color }] } },
      ))
      steps[steps.length - 1].events = [
        { type: 'tree.visit', nodeId },
        { type: 'scene.seq_push', value },
      ]
    })

    steps.push(makeStep(
      sid++,
      codeLine,
      `${zhName}完成：[${path.map(id => values.get(id)).join(', ')}]`,
      `${enName} complete: [${path.map(id => values.get(id)).join(', ')}]`,
      'mark',
      path.map(Number),
      'success',
      0,
      0,
      path.length,
      { tree: { traversalPath: path } },
    ))
  }
}

function traversal(
  rootId: string,
  children: Map<string, { left?: string; right?: string }>,
  order: 'inorder' | 'preorder' | 'postorder',
): string[] {
  const result: string[] = []
  const visit = (id: string | undefined) => {
    if (!id) return
    const child = children.get(id)
    if (order === 'preorder') result.push(id)
    visit(child?.left)
    if (order === 'inorder') result.push(id)
    visit(child?.right)
    if (order === 'postorder') result.push(id)
  }
  visit(rootId)
  return result
}

function breadthFirst(rootId: string, children: Map<string, { left?: string; right?: string }>): string[] {
  if (!children.has(rootId) && rootId === '0') return []
  const result: string[] = []
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift()!
    result.push(id)
    const child = children.get(id)
    if (child?.left) queue.push(child.left)
    if (child?.right) queue.push(child.right)
  }
  return result
}

function treeHeight(rootId: string, children: Map<string, { left?: string; right?: string }>): number {
  if (!children.has(rootId) && rootId === '0') return 0
  const child = children.get(rootId)
  return 1 + Math.max(
    child?.left ? treeHeight(child.left, children) : 0,
    child?.right ? treeHeight(child.right, children) : 0,
  )
}
