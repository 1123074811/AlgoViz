import type { AnimationScript, AnimationStep, RendererType, ActionColor } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene/eventTypes'

const MAX_STEPS = 600

type Action = AnimationStep['action']

/** Accumulates builder calls into a standard AnimationScript. Used by AI-generated
 *  generators to describe an algorithm's animation without writing raw JSON. */
export class AnimationBuilder {
  private steps: AnimationStep[] = []
  private sid = 1
  private pendingDesc = ''
  private algorithm: string
  private type: RendererType
  // captured from the first create call, used to build initialState
  private arrayData: (number | string)[] = []
  private graphNodes: Array<{ id: string; label?: string }> = []
  private graphEdges: Array<{ source: string; target: string; weight?: number }> = []
  private treeRoot?: string
  private treeChildren: Record<string, string[]> = {}
  private treeNodes: Array<{ id: string; value: number | string }> = []

  constructor(algorithm: string, type: RendererType) {
    this.algorithm = algorithm || 'custom'
    this.type = type
  }

  desc(zh: string): this { this.pendingDesc = zh; return this }

  private add(events: AlgorithmEvent[], action: Action): this {
    if (this.steps.length >= MAX_STEPS) {
      throw new Error(`步数超过上限 ${MAX_STEPS}，请减少操作或简化算法`)
    }
    const zh = this.pendingDesc || `步骤 ${this.sid}`
    this.steps.push({
      stepId: this.sid++,
      codeLine: 0,
      description: { zh, en: zh },
      action,
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events,
    })
    this.pendingDesc = ''
    return this
  }

  private act(type: Action['type'], targets: number[] = [], color: ActionColor = 'primary'): Action {
    return { type, targets, color }
  }

  // ── array ──
  arrayCreate(values: (number | string)[]): this {
    this.arrayData = [...values]
    return this.add([{ type: 'array.create', values: [...values] }], this.act('highlight', [], 'primary'))
  }
  compare(i: number, j: number): this {
    return this.add([{ type: 'array.compare', indices: [i, j] }], this.act('compare', [i, j], 'warning'))
  }
  swap(i: number, j: number): this {
    return this.add([{ type: 'array.swap', indices: [i, j] }], this.act('swap', [i, j], 'danger'))
  }
  move(from: number, to: number): this {
    return this.add([{ type: 'array.move', from, to }], this.act('move', [from, to], 'primary'))
  }
  setValue(index: number, value: number | string): this {
    return this.add([{ type: 'array.set_value', index, value }], this.act('highlight', [index], 'primary'))
  }
  markSorted(indices: number[]): this {
    return this.add([{ type: 'array.mark_sorted', indices: [...indices] }], this.act('mark', [...indices], 'success'))
  }
  partition(pivotIndex: number, left: number, right: number): this {
    return this.add([{ type: 'array.partition', pivotIndex, left, right }], this.act('highlight', [pivotIndex], 'primary'))
  }

  // ── graph ──
  graphCreate(nodes: Array<{ id: string; label?: string }>, edges: Array<{ source: string; target: string; weight?: number }>, directed?: boolean): this {
    this.graphNodes = nodes.map(n => ({ ...n }))
    this.graphEdges = edges.map(e => ({ ...e }))
    return this.add([{ type: 'graph.create', nodes, edges, directed }], this.act('highlight', [], 'primary'))
  }
  visitNode(id: string): this {
    return this.add([{ type: 'graph.visit_node', nodeId: id }], this.act('highlight', [], 'primary'))
  }
  visitEdge(source: string, target: string): this {
    return this.add([{ type: 'graph.visit_edge', source, target }], this.act('edge', [], 'warning'))
  }
  relaxEdge(source: string, target: string, success: boolean): this {
    return this.add([{ type: 'graph.relax_edge', source, target, success }], this.act('edge', [], success ? 'success' : 'muted'))
  }
  enqueue(id: string): this {
    return this.add([{ type: 'graph.enqueue', nodeId: id }], this.act('highlight', [], 'primary'))
  }
  dequeue(id: string): this {
    return this.add([{ type: 'graph.dequeue', nodeId: id }], this.act('highlight', [], 'primary'))
  }

