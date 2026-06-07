/**
 * 金样例 · linear（线性 / 数组）—— 冒泡排序
 * sample input: [5, 2, 9, 1, 5, 6]
 * 结构：array；操作：compare / swap / mark_sorted。
 * 每步均带 b.line（对应下方源码行）与 b.desc。
 */
export const GOLDEN: string = `// @algorithm bubble_sort
// @type array
// @sample [5, 2, 9, 1, 5, 6]
// @time O(n²)
// @space O(1)
const arr = Array.isArray(input) ? input.slice() : (input.nums || input.arr || []).slice()
b.line(1).desc('初始化数组，准备开始冒泡排序').arrayCreate(arr)
const n = arr.length
for (let i = 0; i < n - 1; i++) {
  let swapped = false
  for (let j = 0; j < n - 1 - i; j++) {
    b.line(6).desc('比较 arr[' + j + ']=' + arr[j] + ' 与 arr[' + (j + 1) + ']=' + arr[j + 1]).compare(j, j + 1)
    if (arr[j] > arr[j + 1]) {
      const t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t
      swapped = true
      b.line(9).desc('左大于右，交换 ' + j + ' 与 ' + (j + 1)).swap(j, j + 1)
    }
  }
  b.line(12).desc('本轮最大值已沉底，标记 arr[' + (n - 1 - i) + '] 归位').markSorted([n - 1 - i])
  if (!swapped) {
    b.line(14).desc('本轮无交换，数组已有序，提前结束').note('已有序，提前终止')
    break
  }
}
b.line(17).desc('排序完成，标记首位归位').markSorted([0])
`
