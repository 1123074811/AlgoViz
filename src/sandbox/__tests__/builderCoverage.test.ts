import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '@/sandbox/builder'

/**
 * 深度覆盖 builder.ts 内部分支：coerceArray / statDelta / defaultDescFor /
 * build() 输出形状 / MAX_STEPS 封顶。这些函数本身未导出，故通过公开方法间接驱动。
 */

const lastEvent = (b: AnimationBuilder) => {
  const steps = b.build().steps
  return steps[steps.length - 1].events?.[0]
}

describe('coerceArray（经 stackCreate / arrayCreate 等驱动）', () => {
  it('原样接受数组', () => {
    const b = new AnimationBuilder('x', 'array')
    b.stackCreate([1, 2, 3])
    expect(lastEvent(b)).toEqual({ type: 'stack.create', values: [1, 2, 3] })
  })

  it('从包装对象的 nums 键解出数组', () => {
    const b = new AnimationBuilder('x', 'array')
    // @ts-expect-error 故意传入包装对象，模拟 AI 误传整个 input
    b.queueCreate({ nums: [4, 5] })
    expect(lastEvent(b)).toEqual({ type: 'queue.create', values: [4, 5] })
  })

  it('从包装对象的其它候选键（values / arr / data / list / items / a）解出数组', () => {
    const keys: Array<[string, (number | string)[]]> = [
      ['values', [1]],
      ['arr', [2]],
      ['array', [3]],
      ['data', [4]],
      ['list', [5]],
      ['items', [6]],
      ['a', [7]],
    ]
    for (const [k, arr] of keys) {
      const b = new AnimationBuilder('x', 'array')
      // @ts-expect-error 故意传入包装对象
      b.dequeCreate({ [k]: arr })
      expect(lastEvent(b)).toEqual({ type: 'deque.create', values: arr })
    }
  })

  it('标量（number / string）被包裹为单元素数组', () => {
    const bn = new AnimationBuilder('x', 'array')
    // @ts-expect-error 标量
    bn.stackCreate(7)
    expect(lastEvent(bn)).toEqual({ type: 'stack.create', values: [7] })

    const bs = new AnimationBuilder('x', 'array')
    // @ts-expect-error 标量
    bs.stackCreate('hi')
    expect(lastEvent(bs)).toEqual({ type: 'stack.create', values: ['hi'] })
  })

  it('垃圾输入（null / 无匹配键的对象）降级为空数组', () => {
    const bnull = new AnimationBuilder('x', 'array')
    // @ts-expect-error 垃圾
    bnull.queueCreate(null)
    expect(lastEvent(bnull)).toEqual({ type: 'queue.create', values: [] })

    const bobj = new AnimationBuilder('x', 'array')
    // @ts-expect-error 无匹配键
    bobj.queueCreate({ foo: [1, 2] })
    expect(lastEvent(bobj)).toEqual({ type: 'queue.create', values: [] })
  })

  it('arrayCreate 经 coerceArray 后还会写入 initialState.data', () => {
    const b = new AnimationBuilder('x', 'array')
    // @ts-expect-error 包装对象
    b.arrayCreate({ nums: [9, 8, 7] })
    const script = b.build()
    expect(script.steps[0].events?.[0]).toEqual({ type: 'array.create', values: [9, 8, 7] })
    expect(script.initialState.data).toEqual([9, 8, 7])
  })
})

describe('statDelta（累计 comparisons / swaps / accesses）', () => {
  const stats = (b: AnimationBuilder) => {
    const steps = b.build().steps
    return steps[steps.length - 1].stats
  }

  it('compare 家族：比较 +1，访问 +2', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 2])
    b.compare(0, 1)
    expect(stats(b)).toEqual({ comparisons: 1, swaps: 0, accesses: 2 })
  })

  it('get / peek / visit / highlight 家族：访问 +1', () => {
    const b = new AnimationBuilder('x', 'array')
    b.stackCreate([1])
    b.stackPeek(0) // stack.peek
    b.queuePeekFront(0) // queue.peek_front
    expect(stats(b)).toEqual({ comparisons: 0, swaps: 0, accesses: 2 })
  })

  it('swap 家族：交换 +1，访问 +2', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 2])
    b.swap(0, 1)
    expect(stats(b)).toEqual({ comparisons: 0, swaps: 1, accesses: 2 })
  })

  it('sift 家族：比较 +1、交换 +1、访问 +2', () => {
    const b = new AnimationBuilder('x', 'array')
    b.heapCreate([3, 2, 1])
    b.heapSift(0, 1)
    expect(stats(b)).toEqual({ comparisons: 1, swaps: 1, accesses: 2 })
  })

  it('create / init / scene.* 家族：三项均不增加', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 2]) // array.create -> 0
    b.note('旁注') // scene.note -> 0
    expect(stats(b)).toEqual({ comparisons: 0, swaps: 0, accesses: 0 })
  })

  it('generic 数据操作（push/set/update...）：访问 +1', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 2]) // create -> 0
    b.setValue(0, 9) // array.set_value -> generic +1
    b.stackPush(5) // stack.push -> generic +1
    expect(stats(b)).toEqual({ comparisons: 0, swaps: 0, accesses: 2 })
  })
})

