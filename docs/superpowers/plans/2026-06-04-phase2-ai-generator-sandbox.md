# Phase 2: AI 可执行逻辑生成器 + 沙箱执行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 自定义算法时，AI 输出一个"生成器函数体"（用 builder API 操作），前端在 Web Worker 沙箱里用当前输入执行它得到动画；改输入本地重跑沙箱，无需再调 AI。

**Architecture:** 四层：① `AnimationBuilder` 把 builder 调用累积成 AnimationScript（纯函数，可测）；② `executeGenerator` 用 `new Function` 跑生成器体（纯函数，可测）；③ Web Worker（`generatorWorker.ts` + `runGenerator.ts`）隔离执行 + 超时 + 中和网络；④ AI 生成器提示词 + 解析 + client。Playground 集成：识别为内置算法走 Phase 1，否则跑 AI 生成器（Phase 2）。

**Tech Stack:** TypeScript, React 18, Vite Web Worker, vitest

**依赖分波：** Wave 1 = Task A + Task C（并行）；Wave 2 = Task B（依赖 A）；Wave 3 = Task D（依赖 B+C）。

---

## Builder API 契约（所有任务共享，务必一致）

`AnimationBuilder` 方法（除 `build()` 外均返回 `this` 支持链式）：

```
构造: new AnimationBuilder(algorithm: string, type: 'array'|'graph'|'tree'|'linked_list')
共享: desc(zh: string)            为下一个操作设置中文描述
      note(text: string)          添加旁注
数组: arrayCreate(values)         compare(i,j)   swap(i,j)   move(from,to)
      setValue(index,value)       markSorted(indices)        partition(pivot,left,right)
图:   graphCreate(nodes,edges,directed?)  visitNode(id)  visitEdge(s,t)
      relaxEdge(s,t,success)      enqueue(id)    dequeue(id)
树:   treeCreate(variant,rootId,nodes,edges)  treeVisit(id)
      treeInsert(parentId,node,side?)  treeCompare(nodeId,value)  treeRotate(rotation,pivotId)
链表: listCreate(variant,nodes,headId?)  listVisit(id)  listInsertAfter(targetId,node)
      listDelete(id)              movePointer(pointerId,toNodeId)
逃生: emit(event)                 直接发原始 AlgorithmEvent
终结: build(): AnimationScript    （由执行器调用，AI 不调）
```

生成器体（AI 输出）签名：裸语句，可用 `input`（解析后的输入）和 `b`（builder 实例）。例：
```js
b.arrayCreate(input)
for (let i = 0; i < input.length; i++)
  for (let j = 0; j < input.length - 1 - i; j++) {
    b.desc('比较 ' + j + ' 和 ' + (j+1)).compare(j, j+1)
    if (input[j] > input[j+1]) {
      const t = input[j]; input[j] = input[j+1]; input[j+1] = t
      b.desc('交换').swap(j, j+1)
    }
  }
```

---

## Task A: Builder + 执行器（纯函数地基）

**Files:**
- Create: `src/sandbox/builder.ts`
- Create: `src/sandbox/executeGenerator.ts`
- Test: `src/sandbox/__tests__/builder.test.ts`
- Test: `src/sandbox/__tests__/executeGenerator.test.ts`

> **前提：** 无依赖。可与 Task C 并行。

---

- [ ] **Step 1: 创建 `src/sandbox/builder.ts`**

```ts
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
```

- [ ] **Step 2: 创建 `src/sandbox/executeGenerator.ts`**

```ts
import type { AnimationScript, RendererType } from '@/types/animation'
import { AnimationBuilder } from './builder'

export interface GeneratorMeta {
  algorithm: string
  type: RendererType
}

export interface GeneratorResult {
  ok: boolean
  script?: AnimationScript
  error?: string
}

/** Execute an AI-generated generator body against the given input. Pure — runs
 *  via `new Function`. In production this runs inside a Web Worker (see
 *  runGenerator.ts); in tests it can be called directly with trusted sources. */
export function executeGenerator(source: string, input: unknown, meta: GeneratorMeta): GeneratorResult {
  try {
    const b = new AnimationBuilder(meta.algorithm, meta.type)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('input', 'b', source) as (input: unknown, b: AnimationBuilder) => void
    fn(input, b)
    return { ok: true, script: b.build() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
```

