import type { AnimationScript, AnimationStep } from '@/types/animation'

type Color = 'red' | 'black'

interface RBNode {
  id: string
  value: number
  color: Color
  left: RBNode | null
  right: RBNode | null
}

export function generateRedBlackTree(input?: number[]): AnimationScript {
  const values = input?.filter(Number.isFinite) ?? [13, 8, 17, 1, 11, 15, 25, 6, 22, 27]
  const steps: AnimationStep[] = []
  let root: RBNode | null = null
  let nextId = 0
  let stepId = 1

  const isRed = (node: RBNode | null) => node?.color === 'red'
  const rotateLeft = (node: RBNode, operations: string[]): RBNode => {
    const next = node.right!
    node.right = next.left
    next.left = node
    next.color = node.color
    node.color = 'red'
    operations.push(`左旋 ${node.value}`)
    return next
  }
  const rotateRight = (node: RBNode, operations: string[]): RBNode => {
    const next = node.left!
    node.left = next.right
    next.right = node
    next.color = node.color
    node.color = 'red'
    operations.push(`右旋 ${node.value}`)
    return next
  }
  const flipColors = (node: RBNode, operations: string[]) => {
    node.color = node.color === 'red' ? 'black' : 'red'
    if (node.left) node.left.color = node.left.color === 'red' ? 'black' : 'red'
    if (node.right) node.right.color = node.right.color === 'red' ? 'black' : 'red'
    operations.push(`翻转 ${node.value} 及子节点颜色`)
  }
  const insert = (node: RBNode | null, value: number, operations: string[]): RBNode => {
    if (!node) {
      operations.push(`插入红色节点 ${value}`)
      return { id: `rb_${nextId++}`, value, color: 'red', left: null, right: null }
    }
    if (value < node.value) node.left = insert(node.left, value, operations)
    else if (value > node.value) node.right = insert(node.right, value, operations)
    else operations.push(`忽略重复值 ${value}`)

    if (isRed(node.right) && !isRed(node.left)) node = rotateLeft(node, operations)
    if (isRed(node.left) && isRed(node.left?.left ?? null)) node = rotateRight(node, operations)
    if (isRed(node.left) && isRed(node.right)) flipColors(node, operations)
    return node
  }

  for (const value of values) {
    const operations: string[] = []
    root = insert(root, value, operations)
    root.color = 'black'
    const snapshot = toSnapshot(root)
    steps.push({
      stepId: stepId++,
      codeLine: 4,
      description: {
        zh: `插入 ${value}：${operations.join('；')}`,
        en: `Insert ${value}: ${operations.join('; ')}`,
      },
      action: { type: 'insert', targets: [], color: 'warning' },
      events: [{
        type: 'tree.create',
        variant: 'binary',
        rootId: root.id,
        nodes: snapshot.nodes,
        edges: snapshot.edges,
      }],
      stats: { comparisons: operations.length, swaps: operations.filter(item => item.includes('旋')).length, accesses: snapshot.nodes.length },
    })
  }

  if (!root) {
    root = { id: 'rb_0', value: 0, color: 'black', left: null, right: null }
  }
  const final = toSnapshot(root)
  const result = inorder(root)
  steps.push({
    stepId,
    codeLine: 10,
    description: {
      zh: `红黑树构建完成，中序结果：[${result.join(', ')}]`,
      en: `Red-black tree complete; inorder: [${result.join(', ')}]`,
    },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'tree.visit', nodeId: root.id }],
    stats: { comparisons: 0, swaps: 0, accesses: final.nodes.length },
  })

  return {
    algorithm: 'red_black_tree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree' },
    initialState: {
      type: 'tree',
      data: result,
      root: root.id,
      treeNodes: final.nodes,
      children: final.children,
    },
    result,
    steps,
  }
}

function toSnapshot(root: RBNode) {
  const nodes: Array<{ id: string; value: number; rbColor: Color }> = []
  const edges: Array<{ parentId: string; childId: string; port: 'left' | 'right' }> = []
  const children: Record<string, string[]> = {}
  const visit = (node: RBNode) => {
    nodes.push({ id: node.id, value: node.value, rbColor: node.color })
    const childIds: string[] = []
    if (node.left) {
      childIds.push(node.left.id)
      edges.push({ parentId: node.id, childId: node.left.id, port: 'left' })
      visit(node.left)
    }
    if (node.right) {
      childIds.push(node.right.id)
      edges.push({ parentId: node.id, childId: node.right.id, port: 'right' })
      visit(node.right)
    }
    children[node.id] = childIds
  }
  visit(root)
  return { nodes, edges, children }
}

function inorder(node: RBNode | null): number[] {
  return node ? [...inorder(node.left), node.value, ...inorder(node.right)] : []
}