  // ── tree ──
  treeCreate(variant: 'binary' | 'bst' | 'avl', rootId: string, nodes: Array<{ id: string; value: number | string }>, edges: Array<{ parentId: string; childId: string }>): this {
    this.treeRoot = rootId
    this.treeNodes = nodes.map(n => ({ ...n }))
    this.treeChildren = {}
    for (const n of nodes) this.treeChildren[n.id] = this.treeChildren[n.id] ?? []
    for (const e of edges) {
      this.treeChildren[e.parentId] = this.treeChildren[e.parentId] ?? []
      this.treeChildren[e.parentId].push(e.childId)
    }
    return this.add([{ type: 'tree.create', variant, rootId, nodes, edges }], this.act('highlight', [], 'primary'))
  }
  treeVisit(id: string): this {
    return this.add([{ type: 'tree.visit', nodeId: id }], this.act('highlight', [], 'primary'))
  }
  treeInsert(parentId: string, node: { id: string; value: number | string }, side?: 'left' | 'right'): this {
    this.treeNodes.push({ ...node })
    this.treeChildren[parentId] = this.treeChildren[parentId] ?? []
    this.treeChildren[parentId].push(node.id)
    return this.add([{ type: 'tree.insert', parentId, node, side }], this.act('insert', [], 'success'))
  }
  treeCompare(nodeId: string, value: number | string): this {
    return this.add([{ type: 'tree.compare', nodeId, value }], this.act('compare', [], 'warning'))
  }
  treeRotate(rotation: 'left' | 'right' | 'left-right' | 'right-left', pivotId: string): this {
    return this.add([{ type: 'tree.rotate', rotation, pivotId }], this.act('highlight', [], 'primary'))
  }

  // ── linked_list ──
  listCreate(variant: 'singly' | 'doubly' | 'circular', nodes: Array<{ id: string; value: number | string }>, headId?: string): this {
    this.arrayData = nodes.map(n => n.value)
    return this.add([{ type: 'linked_list.create', variant, nodes, headId }], this.act('highlight', [], 'primary'))
  }
  listVisit(id: string): this {
    return this.add([{ type: 'linked_list.visit', nodeId: id }], this.act('highlight', [], 'primary'))
  }
  listInsertAfter(targetNodeId: string, node: { id: string; value: number | string }): this {
    return this.add([{ type: 'linked_list.insert_after', targetNodeId, newNode: node }], this.act('insert', [], 'success'))
  }
  listDelete(id: string): this {
    return this.add([{ type: 'linked_list.delete', nodeId: id }], this.act('delete', [], 'danger'))
  }
  movePointer(pointerId: string, toNodeId: string | null): this {
    return this.add([{ type: 'linked_list.move_pointer', pointerId, toNodeId }], this.act('highlight', [], 'primary'))
  }

  // ── note / escape ──
  note(text: string): this {
    return this.add([{ type: 'scene.note', text }], this.act('annotate', [], 'muted'))
  }
  emit(event: AlgorithmEvent): this {
    return this.add([event], this.act('highlight', [], 'primary'))
  }

  build(): AnimationScript {
    if (this.steps.length === 0) {
      throw new Error('生成器没有产生任何步骤')
    }
    const initialState = this.buildInitialState()
    return {
      algorithm: this.algorithm,
      presentation: { engine: 'scene', module: this.type },
      complexity: { time: { best: 'O(?)', average: 'O(?)', worst: 'O(?)' }, space: 'O(?)' },
      initialState,
      steps: this.steps,
    }
  }

  private buildInitialState(): AnimationScript['initialState'] {
    if (this.type === 'graph') {
      return { type: 'graph', data: [], nodes: this.graphNodes, edges: this.graphEdges }
    }
    if (this.type === 'tree') {
      return {
        type: 'tree', data: [],
        root: this.treeRoot,
        children: this.treeChildren,
        treeNodes: this.treeNodes,
      }
    }
    // array / linked_list
    const numericData = this.arrayData.map(v => typeof v === 'number' ? v : Number(v)).filter(v => !Number.isNaN(v))
    return { type: this.type, data: numericData }
  }
}
