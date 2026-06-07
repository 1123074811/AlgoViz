/**
 * 动态规划类别提示词：DP 状态表（dp*）+ 矩阵 / DP 网格转移箭头。
 */
export const PROMPT: string = `### DP 状态表（dynamic programming，@type 用 array）
动态规划用**状态表视图**展示 dp 数组/二维表的逐格填充与依赖关系（LCS、编辑距离、背包、矩阵链、区间 DP 等）。
- \`b.dpCreate(tableId, rows, cols, options?)\` 第一步必调；options={ title?, rowLabels?, colLabels?, values?, defaultValue? }
- \`b.dpSet(tableId, row, col, value, formula?)\` 填某格的 dp 值，formula 可附该格的转移式文本
- \`b.dpHighlight(tableId, cells, kind?)\` 高亮一批格，kind ∈ 'current'|'dependency'|'candidate'|'answer'（答案格用 'answer'）
- \`b.dpDependency(tableId, sources, target, label?)\` 画依赖箭头：target 由 sources（多个前驱格）转移而来
- \`b.dpFormula(tableId, target, text)\` 在某格旁标注转移方程文本
- \`b.dpTraceback(tableId, path)\` 回溯标记最优解路径（path=[{row,col},...]）
要点：填每格前先 dpHighlight 标 'current'、再 dpDependency 指出它依赖哪些前驱格，然后 dpSet 写值并附 formula。最后用 dpTraceback 回放最优路径、dpHighlight 'answer' 标答案格。配合 b.desc 说明转移方程。

### 矩阵 / DP 网格转移箭头（@type 用 matrix）
2D 动态规划也可用矩阵 + 状态转移箭头表达。矩阵用 \`b.matrixCreate(rows, cols, values?)\` 创建，再用 \`b.matrixVisit\` / \`b.matrixUpdate\` 填表，转移关系用：
- \`b.matrixCreate(rows, cols, values?)\` 第一步必调；values 为二维数组（可省略=全 0）
- \`b.matrixVisit(row, col)\` 访问格子 / \`b.matrixUpdate(row, col, value)\` 更新格子值 / \`b.matrixMarkPath(cells)\` 标记路径（cells=[{row,col}]）
- \`b.matrixTransition({row, col}, {row, col})\` 在 from 格与 to 格之间画一条虚线箭头，表示 \`dp[to]\` 由 \`dp[from]\` 转移而来。每步只保留最新一条转移边（自动清掉上一步的）。
要点：每次更新 dp 单元前，先 matrixTransition 指出它从哪个前驱状态转移来（如 LCS 从左上/上/左），再 matrixUpdate 写值。配合 b.desc 说明转移方程。`