- [ ] **Step 3: 创建 `src/sandbox/__tests__/builder.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('AnimationBuilder — array', () => {
  it('arrayCreate + compare + swap 产出含对应 events 的脚本', () => {
    const b = new AnimationBuilder('bubble_sort', 'array')
    b.arrayCreate([3, 1, 2])
    b.desc('比较').compare(0, 1)
    b.desc('交换').swap(0, 1)
    const script = b.build()
    expect(script.algorithm).toBe('bubble_sort')
    expect(script.presentation?.engine).toBe('scene')
    expect(script.initialState.type).toBe('array')
    expect(script.initialState.data).toEqual([3, 1, 2])
    expect(script.steps).toHaveLength(3)
    expect(script.steps[0].events?.[0]).toEqual({ type: 'array.create', values: [3, 1, 2] })
    expect(script.steps[1].events?.[0]).toEqual({ type: 'array.compare', indices: [0, 1] })
    expect(script.steps[2].events?.[0]).toEqual({ type: 'array.swap', indices: [0, 1] })
  })

  it('desc 设置当前步骤描述，用后即清', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1])
    b.desc('我的描述').compare(0, 0)
    b.compare(0, 0)
    const script = b.build()
    expect(script.steps[1].description.zh).toBe('我的描述')
    expect(script.steps[2].description.zh).not.toBe('我的描述')
  })

  it('超过步数上限抛错', () => {
    const b = new AnimationBuilder('x', 'array')
    expect(() => {
      for (let i = 0; i < 1000; i++) b.compare(0, 0)
    }).toThrow(/步数超过上限/)
  })

  it('没有任何步骤时 build 抛错', () => {
    const b = new AnimationBuilder('x', 'array')
    expect(() => b.build()).toThrow(/没有产生任何步骤/)
  })
})

describe('AnimationBuilder — graph', () => {
  it('graphCreate 写入 initialState.nodes/edges', () => {
    const b = new AnimationBuilder('bfs', 'graph')
    b.graphCreate([{ id: 'A' }, { id: 'B' }], [{ source: 'A', target: 'B' }])
    b.visitNode('A')
    const script = b.build()
    expect(script.initialState.type).toBe('graph')
    expect(script.initialState.nodes).toHaveLength(2)
    expect(script.initialState.edges).toHaveLength(1)
    expect(script.steps[1].events?.[0]).toEqual({ type: 'graph.visit_node', nodeId: 'A' })
  })
})

describe('AnimationBuilder — tree', () => {
  it('treeCreate 写入 root/children/treeNodes', () => {
    const b = new AnimationBuilder('bst', 'tree')
    b.treeCreate('bst', 'r', [{ id: 'r', value: 5 }, { id: 'l', value: 3 }], [{ parentId: 'r', childId: 'l' }])
    const script = b.build()
    expect(script.initialState.type).toBe('tree')
    expect(script.initialState.root).toBe('r')
    expect(script.initialState.children?.r).toContain('l')
  })
})
```

- [ ] **Step 4: 创建 `src/sandbox/__tests__/executeGenerator.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { executeGenerator } from '../executeGenerator'

const bubbleBody = `
b.arrayCreate(input)
for (let i = 0; i < input.length; i++)
  for (let j = 0; j < input.length - 1 - i; j++) {
    b.desc('比较 ' + j + ',' + (j+1)).compare(j, j+1)
    if (input[j] > input[j+1]) {
      const t = input[j]; input[j] = input[j+1]; input[j+1] = t
      b.desc('交换').swap(j, j+1)
    }
  }
