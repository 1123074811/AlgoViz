import type { AnimationScript, AnimationStep, RendererType, ActionColor } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene/eventTypes'
import type { CallStackBindings, CallStackFrameStatus, CallStackValue } from '@/scene/overlays'

const MAX_STEPS = 600

type Action = AnimationStep['action']

/** Tolerate common AI mistakes: passing the whole input object (e.g. {nums:[...],
 *  target}) or a non-array to a create method. Extracts the intended array instead
 *  of crashing with a cryptic "Cannot read properties of null". */
function coerceArray(values: unknown): (number | string)[] {
  if (Array.isArray(values)) return values as (number | string)[]
  if (values && typeof values === 'object') {
    const o = values as Record<string, unknown>
    for (const k of ['nums', 'values', 'arr', 'array', 'data', 'list', 'items', 'a']) {
      if (Array.isArray(o[k])) return o[k] as (number | string)[]
    }
  }
  if (typeof values === 'number' || typeof values === 'string') return [values]
  return []
}

/** Per-event contribution to cumulative stats (比较 / 交换 / 访问). */
function statDelta(type: string): { c: number; s: number; a: number } {
  if (/\.(compare|contains|relax_edge)$/.test(type)) return { c: 1, s: 0, a: 2 }
  if (/\.(get|peek|peek_front|peek_back|visit|visit_node|visit_cell|highlight)$/.test(type)) return { c: 0, s: 0, a: 1 }
  if (/\.swap$/.test(type)) return { c: 0, s: 1, a: 2 }
  if (/\.sift$/.test(type)) return { c: 1, s: 1, a: 2 }
  if (/\.(create|init)$/.test(type) || /^scene\./.test(type)) return { c: 0, s: 0, a: 0 }
  return { c: 0, s: 0, a: 1 } // generic data-touching op (push/pop/set/update/insert...)
}

/** Derive a readable Chinese description from an event when the AI omits b.desc().
 *  Covers every event family so a step never falls back to a meaningless "步骤 N". */
