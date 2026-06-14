# Observable 风格迁回生产渲染层 · 实施文档

> 目标读者：后续接手实现的 agent / 开发者。
> 状态：待实现。本文档是把 `design-demos/algoviz-gallery.html`（已定稿的 Observable/D3 风格参考 demo）的视觉语言迁回 `src/scene` 生产渲染层的完整方案。
> 基准产物：[`design-demos/algoviz-gallery.html`](../design-demos/algoviz-gallery.html)（26 类算法/结构，纯静态 HTML 原型，**仅作视觉基准，不是要被搬运的代码**）。

---

## 0. 一句话结论

**这是一次"换肤"，不是重写。** 生产渲染层早已把全部视觉收口到 `src/scene/tokens.ts` 单一事实源，并有测试守卫"primitive 内不得硬编码色值"。因此 90% 的视觉改动发生在 `tokens.ts`；少量发生在 primitives 的字体/描边/聚焦动效。**不要新增算法、不要照搬 demo 里的 26 个独立模块**——生产侧的算法数据由 `src/scene/compilers/*` 产出，渲染由 `primitives/*` 负责，二者已存在且工作正常。

---

## 1. 现状架构速览（迁移前必读）

数据流：
```
算法脚本(AnimationScript) 
  → deriveSceneState()            // SceneEngine.ts：把第 N 步还原成 SceneState
  → useSceneTransition()          // 在前后两个 SceneState 间补间(位置/透明度 tween) —— 节点"滑动"的来源
  → SceneCanvas.tsx               // 顶层 SVG：viewBox、defs(markers/shadow)、把实体派发给各 primitive
  → primitives/*.tsx              // 每类图元的 SVG 渲染，消费 tokens
```

**视觉单一事实源**：[`src/scene/tokens.ts`](../src/scene/tokens.ts)
- `SEMANTIC_COLORS`：`idle / primary / compare / active / success / danger / window`，每个含 `{stroke, fill, text}`。**算法状态色**。
- `NEUTRALS`：`mutedText / labelText / bodyText / frameStroke / shadow / surface`。**非语义结构色**（下标、标签、虚线框、阴影）。
- `SHAPE`：`cellRadius / ringRadius / strokeWidth{thin,base,bold} / shadow{soft,raised}`。
- `TYPO`：`mono / size{label,index,value,title} / weight{...}`。
- `MOTION`：`easing / duration{fast,base,slow}`。

**状态 → 样式映射**（对应 demo 里的"语义类名"）：每个 primitive 把 `entity.state.color`（如 `'warning'`）/`role`（如 `'current'`）映射到一个 `SemanticColorName`，再取 `SEMANTIC_COLORS[name]`。例如 [`CellView.tsx`](../src/scene/primitives/CellView.tsx) 的 `COLOR_ALIAS`/`resolveColor`、[`NodeView.tsx`](../src/scene/primitives/NodeView.tsx) 与 [`EdgeView.tsx`](../src/scene/primitives/EdgeView.tsx) 的 `COLOR_MAP`。

**聚焦态 / 完成态（对应 demo 的 lens 光斑 + pop 落定）**：已存在。
- 当前元素：`cell-current-ring` / `node-active-ring`——一个 `opacity 0.08` 的描边色环 + **无限脉冲**动画（见 [`sharedMotion.ts`](../src/scene/primitives/sharedMotion.ts) 的 `CELL_KEYFRAMES`，以及 CellView/NodeView 内 `isCurrent/isActive` 分支画的 ring `<rect>/<circle>`）。
- 落定：`cell-pulse` / `node-pulse`（一次性 scale pop）。
- 边流动：`scene-edge-flow`（虚线流动）。

**补间/滑动**：[`useSceneTransition.ts`](../src/scene/useSceneTransition.ts) 已对实体位置做 tween，时长来自 `durationForStep()`（SceneCanvas.tsx）→ `MOTION.duration`。**demo 里手写的 `transform`/`d` 过渡，在生产侧由这套补间自动提供**，迁移时无需再加。

