# AlgoViz 算法动画统一样式重构 — 设计文档

## 1. 背景

AlgoViz 已实现 Scene Engine 基础设施（`src/scene/`），包含类型系统、事件协议、编译器、布局器和基础图元视图。但实际使用中存在两个系统并存的问题：

- **已迁移**：链表、BST、BFS 图等部分预设使用了 Scene Engine events + `presentation.engine = 'scene'`
- **未迁移**：大部分算法预设（排序、图算法、DP、回溯等）仍使用旧 Renderer（ArrayRenderer/GraphRenderer/MatrixRenderer）
- **视觉问题**：现有图元 NodeView/EdgeView/PointerView 存在文本重叠、元素超出容器、样式不统一等缺陷

本项目目标：**将全部算法动画统一迁移至 Scene Engine，并优化图元渲染质量，达到极简学术风视觉效果**。

## 2. 设计原则

### 2.1 核心哲学

- **结点是基础元素**：每个独立的结构体/类/方法对应一个可视化结点
- **箭头表达关系**：结点之间通过有向/无向箭头连线表达数据和逻辑关系
- **颜色传递状态**：柔和的浅色填充区分算法的不同执行阶段
- **文字辅助理解**：指针标签、步骤说明、统计数据显示在合适位置

### 2.2 数据同步原则（用户强调）

- 输入数据格式遵循 LeetCode 标准测试用例格式
- 预设生成器根据实际输入动态生成动画步骤，**变量名不能写死**
- 代码可以是任何有效的 Python/JS/C++/Java 实现
- 系统通过语义分析（代码结构、操作类型）匹配动画事件，不依赖具体变量名
- 同一算法的不同代码实现应产生语义相同的可视化结果

### 2.3 质量约束

- 元素大小合适，不超出容器边界
- 文本不重叠、图案不相互遮挡
- 布局自动适配元素数量
- viewBox 自动计算，留足 padding
- 动画过渡流畅，使用 CSS/SVG 动画

## 3. 结点元素规范

### 3.1 数组单元 (Array Cell)

```
     44px
  ┌──────────┐
  │    5     │  ← 值居中，等宽字体
  └──────────┘
      0       ← 索引标签，10px muted
```

- 尺寸：44×44px（值），24px 高（索引标签）
- 圆角：8px
- 排序场景：柱状图在上，格子+索引在下
- 普通数组场景：仅格子+索引

### 3.2 链表结点 (Linked List Node)

```
  ┌──────┬──────┐
  │   1  │ next │  ← data|next 分区
  └──────┴──────┘

  双向链表：
  ┌──────┬──────┬──────┐
  │ prev │   2  │ next │
  └──────┴──────┴──────┘
```

- data 区：52×44px，值居中加粗
- next/prev 区：44×44px，标签居中，muted 颜色
- 圆角：8px（整体），分区竖线 1px
- 箭头在结点之间，箭身 1.5px，小三角箭头

### 3.3 树结点 (Tree Node)

```
     ◯ 5      ← 纯圆形，值居中
    / \
   ◯3 ◯7     ← 位置暗示 left/right
```

- 直径：48px（根）/ 40px（内部节点）/ 32px（叶子）
- 圆形，1.5px 边框
- 无 left/right 文字标签，左右子树通过位置关系暗示
- AVL 节点额外显示 height/balanceFactor 小字（10px）在圆下方

### 3.4 图顶点 (Graph Vertex)

```
    ◯ A       ← 空心圆，字母/数字
```

- 直径：48px
- 空心圆，1.5px 边框
- 标签居中，等宽字体

### 3.5 DP 矩阵单元格 (Matrix Cell)

- 带行列标题的学术表格风格
- 单元格 36-48px，根据行列数自适应
- 行标题/列标题：muted 色，10px 字
- 当前计算格：蓝色边框 + 浅蓝背景
- 路径格：虚线边框或特殊标记

## 4. 颜色系统

柔和填充风格：统一 1.5px 边框，浅色背景区分状态。

| 状态 | 边框 | 背景 | 文字 | 用途 |
|------|------|------|------|------|
| idle | `#E2E8F0` | `white` | `#1E293B` | 默认/未访问 |
| active | `#3B82F6` | `#EFF6FF` | `#1E293B` | 当前焦点 |
| comparing | `#F59E0B` | `#FFFBEB` | `#1E293B` | 比较中 |
| swapping | `#EF4444` | `#FEF2F2` | `#EF4444` | 交换/冲突 |
| success | `#10B981` | `#ECFDF5` | `#1E293B` | 完成/已排序 |
| muted | `#E2E8F0` | `#F8FAFC` | `#94A3B8` | 非活跃 |

箭头/连线颜色跟随源结点颜色。

## 5. 布局系统

### 5.1 数组布局

