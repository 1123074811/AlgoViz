# 批 0 试点:图(BFS)对齐 demo + 沉淀公共原语 — 实施计划

> **For agentic workers:** 本计划实现 [`docs/superpowers/specs/2026-06-16-demo-structure-restyle-design.md`](../specs/2026-06-16-demo-structure-restyle-design.md) 的"批 0 试点"。视觉基准 [`design-demos/algoviz-gallery.html`](../../../design-demos/algoviz-gallery.html) 的 `bfsMod`(行 ~408-425)+ `:root`/`.node`/`.edge`/`.box`/`.focusdot` CSS(行 6-128)。

**目标:** 让图 BFS 在生产里长得/动得像 demo,并沉淀后续所有结构复用的公共原语(lens 光斑、边发线色、空槽虚线、bump 落定、composite 队列一排格子)。

**架构边界:** 只改渲染层 + 少量 composite 产出形态。不动 IR / compiler 派发 / 补间框架 / AI 管线。

**执行编排(关键):**
- **阶段 A · 地基(串行,主控亲自做,先于一切)**:Task 1 + Task 2。立起 token 与动画原语契约,提交后才放 agent。
- **阶段 B · 三个文件互斥的并行 agent**(地基落定后):
  - **Agent X(lens)**:Task 3 —— owns `src/scene/primitives/FocusLens.tsx`(新)+ `src/scene/SceneCanvas.tsx`。
  - **Agent Y(图边+圆节点)**:Task 4 + Task 5 —— owns `src/scene/primitives/EdgeView.tsx` + `src/scene/primitives/NodeView.tsx`(+各自测试)。
  - **Agent Z(composite 队列)**:Task 6 —— owns `src/scene/SceneEngine.ts`(queue 段)+ `src/scene/primitives/ContainerView.tsx`(+ deriveSceneState 测试)。
- **阶段 C · 收尾验收(主控)**:Task 7 —— 全量测试 + 图 BFS 截图并排比对 demo。

**并行安全**(沿用 2026-06-16 那批经验):各 agent 只 `git add` 自己 owns 的显式路径(禁 `-A`);开发期跑范围测试;`tokens.ts`/`sharedMotion.ts` 已由阶段 A 锁定,agent 只读不写;`.git/index.lock` 重试一次。

---

## 阶段 A · 地基(主控串行)

### Task 1: token 扩充 + tokens.test 守卫扩面

**Files:** Modify `src/scene/tokens.ts`、`src/scene/__tests__/tokens.test.ts`

