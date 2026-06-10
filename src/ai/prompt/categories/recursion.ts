/**
 * 递归类别提示词：递归调用栈（callStack*）+ 回溯 / 分治。
 */
export const PROMPT: string = `### 递归调用栈（recursion / 回溯 / 分治，@type 用 array）
递归、回溯、分治算法用**调用栈视图**展示函数帧的压入与弹出：每进入一层递归压一帧，返回时弹一帧。帧上展示该层的参数与局部变量。
- \`b.callStackCreate(title?, id?)\` 第一步必调，创建调用栈容器（title 默认 '递归调用栈'）。标题必须用中文，如 'DFS 回溯栈'、'递归调用栈'。
- \`b.callPush(functionName, parameters?, locals?, frameId?)\` 进入一层递归就压一帧：functionName 用简短中文显示名（如 '深度搜索'、'求解'、'回溯'），parameters 是该层入参对象（如 { 位置: 5 }），locals 是局部变量对象；frameId 可自定义以便后续引用
- \`b.callUpdate(frameId, { parameters?, locals?, status? })\` 更新某帧的参数/局部变量/状态（递归过程中变量变化时调用）
- \`b.callReturn(frameId, value?, pop?)\` 该层返回：value 是返回值；pop=true 时返回后顺带弹出该帧
- \`b.callPop(frameId?)\` 弹出栈顶（或指定）帧，表示该层递归结束
- \`b.callHighlight(frameId, active?, clear?)\` 高亮某帧，强调"当前正在执行此层"
要点：调用栈内容必须简短中文化。不要使用 PARAMETERS、LOCALS、Waiting、dfs 这类英文展示词；参数/局部变量 key 用中文短词（如 位置、格子、数字、已找到），值尽量短（如 是/否、(0,5)、4）。每次递归调用 = callPush，每次返回 = callReturn / callPop，下标与栈顺序对应真实调用顺序。回溯算法在"做选择"时 callPush、在"撤销选择"时 callPop，并用 b.desc 说明这一步在尝试或回退什么。分治在拆分子问题时压帧、合并结果时返回。
### 搜索树（回溯算法必用，与调用栈配合）
回溯算法除调用栈外，**必须**用搜索树把"搜索空间的形状与剪枝位置"画出来：
- \`b.searchRoot(label)\` 创建搜索树根（label 如 '空棋盘'、'第 0 层'）
- \`const id = b.searchTry(parentId, label)\` 做选择时挂一个分支节点并拿到其 id；label 用简短中文描述这次选择（如 '皇后@(0,2)'、'放 5'）
- \`b.searchFail(id)\` 冲突/剪枝；\`b.searchBack(id)\` 撤销选择；\`b.searchOk(id)\` 该分支到达解
- 搜索树节点同样计入步数预算：只展开前 2~4 层代表性分支，其余用 b.note 概括
步数预算：数独、N 皇后、排列/组合枚举等指数级回溯不能逐步展示完整搜索树。只展示前 2~4 层或前 80~150 个关键事件（尝试、冲突、做选择、撤销选择），之后用 b.note 概括"继续按相同规则搜索"，并直接展示最终解/结果。`
