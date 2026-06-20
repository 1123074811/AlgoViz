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
要点：DP 动画必须围绕“状态转移方程”展开，而不是只填表。每个关键状态按固定顺序输出：
1. \`b.dpHighlight(tableId, [{row,col}], 'current')\` 标当前格；
2. \`b.dpDependency(tableId, sources, {row,col}, label?)\` 标出方程右侧依赖的前驱格；
3. \`b.dpFormula(tableId, {row,col}, 'dp[i][j] = ...')\` 展示本次转移方程，公式里写清条件与取值，例如通配符匹配：\`p[j-1]=="*" → dp[i][j]=dp[i][j-1]||dp[i-1][j]\`；
4. \`b.dpSet(tableId, row, col, value, formula)\` 写入结果。
最后用 dpTraceback 回放最优路径、dpHighlight 'answer' 标答案格。配合 b.desc 说明“为什么用这个方程”。

### 记忆化搜索（dfs + memo 数组）→ 必须用 DP 状态表，而非递归树
**判别**：函数体里出现 \`memo\`/\`记忆化\`/\`dp[...]=...\` 缓存数组、命中即返回（如数位 DP、记忆化区间 DP、fib memo）——这类“带 memo 的 dfs”精华是 **memo 表的填充与复用**，不是递归过程。递归树会指数爆炸（数位 DP：每个 pos 试 0-9 × 16 位 ≈ 10^16 节点，展开一层就横排），**禁止用递归树/调用栈**，一律用 DP 状态表展示 memo 表：
- \`b.dpCreate(tableId, rows, cols, ...)\` 把 memo 数组建成表：**行=最关键的一维状态、列=另一关键维**（如数位 DP 用 \`pos × 已填数字\`、记忆化区间 DP 用 \`i × j\`）。
- \`b.dpSet(tableId, row, col, value, formula?)\` 逐格填入算出的子问题结果，formula 写该子问题的转移式。
- \`b.dpHighlight(...,'current')\` 标当前正在计算的格、\`'dependency'\` 标它依赖的已填格、\`'answer'\` 标最终答案格。
- \`b.dpDependency(tableId, sources, target, label?)\` 画依赖箭头（当前子问题由哪些已填子问题转移而来）。
- **记忆化命中 = 复用已填格**：再次需要某子问题时，不重算，直接 \`dpHighlight([{row,col}], 'dependency')\` 高亮那个已填格表示“命中缓存、直接复用”，并在 b.desc 里说明“记忆化命中，复用而非重算”。
- **多维 memo[a][b][c] 投影到 2D**：固定或合并一维——例如行=pos、列=把 \`(prev,curr)\` 等编码成一个索引，或挑两个最有代表性的维度；务必在 b.desc 里说明投影方式（“行=pos，列=已构造数字的余数”之类）。
要点：填表是**有界的**（状态数有限，不指数爆炸），命中即复用，天然适合数位 DP / 记忆化区间 DP / 记忆化背包等“宽记忆化”场景。把动画讲成“一张表怎么被逐格填满、哪些格被复用”，而不是“递归怎么一层层下去”。

### ⚠️ 高维 DP 降级（投影后仍过大时，**绝不铺超宽全表**）
若 memo 维度 ≥3，或投影到 2D 后**任一维 > ~15**（如数位 DP 把 \`(prev,curr)\` 编码成 ~100 列），铺完整表会被拉成一条看不清的横线（这是高维 DP 的固有困境：状态上千，逐状态画不下）。此时**不要 dpCreate 一张超宽表**，改用「轻量状态追踪」：
- 用 \`b.varSet('pos', ...)\`、\`b.varSet('prev', ...)\`、\`b.varSet('curr', ...)\`、\`b.varSet('memo', 当前子问题值)\` 在左上变量面板展示**当前正在计算的那一个状态**；
- 记忆化命中时 \`b.note('记忆化命中 (pos,prev,curr)，复用 = ...')\` + \`b.desc\` 说明“复用而非重算”；
- \`b.desc\` 叙述当前在做什么 + 进度（如「填 pos=2 这一层」）；
- 若一定要表，**只画当前主维（如 pos）那一层的小切片**（prev×curr，每维 ≤ 12），逐层重建，绝不把所有层铺成一张大表。
判断阈值：先估算投影后的行数×列数，> ~300 格或任一维 > 15，就走本降级、用轻量追踪；否则（典型 2D DP：LCS/背包/编辑距离，几十格）正常铺 DP 表。

### 矩阵 / DP 网格转移箭头（@type 用 matrix）
2D 动态规划也可用矩阵 + 状态转移箭头表达。矩阵用 \`b.matrixCreate(rows, cols, values?)\` 创建，再用 \`b.matrixVisit\` / \`b.matrixUpdate\` 填表，转移关系用：
- \`b.matrixCreate(rows, cols, values?)\` 第一步必调；values 为二维数组（可省略=全 0）
- \`b.matrixVisit(row, col)\` 访问格子 / \`b.matrixUpdate(row, col, value)\` 更新格子值 / \`b.matrixMarkPath(cells)\` 标记路径（cells=[{row,col}]）
- \`b.matrixTransition({row, col}, {row, col})\` 在 from 格与 to 格之间画一条虚线箭头，表示 \`dp[to]\` 由 \`dp[from]\` 转移而来。每步只保留最新一条转移边（自动清掉上一步的）。
要点：每次更新 dp 单元前，先 matrixTransition 指出它从哪个前驱状态转移来（如 LCS 从左上/上/左），再 matrixUpdate 写值。配合 b.desc 说明转移方程。`
