import type { AnimationScript } from '@/types/animation'

export function generateRadixSort(arr: number[]): AnimationScript {
  const data = [...arr]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const n = data.length

  const maxVal = Math.max(...data, 1)
  steps.push({ stepId: sid++, codeLine: 0, description: { zh: `max=${maxVal}，按个位→十位→百位排序`, en: `max=${maxVal}, sort by units→tens→hundreds` }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: n } })

  let exp = 1
  while (Math.floor(maxVal / exp) > 0) {
    const digitName = exp === 1 ? '个位' : exp === 10 ? '十位' : exp === 100 ? '百位' : `${exp}位`
    steps.push({ stepId: sid++, codeLine: 4, description: { zh: `按${digitName}排序 (exp=${exp})`, en: `Sort by ${digitName} digit (exp=${exp})` }, action: { type: 'highlight', targets: [], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: n } })

    const count = new Array(10).fill(0)
    for (let i = 0; i < n; i++) {
      const digit = Math.floor(data[i] / exp) % 10
      count[digit]++
      steps.push({ stepId: sid++, codeLine: 6, description: { zh: `${data[i]} ${digitName}=${digit} → count[${digit}]++`, en: `${data[i]} digit=${digit} → count[${digit}]++` }, action: { type: 'compare', targets: [i], color: 'warning' }, stats: { comparisons: sid, swaps: 0, accesses: 1 } })
    }

    for (let i = 1; i < 10; i++) count[i] += count[i - 1]

    const output = new Array(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(data[i] / exp) % 10
      output[--count[digit]] = data[i]
      steps.push({ stepId: sid++, codeLine: 10, description: { zh: `${data[i]}(${digitName}=${digit}) → 位置 ${count[digit]}`, en: `${data[i]}(digit=${digit}) → pos ${count[digit]}` }, action: { type: 'swap', targets: [i], color: 'success' }, stats: { comparisons: sid, swaps: 0, accesses: 1 } })
    }

    for (let i = 0; i < n; i++) data[i] = output[i]
    steps.push({ stepId: sid++, codeLine: 12, description: { zh: `${digitName}排序后: [${data.join(', ')}]`, en: `After sorting ${digitName}: [${data.join(', ')}]` }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: sid, swaps: n, accesses: 2 * n } })

    exp *= 10
  }

  steps.push({ stepId: sid++, codeLine: 13, description: { zh: `排序完成！[${data.join(', ')}]`, en: `Sorted! [${data.join(', ')}]` }, action: { type: 'mark', targets: data.map((_, k) => k), color: 'success' }, stats: { comparisons: sid, swaps: 0, accesses: n } })

  return { algorithm: 'radix_sort', complexity: { time: { best: 'O(d*(n+k))', average: 'O(d*(n+k))', worst: 'O(d*(n+k))' }, space: 'O(n+k)' }, initialState: { type: 'array', data: [...arr] }, steps: steps as AnimationScript['steps'] }
}
