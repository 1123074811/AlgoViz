# Demo 结构形态迁移(渲染层重构)· 设计文档

> 状态:已与用户在 brainstorming 中确认方向,待用户复核本 spec → 转 writing-plans。
> 视觉基准:[`design-demos/algoviz-gallery.html`](../../../design-demos/algoviz-gallery.html)(方向 B · Observable/D3,26 类结构纯前端原型)。
> 关联:本设计**取代**了 [`docs/observable-restyle-migration-plan.md`](../../observable-restyle-migration-plan.md) 的"只换肤"范围论断(见 §0)。

---

## 0. 背景:为什么"还是旧的"

此前把 demo 迁移定性为"换肤"——只改 `src/scene/tokens.ts` 配色,认为结构渲染形态不动(见 `observable-restyle-migration-plan.md` §0/§3 反复强调"不要照搬 demo 的 26 个模块,生产渲染已存在")。但真实运行的 app 暴露三类**根因**,说明配色 token 改了≠结构长得像 demo:

1. **图的边**:`src/scene/primitives/EdgeView.tsx` 的 `muted` 边色是"为可读性加深的 slate",比 demo 的 `.edge`(`#d3d3d3`,1.2px 发线)深很多,箭头 marker 也更重 → 图显得"重而旧"。
2. **composite 队列盒子**:`src/scene/SceneEngine.ts:291` 在 `layout:'composite'` 场景(拓扑/BFS 等图+辅助队列)里自动生成一个 `text:'Queue (队列)'` 的虚线大占位框,与 demo 的"一排浅灰圆角小格 + ▼front/▼rear 指针"完全是两种形态。
3. **新结构(跳表等)**:按"能跑"实现,箭头/布局未对照 demo 的多层发线精修。

更深层:demo 有一组**跨结构复用的视觉/动画原语**(lens 光斑、圆形节点、发线边、一排小格、bump/pop 落定、序列输出 chip、节点 `transform .55s` 滑动 + 边 `d .55s` 平滑变形),生产基本**没有**(`sharedMotion.ts` 仅有 `cell-pop` + `edge-flow`)。

## 1. 目标与范围(用户已确认)

- **全覆盖,分批实施**:26 类结构最终都对照 demo 重做形态,但按差距大→小分批,每批可验收。
- **形态 + 动画都对齐**:不只静态像 demo,lens 光斑跟随、bump/pop、边 d 过渡等动画也要对齐。
- **允许必要时动数据管线/引擎**:仅在确有必要的少数点(如 composite 队列盒子产出形态),不无差别重写引擎;AI 的 IR 契约/事件类型保持不变。

**不在范围**:不重写 IR `AnimationScript`、`SceneEngine.deriveSceneState` 主流程、compiler 派发注册表、`useSceneTransition` 补间框架、AI 管线(`useAIGenerator`/`schema.ts`)。这些是"不重写核心"的底线(见架构评审记忆)。

## 2. 实施路径:试点先行 + 公共原语 + 分批复制

选 1 个高差距结构做**完整 demo 对齐(形态+动画)**作试点,沉淀后续所有结构复用的地基,再分批套用。

**试点结构:图(BFS)** —— 一次覆盖最多通用原语(lens、圆节点、发线边、frontier/active/visited 状态),且 composite 队列盒子也在图场景里,受益面最广。

## 3. 试点交付物(后续复用的"样板")

### 3.1 token 扩充(`tokens.ts`)
- `edge`:发线色(对齐 demo `#d3d3d3` 级别的浅灰,比当前 muted 浅)、`edge.on` 高亮色、线宽 1.2。
- `empty`:空槽填充 `#fafafa` + 虚线 `stroke-dasharray 3 3` + 浅边。
- `lens`:光斑色(`rgba(78,121,167,.12)` 量级)、半径(~30)。
- `bump`/`pop`:落定时长曲线(对齐 demo 的 `.4~.55s var(--ease)`)。
- 新增色一律进 token,不撒进 primitive(见 §6 测试守卫)。

### 3.2 公共动画原语(新建 + 扩 `sharedMotion.ts`)
- **lens 光斑**:SceneCanvas 层的覆盖件,读"当前元素"(`state.role ∈ {current,active}`)的位置,半透明大圆 `transition:cx/cy` 平滑跟随。**契约**:输入=当前高亮实体的中心坐标;无当前元素时 `opacity:0`。
- **bump 落定** keyframe(`@keyframes bump` scale 1→1.05→1)。
- **边 `d` 平滑过渡**:`EdgeView` 给 path 加 `transition:d`(或确认 `useSceneTransition` 已覆盖边的 d 补间;若未覆盖则在 EdgeView 层加 CSS),用于旋转/分裂/合并时边平滑变形。
- **序列输出 chip**:遍历类结构底部"输出序列"条的公共件(对齐 demo `.seqchip`),可选,供中序遍历/拓扑/BFS 等用。

