# 公共图元库(Graphics Library)设计

> 状态:已与用户对齐方向(代码层重写;现有测试保留当回归网,先不写新测试)。本文档是设计 spec,后续转 writing-plans 拆实施计划。
> 视觉基准:[`design-demos/algoviz-gallery.html`](../../../design-demos/algoviz-gallery.html)(26 类算法/结构,Observable/D3 风)。

---

## 1. 目标

把 demo 的视觉风格 + 生产已分散在 `compilers/` + `primitives/` + `DataUnits` 的图元,**抽取/重写成一个统一的公共图元库** `src/scene/graphics/`,作为图元的**唯一实现层**,使得:

- **覆盖所有算法可视化**(至少 demo 的 26 种),图元目录可枚举、可发现。
- **preset 生成器与 AI 都"调用图元 builder",不再手写裸 `events`**——消除手写 events 的整类错误(如红黑插入 bug)。
- **demo 视觉风格固化在图元规格里**,改一处全局生效。

## 2. 现状(重写前)

- 数据流:`AnimationScript.events` → `compileEvent` 派发到 22 个 compiler → `SceneCommand[]` → `deriveSceneState` → 约 20 个 primitive 渲染。
- 视觉单一事实源:`tokens.ts`(SEMANTIC_COLORS/NEUTRALS/SHAPE/TYPO/MOTION/FOCUS/RBTREE)。
- 工厂雏形:`primitives/DataUnits.ts`(`arrayCell`/`listNode`/`btreeNode` + `AuxiliaryUnit.arrow`/`pointer`)。
- **27 个事件族已覆盖 demo 26 种**(见 §4 映射),但图元创建逻辑分散在各 compiler 内联手写,无统一入口/目录。

## 3. 目标架构:`src/scene/graphics/`

```
src/scene/graphics/
  specs.ts        # 图元视觉规格(扩展 tokens):每个图元的配色/形状/描边/圆角/动画
  catalog.ts      # 图元目录:枚举每个图元的元信息(name/params/spec/coversAlgorithms)
  builders/       # 脚本构建层:语义参数 → 产出 AnimationScript 的 events 片段(preset/AI 调用,替代手写裸 events)
    arrayBuilder.ts  treeBuilder.ts  graphBuilder.ts  gridBuilder.ts
    linkedListBuilder.ts  containerBuilder.ts(queue/stack/deque)
    hashBuilder.ts  heapBuilder.ts  stringBuilder.ts  bitsetBuilder.ts
    unionFindBuilder.ts  dpBuilder.ts  matrixBuilder.ts  variablesBuilder.ts
    geometryBuilder.ts  automatonBuilder.ts  probBuilder.ts  callStackBuilder.ts
    pointerBuilder.ts  focusLensBuilder.ts  seqChipBuilder.ts  skipListBuilder.ts
  compile/        # events → SceneCommand(原 compilers 逻辑迁入,事件薄派发)
  renderers/      # SceneCommand/SceneEntity → SVG(从现有 primitive 迁入 + 按 demo 重写)
    （CellRenderer / NodeRenderer / EdgeRenderer / GridRenderer / … 对应现 primitive）
  index.ts        # 统一导出 + 图元注册表
```

- **builders** 是核心:每个 builder 暴露语义方法(如 `treeBuilder.create({nodes,edges,rbColors})`、`treeBuilder.recolor(id,'red')`、`graphBuilder.enqueue(id)`),产出 `AnimationScript` 的 **events 片段**,供 preset 与 AI 构建脚本——**这是 AI 动态渲染的统一入口,替代手写裸 events**。底层链路:`events → SceneCommand`(原 compiler 逻辑迁入 `compile/`)→ `SVG`(`renderers/`,原 primitive 按 demo 重写)。
- **renderers** 即重写后的 primitive(消费 SceneEntity 出 SVG),按 demo 风格统一。
- **specs/catalog** 让图元可发现:catalog 列出"有哪些图元、各自参数、覆盖哪些算法",是 AI 动态渲染的依据。

## 4. 图元目录(覆盖 demo 26 种)

