import type { AnimationScript } from '@/types/animation'
import { generateDPTable, rowMajorOrder } from './dpTable'

/** 最长公共子序列:dp[i][j] = s1 前 i 个与 s2 前 j 个的 LCS 长度。统一的 DP 状态表 + 变量面板。 */
export function generateLCS(text1?: string, text2?: string): AnimationScript {
  const s1 = text1 ?? 'ABCBDAB'
  const s2 = text2 ?? 'BDCABA'
  const m = s1.length, n = s2.length

  const rowLabels = ['∅', ...s1.split('')]
  const colLabels = ['∅', ...s2.split('')]
  const initial: Array<Array<number | null>> = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  return generateDPTable({
    algorithm: 'lcs',
    title: { zh: 'LCS DP 状态表', en: 'LCS DP Table' },
    rows: m + 1,
    cols: n + 1,
    rowLabels,
    colLabels,
    initial,
    vars: [
      { name: 'i', value: 0 },
      { name: 'j', value: 0 },
      { name: 'LCS 长', value: 0 },
    ],
    order: rowMajorOrder(m + 1, n + 1),
    intro: {
      zh: `最长公共子序列:序列1=${s1}(长度${m}),序列2=${s2}(长度${n})。字符相等则左上+1,否则取上/左较大者`,
      en: `Longest Common Subsequence: s1=${s1}(len ${m}), s2=${s2}(len ${n}). Equal → diagonal+1, else max(up, left)`,
    },
    complexity: { time: { best: 'O(m*n)', average: 'O(m*n)', worst: 'O(m*n)' }, space: 'O(m*n)' },
    answer: { row: m, col: n },
    done: { zh: `DP 完成!LCS 长度 = dp[${m}][${n}]`, en: `DP done! LCS length = dp[${m}][${n}]` },
    compute: (i, j, dp) => {
      const a = s1[i - 1], b = s2[j - 1]
      if (a === b) {
        const value = dp[i - 1][j - 1] + 1
        return {
          value,
          vars: { i, j, 'LCS 长': value },
          deps: [{ row: i - 1, col: j - 1 }],
          formula: {
            zh: `'${a}' == '${b}' → dp[${i}][${j}] = dp[${i - 1}][${j - 1}]+1 = ${value}`,
            en: `'${a}' == '${b}' → dp[${i}][${j}] = dp[${i - 1}][${j - 1}]+1 = ${value}`,
          },
          desc: {
            zh: `字符相等 '${a}'='${b}',取左上角 +1 = ${value}`,
            en: `Match '${a}'='${b}', diagonal +1 = ${value}`,
          },
        }
      }
      const up = dp[i - 1][j], left = dp[i][j - 1]
      const value = Math.max(up, left)
      return {
        value,
        vars: { i, j, 'LCS 长': value },
        deps: [{ row: i - 1, col: j }, { row: i, col: j - 1 }],
        formula: {
          zh: `'${a}' ≠ '${b}' → dp[${i}][${j}] = max(上 ${up}, 左 ${left}) = ${value}`,
          en: `'${a}' ≠ '${b}' → dp[${i}][${j}] = max(up ${up}, left ${left}) = ${value}`,
        },
        desc: {
          zh: `字符不等 '${a}'≠'${b}',取上(${up})、左(${left})较大者 ${value}`,
          en: `Mismatch '${a}'≠'${b}', max(up ${up}, left ${left}) = ${value}`,
        },
      }
    },
  })
}