`

describe('executeGenerator', () => {
  it('合法生成器体对输入产出脚本', () => {
    const result = executeGenerator(bubbleBody, [3, 1, 2], { algorithm: 'bubble_sort', type: 'array' })
    expect(result.ok).toBe(true)
    expect(result.script?.initialState.data).toEqual([3, 1, 2])
    expect(result.script!.steps.length).toBeGreaterThan(1)
    // 第一步必为 array.create
    expect(result.script!.steps[0].events?.[0]).toEqual({ type: 'array.create', values: [3, 1, 2] })
  })

  it('换输入产出不同长度的脚本', () => {
    const small = executeGenerator(bubbleBody, [2, 1], { algorithm: 'x', type: 'array' })
    const large = executeGenerator(bubbleBody, [5, 4, 3, 2, 1], { algorithm: 'x', type: 'array' })
    expect(large.script!.steps.length).toBeGreaterThan(small.script!.steps.length)
  })

  it('生成器抛错时返回 ok:false + error', () => {
    const result = executeGenerator('throw new Error("boom")', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('boom')
  })

  it('语法错误的生成器体返回 ok:false', () => {
    const result = executeGenerator('this is not valid js {{{', [1], { algorithm: 'x', type: 'array' })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 5: 验证并提交**

```bash
npx tsc --noEmit && npm test src/sandbox/
```

期望：0 类型错误，builder + executeGenerator 测试全过。

```bash
git add src/sandbox/builder.ts src/sandbox/executeGenerator.ts src/sandbox/__tests__/
git commit -m "feat(sandbox): AnimationBuilder + executeGenerator（Phase 2 地基）

AnimationBuilder 把 builder 调用累积成标准 AnimationScript，覆盖
array/graph/tree/linked_list 事件，内置 600 步上限。executeGenerator
用 new Function 执行生成器体（纯函数，供 Worker 与测试共用）。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task B: Web Worker 沙箱（依赖 Task A）

**Files:**
- Create: `src/sandbox/generatorWorker.ts`
- Create: `src/sandbox/runGenerator.ts`

> **前提：** Task A 完成（需要 `executeGenerator`）。

---

- [ ] **Step 1: 创建 `src/sandbox/generatorWorker.ts`**

```ts
/// <reference lib="webworker" />
import { executeGenerator, type GeneratorResult, type GeneratorMeta } from './executeGenerator'

// Defense-in-depth: neutralize network / escape APIs inside the worker.
const w = self as unknown as Record<string, unknown>
w.fetch = undefined
w.XMLHttpRequest = undefined
w.importScripts = undefined
w.WebSocket = undefined

self.onmessage = (e: MessageEvent<{ source: string; input: unknown; meta: GeneratorMeta }>) => {
  const { source, input, meta } = e.data
  const result: GeneratorResult = executeGenerator(source, input, meta)
  ;(self as unknown as Worker).postMessage(result)
}
```

- [ ] **Step 2: 创建 `src/sandbox/runGenerator.ts`**

```ts
import type { GeneratorResult, GeneratorMeta } from './executeGenerator'
import { executeGenerator } from './executeGenerator'

/** Run an AI-generated generator in an isolated Web Worker with a hard timeout.
 *  Falls back to inline execution if Workers are unavailable (e.g. test env). */
export function runGeneratorSandboxed(
  source: string,
  input: unknown,
  meta: GeneratorMeta,
  timeoutMs = 2000,
): Promise<GeneratorResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(executeGenerator(source, input, meta))
  }
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./generatorWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(executeGenerator(source, input, meta))
      return
    }
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({ ok: false, error: `生成器执行超时（>${timeoutMs}ms），可能存在死循环` })
    }, timeoutMs)
    worker.onmessage = (ev: MessageEvent<GeneratorResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(ev.data)
    }
    worker.onerror = (ev) => {
      clearTimeout(timer)
      worker.terminate()
      resolve({ ok: false, error: '生成器执行出错: ' + ev.message })
    }
    worker.postMessage({ source, input, meta })
  })
}
```

- [ ] **Step 3: 验证（worker 在 jsdom 无法跑，依赖 fallback；只验证类型与构建）**

```bash
npx tsc --noEmit && npm test && npx vite build
```

期望：0 类型错误；现有测试全过；build 成功（Vite 正确打包 worker chunk）。

- [ ] **Step 4: 提交**