| 图元域(builder) | 图元 | demo 风格要点 | 覆盖的 demo 算法 |
|---|---|---|---|
| array | cell(idle/compare/swap/sorted/window) | 浅灰圆角小格、橙比较、绿完成 | 排序、二分、滑窗、单调栈、线段树 |
| tree | treeNode(binary/bst/avl/btree/trie)、edge、**rbColor**、rotate 弧 | 圆节点发线边、红黑红/黑实心白字、btree 矩形多键 | 树遍历、AVL、红黑、B树、哈夫曼、Trie、线段树 |
| graph | graphNode、edge(weighted)、frontier/current/visited | 圆节点、#d3d3d3 发线、frontier 橙/current 钢蓝/visited 绿 | 图BFS、Dijkstra、拓扑、Prim、Kruskal、Floyd、Tarjan |
| grid | gridCell(start绿/target蓝/visited浅蓝/frontier橙/path绿/wall深灰)、arrow | 网格格子 + 回溯箭头 | 网格寻路、网格DP |
| linked_list | listNode(singly/doubly/circular)、arrow、ptr(prev/cur/next) | rect 节点 + 发线箭头 + 三指针 | 链表、链表反转 |
| pointer | 指针指示器(i/j/slow/fast/head/tail) | 小三角 + 标签 | 二分、滑窗、链表 |
| focusLens | 当前元素聚焦光斑 | 半透明大圆跟随 | 图/树遍历/网格(通用) |
| **seqChip(补)** | 遍历输出序列条 | 底部绿色 chip 序列 | 树遍历、拓扑、BFS |
| container | queue/stack/deque(一排格子+front/rear/top) | 浅灰格 + 虚线空槽 + 指针 | 队列、栈 |
| hash | hashBucket + chain | 桶一排 + 链地址法下挂 | 哈希表 |
| heap | 树↔数组双视图 | 树 + 底层数组同步 | 堆 |
| string | char cells + pattern + match/mismatch | 字符格 + 滑动模式串 | KMP、Manacher |
| bitset | bit cells | 0/1 格 | 位运算类 |
| union_find | nodes + **arc 弧线指父(补)** + 路径压缩 | 弧线箭头指父 | 并查集 |
| dp | dp table(dep/active/ans) | 二维表 + 表头 + 当前格 | DP表、编辑距离、LCS、背包 |
| matrix | matrix cells + path/conflict | 矩阵格 | Floyd、N皇后、矩阵DP |
| variables | 左上固定变量面板 | HTML 覆盖层 | 通用(数学/调试值) |
| geometry | plane/point/segment/polygon/sweepline | 坐标系 + 点线面 | 凸包、几何 |
| automaton | states + transitions | 状态圆 + 转移边 | KMP自动机 |
| prob | distribution/reservoir | 分布条 | 水塘抽样 |
| callStack | call frames | 调用栈帧 | 递归类 |
| skipList | 多层格子 + 层间发线箭头 | 多层索引 | 跳表 |

> 补缺项:**seqChip(序列输出条)**、**union_find 弧线指父**——demo 有、生产无,本次随图元库一并补齐。

## 5. 迁移策略(渐进逐域,控风险)

**不一次性推倒。** 按图元域分批,每域闭环:
1. 在 `graphics/` 写该域的 spec + builder + renderer。
2. 对应 compiler 改为薄派发(调 builder);对应 primitive 由 renderer 取代(SceneCanvas 改引 renderer)。
3. **tsc 通过 + 交用户人工验收该域**(用户在 app 里查看;不做截图)。
4. 现有该域测试:能过则过;因结构调整失效的断言,记录待批量修订。
5. 下一域。

**批次顺序**(差距/复用度):
- 批 A:array + cell(最基础,排序/二分/滑窗)
- 批 B:tree(树遍历/AVL/红黑/B树/哈夫曼/Trie)
- 批 C:graph + focusLens + seqChip(图族 + 通用原语)
- 批 D:grid + matrix(网格/Floyd)
- 批 E:linked_list + pointer + container(链表/队列/栈)
- 批 F:hash + heap + union_find(含弧线)+ dp
- 批 G:string + bitset + geometry + automaton + prob + callStack + skipList(长尾)

## 6. 测试与验收

- **先不写新单测**(用户决定),靠 `npx tsc --noEmit` 把关类型/编译。
- **验收 = 用户人工验收**(用户明确要求,不做 Playwright 截图):每域完成后交用户在 app 里查看确认。
- **现有 1930 测试保留当回归网**:重写中尽量保持绿;因 builder/renderer 结构调整而失效的断言,**集中在最后一批统一修订**(而非边写边改,避免来回)。
- **完成判据**:tsc 零错;现有测试修订后回归全绿;用户人工验收 26 种通过。

## 7. 风险与边界

- **风险**:动几十个文件的大重构;无新测试期间回归靠人眼截图,覆盖面有限;现有测试会大面积临时变红。用"渐进逐域 + 用户人工验收 + 旧测试当最终网 + 多 agent 按域文件切分"压制。
- **边界**:不动 IR(`AnimationScript`)契约、不动 `SceneEngine.deriveSceneState`/补间框架、不动 AI 解析/校验管线的输入契约(events 类型集不变,只是改由 builder 产出)。`graphics/` 是渲染+构建层的重写,不是引擎重写。
- **AI 集成**:本次先让 preset 改用 builder + 出 catalog;AI 直接基于 catalog 生成留作 catalog 就绪后的下一步(不在本 spec 范围)。
