/**
 * 递归类别提示词：优先用「递归调用树」(tree.* 生长 + scene.highlight 状态色)，
 * callStack 仅作备选(确需展示栈深度时)。
 */
export const PROMPT: string = `### 递归调用树（recursion / 回溯 / 分治 / 记忆化，@type 用 array）
递归、回溯、分治、记忆化搜索**优先用递归调用树**展示:节点=一个子问题状态(参数/已选集合),边=一次递归调用。让调用树**逐层生长**,并用状态色标当前路径、剪枝、记忆化命中、找到解。比逐帧调用栈更能看清搜索空间的**全局形状与复用关系**,且能从根本上控制步数。
- **生长树**:第一步 \`b.searchRoot(初始状态标签)\` 建根(如 '空集'、'空棋盘'、'fib(5)');每进入一层递归 \`const id = b.searchTry(父节点id, 选择标签)\` 挂一个子节点并拿到其 id(标签用简短中文/数学式,如 '选 2'、'放 Q@(0,1)'、'fib(3)')。
- **状态色**(用 searchOk/searchFail/searchBack,内部走 scene.highlight):
  - 当前递归路径 → \`primary\`(钢蓝,searchTry 默认进入即当前)
  - 找到解 / 到达叶 → \`b.searchOk(id)\`(success 绿)
  - 剪枝(分支被否决/冲突)→ \`b.searchFail(id)\`(danger 红)
  - 记忆化命中(复用已算结果,**不再展开其子树**)→ \`b.searchBack(id)\` 或对该节点发 warning 高亮(橙),并 b.note 说明"命中缓存,复用结果"
  - 已回溯/探索完 → \`b.searchBack(id)\`(muted 灰)
- 输出序列:每得到一个完整解(叶节点),可 \`b.note\` 概括,或 b.searchOk 标绿;到达解时把解推入底部序列条增强可读性。
**步数控制(治本)**:
- 记忆化命中的子树**绝不展开**——只标该命中节点(橙)即体现"复用而非重算",天然砍掉指数级重复子树。
- 节点上限 ~60~80:超出后停止生长,b.note 概括"…更深分支省略,结果继续计算"。
- **只在关键事件出 step**:进入新状态 / 做选择 / 剪枝 / 命中缓存 / 找到解;不为每个平凡递归调用出帧。只展开前 2~4 层代表性分支,其余概括。
### 调用栈（callStack，备选——仅在确需强调"栈深度随递归增减"时使用）
若题目核心是栈深度本身(如纯尾递归深度、爆栈分析),可改用调用栈视图:
- \`b.callStackCreate(title?)\` 第一步创建(title 中文,如 '递归调用栈')。
- \`b.callPush(functionName, parameters?, locals?, frameId?)\` 进入一层压一帧(functionName 用简短中文,参数/局部变量 key 用中文短词)。
- \`b.callReturn(frameId, value?, pop?)\` / \`b.callPop(frameId?)\` 返回/弹栈。\`b.callHighlight(frameId)\` 高亮当前帧。
- 调用栈内容必须简短中文化,不要 PARAMETERS/LOCALS/dfs 等英文展示词。
两者可配合(树看全局形状,栈看当前路径),但默认以**递归树**为主。`
