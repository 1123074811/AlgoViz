/**
 * 递归类别提示词：优先用「递归调用树」(tree.* 生长 + scene.highlight 状态色)，
 * callStack 仅作备选(确需展示栈深度时)。
 */
export const PROMPT: string = `### 递归调用树（recursion / 回溯 / 分治 / 记忆化，@type 用 array）
递归、回溯、分治、记忆化搜索**优先用递归调用树**展示:节点=一个子问题状态(参数/已选集合),边=一次递归调用。让调用树**逐层生长**,并用状态色标当前路径、剪枝、记忆化命中、找到解。比逐帧调用栈更能看清搜索空间的**全局形状与复用关系**,且能从根本上控制步数。
- **生长树(栈式 API,父子自动成树 → 绝不会扁平成一排)**:第一步 \`b.searchRoot(初始状态标签)\` 建根(如 '空集'、'空棋盘'、'fib(5)'),它同时初始化 builder 内部的「调用栈」,栈顶即当前父节点。
  - **进入一层递归**:在递归函数开头 \`b.searchEnter(选择标签)\` —— 它自动以**当前栈顶**为父挂一个子节点、把它压栈、返回其 id(标签用简短中文/数学式,如 '选 2'、'放 Q@(0,1)'、'fib(3)')。**不要手传 parentId**。
  - **离开一层递归**:在该递归调用 return 之前 \`b.searchLeave(ok?)\` —— 出栈;\`ok=true\` 标该子问题已解(success 绿),否则标回溯(muted 灰)。
  - **每次递归调用都对应一对 \`searchEnter\` / \`searchLeave\`**(进栈/出栈成对),父子关系由内部栈自动、必然正确地逐层建立 —— **不要再用 \`b.searchTry(parentId, ...)\` 手传 parentId**(对数位 DP 等复杂递归极易把所有节点都挂到同一个父,导致树被压扁成一排)。
  - **记忆化命中**:\`b.searchMemoHit(标签)\` —— 当前栈顶下挂一个命中节点并标 warning 橙,**不展开其子树**(体现复用而非重算)。命中后直接 return,不要 searchEnter。
- **状态色**:
  - 当前递归路径 → \`primary\`(钢蓝,searchEnter 进入即标当前)
  - 找到解 / 到达叶 → \`b.searchLeave(true)\`(success 绿)
  - 剪枝(分支被否决/冲突)→ 对该节点 \`b.searchFail(id)\`(danger 红,id 即 searchEnter 返回值),随后仍要 \`b.searchLeave(false)\` 出栈
  - 记忆化命中(复用已算结果,**不再展开其子树**)→ \`b.searchMemoHit(标签)\`(warning 橙)
  - 已回溯/探索完 → \`b.searchLeave(false)\`(muted 灰)
- 输出序列:每得到一个完整解(叶节点),可 \`b.note\` 概括,或 \`b.searchLeave(true)\` 标绿;到达解时把解推入底部序列条增强可读性。
**完整计算与决策校验**:
- 记忆化命中时按原算法直接复用缓存；未命中的分支必须完整计算，禁止按层数、节点数或动画长度跳过分支。
- 每次可撤销选择使用 \`b.backtrackTry({ choice, state: 修改前状态 })\`；保留选择用 \`b.backtrackCommit({ choice })\`，撤销后用 \`b.backtrackUndo({ choice, state: 撤销后状态, reason? })\`。Builder 会校验决策闭合和状态确实恢复。
- Builder 会在事件预算耗尽后自动省略后续教学事件；递归仍必须继续到真实终止条件并调用 \`b.result(realResult)\`。
### 调用栈（callStack，备选——仅在确需强调"栈深度随递归增减"时使用）
若题目核心是栈深度本身(如纯尾递归深度、爆栈分析),可改用调用栈视图:
- \`b.callStackCreate(title?)\` 第一步创建(title 中文,如 '递归调用栈')。
- \`b.callPush(functionName, parameters?, locals?, frameId?)\` 进入一层压一帧(functionName 用简短中文,参数/局部变量 key 用中文短词)。
- \`b.callReturn(frameId, value?, pop?)\` / \`b.callPop(frameId?)\` 返回/弹栈。\`b.callHighlight(frameId)\` 高亮当前帧。
- 调用栈内容必须简短中文化,不要 PARAMETERS/LOCALS/dfs 等英文展示词。
两者可配合(树看全局形状,栈看当前路径),但默认以**递归树**为主。`
