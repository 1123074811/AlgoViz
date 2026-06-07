/**
 * 递归类别提示词：递归调用栈（callStack*）+ 回溯 / 分治。
 */
export const PROMPT: string = `### 递归调用栈（recursion / 回溯 / 分治，@type 用 array）
递归、回溯、分治算法用**调用栈视图**展示函数帧的压入与弹出：每进入一层递归压一帧，返回时弹一帧。帧上展示该层的参数与局部变量。
- \`b.callStackCreate(title?, id?)\` 第一步必调，创建调用栈容器（title 默认 'Call Stack'）
- \`b.callPush(functionName, parameters?, locals?, frameId?)\` 进入一层递归就压一帧：functionName 是函数名（如 'dfs'、'solve'），parameters 是该层入参对象（如 { n: 5 }），locals 是局部变量对象；frameId 可自定义以便后续引用
- \`b.callUpdate(frameId, { parameters?, locals?, status? })\` 更新某帧的参数/局部变量/状态（递归过程中变量变化时调用）
- \`b.callReturn(frameId, value?, pop?)\` 该层返回：value 是返回值；pop=true 时返回后顺带弹出该帧
- \`b.callPop(frameId?)\` 弹出栈顶（或指定）帧，表示该层递归结束
- \`b.callHighlight(frameId, active?, clear?)\` 高亮某帧，强调"当前正在执行此层"
要点：每次递归调用 = callPush，每次返回 = callReturn / callPop，下标与栈顺序对应真实调用顺序。回溯算法在"做选择"时 callPush、在"撤销选择"时 callPop，并用 b.desc 说明这一步在尝试或回退什么。分治在拆分子问题时压帧、合并结果时返回。`