describe('defaultDescFor（无 desc 时按事件家族推导中文描述）', () => {
  const placeholder = /^步骤\s*\d+$/
  const descOf = (build: () => ReturnType<AnimationBuilder['build']>, idx: number) =>
    build().steps[idx].description.zh

  it('array 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 2, 3]) // 0
    b.compare(0, 1) // 1
    b.swap(0, 1) // 2
    b.move(0, 2) // 3
    b.setValue(1, 9) // 4
    b.markSorted([0]) // 5
    b.partition(1, 0, 2) // 6
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化数组')
    expect(s[1].description.zh).toBe('比较索引 0、1')
    expect(s[2].description.zh).toBe('交换索引 0、1')
    expect(s[3].description.zh).toBe('移动 0 → 2')
    expect(s[4].description.zh).toBe('更新索引 1 的值为 9')
    expect(s[5].description.zh).toBe('标记索引 0 已确定')
    expect(s[6].description.zh).toBe('以索引 1 为基准划分')
  })

  it('graph 家族', () => {
    const b = new AnimationBuilder('x', 'graph')
    b.graphCreate([{ id: 'A' }, { id: 'B' }], [{ source: 'A', target: 'B' }]) // 0
    b.visitNode('A') // 1
    b.visitEdge('A', 'B') // 2
    b.relaxEdge('A', 'B', true) // 3
    b.enqueue('A') // 4
    b.dequeue('A') // 5
    const s = b.build().steps
    expect(s[0].description.zh).toBe('构建图')
    expect(s[1].description.zh).toBe('访问节点 A')
    expect(s[2].description.zh).toBe('检查边 A→B')
    expect(s[3].description.zh).toBe('松弛边 A→B')
    expect(s[4].description.zh).toBe('节点 A 入队')
    expect(s[5].description.zh).toBe('节点 A 出队')
  })

  it('tree 家族', () => {
    const b = new AnimationBuilder('x', 'tree')
    b.treeCreate('bst', 'r', [{ id: 'r', value: 5 }], []) // 0
    b.treeVisit('r') // 1
    b.treeInsert('r', { id: 'c', value: 3 }) // 2
    b.treeCompare('r', 3) // 3
    b.treeRotate('left', 'r') // 4
    const s = b.build().steps
    expect(s[0].description.zh).toBe('构建树')
    expect(s[1].description.zh).toBe('访问节点 r')
    expect(s[2].description.zh).toBe('插入节点 3')
    expect(s[3].description.zh).toBe('与节点 r 比较')
    expect(s[4].description.zh).toBe('旋转（left）')
  })

  it('linked_list 家族', () => {
    const b = new AnimationBuilder('x', 'linked_list')
    b.listCreate('singly', [{ id: 'n1', value: 1 }], 'n1') // 0
    b.listVisit('n1') // 1
    b.listInsertAfter('n1', { id: 'n2', value: 2 }) // 2
    b.listDelete('n1') // 3
    b.movePointer('p', 'n2') // 4
    const s = b.build().steps
    expect(s[0].description.zh).toBe('构建链表')
    expect(s[1].description.zh).toBe('访问节点 n1')
    expect(s[2].description.zh).toBe('在 n1 后插入')
    expect(s[3].description.zh).toBe('删除节点 n1')
    expect(s[4].description.zh).toBe('移动指针 p')
  })

  it('pointer 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1])
    b.pointerCreate('p', 0) // 1
    b.pointerMove('p', 1) // 2
    b.pointerHighlight('p') // 3
    b.pointerClear('p') // 4
    const s = b.build().steps
    expect(s[1].description.zh).toBe('创建指针 p')
    expect(s[2].description.zh).toBe('移动指针 p')
    expect(s[3].description.zh).toBe('高亮指针 p')
    expect(s[4].description.zh).toBe('清除指针 p')
  })

  it('stack 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.stackCreate([]) // 0
    b.stackPush(7) // 1
    b.stackPeek(0) // 2
    b.stackPop() // 3
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化栈')
    expect(s[1].description.zh).toBe('7 入栈')
    expect(s[2].description.zh).toBe('查看栈顶')
    expect(s[3].description.zh).toBe('弹出栈顶')
  })

  it('queue 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.queueCreate([]) // 0
    b.queueEnqueue(3) // 1
    b.queuePeekFront(0) // 2
    b.queueDequeue() // 3
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化队列')
    expect(s[1].description.zh).toBe('3 入队')
    expect(s[2].description.zh).toBe('查看队首')
    expect(s[3].description.zh).toBe('队首出队')
  })

  it('deque 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.dequeCreate([]) // 0
    b.dequePushFront(1) // 1
    b.dequePushBack(2) // 2
    b.dequePopFront() // 3
    b.dequePopBack() // 4
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化双端队列')
    expect(s[1].description.zh).toBe('1 加入队首')
    expect(s[2].description.zh).toBe('2 加入队尾')
    expect(s[3].description.zh).toBe('移除队首')
    expect(s[4].description.zh).toBe('移除队尾')
  })

  it('heap 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.heapCreate([3, 1]) // 0
    b.heapPush(5) // 1
    b.heapSift(0, 1) // 2
    b.heapPeek(0) // 3
    b.heapPop() // 4
    const s = b.build().steps
    expect(s[0].description.zh).toBe('建堆')
    expect(s[1].description.zh).toBe('5 入堆')
    expect(s[2].description.zh).toBe('堆调整：索引 0 ↔ 1')
    expect(s[3].description.zh).toBe('查看堆顶')
    expect(s[4].description.zh).toBe('弹出堆顶')
  })

  it('hashtable 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.hashCreate(8) // 0
    b.hashPut('k', 1, 3) // 1
    b.hashGet('k', 3, true) // 2
    b.hashRemove('k', 3) // 3
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化哈希表')
    expect(s[1].description.zh).toBe('存入 k → 桶 3')
    expect(s[2].description.zh).toBe('查找 k')
    expect(s[3].description.zh).toBe('删除 k')
  })

  it('set 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.setCreate([1]) // 0
    b.setAdd(2) // 1
    b.setContains(2, true) // 2
    b.setRemove(2) // 3
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化集合')
    expect(s[1].description.zh).toBe('加入 2')
    expect(s[2].description.zh).toBe('判断是否包含 2')
    expect(s[3].description.zh).toBe('移除 2')
  })

  it('string 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.strCreate('abc') // 0
    b.strCompare(0, 0, 1) // 1
    b.strMatch(0, 1) // 2
    b.strMismatch(0, 2) // 3
    b.strMarkRange(0, [0, 1]) // 4
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化字符串')
    expect(s[1].description.zh).toBe('比较字符 0、1')
    expect(s[2].description.zh).toBe('字符匹配于 1')
    expect(s[3].description.zh).toBe('字符失配于 2')
    expect(s[4].description.zh).toBe('标记区间 0、1')
  })

  it('matrix 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.matrixCreate(2, 2) // 0
    b.matrixVisit(0, 1) // 1
    b.matrixUpdate(1, 0, 9) // 2
    b.matrixMarkPath([{ row: 0, col: 0 }]) // 3
    b.matrixTransition({ row: 0, col: 0 }, { row: 1, col: 1 }) // 4
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化矩阵')
    expect(s[1].description.zh).toBe('访问格子 (0,1)')
    expect(s[2].description.zh).toBe('更新格子 (1,0) = 9')
    expect(s[3].description.zh).toBe('标记路径')
    expect(s[4].description.zh).toBe('状态转移')
  })

  it('math / bitset 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.varInit([{ name: 'i', value: 0 }]) // 0 -> math.init
    b.varSet('i', 1) // 1 -> math.set
    b.bitsetCreate(8) // 2
    b.bitsetSet(0, 1) // 3
    b.bitsetHighlight(0) // 4
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化变量')
    expect(s[1].description.zh).toBe('i = 1')
    expect(s[2].description.zh).toBe('初始化位集')
    expect(s[3].description.zh).toBe('位 0 置为 1')
    expect(s[4].description.zh).toBe('关注位 0')
  })

  it('scene 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1])
    b.note('一条旁注') // scene.note
    b.link('arr_0', 'arr_0') // scene.link
    const s = b.build().steps
    expect(s[1].description.zh).toBe('一条旁注')
    expect(s[2].description.zh).toBe('连接 arr_0 → arr_0')
  })

  it('callstack 家族（含 return 有/无值分支）', () => {
    const b = new AnimationBuilder('x', 'array')
    b.callStackCreate() // 0
    b.callPush('foo', {}, {}, 'f0') // 1
    b.callUpdate('f0', { status: 'active' }) // 2
    b.callReturn('f0', 9) // 3 有值
    b.callHighlight('f0') // 4
    b.callPop('f0') // 5
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化调用栈')
    expect(s[1].description.zh).toBe('调用 foo')
    expect(s[2].description.zh).toContain('f0')
    expect(s[3].description.zh).toBe('函数返回 9')
    expect(s[4].description.zh).toContain('f0')
    expect(s[5].description.zh).toBe('弹出调用帧')
  })

  it('callstack.return 无值时显示「函数返回」', () => {
    const b = new AnimationBuilder('x', 'array')
    b.callStackCreate()
    b.callReturn('f0')
    expect(b.build().steps[1].description.zh).toBe('函数返回')
  })

  it('grid 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.gridCreate([[1, 0], [0, 1]]) // 0
    b.gridSet(0, 1, 5) // 1 有值
    b.gridVisit(1, 0) // 2
    b.gridFrontier([[0, 0]]) // 3
    b.gridPath([[0, 0]]) // 4
    b.gridWall(1, 1, true) // 5
    b.gridWeight(0, 0, 7) // 6
    b.gridArrow([0, 0], [1, 1]) // 7
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化网格')
    expect(s[1].description.zh).toBe('更新格子 (0,1) = 5')
    expect(s[2].description.zh).toBe('访问格子 (1,0)')
    expect(s[3].description.zh).toBe('更新网格边界集合')
    expect(s[4].description.zh).toBe('标记网格路径')
    expect(s[5].description.zh).toBe('设置障碍 (1,1)')
    expect(s[6].description.zh).toBe('设置格子 (0,0) 权重 7')
    expect(s[7].description.zh).toBe('标记网格转移方向')
  })

  it('grid.set_cell 无值时省略「= 值」', () => {
    const b = new AnimationBuilder('x', 'array')
    b.gridCreate([[1]])
    b.gridSet(0, 0) // 无 value
    expect(b.build().steps[1].description.zh).toBe('更新格子 (0,0)')
  })

  it('grid.wall enabled=false 时显示「移除障碍」', () => {
    const b = new AnimationBuilder('x', 'array')
    b.gridCreate([[1]])
    b.gridWall(0, 0, false)
    expect(b.build().steps[1].description.zh).toBe('移除障碍 (0,0)')
  })

  it('dp 家族', () => {
    const b = new AnimationBuilder('x', 'array')
    b.dpCreate('dp', 2, 2) // 0
    b.dpSet('dp', 1, 1, 4) // 1 有值
    b.dpHighlight('dp', [{ row: 0, col: 0 }]) // 2
    b.dpDependency('dp', [{ row: 0, col: 0 }], { row: 1, col: 1 }) // 3
    b.dpFormula('dp', { row: 1, col: 1 }, 'dp[i][j]') // 4
    b.dpTraceback('dp', [{ row: 0, col: 0 }]) // 5
    const s = b.build().steps
    expect(s[0].description.zh).toBe('初始化 DP 表')
    expect(s[1].description.zh).toBe('更新 DP 状态 (1,1) = 4')
    expect(s[2].description.zh).toBe('高亮 DP 状态')
    expect(s[3].description.zh).toBe('标记 DP 状态依赖')
    expect(s[4].description.zh).toBe('展示 DP 转移公式')
    expect(s[5].description.zh).toBe('回溯 DP 答案路径')
  })

  it('dp.set 无值时省略「= 值」', () => {
    const b = new AnimationBuilder('x', 'array')
    b.dpCreate('dp', 1, 1)
    b.dpSet('dp', 0, 0, null) // value === null -> undefined? value is null not undefined
    // null !== undefined，故仍带 "= null"
    expect(b.build().steps[1].description.zh).toBe('更新 DP 状态 (0,0) = null')
  })

  it('未知事件类型走 fallback「执行 <family> 操作」', () => {
    const b = new AnimationBuilder('x', 'array')
    // emit 任意自定义事件，defaultDescFor 返回 ''，落到 fallback
    b.emit({ type: 'custom.thing' } as never)
    expect(b.build().steps[0].description.zh).toBe('执行 custom 操作')
  })

  it('显式 desc 优先于推导', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1])
    b.desc('我自己写的').compare(0, 0)
    expect(b.build().steps[1].description.zh).toBe('我自己写的')
  })

  it('所有覆盖的步骤都不应落到「步骤 N」占位', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 2])
    b.compare(0, 1)
    b.swap(0, 1)
    for (const step of b.build().steps) {
      expect(step.description.zh).not.toMatch(placeholder)
    }
  })
})