**测试守卫**（[`__tests__/tokens.test.ts`](../src/scene/__tests__/tokens.test.ts)，改 token 必看）：
- 每个语义色必须是合法 `#RRGGBB`，含 stroke/fill/text。
- `SHAPE/TYPO/MOTION` 字段存在；`TYPO.mono` 含 `monospace`；`MOTION.easing` 含 `cubic-bezier`。
- `CellView.tsx` 不得出现 `const COLOR_MAP`（色值必须来自 token）。
- 12 个 primitive/Canvas 文件里硬编码 `#RRGGBB` 总数 **≤ 20**（当前约 11，余量有限——新加颜色一律进 token，别撒在 primitive 里）。
- `ColorLegend.tsx` 的图例色直接取自 `SEMANTIC_COLORS`，改 token 自动同步，无需手动改。

---

## 2. demo 概念 ↔ 生产文件 对照

| demo（algoviz-gallery.html） | 生产对应 | 迁移动作 |
|---|---|---|
| `:root` 主题变量（配色/描边/圆角/字体/缓动） | `src/scene/tokens.ts` | **核心**：retune token 值 |
| 语义类 `.box/.node/.bar` + 状态类 `.cmp/.act/.ok` | primitives 的 `COLOR_MAP`/`resolveColor` → `SEMANTIC_COLORS` | 不动逻辑，颜色随 token 变 |
| 发线细描边（stroke-width 1 / 1.2） | `SHAPE.strokeWidth` + 各 primitive 里硬编码的 `strokeWidth={1.5}` | 调 token + 把硬编码改引 token |
| 衬线斜体注解（Georgia） | `TYPO`（需新增 `serif`）+ primitives 里 `fontFamily="monospace"` 的**标签/注解** | 新增 `TYPO.serif`，标签类改引它（数值保留 mono） |
| 低饱和分类配色 | `SEMANTIC_COLORS` | 见 §4 目标值 |
| 大留白 | viewBox padding（`computeViewBoxDimensions` 的 `padding=60`） | 可选微调，低优先 |
| 节点滑动 / 边 `d` 过渡 | `useSceneTransition` 已有补间 | **无需迁移** |
| lens 光斑 / pop 落定 | `cell-current-ring`/`pulse` 等 | 调成 Observable 的克制风（见 §5） |
| 26 个算法模块 | `src/scene/compilers/*` + `primitives/*` 已存在 | **不迁移**（demo 仅作视觉参照） |

---

## 3. 范围边界（务必遵守）

**在范围内**：`tokens.ts` 的值；primitives 里把硬编码描边/字体收口到 token；聚焦/完成态动效的观感调校；必要的测试更新；`ColorLegend` 自动跟随（无需手改）。

**不在范围内**：
- ❌ 不新增/改算法或 compiler（demo 的 26 模块只是"长什么样"的参照，生产已有对应渲染）。
- ❌ 不动 `SceneEngine`/`deriveSceneState`/`useSceneTransition` 的逻辑。
- ❌ 不改 `SemanticColorName` 的**枚举集合**（`idle/primary/compare/...` 名字不变，只换值）——改名会波及所有 compiler 与测试。
- ❌ 不把 demo 的 HTML/CSS 直接搬进 React。

---

## 4. 目标 token 值（Observable / D3 风格）

> 取自 demo 的 `:root`。**只换值、不改键**。`danger` 用 Tableau 红；`window` 用浅钢蓝。

