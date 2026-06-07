/**
 * 金样例 · structure（数据结构）—— 单调栈求每日温度（下一个更大元素）
 * sample input: {"temperatures":[73,74,75,71,69,72,76,73]}
 * 结构：array + stack；操作：stack.push / stack.pop（单调递减栈）。
 * 外层 i 递增，内层 while 每轮要么 pop 要么 break，保证终止。
 */
export const GOLDEN: string = `// @algorithm daily_temperatures_monotonic_stack
// @type array
// @sample {"temperatures":[73,74,75,71,69,72,76,73]}
// @time O(n)
// @space O(n)
const t = (input && input.temperatures) || (Array.isArray(input) ? input : []) || []
b.line(1).desc('初始化温度数组').arrayCreate(t)
b.line(2).desc('创建单调递减栈（存下标）').stackCreate([])
const n = t.length
const ans = new Array(n).fill(0)
const stack = []
for (let i = 0; i < n; i++) {
  b.line(7).desc('考察第 ' + i + ' 天，温度 ' + t[i]).compare(i, i)
  while (stack.length && t[i] > t[stack[stack.length - 1]]) {
    const j = stack.pop()
    ans[j] = i - j
    b.line(10).desc('当前 ' + t[i] + ' > 栈顶第 ' + j + ' 天的 ' + t[j] + '，弹栈并记录等待 ' + (i - j) + ' 天').stackPop()
    b.setValue(j, i - j)
  }
  stack.push(i)
  b.line(14).desc('第 ' + i + ' 天下标入栈，维持栈内温度递减').stackPush(i)
}
b.line(16).desc('剩余栈内元素之后无更高温度，答案保持 0').note('单调栈处理完毕')
`
