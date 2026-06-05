# 优化方案：组合式场景架构（Composite Scene）

**日期：** 2026-06-04
**目标：** 让可视化系统从"单结构独占画布"升级为"多命名结构实例 + 区域自动布局 + 跨结构连线"，覆盖绝大多数组合型算法（邻接表、拉链哈希、Dijkstra、并查集、DP 等）。
**验证样板：** Dijkstra（图 + 距离数组 + 最小堆 + 跨结构连线）。

---

## 一、覆盖度评估（现状）

**已覆盖（单结构）：** array / graph / tree(BST·AVL·B树·B+树·Trie) / linked_list / matrix / stack / queue / deque / set / hashtable / string / 变量面板。单结构算法基本无缺口。

**未覆盖（核心缺口 = 组合）：** 多结构协同的算法。根因有四：
1. 每个编译器**硬编码绝对坐标**（`START_X=200`、`START_Y=550`...），都假设独占画布 → 多结构重叠
2. 实体 id **全局前缀唯一**（`arr_`、`set_`）→ 无法表示同种结构的**多个实例**（5 个链表）
3. 组合是 **ad-hoc**：`deriveSceneState` 硬写了"BFS 时画队列"，换组合即失效
4. **无通用跨结构连线**（数组格 → 链表头）

---

## 二、架构设计：Composite Scene

### 2.1 命名空间（Namespacing）
- 结构事件新增可选 `ns`（实例 id）字段；实体新增可选 `group?: string` 字段
- 编译器收到 `ns` 时：实体 id 前缀化 `{ns}__{localId}`，并设 `entity.group = ns`
- **向后兼容**：无 `ns` 的事件 → `group` 默认 `'main'`，行为不变（现有预设/单结构 AI 脚本不受影响）

### 2.2 区域布局后处理（Region Layout Pass）
新模块 `src/scene/regionLayout.ts`，在 `deriveSceneState` 编译完所有事件后运行：
1. 按 `group` 把已定位实体分区（默认组 `main`）
2. 每组算局部包围盒
3. 用 **shelf/行打包** 把各组包围盒排成不重叠区域（横向排不下则换行），把组内所有实体平移到目标区域
4. 每组发出一个区域边框 + 标题（用 `SceneGroup` 承载）→ RegionView 渲染
- **关键收益**：编译器的硬编码坐标退化为"组内局部坐标"，全局摆放交给布局器，彻底解决重叠

### 2.3 跨结构连线（Cross-Structure Links）
- 复用现有 edge 系统（本就能连任意 id）。新增 `b.link(fromId, toId, opts)` → 发 `connect` 边
- 边的端点位置在渲染时从实体位置实时计算 → 区域平移后**自动重路由**，无需特殊处理

### 2.4 Builder v2（组合场景构建器）
现有 builder 构造时只能定一个 `type`。升级为 **SceneBuilder**，可创建多个命名子结构句柄：
```js
const arr  = b.array('heads', n)            // 句柄，ns='heads'
const list = b.linkedList('chain'+i, vals)  // ns='chain_i'
b.link(arr.cell(i), list.head)              // 跨结构连线
arr.compare(0, 1)                           // 操作作用于句柄（内部带 ns）
```
- 每个句柄的方法发带 `ns` 的事件；builder 记录所有实例供区域布局
- **向后兼容**：保留现有扁平方法（默认单结构、ns 省略），现有 AI 生成器照常工作

---

## 三、补缺高频原语

### 3.1 堆 / 优先队列（Dijkstra 刚需）
- `heap.*` 事件：`create / push / pop / sift_up / sift_down / peek`
- `HeapView`：二叉堆**树形布局**（父子连线）+ 可选底部数组视图。Dijkstra/Prim/堆排序通用

### 3.2 2D DP 网格 + 转移箭头
- 复用 matrix，新增 `matrix.transition(from{r,c}, to{r,c})` 画状态转移箭头；DP 类（LCS/编辑距离/背包）

### 3.3 位集 / bitmask（状压 DP）
- `bitset.*` 事件 + `BitsetView`：0/1 位格带下标

---

## 四、Agent 任务分解（依赖分波）

| 波次 | 任务 | 依赖 | 可并行 | 文件域 |
|---|---|---|---|---|
| **W1** | **4a 组合地基**：events 加 `ns`、实体加 `group`、各编译器支持 ns 前缀、`regionLayout.ts` 区域布局 pass、`RegionView`、deriveSceneState 接入 | 无 | 否（核心，单 agent） | SceneEngine, types, regionLayout, RegionView, 各 compiler, SceneCanvas |
| **W2-a** | **4d 堆原语**：heap.* + HeapView + builder + prompt | W1 | 与 W2-b 并行 | heapCompiler, HeapView, eventTypes, builder, prompt |
| **W2-b** | **4e DP网格+bitmask**：matrix.transition + bitset.* + BitsetView | W1 | 与 W2-a 并行 | matrixCompiler, bitsetCompiler, BitsetView, eventTypes, builder, prompt |
| **W3** | **4b 跨结构连线 + 4c Builder v2 句柄 API** | W1 | 否 | builder（大改）, eventTypes, SceneEngine |
| **W4** | **4c AI 提示词组合范例 + 解析** | W3 | 否 | generatorPrompt, generatorParser |
| **W5** | **验证样板 Dijkstra 组合预设**（图+距离数组+堆+连线） | W2,W3 | 否 | presets/dijkstra（或新 composite 预设） |
| **W6** | **4f 迁移** legacy 队列/栈/aux 到区域系统 | W1-W5 | 否 | SceneEngine（清理硬编码 START_Y） |

> W2-a / W2-b 并行时仍共享 eventTypes/builder/prompt → 由协调者（我）整合共享文件，agent 各自负责 compiler+view+test 不重叠部分；或串行。

---

## 五、风险与策略
1. **W1 动 deriveSceneState 合成核心**：最高风险。策略——先只让带 `ns` 的实体走区域布局，`main` 组保持现状（渐进，不破坏现有 118 测试）
2. **区域布局算法**：先实现"竖直堆叠 + 标题"简单可靠版，后续再做网格/紧凑打包
3. **Builder v2 向后兼容**：扁平 API 与句柄 API 共存，旧生成器不动
4. **验证驱动**：W1 完成后立即用 Dijkstra 三结构场景验证布局器，确认靠谱再推进 W2+
5. **共享文件冲突**：eventTypes/builder/generatorPrompt/SceneCanvas 多任务共享 → 波内串行或由协调者整合，避免并行冲突

---

## 六、不做（YAGNI）
- 不做任意拖拽/手动布局编辑器
- 不做 3D / 物理引擎
- 区域布局先不做最优紧凑打包（NP 难），用启发式行打包即可
