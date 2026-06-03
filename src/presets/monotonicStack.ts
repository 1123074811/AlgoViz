import type { AnimationScript } from '@/types/animation'

export function generateMonotonicStack(arr: number[]): AnimationScript {
  const data = [...arr]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1, comps = 0, acc = 0

  // Helper: create teachingState with current stack
  const stackAux = (stack: number[], data: number[], activeIdx?: number) => ({
    auxiliaryArrays: [{
      id: 'stack',
      label: '单调栈 (递减)',
      data: stack.map(i => data[i]),
      activeIndices: activeIdx !== undefined ? [activeIdx] : undefined,
    }],
  })

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `数组 [${data.join(', ')}]，查找每个元素的下一个更大元素`, en: `Array [${data.join(', ')}], find next greater element for each` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: [...arr] }],
    teachingState: stackAux([], data),
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  const n = data.length
  const result: number[] = new Array(n).fill(-1)
  const stack: number[] = []

  for (let i = 0; i < n; i++) {
    steps.push({
      stepId: sid++, codeLine: 4,
      description: { zh: `扫描 arr[${i}]=${data[i]}`, en: `Scan arr[${i}]=${data[i]}` },
      action: { type: 'highlight', targets: [i], color: 'primary' },
      events: [{ type: 'array.compare', indices: [i] }],
      teachingState: stackAux(stack, data),
      stats: { comparisons: comps, swaps: 0, accesses: ++acc },
    })

    while (stack.length > 0 && data[stack[stack.length - 1]] < data[i]) {
      const idx = stack[stack.length - 1]
      steps.push({
        stepId: sid++, codeLine: 5,
        description: { zh: `栈顶 arr[${idx}]=${data[idx]} < arr[${i}]=${data[i]}，弹出并记录结果`, en: `Stack top arr[${idx}]=${data[idx]} < arr[${i}]=${data[i]}, pop and record` },
        action: { type: 'compare', targets: [idx, i], color: 'warning' },
        events: [{ type: 'array.compare', indices: [idx, i] }],
        teachingState: stackAux(stack, data, stack.length - 1),
        stats: { comparisons: ++comps, swaps: 0, accesses: acc },
      })
      result[idx] = data[i]
      stack.pop()
      steps.push({
        stepId: sid++, codeLine: 6,
        description: { zh: `result[${idx}]=${data[i]}。栈:${stack.length > 0 ? ` [${stack.map(j => data[j]).join(',')}]` : ' 空'}`, en: `result[${idx}]=${data[i]}. Stack:${stack.length > 0 ? ` [${stack.map(j => data[j]).join(',')}]` : ' empty'}` },
        action: { type: 'mark', targets: [idx], color: 'success' },
        events: [{ type: 'array.mark_sorted', indices: [idx] }],
        teachingState: stackAux(stack, data),
        stats: { comparisons: comps, swaps: 0, accesses: ++acc },
      })
    }

    stack.push(i)
    steps.push({
      stepId: sid++, codeLine: 7,
      description: { zh: `arr[${i}]=${data[i]} 入栈。栈: [${stack.map(j => data[j]).join(', ')}]`, en: `arr[${i}]=${data[i]} pushed. Stack: [${stack.map(j => data[j]).join(', ')}]` },
      action: { type: 'highlight', targets: [i], color: 'primary' },
      events: [{ type: 'array.mark_sorted', indices: [i] }],
      teachingState: stackAux(stack, data, stack.length - 1),
      stats: { comparisons: comps, swaps: 0, accesses: ++acc },
    })
  }

  if (stack.length > 0) {
    steps.push({
      stepId: sid++, codeLine: 9,
      description: { zh: `剩余栈中元素 [${stack.map(j => data[j]).join(',')}] 没有更大元素，result=-1`, en: `Remaining stack [${stack.map(j => data[j]).join(',')}] has no greater element, result=-1` },
      action: { type: 'mark', targets: stack, color: 'muted' },
      events: [{ type: 'array.mark_sorted', indices: stack }],
      teachingState: stackAux(stack, data),
      stats: { comparisons: comps, swaps: 0, accesses: acc },
    })
  }

  steps.push({
    stepId: sid++, codeLine: 10,
    description: { zh: `完成！result=[${result.join(', ')}]`, en: `Done! result=[${result.join(', ')}]` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'array.mark_sorted', indices: [] }],
    teachingState: stackAux([], data),
    stats: { comparisons: comps, swaps: 0, accesses: acc },
  })

  return {
    algorithm: 'monotonic_stack',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'array', variant: 'monotonic_stack' },
    initialState: { type: 'array', data: [...arr] },
    steps,
  }
}