```ts
// src/scene/tokens.ts —— SEMANTIC_COLORS 目标
idle:    { stroke: '#CFCFCF', fill: '#F3F3F4', text: '#232323' }
primary: { stroke: '#4E79A7', fill: '#E1E9F1', text: '#232323' }  // steelblue
compare: { stroke: '#F28E2B', fill: '#FBE7D3', text: '#B45309' }  // orange
active:  { stroke: '#4E79A7', fill: '#E1E9F1', text: '#232323' }  // 同 primary
success: { stroke: '#59A14F', fill: '#E6EFE4', text: '#3C7A36' }  // green
danger:  { stroke: '#E15759', fill: '#FBE9E9', text: '#C0413F' }  // Tableau red
window:  { stroke: '#BCD0E4', fill: '#F4F8FC', text: '#232323' }

// NEUTRALS 目标（更轻、更灰，贴合 Observable）
mutedText:  '#8A8A8A'
labelText:  '#6B6B6B'
bodyText:   '#444444'
frameStroke:'#E2E2E2'
shadow:     '#0F172A'   // 保留（阴影用得很少）
surface:    '#FFFFFF'

// SHAPE 目标（更细描边、更小圆角、近乎无阴影）
cellRadius: 3            // demo 用 3（原 8）
ringRadius: 6
strokeWidth: { thin: 1, base: 1.2, bold: 2.4 }   // 原 1.15/1.5/3.4
shadow: {
  soft:   'none',        // Observable 走扁平；或保留极淡 drop-shadow(0 1px 2px rgba(15,23,42,0.05))
  raised: 'drop-shadow(0 2px 6px rgba(15,23,42,0.08))',
}

// TYPO 目标（数值保留等宽；新增衬线给注解/标签用）
mono:  'ui-monospace, SFMono-Regular, Menlo, monospace'   // 不变（数值用，tabular）
serif: 'Georgia, "Times New Roman", "Songti SC", serif'   // 新增：标签/注解/标题
sans:  '"Helvetica Neue", Arial, "Noto Sans SC", sans-serif' // 新增(可选)：UI 文本
size:  { label: 11, index: 11, value: 14, title: 18 }
weight:{ normal: 400, medium: 500, bold: 600 }

// MOTION（口味问题，二选一，低风险）
easing: 'cubic-bezier(0.4, 0, 0.2, 1)'   // Observable 标准缓动(更稳)；或保留现有 expo-out
duration: { fast: 320, base: 600, slow: 950 }  // 不变
```

> ⚠️ `tokens.test.ts` 断言 `TYPO.mono` 含 `monospace` 且每个语义色三字段是合法 hex——上面值均满足。新增 `serif/sans` 是 **additive**，不破坏现有断言。

---

## 5. 聚焦态 / 完成态调校（对应 demo 的克制观感）

Observable 风格"安静"，当前的**无限脉冲色环**（`cell-current-ring` / `node-active-ring`，`animation ... infinite`）偏吵。建议：

- 把无限脉冲改为**静态细描边强调**或**一次性淡入光晕**：在 `sharedMotion.ts` 把 `cell-ring`/`node-ring` 的 `infinite` 去掉，或将当前元素的强调改为"加粗描边 + `SHAPE.strokeWidth.bold`"而非脉冲环。
- `pop` 落定（`cell-pop`）保留，幅度可略收（`scale(1.04)` 已足够克制）。
- 这些都在 [`sharedMotion.ts`](../src/scene/primitives/sharedMotion.ts) + CellView/NodeView 内 `isCurrent/isActive` 分支。改观感即可，**不改触发逻辑**。

> 这是观感取舍，建议实现时先按"静态加粗描边"做一版，截图对比 demo 再决定要不要保留极淡光晕。

---

## 6. 分阶段实施

> 每阶段结束都要：`npm run test`（或相关子集）+ 起 dev server 截图比对 demo。每阶段一个 commit。

### Phase 1 · 调 `tokens.ts`（产出 80% 效果）
- 改 `SEMANTIC_COLORS`、`NEUTRALS`、`SHAPE` 为 §4 值；新增 `TYPO.serif`（+ 可选 `sans`）。
- **验收**：`tokens.test.ts` 通过；起 dev 看任一算法，配色变 Observable 但布局不乱。
- **预期副作用**：可能有别的测试硬断言了旧色值（搜 `#3B82F6`/`#F59E0B`/`#10B981` 等）→ 一并更新（见 §7）。

### Phase 2 · primitives 描边收口到 token
- 把 NodeView/EdgeView/CellView 等里硬编码的 `strokeWidth={1.5}`/`={1}`/`={1.2}` 改引 `SHAPE.strokeWidth.*`。
- 残留硬编码 `#RRGGBB`（当前约 11，预算 ≤20）尽量并进 `NEUTRALS`/`SEMANTIC_COLORS`；新值**严禁**直接写进 primitive。
- **验收**：`tokens.test.ts` 的"硬编码 hex ≤20"仍过；视觉描边变细。

### Phase 3 · 衬线注解
- 把 primitives 里**标签/下标/注解**类文本的 `fontFamily="monospace"`（约 15 处文件）改引 `TYPO.serif`；**数值文本保留 `TYPO.mono`**（钢蓝/数字对齐靠等宽）。
  - 重点：`CellView` 的 header 文本、`NodeView` 的 `field.label` 与圆下方 sub 文本、`SceneCanvas` 的下标轴 `renderArrayIndexAxis`、各 *View 的标题/索引。