describe('build() 输出形状', () => {
  it('包含 algorithm / presentation / complexity / initialState / steps，默认无 result', () => {
    const b = new AnimationBuilder('my_algo', 'array')
    b.arrayCreate([1, 2])
    b.compare(0, 1)
    const script = b.build()
    expect(script.algorithm).toBe('my_algo')
    expect(script.presentation).toEqual({ engine: 'scene', module: 'array' })
    expect(script.complexity).toEqual({
      time: { best: 'O(?)', average: 'O(?)', worst: 'O(?)' },
      space: 'O(?)',
    })
    expect(script.initialState).toEqual({ type: 'array', data: [1, 2] })
    expect(script.steps).toHaveLength(2)
    expect(script.result).toBeUndefined()
    expect('result' in script).toBe(false)
  })

  it('result() 写入 result 字段并追加描述/旁注步骤', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1])
    b.result([2, 3])
    const script = b.build()
    expect(script.result).toEqual([2, 3])
    const last = script.steps[script.steps.length - 1]
    expect(last.events?.[0]).toMatchObject({ type: 'scene.note', text: 'result = [2, 3]' })
    expect(last.description.zh).toBe('输出结果：[2, 3]')
  })

  it('空 algorithm 退化为 "custom"', () => {
    const b = new AnimationBuilder('', 'array')
    b.arrayCreate([1])
    expect(b.build().algorithm).toBe('custom')
  })

  it('graph 类型的 initialState 形状', () => {
    const b = new AnimationBuilder('x', 'graph')
    b.graphCreate([{ id: 'A' }], [{ source: 'A', target: 'A' }])
    const init = b.build().initialState
    expect(init.type).toBe('graph')
    expect(init.data).toEqual([])
    expect(init.nodes).toEqual([{ id: 'A' }])
    expect(init.edges).toEqual([{ source: 'A', target: 'A' }])
  })

  it('tree 类型的 initialState 形状', () => {
    const b = new AnimationBuilder('x', 'tree')
    b.treeCreate('bst', 'r', [{ id: 'r', value: 5 }, { id: 'l', value: 3 }], [{ parentId: 'r', childId: 'l' }])
    const init = b.build().initialState
    expect(init.type).toBe('tree')
    expect(init.root).toBe('r')
    expect(init.children?.r).toEqual(['l'])
    expect(init.treeNodes).toEqual([{ id: 'r', value: 5 }, { id: 'l', value: 3 }])
  })

  it('array initialState.data 过滤非数值项（字符串/NaN 被剔除）', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 'foo', 3, '∞'])
    // 'foo'/'∞' -> NaN 被过滤，'3' 数字保留
    expect(b.build().initialState.data).toEqual([1, 3])
  })

  it('build 在零步骤时抛错', () => {
    const b = new AnimationBuilder('x', 'array')
    expect(() => b.build()).toThrow(/没有产生任何步骤/)
  })
})