```bash
git add src/sandbox/generatorWorker.ts src/sandbox/runGenerator.ts
git commit -m "feat(sandbox): Web Worker 沙箱执行器 + 超时

generatorWorker 在独立线程执行生成器并中和网络 API；runGeneratorSandboxed
主线程超时强制 terminate，Worker 不可用时回退内联执行。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task C: AI 生成器提示词 + 解析 + client（与 Task A 并行）

**Files:**
- Create: `src/ai/generatorPrompt.ts`
- Create: `src/ai/generatorParser.ts`
- Modify: `src/ai/client.ts`（新增 `analyzeCodeGenerator`）
- Modify: `src/ai/index.ts`（导出）
- Test: `src/ai/__tests__/generatorParser.test.ts`

> **前提：** 无依赖（builder API 方法名见上方契约，照此文档化即可）。可与 Task A 并行。

---

- [ ] **Step 1: 创建 `src/ai/generatorPrompt.ts`**

```ts
export function buildGeneratorSystemPrompt(language: string): string {
  return `你是算法可视化生成器编写器。用户给你一段 ${language} 算法代码和初始输入数据。
你的任务：分析算法逻辑，输出一段 **JavaScript 生成器代码**，它对**任意输入**都能产出对应的可视化动画。

## 输出格式（严格遵守）
只输出一个 \`\`\`js 代码块。代码块顶部用两行指令注释声明算法标识和数据结构类型：
\`\`\`js
// @algorithm <蛇形算法名，如 selection_sort>
// @type <array | graph | tree | linked_list>
<这里是直接可执行的语句，使用变量 input 和 b，不要包成 function>
\`\`\`
不要输出任何代码块以外的文字。

## 可用变量
- \`input\`：解析后的输入数据（数组类为 number[]；图为 {nodes,edges}；树为 {root,children}）
- \`b\`：动画构建器，方法如下（除终结外都可链式 .desc(...).xxx()）

### 通用
- \`b.desc(中文描述)\`：为紧接着的那个操作设置说明
- \`b.note(文本)\`：旁注

### 数组（排序/查找/双指针/滑动窗口）
- \`b.arrayCreate(values)\` 第一步必调，传完整初始数组
- \`b.compare(i, j)\` / \`b.swap(i, j)\` / \`b.move(from, to)\`
- \`b.setValue(index, value)\` / \`b.markSorted(indices)\` / \`b.partition(pivot, left, right)\`

### 图
- \`b.graphCreate(nodes, edges, directed?)\` 第一步必调；nodes=[{id,label?}]，edges=[{source,target,weight?}]
- \`b.visitNode(id)\` / \`b.visitEdge(s, t)\` / \`b.relaxEdge(s, t, success)\` / \`b.enqueue(id)\` / \`b.dequeue(id)\`

### 树
- \`b.treeCreate('bst'|'binary'|'avl', rootId, nodes, edges)\`；nodes=[{id,value}]，edges=[{parentId,childId}]
- \`b.treeVisit(id)\` / \`b.treeInsert(parentId, {id,value}, side?)\` / \`b.treeCompare(nodeId, value)\` / \`b.treeRotate(rotation, pivotId)\`

### 链表
- \`b.listCreate('singly'|'doubly'|'circular', nodes, headId?)\`；nodes=[{id,value}]
- \`b.listVisit(id)\` / \`b.listInsertAfter(targetId, {id,value})\` / \`b.listDelete(id)\` / \`b.movePointer(pointerId, toNodeId)\`

## 硬性要求
- 代码必须用 input 的实际值运行，**换输入要能产出不同动画**（不要硬编码步骤）
- 数组类第一步必须 \`b.arrayCreate(input)\`；图/树类似
- 每个关键操作都要发对应方法（比较、交换、访问...），不要只 b.note 文字
- 总步数控制在 ~300 以内；可在循环里 break/限制规模
- 不要访问网络、DOM、定时器；不要写死循环；只用 input 和 b

## 示例（选择排序）
\`\`\`js
// @algorithm selection_sort
// @type array
b.arrayCreate(input)
for (let i = 0; i < input.length; i++) {
  let min = i
  b.desc('外层 i=' + i + '，假定最小为 ' + input[i]).compare(i, i)
  for (let j = i + 1; j < input.length; j++) {
    b.desc('比较 arr[' + j + '] 与当前最小 arr[' + min + ']').compare(j, min)
    if (input[j] < input[min]) min = j
  }
  if (min !== i) {
    const t = input[i]; input[i] = input[min]; input[min] = t
    b.desc('交换 ' + i + ' 和 ' + min).swap(i, min)
  }
  b.desc('arr[' + i + '] 归位').markSorted([i])
}
\`\`\``
}
```

- [ ] **Step 2: 创建 `src/ai/generatorParser.ts`**

```ts
import type { RendererType } from '@/types/animation'

