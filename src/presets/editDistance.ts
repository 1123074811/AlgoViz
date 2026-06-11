import type { AnimationScript } from '@/types/animation'
import { generateDPTable, rowMajorOrder } from './dpTable'

/** 编辑距离:dp[i][j] = word1 前 i 个变成 word2 前 j 个的最少操作数。统一 DP 状态表 + 变量。 */
export function generateEditDistance(w1?: string, w2?: string): AnimationScript {
  const word1 = w1 ?? 'horse'
  const word2 = w2 ?? 'ros'
  const m = word1.length, n = word2.length

  const rowLabels = ['∅', ...word1.split('')]
  const colLabels = ['∅', ...word2.split('')]
  // 基态:dp[i][0]=i(删 i 个)、dp[0][j]=j(插 j 个)。
  const initial: Array<Array<number | null>> = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )

  return generateDPTable({
    algorithm: 'edit_distance',
    title: { zh: '编辑距离 DP 状态表', en: 'Edit Distance DP Table' },
    rows: m + 1,
    cols: n + 1,
    rowLabels,
    colLabels,
    initial,
    vars: [
      { name: 'i', value: 0 },
      { name: 'j', value: 0 },
      { name: '当前距离', value: 0 },
    ],
    order: rowMajorOrder(m + 1, n + 1),
    intro: {
      zh: `编辑距离:单词1="${word1}"(${m}),单词2="${word2}"(${n})。字符相等沿对角,否则 1+min(删/插/换)`,
      en: `Edit Distance: word1="${word1}"(${m}), word2="${word2}"(${n}). Equal → diagonal, else 1+min(del/ins/rep)`,
    },
    complexity: { time: { best: 'O(m*n)', average: 'O(m*n)', worst: 'O(m*n)' }, space: 'O(m*n)' },
    answer: { row: m, col: n },
    done: { zh: `编辑距离 = dp[${m}][${n}]("${word1}" → "${word2}")`, en: `Edit distance = dp[${m}][${n}] ("${word1}" → "${word2}")` },
    compute: (i, j, dp) => {
      const a = word1[i - 1], b = word2[j - 1]
      if (a === b) {
        const value = dp[i - 1][j - 1]
        return {
          value,
          vars: { i, j, '当前距离': value },
          deps: [{ row: i - 1, col: j - 1 }],
          formula: {
            zh: `'${a}' == '${b}' → dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${value}`,
            en: `'${a}' == '${b}' → dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${value}`,
          },
          desc: { zh: `字符相等 '${a}'='${b}',无需操作,沿对角 = ${value}`, en: `Match '${a}'='${b}', no op, diagonal = ${value}` },
        }
      }
      const del = dp[i - 1][j], ins = dp[i][j - 1], rep = dp[i - 1][j - 1]
      const value = 1 + Math.min(del, ins, rep)
      return {
        value,
        vars: { i, j, '当前距离': value },
        deps: [{ row: i - 1, col: j }, { row: i, col: j - 1 }, { row: i - 1, col: j - 1 }],
        formula: {
          zh: `'${a}' ≠ '${b}' → dp[${i}][${j}] = 1+min(删 ${del}, 插 ${ins}, 换 ${rep}) = ${value}`,
          en: `'${a}' ≠ '${b}' → dp[${i}][${j}] = 1+min(del ${del}, ins ${ins}, rep ${rep}) = ${value}`,
        },
        desc: { zh: `字符不等 '${a}'≠'${b}',1+min(删${del},插${ins},换${rep}) = ${value}`, en: `Mismatch, 1+min(del${del},ins${ins},rep${rep}) = ${value}` },
      }
    },
  })
}
