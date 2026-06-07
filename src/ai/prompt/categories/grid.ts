/**
 * 网格类别提示词：网格 / 迷宫 / 岛屿 / 棋盘寻路（grid*）。
 */
export const PROMPT: string = `### 网格 / 迷宫 / 岛屿（grid，@type 用 matrix）
二维网格上的搜索/寻路类算法（BFS/DFS 迷宫、岛屿数量、最短路径、棋盘问题等）用**网格视图**：每个格子可处于不同状态（已访问、边界、路径、墙、起点、终点等）。
- \`b.gridCreate(values, options?)\` 第一步必调，values 为二维数组（每格初值，可用 0/1/字符）；options={ id?, title?, cellSize? }
- \`b.gridSet(row, col, value?, state?)\` 设置某格的值与状态；state ∈ 'default'|'active'|'visited'|'frontier'|'path'|'wall'|'start'|'target'|'weighted'|'warning'|'error'
- \`b.gridVisit(row, col, order?)\` 访问某格（高亮，order 可标访问序号）
- \`b.gridFrontier(cells)\` 标记一批边界/待扩展格（cells=[[row,col],...]）
- \`b.gridPath(cells)\` 标记最终路径（cells=[[row,col],...]）
- \`b.gridWall(row, col, enabled?)\` 把某格标记/取消为墙
- \`b.gridWeight(row, col, weight)\` 给带权格设权重
- \`b.gridArrow(from, to, label?)\` 在两格间画箭头（from/to=[row,col]），表达搜索方向或来源
要点：BFS/DFS 每访问一格 gridVisit；队列/栈里待扩展的邻居用 gridFrontier；找到目标后用 gridPath 回放路径。迷宫的墙用 gridWall，起点终点用 gridSet 配 'start'/'target' 状态。配合 b.desc 说明当前在扩展哪个方向、为什么剪枝。`