export interface ParsedGenerator {
  algorithm: string
  type: RendererType
  body: string
}

export interface GeneratorParseResult {
  success: boolean
  generator?: ParsedGenerator
  error?: string
}

const VALID_TYPES: RendererType[] = ['array', 'graph', 'tree', 'linked_list', 'matrix']

/** Parse the AI's generator response: a ```js block with @algorithm/@type directives. */
export function parseGeneratorResponse(raw: string): GeneratorParseResult {
  // Extract the js code block, or fall back to the whole response.
  const blockMatch = raw.match(/```(?:js|javascript)?\s*([\s\S]*?)```/)
  const code = (blockMatch ? blockMatch[1] : raw).trim()
  if (!code) return { success: false, error: '响应为空，未找到生成器代码' }

  const algoMatch = code.match(/\/\/\s*@algorithm\s+([A-Za-z0-9_]+)/)
  const typeMatch = code.match(/\/\/\s*@type\s+([A-Za-z_]+)/)

  const algorithm = algoMatch ? algoMatch[1] : 'custom'
  const typeStr = typeMatch ? typeMatch[1] : 'array'
  const type = (VALID_TYPES as string[]).includes(typeStr) ? (typeStr as RendererType) : 'array'

  // Body = code minus the directive comment lines.
  const body = code
    .split('\n')
    .filter(line => !/^\s*\/\/\s*@(algorithm|type)\b/.test(line))
    .join('\n')
    .trim()

  if (!body) return { success: false, error: '生成器代码体为空' }

  // Light sanity check: must reference the builder.
  if (!/\bb\s*\./.test(body)) {
    return { success: false, error: '生成器未调用构建器 b（输出格式不符）' }
  }

  return { success: true, generator: { algorithm, type, body } }
}
```

- [ ] **Step 3: 在 `src/ai/client.ts` 末尾新增 `analyzeCodeGenerator`**

在文件顶部 import 区追加：
```ts
import { buildGeneratorSystemPrompt } from './generatorPrompt'
import { parseGeneratorResponse, type ParsedGenerator } from './generatorParser'
```

在文件末尾（`testApiConnection` 之后、`requestWithProxyFallback` 之前的任意顶层位置）追加：
```ts
export interface GeneratorAnalyzeResult {
  success: boolean
  generator?: ParsedGenerator
  error?: string
  errorReport?: AIErrorReport
  rawResponse?: string
}

/** Phase 2: ask the AI to produce an executable generator (input → animation),
 *  instead of a one-shot static script. */