- **验收**：注解呈现衬线斜体气质，数值仍等宽对齐。

### Phase 4 · 聚焦/完成态观感（§5）
- 调 `sharedMotion.ts` + ring 分支。
- **验收**：当前元素强调克制不闪烁；落定有轻微 pop。

### Phase 5 · 逐 primitive 校准（按重要度）
对照 demo 逐个核对，重点几个：
- `HeapView`（树↔数组双视图，demo 招牌）：确认索引映射文案与配色到位。
- `HashTableView`（桶+冲突链）：链节点描边/箭头颜色用 `NEUTRALS.mutedText`。
- `DPTableView`（DP 表）：依赖格 `compare`、答案格 `success`。
- 树类（NodeView 圆形 + EdgeView）：AVL/红黑/B 树由 compiler 产数据，确认旋转补间顺滑（补间已有，主要看配色）。
- **验收**：每个起一个对应算法截图比对。

### Phase 6 · 测试 & 验收闭环
- 全量 `npm run test`，更新所有因换色失败的断言（§7）。
- 视觉走查（§8）。

---

## 7. 高风险点 / 必查清单

1. **硬断言旧色值的测试**：先全局搜旧值再动手：
   ```
   grep -rE "#3B82F6|#F59E0B|#10B981|#E2E8F0|#EF4444|#1E293B" src --include=*.ts --include=*.tsx
   ```
   命中的测试/组件按新值更新。
2. **硬编码 hex 预算 ≤20**（tokens.test.ts）：换色时若想加新色，进 token，不要进 primitive。
3. **AI golden / 质量快照**：`src/ai/golden`、`src/ai/quality` 若包含渲染色值快照，需 review/regenerate。
4. **`SemanticColorName` 枚举不可改名**：只换值。改名会炸 compiler + 大量测试。
5. **补间别重复造轮子**：`useSceneTransition` 已提供滑动；不要在 primitive 里加 CSS transform 过渡（会和补间打架）。
6. **ColorLegend / 国际化**：图例自动跟随 token；但 `i18n` 文案 key（`scene.legend.*`）不变。
7. **serif 中文回退**：`TYPO.serif` 末尾带 `"Songti SC"` 等中文衬线回退，避免中文标签掉到默认字体。

---

## 8. 验证清单（完成判据）

- [ ] `npm run test` 全绿（含 `tokens.test.ts` 及各 primitive 测试）。
- [ ] `npm run typecheck` / `npm run lint`（按项目脚本）无新增报错。
- [ ] dev server 起一组代表算法逐一截图，与 demo 同类页比对：
      排序 / 堆(树↔数组) / 哈希表 / Dijkstra / DP表 / AVL 旋转。
- [ ] 配色 = Observable（钢蓝/橙/绿低饱和）、描边变细、注解呈衬线、当前元素强调克制。
- [ ] 数值文本仍等宽对齐；中文标签不掉字体。
- [ ] 无控制台报错；补间滑动顺滑无抖动。

**截图办法**（preview MCP 对本仓 vite HMR 会超时，用 Playwright file:// 绕开——chromium 已缓存于 `~/AppData/Local/ms-playwright/chromium-1223`）：
`npm i -D playwright-core` → 临时脚本用 `executablePath` 指向 chrome.exe 起 dev 截图 → 完事 `npm remove playwright-core` 还原 `package.json`。

---

## 9. 给实现 agent 的执行须知

- 先读本文档 §1、§3、§7，再读 `tokens.ts` + `tokens.test.ts` + `CellView.tsx`/`NodeView.tsx`/`EdgeView.tsx` 三个代表 primitive，建立"状态→token→SVG"心智模型。
- 严格按 Phase 推进，**每个 Phase 一个 commit**，commit 信息说明动了哪些 token/文件。
- 改值前先跑一次基线 `npm run test` 确认绿，便于隔离回归。
- 视觉以 [`design-demos/algoviz-gallery.html`](../design-demos/algoviz-gallery.html) 为唯一基准，有歧义时以 demo 截图为准。
- 不确定某个观感（如是否保留光晕）时，做最克制的一版 + 截图，留给人审。
```