- 横向排列，元素间距 4-6px（根据数量自适应）
- 柱状图模式：柱子在上方（高度 = 值/max × 可用高度），格子+索引在柱子下方
- 最多 15 个元素一行，超出自动缩放
- viewBox 动态计算，四周留 80-120px padding

### 5.2 链表布局

- 横向排列，结点间距 12px
- 箭头在结点之间的水平线上
- head 指针标签在首个结点上方，cur/prev 等遍历指针在遍历到的结点上方
- 双向链表：next 边在上方直线，prev 边在下方弧线
- viewBox 根据结点总数动态计算宽度

### 5.3 树布局

- 根节点居中顶部
- 递归布局：每个节点的子树左右对称分布
- 同层节点 y 对齐
- 叶子间距根据总叶子数动态计算
- 整体做自适应缩放确保不溢出容器
- AVL 旋转：重新布局后所有节点平滑移动到新位置

### 5.4 图布局

- 默认圆形布局（节点均匀分布在圆上）
- BFS/DFS 可切换为层级布局
- 节点间距根据数量动态调整
- 边权重标签显示在边的中点上方

### 5.5 矩阵布局

- 标准网格，带行列标题
- 单元格尺寸 = min(48px, (可用空间 - 标题区) / max(rows, cols))
- 当前计算格加粗边框
- 转移路径用虚线箭头标注

### 5.6 N-Queens 棋盘

- 棋盘格交替着色（浅灰/白）
- ♛ 表示皇后，✗ 表示冲突位置
- 当前尝试格：蓝色边框
- 回溯格：删除皇后并恢复到普通格

## 6. 指针与标注

### 6.1 指针变量

```
  ┌──────┐
  │ head │  ← 标签框（蓝边框白底）
  └──┬───┘
     ↓        ← 垂直箭头指向目标结点
   ┌────┐
   │ 1  │
   └────┘
```

- 标签框：蓝色边框(1px) + 白底 + 蓝色文字
- 箭头：1.5px 蓝色线 + 小三角
- null 表示：`Ø` 符号或 `null` 文字

### 6.2 步骤说明

- 浮层形式在画布底部显示
- 显示当前操作的文字描述（中英双语）
- 包含复杂度、比较/交换/访问次数统计

## 7. 动画过渡

### 7.1 结点动画

| 操作 | 动画 | 时长 |
|------|------|------|
| 创建 | scale(0→1) + fade in | 300ms |
| 删除 | fade out + scale(1→0) | 300ms |
| 高亮 | border/background color transition | 200ms |
| 移动 | transform translate | 400ms ease |
| pulse | scale(1→1.04→1) | 500ms |

### 7.2 边动画

- 创建：draw 动画（stroke-dashoffset）
- 高亮：color transition + pulse
- 删除：fade out

## 8. 实施范围

### 8.1 需要迁移的算法预设（按优先级）

**P0 — 排序算法（最常用）**
- bubbleSort, selectionSort, insertionSort
- mergeSort, quickSort
- heapSort, shellSort
- countingSort, radixSort, bucketSort

**P1 — 数据结构操作**
- array, stack, queue
- heap, unionFind, hashTable
- segmentTree, fenwickTree

**P2 — 图算法**
- dijkstra, floyd, bellmanFord, aStar
- prim, kruskal, topologicalSort
- dfsGraph（已部分迁移）

**P3 — DP 与回溯**
- knapsack, unboundedKnapsack, lcs, lis
- editDistance, matrixChain, intervalDP
- nQueens, sudoku, backtracking

**P4 — 字符串与高级**
- kmp, manacher, slidingWindow, monotonicStack

### 8.2 图元优化任务

- NodeView：适配所有 variant 的字段/端口渲染
- EdgeView：改进箭头定位，支持双向边的弧线渲染
- PointerView：统一标签框样式
- CellView：矩阵单元格样式
- SceneCanvas：改进 viewBox 计算逻辑

## 9. 验收标准

1. 所有 30+ 算法预设均可通过 Scene Engine 播放动画
2. 元素不超出容器边界，文本不重叠
3. 动画过渡流畅（FPS 60）
4. 预设生成器接受真实输入数据（LeetCode 格式），不依赖硬编码变量名
5. 旧 Renderer（ArrayRenderer 等）可安全移除或降级为回退
6. AI 生成的 AnimationScript 可通过 Scene Engine 渲染（保留兼容路径）

## 10. 风险与规避

| 风险 | 规避策略 |
|------|----------|
| 预设迁移工作量大 | 按 P0→P4 优先级分批，每批独立 PR |
| 图元样式回归 | 每个 variant 编写视觉测试，保持 snapshot |
| 布局溢出 | 统一的 viewBox 计算逻辑，所有 layout 函数内置边界检查 |
| 性能问题 | SVG 渲染，CSS 动画而非 JS 动画，避免大量节点场景的性能瓶颈 |
| 数据同步不一致 | 生成器严格从 initialState.data 读取输入，不硬编码测试数据 |