function defaultDescFor(event: AlgorithmEvent | undefined): string {
  if (!event) return ''
  const e = event as Record<string, unknown>
  const idx = (k = 'indices') => (e[k] as number[] | undefined)?.join('、')
  switch (event.type) {
    // array
    case 'array.create': return '初始化数组'
    case 'array.compare': return `比较索引 ${idx()}`
    case 'array.swap': return `交换索引 ${idx()}`
    case 'array.move': return `移动 ${e.from} → ${e.to}`
    case 'array.set_value': return `更新索引 ${e.index} 的值为 ${e.value}`
    case 'array.mark_sorted': return `标记索引 ${idx()} 已确定`
    case 'array.partition': return `以索引 ${e.pivotIndex} 为基准划分`
    // graph
    case 'graph.create': return '构建图'
    case 'graph.visit_node': return `访问节点 ${e.nodeId}`
    case 'graph.visit_edge': return `检查边 ${e.source}→${e.target}`
    case 'graph.relax_edge': return `松弛边 ${e.source}→${e.target}`
    case 'graph.enqueue': return `节点 ${e.nodeId} 入队`
    case 'graph.dequeue': return `节点 ${e.nodeId} 出队`
    // tree
    case 'tree.create': return '构建树'
    case 'tree.visit': return `访问节点 ${e.nodeId}`
    case 'tree.insert': return `插入节点 ${(e.node as { value?: unknown })?.value ?? ''}`
    case 'tree.compare': return `与节点 ${e.nodeId} 比较`
    case 'tree.rotate': return `旋转（${e.rotation}）`
    // linked_list
    case 'linked_list.create': return '构建链表'
    case 'linked_list.visit': return `访问节点 ${e.nodeId}`
    case 'linked_list.insert_after': return `在 ${e.targetNodeId} 后插入`
    case 'linked_list.delete': return `删除节点 ${e.nodeId}`
    case 'linked_list.move_pointer': return `移动指针 ${e.pointerId}`
    // pointer
    case 'pointer.create': return `创建指针 ${e.pointerId}`
    case 'pointer.move': return `移动指针 ${e.pointerId}`
    case 'pointer.clear': return `清除指针 ${e.pointerId}`
    case 'pointer.highlight': return `高亮指针 ${e.pointerId}`
    // stack
    case 'stack.create': return '初始化栈'
    case 'stack.push': return `${e.value} 入栈`
    case 'stack.pop': return '弹出栈顶'
    case 'stack.peek': return '查看栈顶'
    // queue
    case 'queue.create': return '初始化队列'
    case 'queue.enqueue': return `${e.value} 入队`
    case 'queue.dequeue': return '队首出队'
    case 'queue.peek_front': return '查看队首'
    // deque
    case 'deque.create': return '初始化双端队列'
    case 'deque.push_front': return `${e.value} 加入队首`
    case 'deque.push_back': return `${e.value} 加入队尾`
    case 'deque.pop_front': return '移除队首'
    case 'deque.pop_back': return '移除队尾'
    // heap
    case 'heap.create': return '建堆'
    case 'heap.push': return `${e.value} 入堆`
    case 'heap.pop': return '弹出堆顶'
    case 'heap.sift': return `堆调整：索引 ${e.from} ↔ ${e.to}`
    case 'heap.peek': return '查看堆顶'
    // hashtable
    case 'hashtable.create': return '初始化哈希表'
    case 'hashtable.put': return `存入 ${e.key} → 桶 ${e.bucket}`
    case 'hashtable.get': return `查找 ${e.key}`
    case 'hashtable.remove': return `删除 ${e.key}`
    // set
    case 'set.create': return '初始化集合'
    case 'set.add': return `加入 ${e.value}`
    case 'set.remove': return `移除 ${e.value}`
    case 'set.contains': return `判断是否包含 ${e.value}`
    // string
    case 'string.create': case 'string.create_double': return '初始化字符串'
    case 'string.compare': return `比较字符 ${idx()}`
    case 'string.match': return `字符匹配于 ${e.index}`
    case 'string.mismatch': return `字符失配于 ${e.index}`
    case 'string.mark_range': return `标记区间 ${idx()}`
    // matrix
    case 'matrix.create': return '初始化矩阵'
    case 'matrix.visit_cell': return `访问格子 (${e.row},${e.col})`
    case 'matrix.update_cell': return `更新格子 (${e.row},${e.col}) = ${e.value}`
    case 'matrix.mark_path': return '标记路径'
    case 'matrix.transition': return '状态转移'
    // math / bitset
    case 'math.init': return '初始化变量'
    case 'math.set': return `${e.name} = ${e.value}`
    case 'math.highlight': return `关注变量 ${e.name}`
    case 'bitset.create': return '初始化位集'
    case 'bitset.set': return `位 ${e.index} 置为 ${e.value}`
    case 'bitset.highlight': return `关注位 ${e.index}`
    // scene
    case 'scene.note': return String(e.text ?? '')
    case 'scene.link': return `连接 ${e.from} → ${e.to}`
    case 'scene.highlight': return `高亮 ${e.entityId}`
    case 'scene.clear_highlight': return '清除高亮'
    case 'scene.wait': return '等待'
    // call stack / grid / DP overlays
    case 'callstack.create': return '初始化调用栈'
    case 'callstack.push': {
      const fn = (e.frame as { functionName?: unknown })?.functionName
      return `调用 ${fn ?? '函数'}`
    }
    case 'callstack.update': return `更新调用帧${e.frameId ? ` ${e.frameId}` : ''}`
    case 'callstack.return': return e.value === undefined ? '函数返回' : `函数返回 ${e.value}`
    case 'callstack.pop': return '弹出调用帧'
    case 'callstack.highlight': return `高亮调用帧${e.frameId ? ` ${e.frameId}` : ''}`
    case 'grid.create': return '初始化网格'
    case 'grid.set_cell': return e.value === undefined ? `更新格子 (${e.row},${e.col})` : `更新格子 (${e.row},${e.col}) = ${e.value}`
    case 'grid.visit': return `访问格子 (${e.row},${e.col})`
    case 'grid.frontier': return '更新网格边界集合'
    case 'grid.path': return '标记网格路径'
    case 'grid.wall': return `${e.enabled ? '设置' : '移除'}障碍 (${e.row},${e.col})`
    case 'grid.weight': return `设置格子 (${e.row},${e.col}) 权重 ${e.weight}`
    case 'grid.arrow': return '标记网格转移方向'
    case 'dp.create': return '初始化 DP 表'
    case 'dp.set': return e.value === undefined ? `更新 DP 状态 (${e.row},${e.col})` : `更新 DP 状态 (${e.row},${e.col}) = ${e.value}`
    case 'dp.highlight': return '高亮 DP 状态'
    case 'dp.dependency': return '标记 DP 状态依赖'
    case 'dp.formula': return '展示 DP 转移公式'
    case 'dp.traceback': return '回溯 DP 答案路径'
    case 'dp.roll': return '更新滚动数组窗口'
    default: return ''
  }
}

