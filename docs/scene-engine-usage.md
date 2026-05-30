---
title: Scene Engine Usage
---

# Scene Engine 使用说明

Scene Engine 是 AlgoViz 的事件驱动可视化层。它通过 `presentation.engine = "scene"` 或步骤中的 `events` 自动启用。

## 启用条件

脚本满足任一条件时使用 Scene Engine：

- `script.presentation.engine === "scene"`
- 任意 `step.events` 非空

判断逻辑集中在：

- `src/scene/engineUtils.ts`

## 核心流程

```text
AnimationScript.steps[].events
  -> eventCompiler
  -> SceneCommand[]
  -> SceneEngine.applyCommands
  -> SceneState
  -> SceneCanvas
```

## 基础数据单元与辅助描述系统 (Base Data Units & Auxiliary Descors)

为了使动画和算法完美解耦，Scene Engine 采用了一套高内聚、低耦合的**原子图元体系**。任何复杂的算法场景，都是由**基础数据单元**（节点、格子）和**辅助描述图元**（指针、箭头、公式、颜色、过渡动画）搭配输入数据动态组合而成的。

### 1. 核心基础数据单元 (Base Data Units)
定义在 `@/scene/primitives/DataUnits.ts`，代表算法的核心骨架：
- **`DataUnit.arrayCell(options)`**：一维数组单元格。带有索引标记、数值和多状态支持。
- **`DataUnit.listNode(options)`**：单向、双向、循环链表单元。自动包含数据域 `data` 以及 `prev`/`next` 指针槽与对应的物理连接端口。
- **`DataUnit.treeNode(options)`**：树节点。包含二叉树、BST、AVL、B树和Trie节点结构，AVL变体可显示高度和平衡因子元数据。
- **`DataUnit.graphNode(options)`**：图顶点单元。圆润的顶点，预设了四周端口，便于与任意邻接边连结。
- **`DataUnit.matrixCell(options)`**：矩阵 / DP 状态表格单元。明确带有 `row` 和 `col` 物理坐标以及数值。

### 2. 辅助描述图元 (Auxiliary Units)
用于为基础数据单元补充算法逻辑描述：
- **`AuxiliaryUnit.arrow(options)`**：连接端口的高级边（Edge）。支持直线、曲率控制、虚实变换、标记箭头端、颜色高亮（如当前状态转移依赖边）和**动态虚线流动动画 (Marching Ants Flow)**。
- **`AuxiliaryUnit.pointer(options)`**：指针标签。用于表示 `head`、`tail`、`cur`、`slow`、`fast` 等逻辑变量，它会悬挂在对应节点的端口并平滑滑动过渡。
- **`AuxiliaryUnit.label(options)`**：公式/文本标签。可以静态显示在特定坐标，也可以锚定连接在某个数据单元的端口，用来解释数学方程、中间状态等。

### 3. 过渡动画与状态修饰 (Visual Decors)
- **视觉角色分工**：`idle` (静止), `current` (当前激活), `visited` (已访问), `comparing` (比较中), `swapping` (交换中), `sorted` (排序完成), `conflict` (冲突红), `safe` (安全绿), `candidate` (待选黄) 等。
- **动态特效**：
  - **`cell-pop`**：节点被更新或激活时，自带缓动的心跳放大弹跳动效。
  - **`cell-current-ring`**：当前更新节点外圈带有呼吸感的外扩蓝色聚焦光环。
  - **`scene-edge-flow`**：激活的边会带有光流在箭头上向目标方向流动。

---

## 已支持事件族

### 通用事件

- `scene.note`
- `scene.wait`
- `scene.highlight`
- `scene.clear_highlight`

### 链表

- `linked_list.create`
- `linked_list.visit`
- `linked_list.move_pointer`
- `linked_list.insert_after`
- `linked_list.insert_before`
- `linked_list.delete`
- `linked_list.reverse_link`
- `linked_list.set_head`
- `linked_list.set_tail`

### 树

- `tree.create`
- `tree.visit`
- `tree.compare`
- `tree.insert`
- `tree.delete`
- `tree.rotate`
- `tree.update_metadata`

### 数组

- `array.create`
- `array.compare`
- `array.swap`
- `array.move`
- `array.mark_sorted`
- `array.partition`

### 矩阵 / N 皇后

- `matrix.create`
- `matrix.visit_cell`
- `matrix.update_cell`
- `matrix.mark_path`
- `matrix.mark_conflict`
- `n_queens.try_place`
- `n_queens.place`
- `n_queens.conflict`
- `n_queens.backtrack`
- `n_queens.solution`

### 图

- `graph.create`
- `graph.visit_node`
- `graph.visit_edge`
- `graph.relax_edge`
- `graph.enqueue`
- `graph.dequeue`

## 已接入的内置预设

- `bubble_sort`：数组事件
- `linked_list`：单向链表事件
- `doubly_linked_list`：双向链表事件
- `bst`：树事件
- `n_queens`：矩阵与回溯事件
- `bfs_graph`：图事件

## UI 与诊断

Scene Engine 模式下：

- `SceneCanvas` 渲染事件驱动场景
- `EventTimeline` 显示当前步骤事件
- 右侧 `Render Engine` 卡片显示事件统计和诊断摘要
- `diagnostics.ts` 检测事件缺少必填字段或未注册事件族

## 开发建议

新增事件族时推荐按以下顺序：

1. 在 `eventTypes.ts` 定义事件类型
2. 在 `commandTypes.ts` 确认是否需要新增命令
3. 新增 `src/scene/compilers/*Compiler.ts`
4. 如需布局，新增 `src/scene/layouts/*Layout.ts`
5. 在 `eventCompiler.ts` 和 `registry.ts` 注册编译器
6. 在 `schema.ts` 补充 AI 输出校验
7. 在 `prompts.ts` 补充 AI 输出说明
8. 增加一个内置预设作为验证入口
9. 运行 `npm run build`