- [ ] **Step 1:** 在 `tokens.ts` 的 `NEUTRALS` 增补边/空槽色(demo `.edge`=#d3d3d3、`.box.empty`=#fafafa/#e3e3e3):
```ts
// NEUTRALS 内新增：
/** 图/树结构边的发线色(对齐 demo .edge，比 idle 描边更轻)。 */
edgeStroke: '#D3D3D3',
/** 空槽(队列/栈未占用格)填充与虚线描边。 */
emptyFill: '#FAFAFA',
emptyStroke: '#E3E3E3',
```
新增 `FOCUS`(lens 光斑)与 bump 时长 token,放在 `SHAPE` 之后:
```ts
/** 当前元素聚焦光斑(对齐 demo .focusdot)。 */
export const FOCUS = {
  fill: 'rgba(78,121,167,0.12)',
  radius: 30,
} as const
```

- [ ] **Step 2:** `tokens.test.ts` 把"硬编码 hex ≤20"白名单**扩到漏网文件**(图边/lens 相关),并上调阈值到 28(给新渲染留余量,但仍禁止 primitive 内裸写新色):在 `files` 数组补 `'primitives/EdgeView.tsx'`(已在)、新增 `'primitives/FocusLens.tsx'`;把 `toBeLessThanOrEqual(20)` 改 `(28)`。再加一条断言:`FOCUS.fill` 存在且为 rgba 串、`NEUTRALS.edgeStroke` 是合法 hex。

- [ ] **Step 3:** Run `npm run test -- tokens.test` → PASS。

- [ ] **Step 4:** Commit `git add src/scene/tokens.ts src/scene/__tests__/tokens.test.ts` → `feat(scene): 批0地基 — 扩 edge/empty/lens token`。

### Task 2: 公共动画原语(sharedMotion)

**Files:** Modify `src/scene/primitives/sharedMotion.ts`

- [ ] **Step 1:** 新增 bump 落定 keyframe(对齐 demo `.bump`/`@keyframes bump`),复用 `MOTION.easing`:
```ts
export const BUMP_KEYFRAMES = `
  .scene-bump { animation: scene-bump 0.5s ${MOTION.easing}; transform-box: fill-box; transform-origin: center; }
  @keyframes scene-bump { 0% { transform: scale(1); } 35% { transform: scale(1.05); } 100% { transform: scale(1); } }
`
```
- [ ] **Step 2:** 加一条 lens 跟随过渡常量(供 FocusLens 用,集中时长):
```ts
export const LENS_TRANSITION = `cx ${MOTION.duration.fast}ms ${MOTION.easing}, cy ${MOTION.duration.fast}ms ${MOTION.easing}, opacity 0.3s`
```
- [ ] **Step 3:** Run `npm run test -- tokens.test sharedMotion` (若有) → PASS;`npx tsc --noEmit` 无错。
- [ ] **Step 4:** Commit → `feat(scene): 批0地基 — sharedMotion 增 bump/lens 过渡原语`。

> 阶段 A 两个提交后,token 与原语契约锁定。下放阶段 B 三 agent。

---

## 阶段 B · 并行 agent

### Task 3 (Agent X · lens 光斑)

**Files:** Create `src/scene/primitives/FocusLens.tsx`;Modify `src/scene/SceneCanvas.tsx`;Test `src/scene/__tests__/FocusLens.test.tsx`(新)

**契约:** lens = 一个半透明大圆,定位到"当前元素"(`state.role ∈ {'current','active'}` 的实体,优先 cell/node)的中心,`transition` 平滑跟随;无当前元素时 `opacity:0`。读 `FOCUS` token + `LENS_TRANSITION`。

- [ ] **Step 1: 失败测试** `FocusLens.test.tsx`:给定一组实体含一个 `role:'active'` 的节点,`pickFocusTarget(entities)` 返回其中心坐标;无激活元素返回 null。
- [ ] **Step 2:** 实现 `FocusLens.tsx`:导出 `pickFocusTarget(entities): {x,y}|null`(遍历找 role current/active 的 node/cell,返回 position)与默认组件 `<FocusLens entities={...}/>` 渲染 `<circle class="scene-focus" r={FOCUS.radius} fill={FOCUS.fill} style={{transition:LENS_TRANSITION, opacity}}/>`,cx/cy 来自 target。
- [ ] **Step 3:** `SceneCanvas.tsx`:在主 SVG 实体层**之下**(先画 lens 再画实体,光斑在底)插入 `<FocusLens entities={entities} />`。import 之。
- [ ] **Step 4:** Run `npm run test -- FocusLens` → PASS;`npx tsc --noEmit`。
- [ ] **Step 5:** Commit `git add src/scene/primitives/FocusLens.tsx src/scene/SceneCanvas.tsx src/scene/__tests__/FocusLens.test.tsx` → `feat(scene): lens 聚焦光斑原语(跟随当前元素)`。

### Task 4 + 5 (Agent Y · 图边 + 圆节点)

**Files:** Modify `src/scene/primitives/EdgeView.tsx`、`src/scene/primitives/NodeView.tsx`;更新对应测试 `src/scene/primitives/__tests__/EdgeView.test.tsx`、`NodeView` 相关测试。

- [ ] **Step 1 (边色):** `EdgeView.tsx` 的 `COLOR_MAP.muted`(当前"darker slate")改用新 `NEUTRALS.edgeStroke`(#D3D3D3),structural(非 dashed)边线宽用 `SHAPE.strokeWidth.thin`(1)~`edge` 1.2;高亮边(`color:'primary'`)= `SEMANTIC_COLORS.primary.stroke`。marker(箭头头)填充改用同色 muted/edgeStroke,减重(对齐 demo 细箭头)。
- [ ] **Step 2 (圆节点微调):** `NodeView.renderCircle` 已是浅灰圆;核对 frontier/active/visited 配色映射 = compare(橙)/primary(钢蓝)/success(绿)。`active-ring` 柔光保留(lens 由 Task 3 提供 focusdot,两者叠加即 demo 观感)。圆值字体可保 mono。半径/字号沿用 `getAdaptiveCircleLayout`。
- [ ] **Step 3:** 更新因边色变更而失败的颜色断言(搜 EdgeView.test 里旧 muted hex)。
- [ ] **Step 4:** Run `npm run test -- EdgeView NodeView` → PASS;`npx tsc --noEmit`。
- [ ] **Step 5:** Commit `git add src/scene/primitives/EdgeView.tsx src/scene/primitives/NodeView.tsx src/scene/primitives/__tests__/EdgeView.test.tsx` → `feat(scene): 图边发线化+圆节点配色对齐 demo`。

### Task 6 (Agent Z · composite 队列一排格子)

**Files:** Modify `src/scene/SceneEngine.ts`(queue 段 ~245-296)、`src/scene/primitives/ContainerView.tsx`;更新 `src/scene/__tests__/deriveSceneState.test.ts` 中 composite 相关断言。

**目标形态(对齐 demo `queueMod` 行 243-260):** 一排浅灰圆角小格(`box`),已占用格 `act→ok`、空格 `empty` 虚线;格子下方索引数字;上方 ▼front(绿)/▼rear(橙)指针文本。取代当前"大盒子 + Queue(队列) label"。

- [ ] **Step 1:** 读 `SceneEngine.ts` queue 段,把生成的 `queue_*` 占位 cell 改为一排定宽小格(x = X0 + i*(W+GAP)),已入队元素 `role:'inserted'/color`,空槽 `role:'empty_placeholder'`;移除/改造 `queue_label` 'Queue (队列)' 为对齐 demo 的轻标注(或交由 ContainerView 画 front/rear 指针)。**不改事件契约,只改 deriveSceneState 的 composite 产出几何。**
- [ ] **Step 2:** `ContainerView.tsx`:队列容器渲染对齐 demo(去掉大虚线框观感,改为格子下索引 + front/rear 指针)。空槽用 `NEUTRALS.emptyFill/emptyStroke` + 虚线。
- [ ] **Step 3:** 更新 `deriveSceneState.test.ts` 里断言 composite 仍能 derive(几何变了但实体仍在)。
- [ ] **Step 4:** Run `npm run test -- deriveSceneState ContainerView` → PASS;`npx tsc --noEmit`。
- [ ] **Step 5:** Commit `git add src/scene/SceneEngine.ts src/scene/primitives/ContainerView.tsx src/scene/__tests__/deriveSceneState.test.ts` → `feat(scene): composite 辅助队列改 demo 一排格子形态`。

---

## 阶段 C · 收尾验收(主控)

### Task 7: 全量 + 图 BFS 截图验收

- [ ] **Step 1:** `npm run test`(全量绿)+ `npx tsc --noEmit`(无错)。修任何因渲染改动失败的断言。
- [ ] **Step 2:** 起 dev server,选「拓扑排序」/「图 BFS」类算法,Playwright 截图(file:// 绕 HMR 超时,chromium 缓存 `~/AppData/Local/ms-playwright/chromium-1223`),与 demo `bfsMod` 并排比对:边是浅发线、当前节点有 lens 光斑跟随、frontier 橙/active 钢蓝/visited 绿、composite 队列是一排格子带 front/rear。
- [ ] **Step 3:** 复核公共原语契约(FOCUS/lens/bump/edge token)是否足够支撑批 1。OK 则在 spec 标注"批 0 完成,原语定型",再开批 1。

---

## Self-Review
- **范围**:聚焦图 BFS + 原语,单 plan 可执行。✓
- **占位**:token 值、keyframe、lens 契约均给具体代码;"读现有再改"处给了精确文件+行号+目标形态。✓
- **类型一致**:`FOCUS`/`NEUTRALS.edgeStroke`/`BUMP_KEYFRAMES`/`LENS_TRANSITION`/`pickFocusTarget` 在 Task 1/2/3 定义,Task 3/4 消费,命名一致。✓
- **并行安全**:阶段 A 锁定共享文件(tokens/sharedMotion),阶段 B 三 agent owns 互斥文件集。✓