export async function analyzeCodeGenerator(
  params: AIRequestParams,
  options: AnalyzeOptions = {},
): Promise<GeneratorAnalyzeResult> {
  const { signal } = options
  if (signal?.aborted) return { success: false, error: 'AbortError' }

  const config = getApiConfig()
  if (!config) {
    const template = ERROR_TEMPLATES.missingConfig
    return { success: false, error: template.message, errorReport: { ...template, issues: [], rawResponse: '' } }
  }

  const parsedInput = parseInputData(params.inputData)
  if (!parsedInput.valid) {
    return { success: false, error: parsedInput.message || '输入数据不是合法 JSON' }
  }

  try {
    const result = await requestWithProxyFallback(
      config,
      buildGeneratorSystemPrompt(params.language),
      buildUserMessage(params.code, params.language, params.inputData, parsedInput.promptContext, params.algorithmName),
      { temperature: 0.2, jsonMode: false, signal },
    )
    if (!result.success) {
      return { success: false, error: result.error, errorReport: result.errorReport, rawResponse: result.content }
    }
    const parsed = parseGeneratorResponse(result.content)
    if (!parsed.success) {
      return { success: false, error: parsed.error, rawResponse: result.content }
    }
    return { success: true, generator: parsed.generator, rawResponse: result.content }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
```

注意：`jsonMode: false`（生成器输出是代码块不是 JSON）。

- [ ] **Step 4: 在 `src/ai/index.ts` 导出新类型与函数**

打开 `src/ai/index.ts`，在导出 client 内容处追加 `analyzeCodeGenerator` 和类型 `GeneratorAnalyzeResult`，以及从 generatorParser 导出 `ParsedGenerator`。先 Read 该文件确认现有导出风格，按相同方式补充。例如：
```ts
export { analyzeCode, analyzeCodeGenerator, getApiConfig, testApiConnection, type AIResult, type GeneratorAnalyzeResult } from './client'
export type { ParsedGenerator } from './generatorParser'
```
（具体以文件现有写法为准，保持一致。）

- [ ] **Step 5: 创建 `src/ai/__tests__/generatorParser.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseGeneratorResponse } from '../generatorParser'

const goodResponse = '```js\n// @algorithm selection_sort\n// @type array\nb.arrayCreate(input)\nfor (let i=0;i<input.length;i++) b.compare(i,i)\n```'

describe('parseGeneratorResponse', () => {
  it('解析含指令的 js 代码块', () => {
    const r = parseGeneratorResponse(goodResponse)
    expect(r.success).toBe(true)
    expect(r.generator?.algorithm).toBe('selection_sort')
    expect(r.generator?.type).toBe('array')
    expect(r.generator?.body).toContain('b.arrayCreate(input)')
    // 指令注释行被剔除
    expect(r.generator?.body).not.toContain('@algorithm')
  })

  it('无代码块围栏时回退解析整段', () => {
    const raw = '// @algorithm x\n// @type array\nb.arrayCreate(input)'
    const r = parseGeneratorResponse(raw)
    expect(r.success).toBe(true)
    expect(r.generator?.body).toContain('b.arrayCreate')
  })

  it('缺指令时默认 algorithm=custom、type=array', () => {
    const r = parseGeneratorResponse('```js\nb.arrayCreate(input)\n```')
    expect(r.success).toBe(true)
    expect(r.generator?.algorithm).toBe('custom')
    expect(r.generator?.type).toBe('array')
  })

  it('非法 type 回退为 array', () => {
    const r = parseGeneratorResponse('```js\n// @type banana\nb.compare(0,1)\n```')
    expect(r.generator?.type).toBe('array')
  })

  it('代码体未调用 b 时报错', () => {
    const r = parseGeneratorResponse('```js\n// @type array\nconst x = 1\n```')
    expect(r.success).toBe(false)
  })

  it('空响应报错', () => {
    expect(parseGeneratorResponse('').success).toBe(false)
  })
})
```

- [ ] **Step 6: 验证并提交**

```bash
npx tsc --noEmit && npm test src/ai/
```

期望：0 类型错误，generatorParser 测试全过，现有 ai 测试不破。

```bash
git add src/ai/generatorPrompt.ts src/ai/generatorParser.ts src/ai/client.ts src/ai/index.ts src/ai/__tests__/generatorParser.test.ts
git commit -m "feat(ai): 生成器模式提示词 + 解析 + analyzeCodeGenerator

新增 buildGeneratorSystemPrompt（文档化 builder API，要求 AI 输出
带 @algorithm/@type 指令的 js 生成器代码块）、parseGeneratorResponse
（提取代码体），以及 client.analyzeCodeGenerator（生成器模式 AI 调用）。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task D: Playground 集成（依赖 Task B + Task C）

**Files:**
- Modify: `src/store/algorithmStore.ts`（AIHistoryEntry 加 generator 字段）
- Modify: `src/pages/Playground/index.tsx`

> **前提：** Task B（runGeneratorSandboxed）和 Task C（analyzeCodeGenerator）完成。

---

- [ ] **Step 1: store —— AIHistoryEntry 增加可选生成器字段**

在 `src/store/algorithmStore.ts` 的 `AIHistoryEntry` 接口里，`error?: string` 之后追加：
```ts
  generatorBody?: string
  generatorType?: 'array' | 'graph' | 'tree' | 'linked_list'
```
（其余 store 逻辑不变，updateAIHistory 的 Partial patch 已能写入这些字段。）

- [ ] **Step 2: Playground —— 引入依赖与生成器状态**

在 import 区追加：
```ts
import { analyzeCodeGenerator } from '@/ai'
import { runGeneratorSandboxed } from '@/sandbox/runGenerator'
```

在 `liveAlgoId` state 之后追加生成器状态：
```ts
  // Phase 2: AI-generated generator for custom (unrecognized) algorithms.
  const [generator, setGenerator] = useState<{ body: string; type: 'array' | 'graph' | 'tree' | 'linked_list' } | null>(null)
```

- [ ] **Step 3: Playground —— 新增 runGenerator 辅助（本地跑沙箱并设动画）**

在 `buildLiveScript` 之后追加：
```ts
  const runGenerator = useCallback(async (body: string, type: 'array' | 'graph' | 'tree' | 'linked_list', rawInput: string) => {
    const parsed = parseInputData(rawInput)
    if (!parsed.valid) return
    const result = await runGeneratorSandboxed(body, parsed.value, { algorithm: 'custom', type })
    if (result.ok && result.script) {
      setAnimationScript(result.script)
      setAIStatus('success')
    } else {
      setAIStatus('error', result.error || '生成器执行失败')
    }
  }, [setAnimationScript, setAIStatus])
```

- [ ] **Step 4: Playground —— 替换 handleAnalyze 为生成器流程**

将 `handleAnalyze` 里从 `setAIStatus('analyzing')` 之后的 try 块整体替换为：
```ts
    setAIStatus('analyzing')
    setAiErrorReport(null)
    setAiRepairHistory(null)
    setShowRawResponse(false)

    try {
      const result = await analyzeCodeGenerator({
        code, language: codeLanguage, inputData,
        algorithmName: '用户自定义代码',
      }, { signal: controller.signal })

      if (controller.signal.aborted) return
      playgroundAnalysisController = null

      if (!result.success || !result.generator) {
        setAIStatus('error', result.error || '分析失败', result.rawResponse)
        setAiErrorReport(result.errorReport ?? null)
        updateAIHistory(historyId, { status: 'error', error: result.error || '分析失败' })
        return
      }

      const gen = result.generator
      const recognized = recognizeAlgorithm(gen.algorithm)

      if (recognized) {
        // Phase 1: 内置生成器
        setLiveAlgoId(recognized)
        setGenerator(null)
        const liveScript = buildLiveScript(recognized, inputData)
        if (liveScript) setAnimationScript(liveScript)
        setAIStatus('success')
        updateAIHistory(historyId, { status: 'success', script: liveScript ?? undefined })
      } else {
        // Phase 2: AI 生成器
        const genType = gen.type === 'matrix' ? 'array' : gen.type
        setLiveAlgoId(null)
        setGenerator({ body: gen.body, type: genType })
        const parsed = parseInputData(inputData)
        const sandboxResult = parsed.valid
          ? await runGeneratorSandboxed(gen.body, parsed.value, { algorithm: gen.algorithm, type: genType })
          : { ok: false, error: '输入数据无效' }
        if (sandboxResult.ok && sandboxResult.script) {
          setAnimationScript(sandboxResult.script)
          setAIStatus('success')
          updateAIHistory(historyId, { status: 'success', script: sandboxResult.script, generatorBody: gen.body, generatorType: genType })
        } else {
          setAIStatus('error', sandboxResult.error || '生成器执行失败')
          updateAIHistory(historyId, { status: 'error', error: sandboxResult.error || '生成器执行失败' })
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        removeAIHistory(historyId)
        return
      }
      const msg = e instanceof Error ? e.message : '未知错误'
      setAIStatus('error', msg)
      updateAIHistory(historyId, { status: 'error', error: msg })
    }
  }
```
（注意：`gen.type` 可能是 'matrix'，沙箱 builder 仅支持四类，这里把 matrix 归并为 array 兜底。）

- [ ] **Step 5: Playground —— 输入变化时按模式本地重生成**

把现有的"Live mode" useEffect 扩展为同时处理 Phase 1 与 Phase 2：
```ts
  // 输入变化 → 本地重生成（Phase 1 内置生成器 或 Phase 2 AI 生成器），不调 AI
  useEffect(() => {
    if (liveAlgoId) {
      const handle = setTimeout(() => {
        const script = buildLiveScript(liveAlgoId, inputData)
        if (script) { setAnimationScript(script); setAIStatus('success') }
      }, 400)
      return () => clearTimeout(handle)
    }
    if (generator) {
      let cancelled = false
      const handle = setTimeout(async () => {
        const parsed = parseInputData(inputData)
        if (!parsed.valid) return
        const result = await runGeneratorSandboxed(generator.body, parsed.value, { algorithm: 'custom', type: generator.type })
        if (cancelled) return
        if (result.ok && result.script) { setAnimationScript(result.script); setAIStatus('success') }
      }, 400)
      return () => { cancelled = true; clearTimeout(handle) }
    }
  }, [inputData, liveAlgoId, generator, buildLiveScript, setAnimationScript, setAIStatus])
```
（删除原来只处理 liveAlgoId 的那个 useEffect，用这个替换。）

- [ ] **Step 6: Playground —— handleRestore 恢复生成器**

把 `handleRestore` 成功分支改为：
```ts
    if (entry.status === 'success' && entry.script) {
      const recognized = recognizeAlgorithm(entry.script.algorithm)
      if (recognized) {
        setLiveAlgoId(recognized)
        setGenerator(null)
      } else if (entry.generatorBody && entry.generatorType) {
        setLiveAlgoId(null)
        setGenerator({ body: entry.generatorBody, type: entry.generatorType })
      } else {
        setLiveAlgoId(null)
        setGenerator(null)
      }
      setAnimationScript(entry.script)
      setAIStatus('success')
    } else {
      setLiveAlgoId(null)
      setGenerator(null)
      setAnimationScript(null)
      setAIStatus('idle')
    }
```

- [ ] **Step 7: Playground —— 顶栏徽标区分两种实时模式**

把顶栏的 `liveAlgoId` 徽标条件改为同时覆盖 generator：
```tsx
          {(liveAlgoId || generator) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium flex items-center gap-1 shrink-0">
              <Icon name="zap" size={10} />
              {liveAlgoId ? '实时算法 · 改输入即时更新' : 'AI 逻辑生成器 · 改输入即时更新'}
            </span>
          )}
```

- [ ] **Step 8: 验证**

```bash
npx tsc --noEmit && npm test && npx vite build
```

期望：0 类型错误，所有测试通过，build 成功。

- [ ] **Step 9: 提交**

```bash
git add src/store/algorithmStore.ts src/pages/Playground/index.tsx
git commit -m "feat(playground): Phase 2 集成——自定义算法用 AI 生成器沙箱执行

handleAnalyze 改用 analyzeCodeGenerator：识别内置算法走 Phase 1，
否则在 Web Worker 沙箱执行 AI 生成器，按当前输入产出动画。输入变化
时本地重跑（Phase 1 内置 / Phase 2 沙箱），均不再调 AI。生成器体存入
历史条目支持 restore。顶栏徽标区分两种实时模式。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 自检

**1. Spec 覆盖：**
- ✅ 编译检查先行（Playground handleAnalyze 已有 compileAndValidateCode 前置，未改动）
- ✅ AI 输出可执行生成器（Task C 提示词 + 解析）
- ✅ Builder API 基础元素（Task A，覆盖 array/graph/tree/linked_list）
- ✅ Web Worker 沙箱 + 超时 + 网络中和（Task B）
- ✅ 步数上限防失控（Task A，MAX_STEPS=600）+ 超时防死循环（Task B）
- ✅ 执行失败提示重试（Task D：setAIStatus error + 现有错误浮层"重新分析"按钮）
- ✅ 改输入本地重生成不调 AI（Task D Step 5）
- ✅ 历史 restore 恢复生成器（Task D Step 6）

**2. 占位符扫描：** 无 TBD。所有代码完整。

**3. 类型一致性：**
- `GeneratorResult { ok, script?, error? }` 在 Task A 定义，B/D 一致使用 ✓
- `GeneratorMeta { algorithm, type }` 在 Task A 定义，B 透传 ✓
- `ParsedGenerator { algorithm, type, body }` 在 Task C 定义，D 使用 `gen.body/gen.type/gen.algorithm` ✓
- builder 方法名（arrayCreate/compare/swap/graphCreate/visitNode/treeCreate/listCreate...）在 Task A 定义、Task C 提示词文档化，一致 ✓
- `runGeneratorSandboxed(source, input, meta, timeoutMs?)` 在 Task B 定义，D 按此调用 ✓
- `analyzeCodeGenerator(params, options)` 在 Task C 定义，D 按此调用 ✓
- AIHistoryEntry 的 `generatorBody?/generatorType?`（Task D Step 1）与写入处（updateAIHistory patch）一致 ✓