/** Accumulates builder calls into a standard AnimationScript. Used by AI-generated
 *  generators to describe an algorithm's animation without writing raw JSON. */
export class AnimationBuilder {
  private steps: AnimationStep[] = []
  private sid = 1
  private pendingDesc = ''
  private pendingLine = -1 // -1 = unset (no code-line highlight)
  // Running cumulative stats, auto-derived from emitted events.
  private comparisons = 0
  private swaps = 0
  private accesses = 0
  private algorithm: string
  private type: RendererType
  // captured from the first create call, used to build initialState
  private arrayData: (number | string)[] = []
  private graphNodes: Array<{ id: string; label?: string }> = []
  private graphEdges: Array<{ source: string; target: string; weight?: number }> = []
  private treeRoot?: string
  private treeChildren: Record<string, string[]> = {}
  private treeNodes: Array<{ id: string; value: number | string }> = []
  private resultValue?: AnimationScript['result']
  private varValues = new Map<string, number | string>()
  private pendingVarHighlights = new Set<string>()
  private truncated = false
  // tracks which structure families (event prefix before '.') the script used,
  // to auto-enable composite layout when 2+ distinct structures appear.
  private usedFamilies = new Set<string>()

  constructor(algorithm: string, type: RendererType) {
    this.algorithm = algorithm || 'custom'
    this.type = type
  }

  desc(zh: string): this { this.pendingDesc = zh; return this }

  /** Mark which source-code line subsequent steps map to (1-based, as shown in the
   *  editor). Drives the "current line" arrow. Persists until changed. */
  line(n: number): this { this.pendingLine = Math.max(0, Math.floor(n) - 1); return this }

  private add(events: AlgorithmEvent[], action: Action): this {
    if (this.truncated) {
      this.pendingDesc = ''
      this.pendingVarHighlights.clear()
      return this
    }
    if (this.steps.length >= MAX_STEPS - 1) {
      const zh = `动画步骤已达到 ${MAX_STEPS} 步上限，后续重复搜索/回溯步骤已省略，最终结果仍会继续计算。`
      this.steps.push({
        stepId: this.sid++,
        codeLine: this.pendingLine,
        description: { zh, en: zh },
        action: this.act('annotate', [], 'muted'),
        stats: { comparisons: this.comparisons, swaps: this.swaps, accesses: this.accesses },
        events: [{ type: 'scene.note', text: zh }],
      })
      this.pendingDesc = ''
      this.pendingVarHighlights.clear()
      this.truncated = true
      return this
    }
    const allEvents = [...events, ...this.consumePendingVarHighlights()]
    for (const event of allEvents) {
      const family = event.type.split('.')[0]
      if (family) this.usedFamilies.add(family)
    }
    // When the AI omits b.desc(), derive a meaningful description from the operation
    // itself instead of a meaningless "步骤 N" placeholder. As a last resort use a
    // humanized event family rather than just the step number.
    const fallback = events[0] ? `执行 ${events[0].type.split('.')[0]} 操作` : `步骤 ${this.sid}`
    const zh = this.pendingDesc || defaultDescFor(events[0]) || fallback
    const d = statDelta(events[0]?.type ?? '')
    this.comparisons += d.c
    this.swaps += d.s
    this.accesses += d.a
    this.steps.push({
      stepId: this.sid++,
      codeLine: this.pendingLine,
      description: { zh, en: zh },
      action,
      stats: { comparisons: this.comparisons, swaps: this.swaps, accesses: this.accesses },
      events: allEvents,
    })
    this.pendingDesc = ''
    return this
  }

  private consumePendingVarHighlights(): AlgorithmEvent[] {
    if (this.pendingVarHighlights.size === 0) return []
    const events = [...this.pendingVarHighlights].map(name => ({ type: 'math.highlight' as const, name }))
    this.pendingVarHighlights.clear()
    return events
  }