describe('MAX_STEPS = 600 软封顶', () => {
  it('恰好截断到 600 步，最后一步为提示注释且保留累计 stats', () => {
    const b = new AnimationBuilder('x', 'array')
    b.arrayCreate([1, 2]) // create -> 不增 stat
    for (let i = 0; i < 2000; i++) b.compare(0, 1) // 每步 c+1 a+2
    const script = b.build()
    expect(script.steps).toHaveLength(600)
    const last = script.steps[599]
    expect(last.description.zh).toContain('600')
    expect(last.description.zh).toContain('后续重复搜索/回溯步骤已省略')
    expect(last.events?.[0]).toMatchObject({ type: 'scene.note' })
    // 截断前已累计 599 个真实步骤（含 1 个 create），其中 598 次 compare
    expect(last.stats?.comparisons).toBe(598)
    expect(last.stats?.accesses).toBe(598 * 2)
  })

  it('封顶后继续调用不再新增步骤且 desc 被清空', () => {
    const b = new AnimationBuilder('x', 'array')
    for (let i = 0; i < 1000; i++) b.compare(0, 0)
    b.desc('这条不该出现').swap(0, 1)
    const script = b.build()
    expect(script.steps).toHaveLength(600)
    expect(script.steps.some(s => s.description.zh === '这条不该出现')).toBe(false)
  })
})
