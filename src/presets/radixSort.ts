import type { AnimationScript, ActionColor, AuxiliaryArrayState } from '@/types/animation'
import { makeStep, sortTeaching, sortTeachingWithAux } from './utils'

export function generateRadixSort(arr: number[]): AnimationScript {
  const data = arr.map(v => Math.max(0, Math.floor(v)))
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const n = data.length
  const maxVal = Math.max(...data, 1)

  // Step 1: announce + create array cells + init empty count/output panels
  steps.push({
    ...makeStep(sid++, 0,
      `基数排序开始。最大值=${maxVal}，将按个位→十位→百位的顺序，从低位到高位逐位排序`,
      `Radix sort start. Max=${maxVal}, sort digit by digit from least significant (units) to most significant (hundreds)`,
      'highlight', [], 'primary', 0, 0, n,
      sortTeachingWithAux({ max: maxVal, phase: '初始化 / Init' }, [
        { id: 'count', label: '计数数组 count[0..9]', data: new Array(10).fill(0) },
        { id: 'output', label: '输出数组 output', data: new Array(n).fill('') },
      ])
    ),
    events: [
      { type: 'array.create', values: [...data] },
      { type: 'math.init', vars: [{ name: '最大值', value: maxVal }, { name: '位 exp', value: 1 }, { name: '下标 i', value: 0 }, { name: '当前值', value: data[0] ?? 0 }] },
      { type: 'scene.highlight', entityId: 'arr_0', role: 'active', color: 'primary' },
    ],
  })

  let exp = 1
  while (Math.floor(maxVal / exp) > 0) {
    const digitPlace = exp === 1 ? '个位(units)' : exp === 10 ? '十位(tens)' : exp === 100 ? '百位(hundreds)' : `${exp}位`
    const digitNameZh = exp === 1 ? '个位' : exp === 10 ? '十位' : exp === 100 ? '百位' : `${exp}位`
    const digitNameEn = exp === 1 ? 'units' : exp === 10 ? 'tens' : 'hundreds'

    // Announce current digit — show empty count for this digit
    steps.push({
      ...makeStep(sid++, 4,
        `按${digitNameZh}排序 (exp=${exp})。基数排序从最低位开始，低位排序结果被高位排序保留（稳定性）`,
        `Sort by ${digitNameEn} digit (exp=${exp}). LSD is stable, preserving lower-digit ordering`,
        'highlight', [], 'warning', 0, 0, n,
        sortTeachingWithAux({ digit: (exp === 1 ? '个位' : exp === 10 ? '十位' : '百位'), exp }, [
          { id: 'count', label: `计数 count / ${digitPlace}`, data: new Array(10).fill(0) },
          { id: 'output', label: `输出 output / ${digitPlace}`, data: new Array(n).fill('') },
        ])
      ),
      events: [{ type: 'scene.note', text: `按${digitNameZh}排序 (exp=${exp})` }, { type: 'math.set', name: '位 exp', value: exp }],
    })

    // Count digit occurrences
    const count = new Array(10).fill(0)
    for (let i = 0; i < n; i++) {
      const digit = Math.floor(data[i] / exp) % 10
      count[digit]++

      const countArr: AuxiliaryArrayState = {
        id: 'count', label: `计数 count / ${digitPlace}`,
        data: count.map(String),
        activeIndices: [digit],
        colorMap: { [digit]: 'warning' as ActionColor },
      }

      steps.push({
        ...makeStep(sid++, 6,
          `${data[i]} 的${digitNameZh}=${digit}，count[${digit}] 增加到 ${count[digit]}`,
          `${data[i]} ${digitNameEn} digit=${digit}, count[${digit}] → ${count[digit]}`,
          'compare', [i], 'warning', sid, 0, 1,
          sortTeachingWithAux({ digit: `${digitPlace}`, value: data[i] }, [
            countArr,
            { id: 'output', label: `输出 output / ${digitPlace}`, data: new Array(n).fill('') },
          ])
        ),
        events: [{ type: 'array.compare', indices: [i, i] }, { type: 'scene.highlight', entityId: `arr_${i}`, role: 'comparing', color: 'warning' }, { type: 'math.set', name: '下标 i', value: i }, { type: 'math.set', name: '当前值', value: data[i] }],
      })
    }

    // Prefix sum
    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1]
    }

    steps.push({
      ...makeStep(sid++, 7,
        `计数转前缀和：count[i]=count[i]+count[i−1]，现在 count[i] 表示该位数字 ≤i 的元素个数（即该数字元素在 output 中的结束位置）`,
        `Prefix sum: count[i] now = cumulative count of digits ≤ i (ending position in output)`,
        'highlight', [], 'primary', sid, 0, 10,
        sortTeachingWithAux({ digit: `${digitPlace}`, phase: 'prefix_sum' }, [
          { id: 'count', label: `前缀和 prefix / ${digitPlace}`, data: [...count], activeIndices: count.map((_, i) => i), colorMap: Object.fromEntries(count.map((_, i) => [i, 'success' as ActionColor])) },
          { id: 'output', label: `输出 output / ${digitPlace}`, data: new Array(n).fill('') },
        ])
      ),
      events: [{ type: 'scene.note', text: `前缀和：[${count.join(', ')}]` }],
    })

    // Place elements into output (backward scan for stability)
    const output = new Array(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(data[i] / exp) % 10
      const pos = --count[digit]
      output[pos] = data[i]

      const outArr: AuxiliaryArrayState = {
        id: 'output', label: `输出 output / ${digitPlace}`,
        data: output.map(v => v === 0 ? '' : String(v)),
        activeIndices: [pos],
        colorMap: { [pos]: 'success' as ActionColor },
      }

      steps.push({
        ...makeStep(sid++, 10,
          `${data[i]}(${digitNameZh}=${digit}) → output[${pos}]。逆向扫描保证稳定性`,
          `${data[i]}(${digitNameEn}=${digit}) → output[${pos}]. Backward scan ensures stability`,
          'swap', [i], 'success', sid, 0, 1,
          sortTeachingWithAux({ digit: `${digitPlace}`, value: data[i], output_pos: pos }, [
            { id: 'count', label: `前缀和 prefix / ${digitPlace}`, data: [...count], activeIndices: [digit], colorMap: { [digit]: 'warning' as ActionColor } },
            outArr,
          ])
        ),
        events: [{ type: 'array.compare', indices: [i, pos] }, { type: 'math.set', name: '下标 i', value: i }, { type: 'math.set', name: '当前值', value: data[i] }],
      })
    }

    // Copy output back to data
    for (let i = 0; i < n; i++) {
      data[i] = output[i]
      const step: AnimationScript['steps'][number] = {
        ...makeStep(sid++, 12,
          `复制 output[${i}]=${output[i]} → arr[${i}]`,
          `Copy output[${i}]=${output[i]} → arr[${i}]`,
          'highlight', [i], 'success', sid, 0, 1,
          sortTeachingWithAux({ digit: `${digitPlace}`, value: output[i], toPos: i }, [
            { id: 'output', label: `输出 output / ${digitPlace}`, data: output.map((v, j) => j <= i ? String(v) : ''), activeIndices: [i], colorMap: { [i]: 'success' as ActionColor } },
          ])
        ),
        events: [
          { type: 'array.set_value', index: i, value: output[i] },
          { type: 'scene.highlight', entityId: `arr_${i}`, role: 'inserted', color: 'success'},
        ],
      }
      step.action.value = output[i]
      step.action.to = i
      steps.push(step)
    }

    // Digit done — show final output and sorted data range
    steps.push({
      ...makeStep(sid++, 12,
        `${digitNameZh}排序完成：[${data.join(', ')}]。该位已有序，高位排序时低位顺序不变`,
        `After sorting ${digitNameEn} digit: [${data.join(', ')}]. This digit order is now stable`,
        'mark', data.map((_, k) => k), 'success', sid, n, 2 * n,
        sortTeaching({ digit: `${digitPlace}`, phase: 'done' })
      ),
      events: [{ type: 'scene.note', text: `${digitNameZh}排序完成` }, { type: 'scene.clear_highlight', entityIds: data.map((_, i) => `arr_${i}`) }],
    })

    exp *= 10
  }

  // Final step
  steps.push({
    ...makeStep(sid++, 13,
      `基数排序完成！[${data.join(', ')}]。每一位的稳定性保证了最终结果正确`,
      `Radix sort complete! [${data.join(', ')}]. Stability across each digit guarantees correct final ordering`,
      'mark', data.map((_, k) => k), 'success', sid, 0, n,
      sortTeaching({ phase: '完成 / Complete' })
    ),
    events: [{ type: 'array.mark_sorted', indices: data.map((_, i) => i) }],
  })

  return {
    algorithm: 'radix_sort',
    complexity: { time: { best: 'O(d*(n+k))', average: 'O(d*(n+k))', worst: 'O(d*(n+k))' }, space: 'O(n+k)' },
    initialState: { type: 'array', data: arr.map(v => Math.max(0, Math.floor(v))) },
    steps,
  }
}