  private act(type: Action['type'], targets: number[] = [], color: ActionColor = 'primary'): Action {
    return { type, targets, color }
  }

  // ── array ──
  arrayCreate(values: (number | string)[]): this {
    const v = coerceArray(values)
    this.arrayData = [...v]
    return this.add([{ type: 'array.create', values: [...v] }], this.act('highlight', [], 'primary'))
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
    const normalized = normalizeTreeCreateArgs(rootId, nodes, edges)
    this.treeRoot = normalized.rootId
    this.treeNodes = normalized.nodes.map(n => ({ ...n }))
    this.treeChildren = {}
    for (const n of normalized.nodes) this.treeChildren[n.id] = this.treeChildren[n.id] ?? []
    for (const e of normalized.edges) {
      this.treeChildren[e.parentId] = this.treeChildren[e.parentId] ?? []
      this.treeChildren[e.parentId].push(e.childId)
    }
    return this.add([{ type: 'tree.create', variant, rootId: normalized.rootId, nodes: normalized.nodes, edges: normalized.edges }], this.act('highlight', [], 'primary'))
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
  highlightNode(nodeId: string, color: ActionColor = 'success'): this {
    return this.add([{ type: 'scene.highlight', entityId: nodeId, role: color === 'success' ? 'safe' : 'current', color }], this.act('highlight', [], color))
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

  // ── 通用 pointer（可指向任意 Scene 实体 / 端口） ──
  private pointerTarget(target: string | number | null | undefined): string | undefined {
    if (typeof target === 'number') return `arr_${target}`
    return target ?? undefined
  }
  pointerCreate(pointerId: string, target?: string | number | null, label?: string, portId?: string): this {
    return this.add([{ type: 'pointer.create', pointerId, label, targetId: this.pointerTarget(target), portId }], this.act('highlight', [], 'primary'))
  }
  pointerMove(pointerId: string, target: string | number | null, label?: string, portId?: string): this {
    return this.add([{ type: 'pointer.move', pointerId, targetId: this.pointerTarget(target) ?? null, label, portId }], this.act('highlight', [], 'primary'))
  }
  pointerClear(pointerId: string): this {
    return this.add([{ type: 'pointer.clear', pointerId }], this.act('highlight', [], 'muted'))
  }
  pointerHighlight(pointerId: string, color: ActionColor = 'primary'): this {
    return this.add([{ type: 'pointer.highlight', pointerId, color }], this.act('highlight', [], color))
  }

  // ── hash table（哈希表 / hash map） ──
  hashCreate(capacity: number): this {
    return this.add([{ type: 'hashtable.create', capacity }], this.act('highlight', [], 'primary'))
  }
  hashPut(key: string, value: number | string, bucket: number, collision?: boolean): this {
    return this.add([{ type: 'hashtable.put', key, value, bucket, collision }], this.act('insert', [], collision ? 'warning' : 'success'))
  }
  hashGet(key: string, bucket: number, found: boolean): this {
    return this.add([{ type: 'hashtable.get', key, bucket, found }], this.act('highlight', [], found ? 'success' : 'danger'))
  }
  hashRemove(key: string, bucket: number): this {
    return this.add([{ type: 'hashtable.remove', key, bucket }], this.act('delete', [], 'danger'))
  }

  // ── 堆 / 优先队列（heap，完全二叉树布局，@type 用 array） ──
  heapCreate(values: number[], variant?: 'min' | 'max'): this {
    this.arrayData = [...values]
    return this.add([{ type: 'heap.create', values: [...values], variant }], this.act('highlight', [], 'primary'))
  }
  heapPush(value: number): this {
    return this.add([{ type: 'heap.push', value }], this.act('insert', [], 'success'))
  }
  heapPop(): this {
    return this.add([{ type: 'heap.pop' }], this.act('delete', [], 'danger'))
  }
  heapSift(from: number, to: number): this {
    return this.add([{ type: 'heap.sift', from, to }], this.act('swap', [from, to], 'warning'))
  }
  heapPeek(index: number): this {
    return this.add([{ type: 'heap.peek', index }], this.act('highlight', [index], 'primary'))
  }

  // ── 矩阵 / DP 网格（@type 用 array） ──
  matrixTransition(from: { row: number; col: number }, to: { row: number; col: number }): this {
    return this.add([{ type: 'matrix.transition', from, to }], this.act('edge', [], 'primary'))
  }

  // ── 位集 / 状压（bitmask，@type 用 array） ──
  bitsetCreate(bits: number, label?: string): this {
    return this.add([{ type: 'bitset.create', bits, label }], this.act('highlight', [], 'primary'))
  }
  bitsetSet(index: number, value: 0 | 1): this {
    return this.add([{ type: 'bitset.set', index, value }], this.act('highlight', [index], value === 1 ? 'success' : 'muted'))
  }
  bitsetHighlight(index: number): this {
    return this.add([{ type: 'bitset.highlight', index }], this.act('highlight', [index], 'warning'))
  }

  // ── 纯数学 / 变量面板（结构无关算法，@type 用 array） ──
  varInit(vars: Array<{ name: string; value: number | string }>): this {
    for (const v of vars) this.varValues.set(v.name, v.value)
    return this.add([{ type: 'math.init', vars: vars.map(v => ({ ...v })) }], this.act('highlight', [], 'primary'))
  }
  varSet(name: string, value: number | string, delta?: string): this {
    const previous = this.varValues.get(name)
    const change = delta ?? formatVariableDelta(previous, value)
    this.varValues.set(name, value)
    return this.add([{ type: 'math.set', name, value, ...(change && { delta: change }) }], this.act('highlight', [], 'primary'))
  }
  varHighlight(name: string): this {
    this.pendingVarHighlights.add(name)
    return this
  }

  // ── 状态机 / 自动机（automaton，状态圆 + 带标签有向转移，@type 用 array） ──
  autoCreate(states: Array<{ id: string; label?: string; accepting?: boolean; start?: boolean }>): this {
    return this.add([{ type: 'automaton.create', states: states.map(s => ({ ...s })) }], this.act('highlight', [], 'primary'))
  }
  autoTransition(id: string, from: string, to: string, label: string): this {
    return this.add([{ type: 'automaton.transition', id, from, to, label }], this.act('edge', [], 'primary'))
  }
  autoActivate(stateId: string): this {
    return this.add([{ type: 'automaton.activate', stateId }], this.act('highlight', [], 'success'))
  }
  autoConsume(symbol: string, index: number): this {
    return this.add([{ type: 'automaton.consume', symbol, index }], this.act('highlight', [], 'warning'))
  }

  // ── 集合（set，去重·无序·成员判定，@type 用 array） ──
  setCreate(values: Array<number | string>): this {
    return this.add([{ type: 'set.create', values: [...values] }], this.act('highlight', [], 'primary'))
  }
  setAdd(value: number | string): this {
    return this.add([{ type: 'set.add', value }], this.act('insert', [], 'success'))
  }
  setRemove(value: number | string): this {
    return this.add([{ type: 'set.remove', value }], this.act('delete', [], 'danger'))
  }
  setContains(value: number | string, found: boolean): this {
    return this.add([{ type: 'set.contains', value, found }], this.act('highlight', [], found ? 'success' : 'danger'))
  }

  // ── 字符串（string，带下标的字符格 + 双指针/匹配 + 双行对齐，@type 用 array） ──
  strCreate(text: string): this {
    this.arrayData = text.split('')
    return this.add([{ type: 'string.create', text }], this.act('highlight', [], 'primary'))
  }
  strCreateDouble(text: string, pattern: string): this {
    this.arrayData = text.split('')
    return this.add([{ type: 'string.create_double', text, pattern }], this.act('highlight', [], 'primary'))
  }
  strCompare(row: number, i: number, j: number): this {
    return this.add([{ type: 'string.compare', row, indices: [i, j] }], this.act('compare', [i, j], 'warning'))
  }
  strMatch(row: number, index: number): this {
    return this.add([{ type: 'string.match', row, index }], this.act('mark', [index], 'success'))
  }
  strMismatch(row: number, index: number): this {
    return this.add([{ type: 'string.mismatch', row, index }], this.act('mark', [index], 'danger'))
  }
  strMarkRange(row: number, indices: number[]): this {
    return this.add([{ type: 'string.mark_range', row, indices: [...indices] }], this.act('mark', [...indices], 'primary'))
  }

  // ── 跨结构连线（组合场景） ──
  link(fromId: string, toId: string, opts?: { label?: string; color?: ActionColor }): this {
    return this.add(
      [{ type: 'scene.link', from: fromId, to: toId, label: opts?.label, color: opts?.color }],
      this.act('edge', [], opts?.color ?? 'primary'),
    )
  }

  // ── stack（单调栈、括号匹配、接雨水等）──
  stackCreate(values: (number | string)[] = []): this {
    return this.add([{ type: 'stack.create', values: coerceArray(values) }], this.act('highlight', [], 'primary'))
  }
  stackPush(value: number | string): this {
    return this.add([{ type: 'stack.push', value }], this.act('insert', [], 'success'))
  }
  stackPop(): this {
    return this.add([{ type: 'stack.pop' }], this.act('delete', [], 'danger'))
  }
  stackPeek(index: number): this {
    return this.add([{ type: 'stack.peek', index }], this.act('highlight', [], 'warning'))
  }

  // ── queue（BFS、滑动窗口等）──
  queueCreate(values: (number | string)[] = []): this {
    return this.add([{ type: 'queue.create', values: coerceArray(values) }], this.act('highlight', [], 'primary'))
  }
  queueEnqueue(value: number | string): this {
    return this.add([{ type: 'queue.enqueue', value }], this.act('insert', [], 'success'))
  }
  queueDequeue(): this {
    return this.add([{ type: 'queue.dequeue' }], this.act('delete', [], 'danger'))
  }
  queuePeekFront(index: number): this {
    return this.add([{ type: 'queue.peek_front', index }], this.act('highlight', [], 'warning'))
  }

  // ── deque（滑动窗口最大值等）──
  dequeCreate(values: (number | string)[] = []): this {
    return this.add([{ type: 'deque.create', values: coerceArray(values) }], this.act('highlight', [], 'primary'))
  }
  dequePushFront(value: number | string): this {
    return this.add([{ type: 'deque.push_front', value }], this.act('insert', [], 'success'))
  }
  dequePushBack(value: number | string): this {
    return this.add([{ type: 'deque.push_back', value }], this.act('insert', [], 'success'))
  }
  dequePopFront(): this {
    return this.add([{ type: 'deque.pop_front' }], this.act('delete', [], 'danger'))
  }
  dequePopBack(): this {
    return this.add([{ type: 'deque.pop_back' }], this.act('delete', [], 'danger'))
  }

  // ── matrix（DP 网格、网格遍历等）──
  matrixCreate(rows: number, cols: number, values?: Array<Array<number | string>>): this {
    return this.add([{ type: 'matrix.create', rows, cols, values }], this.act('highlight', [], 'primary'))
  }
  matrixVisit(row: number, col: number): this {
    return this.add([{ type: 'matrix.visit_cell', row, col }], this.act('highlight', [], 'warning'))
  }
  matrixUpdate(row: number, col: number, value: number | string): this {
    return this.add([{ type: 'matrix.update_cell', row, col, value }], this.act('highlight', [], 'primary'))
  }
  matrixMarkPath(cells: Array<{ row: number; col: number }>): this {
    return this.add([{ type: 'matrix.mark_path', cells }], this.act('mark', [], 'success'))
  }

  // ── call stack（递归 / 回溯 / 分治）──
  callStackCreate(title = '递归调用栈', id = 'callstack'): this {
    return this.add([{ type: 'callstack.create', id, title }], this.act('highlight', [], 'primary'))
  }
  callPush(
    functionName: string,
    parameters: CallStackBindings = {},
    locals: CallStackBindings = {},
    frameId?: string,
  ): this {
    return this.add(
      [{ type: 'callstack.push', frame: { id: frameId, functionName, parameters, locals } }],
      this.act('insert', [], 'success'),
    )
  }
  callUpdate(
    frameId: string,
    updates: {
      parameters?: CallStackBindings
      locals?: CallStackBindings
      status?: CallStackFrameStatus
    },
  ): this {
    return this.add(
      [{ type: 'callstack.update', frameId, updates }],
      this.act('highlight', [], 'primary'),
    )
  }
  callReturn(frameId: string, value?: CallStackValue, pop = false): this {
    return this.add(
      [{ type: 'callstack.return', frameId, value, pop }],
      this.act('highlight', [], 'success'),
    )
  }
  callPop(frameId?: string): this {
    return this.add(
      [{ type: 'callstack.pop', frameId }],
      this.act('delete', [], 'danger'),
    )
  }
  callHighlight(frameId: string, active = false, clear = true): this {
    return this.add(
      [{ type: 'callstack.highlight', frameId, active, clear }],
      this.act('highlight', [], 'warning'),
    )
  }

  // ── grid（迷宫 / 棋盘 / 地图寻路）──
  gridCreate(values: unknown[][], options?: { id?: string; title?: string; cellSize?: number }): this {
    const rows = values.length
    const cols = values.reduce((max, row) => Math.max(max, row.length), 0)
    return this.add(
      [{ type: 'grid.create', gridId: options?.id, title: options?.title, rows, cols, values, cellSize: options?.cellSize }],
      this.act('highlight', [], 'primary'),
    )
  }
  gridSet(row: number, col: number, value?: unknown, state?: 'default' | 'active' | 'visited' | 'frontier' | 'path' | 'wall' | 'start' | 'target' | 'weighted' | 'warning' | 'error'): this {
    return this.add(
      [{ type: 'grid.set_cell', row, col, value, state }],
      this.act('highlight', [], 'primary'),
    )
  }
  gridVisit(row: number, col: number, order?: number): this {
    return this.add([{ type: 'grid.visit', row, col, order }], this.act('highlight', [], 'warning'))
  }
  highlight(row: number, col?: number): this {
    if (typeof col === 'number') return this.gridVisit(row, col)
    return this.add([{ type: 'scene.highlight', entityId: `arr_${row}`, role: 'current', color: 'warning' }], this.act('highlight', [row], 'warning'))
  }
  gridFrontier(cells: Array<[number, number]>): this {
    return this.add([{ type: 'grid.frontier', cells }], this.act('highlight', [], 'primary'))
  }
  gridPath(cells: Array<[number, number]>): this {
    return this.add([{ type: 'grid.path', cells }], this.act('mark', [], 'success'))
  }
  gridWall(row: number, col: number, enabled = true): this {
    return this.add([{ type: 'grid.wall', row, col, enabled }], this.act('mark', [], enabled ? 'danger' : 'muted'))
  }
  gridWeight(row: number, col: number, weight: number): this {
    return this.add([{ type: 'grid.weight', row, col, weight }], this.act('highlight', [], 'warning'))
  }
  gridArrow(from: [number, number], to: [number, number], label?: string): this {
    return this.add([{ type: 'grid.arrow', from, to, label }], this.act('edge', [], 'primary'))
  }

  // ── DP table（状态表 / 依赖 / 回溯）──
  dpCreate(
    tableId: string,
    rows: number,
    cols: number,
    options?: { title?: string; rowLabels?: string[]; colLabels?: string[]; values?: Array<Array<string | number | boolean | null>>; defaultValue?: string | number | boolean | null },
  ): this {
    return this.add(
      [{
        type: 'dp.create',
        id: tableId,
        rows,
        cols,
        title: options?.title,
        rowLabels: options?.rowLabels,
        colLabels: options?.colLabels,
        values: options?.values,
        defaultValue: options?.defaultValue,
      }],
      this.act('highlight', [], 'primary'),
    )
  }
  dpSet(tableId: string, row: number, col: number, value: string | number | boolean | null, formula?: string): this {
    return this.add(
      [{ type: 'dp.set', id: tableId, row, col, value, formula }],
      this.act('highlight', [], 'primary'),
    )
  }
  dpHighlight(tableId: string, cells: Array<{ row: number; col: number }>, kind: 'current' | 'dependency' | 'candidate' | 'answer' = 'current'): this {
    return this.add(
      [{ type: 'dp.highlight', id: tableId, cells, kind }],
      this.act('highlight', [], kind === 'answer' ? 'success' : 'warning'),
    )
  }
  dpDependency(
    tableId: string,
    sources: Array<{ row: number; col: number }>,
    target: { row: number; col: number },
    label?: string,
  ): this {
    return this.add(
      [{ type: 'dp.dependency', id: tableId, sources, target, label }],
      this.act('edge', [], 'primary'),
    )
  }
  dpFormula(tableId: string, target: { row: number; col: number }, text: string): this {
    return this.add(
      [{ type: 'dp.formula', id: tableId, target, text }],
      this.act('annotate', [], 'primary'),
    )
  }
  dpTraceback(tableId: string, path: Array<{ row: number; col: number }>): this {
    return this.add(
      [{ type: 'dp.traceback', id: tableId, path }],
      this.act('mark', [], 'success'),
    )
  }

  // ── note / escape ──
  note(text: string): this {
    return this.add([{ type: 'scene.note', text }], this.act('annotate', [], 'muted'))
  }
  result(value: AnimationScript['result']): this {
    this.resultValue = value
    return this.desc(`输出结果：${formatResult(value)}`).note(`result = ${formatResult(value)}`)
  }
  emit(event: AlgorithmEvent): this {
    return this.add([event], this.act('highlight', [], 'primary'))
  }

  build(): AnimationScript {
    if (this.steps.length === 0) {
      throw new Error('生成器没有产生任何步骤')
    }
    const initialState = this.buildInitialState()
    // 多结构（去掉 'scene' 后 ≥2 个不同 family）时自动开启 composite 区域布局。
    // 单结构脚本保持原行为，向后兼容。
    const structureFamilies = [...this.usedFamilies].filter(f => f !== 'scene' && f !== 'pointer')
    const presentation: AnimationScript['presentation'] = { engine: 'scene', module: this.type }
    if (structureFamilies.length >= 2) presentation.layout = 'composite'
    return {
      algorithm: this.algorithm,
      presentation,
      complexity: { time: { best: 'O(?)', average: 'O(?)', worst: 'O(?)' }, space: 'O(?)' },
      initialState,
      ...(this.resultValue !== undefined && { result: this.resultValue }),
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

function formatResult(value: AnimationScript['result']): string {
  return Array.isArray(value) ? `[${value.join(', ')}]` : String(value)
}

function formatVariableDelta(previous: number | string | undefined, next: number | string): string | undefined {
  if (previous === undefined) return undefined
  if (previous === next) return undefined

  const prevNum = typeof previous === 'number' ? previous : Number(previous)
  const nextNum = typeof next === 'number' ? next : Number(next)
  if (Number.isFinite(prevNum) && Number.isFinite(nextNum)) {
    const diff = nextNum - prevNum
    if (diff === 0) return undefined
    return diff > 0 ? `+${diff}` : String(diff)
  }

  return `->${String(next)}`
}

function normalizeTreeCreateArgs(
  rootId: string,
  nodes: Array<{ id: string; value: number | string }>,
  edges: Array<{ parentId: string; childId: string }>,
): {
  rootId: string
  nodes: Array<{ id: string; value: number | string }>
  edges: Array<{ parentId: string; childId: string }>
} {
  const normalizedNodes = nodes.map(node => ({ ...node }))
  const byId = new Map(normalizedNodes.map(node => [node.id, node]))
  const byValue = new Map<string, Array<{ id: string; value: number | string }>>()
  for (const node of normalizedNodes) {
    const valueKey = String(node.value)
    byValue.set(valueKey, [...(byValue.get(valueKey) ?? []), node])
  }

  const usedAsChild = new Set<string>()
  const siblingUse = new Map<string, Map<string, number>>()

  const resolveChild = (parentId: string, childId: string): string => {
    if (!byId.has(childId)) return childId

    const parentUse = siblingUse.get(parentId) ?? new Map<string, number>()
    siblingUse.set(parentId, parentUse)

    const candidates = byValue.get(String(byId.get(childId)?.value)) ?? [byId.get(childId)!]
    const seen = parentUse.get(childId) ?? 0
    parentUse.set(childId, seen + 1)

    const exactCandidate = candidates[seen]
    if (exactCandidate && !usedAsChild.has(exactCandidate.id)) return exactCandidate.id

    const freeCandidate = candidates.find(candidate => !usedAsChild.has(candidate.id))
    return freeCandidate?.id ?? childId
  }

  const normalizedEdges = edges.map(edge => {
    const childId = resolveChild(edge.parentId, edge.childId)
    usedAsChild.add(childId)
    return { parentId: edge.parentId, childId }
  })

  return { rootId, nodes: normalizedNodes, edges: normalizedEdges }
}
