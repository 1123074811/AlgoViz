# 递归树可视化 + AI 接入 设计

> 状态:已与用户对齐(范围=图元+演示+AI接入;演示=subsets)。本文档是 spec,后续转 writing-plans。
> 动机:回溯/DP(数位DP/记忆化搜索)用逐帧 callStack 调用栈 → 步数爆炸(600+ 被硬截断)、只见局部栈帧不见全局结构,难理解。

## 1. 目标

回溯/DP 类算法改用**递归调用树**可视化:节点=子问题状态、边=递归调用,逐层展开 + 高亮当前路径 + 标记剪枝/记忆化命中/找到解。让用户看到**全局树形 + 复用关系**,而非逐帧栈快照;并用"memo 折叠 + 节点上限"根治步数爆炸。

## 2. 现状(改造前)

- AI 分类:`src/ai/categories.ts` 把 `recursion`(dfs/backtrack/permut/combin/subset/n_queens/sudoku 正则)标注为"**必须驱动调用栈**";`src/ai/prompt/categories/recursion.ts` + `src/ai/golden/recursion.ts`(callstack.push/pop 样例)引导 AI 生成 callStack。→ 这是截图里 AI 生成 callStack 的根因。
- 渲染:callStack overlay(`graphics/renderers/CallStackView`)逐帧栈帧 + 600 步硬截断。
- tree 图元齐备:`treeBuilder`(create/insert/visit/compare/recolor…)+ NodeRenderer(圆节点,支持 rbColor/状态色)+ EdgeRenderer(发线边)。`scene.highlight` common 事件可设任意 `{entityId,color,role}`。

## 3. 方案

### 3.1 递归树范式(复用 tree 图元,无新图元/渲染)
- **生长**:递归进入 → `treeBuilder.insert(parentId, {id,value}, side?)` 加子节点(根用 `treeBuilder.create`)。
- **状态色**(用 `scene.highlight` 设,NodeRenderer 的 COLOR_MAP 已支持):
  - 当前递归路径 → `color:'primary'`(钢蓝)
  - 找到解 → `color:'success'`(绿)
  - 剪枝(分支被否决)→ `color:'danger'`(红)
  - 记忆化命中(复用,不展开子树)→ `color:'warning'`(→compare 橙)
  - 已回溯/探索完 → `color:'muted'`(→idle 灰)
- 渲染零改动:圆节点 + 发线边 + lens 光斑跟随当前节点,都现成。

### 3.2 步数控制(治本)
- **记忆化命中的子树不展开**——只画命中节点标橙(这正是 memo 的意义:复用而非重算),天然砍掉指数级重复子树。
- **节点数上限**(~80):超出后停止展开,emit 一条 `scene.note`「…N 个分支已省略,结果继续计算」。
- **只在关键事件出 step**:进入新状态 / 剪枝 / 命中 / 找到解;不为每个无聊递归调用出帧。

### 3.3 subsets 演示 preset
- 新建 `src/presets/subsetsTree.ts`:`generateSubsetsTree(arr?)`,对 `[1,2,3]` 类输入画**选/不选二叉递归树**(每层决定一个元素选或不选,叶=一个子集)。用 `treeBuilder.create/insert` 生长 + `scene.highlight` 标当前路径/叶(解)。`result` = 子集数(2^n)。
- 接线:catalog(`DEFAULT_ALGORITHMS` 加 `{id:'subsets', name:'子集/组合(递归树)', category:'search-backtrack'}`)+ `GENERATORS` + 4 语言代码模板 + metadata。

### 3.4 AI 接入(让 AI 对回溯/DP 生成递归树)
- `src/ai/categories.ts`:recursion 类指引从"必须驱动调用栈"改为"**优先用递归树**(tree.insert 生长 + scene.highlight 标剪枝/命中/解),仅在确需展示栈深度时用 callStack"。
- `src/ai/prompt/categories/recursion.ts`:重写指引——描述递归树范式 + 状态色约定 + 步数控制(memo 折叠/节点上限)。
- `src/ai/golden/recursion.ts`:把金样例从 grid+callstack 改为/新增**递归树样例**(subsets 或 DFS 用 tree.insert+highlight)。
- callStack **保留**为备选(展示纯栈深度时仍可用),不删除其图元/prompt 能力。

## 4. 测试与验收
- `npx tsc --noEmit` + 现有测试当回归网。
- **用户人工验收**(不做 Playwright 截图,见 [[prefer-manual-verification]]):subsets 演示 + 让 AI 对一段回溯/DP 代码生成,确认出递归树而非逐帧 callStack。
- golden 测试(`src/ai/golden/__tests__`)随 recursion 样例改动更新。

## 5. 风险与边界
- **风险**:改 AI recursion prompt/golden 会影响该类所有生成,有回归风险(可能某些 DFS 反而更适合 callStack);用 golden 测试 + 人工验收兜底;callStack 保留为备选降低风险。
- **边界**:不改 IR/引擎/补间;复用 tree 图元(不新增渲染域);AI 侧改 prompt/golden 而非 schema(tree.* 事件 schema 已支持);步数控制在 preset/AI 生成层(不改 SceneEngine 截断机制,但 AI 生成更少更关键的 step)。
- **badge 增强**(可选,后续):NodeRenderer 当前不渲染 `state.badge`;若要在节点上显示「✂」「memo」小标,需给 NodeRenderer 加 badge 渲染。本轮先用纯色区分,不做 badge。
