/**
 * 线性结构类别提示词：数组（排序/查找/双指针/滑动窗口）+ 区间 + 字符串。
 */
export const PROMPT: string = `### 数组（排序/查找/双指针/滑动窗口）
- \`b.arrayCreate(values)\` 第一步必调，传完整初始数组
- \`b.compare(i, j)\` / \`b.swap(i, j)\` / \`b.move(from, to)\`
- \`b.setValue(index, value)\` / \`b.markSorted(indices)\` / \`b.partition(pivot, left, right)\`

### 区间（区间合并/区间调度/前缀和，@type 用 array）
- 区间类问题先把端点排好序，用数组格依次展示各区间端点或前缀和值
- 双指针/滑动窗口表达当前考察的区间边界，优先用 \`b.pointerCreate\`/\`b.pointerMove\`
- 每次合并/选取区间用 \`b.desc\` 说清为什么并入或丢弃，配合 \`b.markSorted\` 标记已确定结果

### 字符串（string，@type 用 array）
字符序列专属视觉：每个字符一格、**格下方带下标**（0,1,2…），支持**双指针/匹配指针**与 **text/pattern 双行对齐**（KMP、最长回文、字符串匹配等），匹配/失配高亮。
- \`b.strCreate(text)\` 单行字符串第一步必调，把 text 渲染成带下标的字符格（row 默认 0）
- \`b.strCreateDouble(text, pattern)\` 双行第一步必调，上行=text（row 0）、下行=pattern（row 1），左侧自动标 "text"/"pattern"
- \`b.strCompare(row, i, j)\` 在某一行比较两个下标处的字符（黄色脉冲，双指针/相遇判定常用）
- \`b.strMatch(row, index)\` 标某下标字符匹配成功（绿色脉冲）
- \`b.strMismatch(row, index)\` 标某下标字符失配（红色脉冲）
- \`b.strMarkRange(row, indices)\` 标记一段下标为结果区间（如找到的回文/子串，蓝色）
要点：下标从 0 起、按 (row, index) 操作；单行用 row 0；双行匹配把主串放 row 0、模式串放 row 1。配合 b.desc 说明每步语义。`