### 3.3 圆形节点形态
图/树共用"圆 circle + 居中值 + 状态描边"画法(对齐 demo `.node`:r≈22、浅灰发线、frontier=橙、active=钢蓝、visited=绿)。当前图节点复用了带 fields/ports 的链表风 `NodeView`,需为 graph/tree 变体提供圆形画法(调整 `NodeView` 的 variant 分支,或抽独立圆形节点件——实现期定)。

### 3.4 验收法
每个结构:起 dev server + Playwright(file:// 绕开本仓 HMR 超时,chromium 缓存于 `~/AppData/Local/ms-playwright/chromium-1223`)截图,与 demo 同类页**并排比对**,作为每批的验收闸。

## 4. 批次划分(差距大→小)

- **批 0(试点)**:图 BFS —— 沉淀 §3 全部原语。
- **批 1 · 高差距**:树遍历/BST、堆(树↔数组双视图)、AVL 旋转、红黑树、B 树、跳表精修、并查集(弧线+路径压缩)、Trie、哈夫曼、**composite 辅助队列盒子→一排格子**。
- **批 2 · 中差距**:队列/栈/双端队列、哈希表(桶+链)、链表反转、网格寻路/网格 DP、DP 表/编辑距离/区间 DP。
- **批 3 · 微调(已较接近,收口描边/衬线/留白/索引/指针标签)**:排序、二分查找、滑动窗口、单调栈、KMP/Manacher/KMP自动机、Dijkstra/Bellman-Ford/Floyd/Prim/Kruskal/拓扑排序、几何/凸包、背包/LCS/LIS。

每批结束:全量测试 + 截图验收;一批一个(或数个)提交。

## 5. 架构边界

| 层 | 处置 |
|---|---|
| IR `AnimationScript` / 事件类型 | **不动**(AI 生成依赖其契约) |
| `SceneEngine.deriveSceneState` 主流程 | **不动**;唯一例外:`SceneEngine.ts:291` composite 辅助队列盒子产出形态改成一排格子 |
| compiler 派发注册表 / 各 compiler | 默认不动产出;个别结构若 demo 形态需要不同实体布局,可调该 compiler 的坐标/实体产出(不改事件契约) |
| `useSceneTransition` 补间框架 | **不动**(滑动复用它);边 d 过渡若它未覆盖则在 EdgeView 层补 CSS |
| `primitives/*` | **重做**各结构 SVG 画法 |
| `sharedMotion.ts` / `tokens.ts` / `SceneCanvas.tsx` | **扩充/重做**(原语、token、lens 层、composite 布局) |
| AI 管线 `useAIGenerator`/`schema.ts` | **不动**(渲染层重做不改 IR 契约) |

## 6. 测试 / 验收策略

- `src/scene/__tests__/tokens.test.ts` 的"硬编码 hex ≤20 白名单"要**扩到图/edge/marker 等漏网文件**,新色一律收进 token(预算可随白名单扩大而上调,但禁止 primitive 内硬编码新色)。
- 每个 primitive 改画法后,其现有快照/断言同步更新。
- 新原语(lens 跟随取位、bump、边 d 过渡、序列 chip)各加单测。
- 每批结束:全量 `npm run test` 绿 + `npx tsc --noEmit` 无错 + Playwright 截图并排比对 demo。

## 7. 风险

- **渲染层近乎重写**:测试面大、视觉回归主要靠人眼。用"试点定样板 → 分批 → 每批截图验收"压住。
- **多 agent 协作**:渲染层各 primitive 文件相对独立,可按"文件所有权切分"并行(见架构记忆里 2026-06-16 那批的成功经验:严格文件互斥、只 `git add` 自己路径、开发期跑范围测试、全量只在收尾跑)。但 `tokens.ts`/`sharedMotion.ts`/`SceneCanvas.tsx`/`SceneEngine.ts` 是共享文件,触碰它们的批次(尤其批 0 试点要建原语)应串行或单 agent 收口。
- **试点是关键路径**:批 0 的原语契约若设计不当,会拖累后续所有批。试点完成后应停下来复核原语再铺开。
