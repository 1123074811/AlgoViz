# 设计：场景动画/视觉打磨 + AI 生成健壮性

- 日期：2026-06-08
- 状态：已批准（待用户复审 spec）
- 推进策略：地基优先（策略 1）—— 三条横向能力做成共享地基，作用于所有算法
- 落地方式：三条低耦合工作线，分派三个并行 agent（git worktree 隔离）

## 1. 背景与目标

AlgoViz 用 Scene Engine 把算法执行统一表达为逐步可播放的 `AnimationScript`。当前渲染路径为「每步用 `deriveSceneState(script, currentStep)` 重算整个场景快照，再由各 primitive 渲染」。

经代码核实，存在三类系统性短板：

1. **动画瞬移**：`CellView`/`NodeView` 等图元把位置直接写在 SVG `transform` 属性上，步与步之间没有过渡，元素是**跳变**到新位置的。当前仅 `cell-pulse`（缩放弹一下）、`cell-current-ring`、edge dash-flow 在动。swap、指针移动、入栈出栈、连边等高价值变化都是瞬移。
2. **视觉分散不一致**：颜色硬编码且多处重复——`CellView.COLOR_MAP`、`SceneCanvas` 的 window/箭头调色板、`NodeView` 等各有一份；动效时长各写各的（0.5s / 0.7s / 0.9s / 420ms…）。
3. **AI 生成不稳定**：自定义代码走 AI 生成动画时，最常见失败是**生成失败 / 空白 / 报错**（解析不了、生成器报错、场景空白、卡在分析中）。

本轮优化目标（按用户确认的优先级）：

- **动画流畅度与表现力**：高价值场景平滑补间，质感接近 VisuAlgo。
- **视觉美观与一致性**：收敛到「精修学术浅色」（方向 A），克制、护眼、适合课堂与文档截图。
- **AI 生成稳定性**：自定义代码无论模型给什么，**永不白屏、永不卡死、永不裸报错**。

非目标（YAGNI）：

- 不做深色/霓虹主题（方向 C 已排除）。
- 不重写 `deriveSceneState` 的场景状态推导逻辑。
- 不引入完整 tween 时间轴引擎（采用「关键场景上补间」的混合方案，而非全量补间）。
- 不做与本轮目标无关的重构。

## 2. 架构总览

三条工作线通过明确契约对接，交集几乎为零：

| 工作线 | 改动核心 | 对外契约（其他线依赖的稳定接口） |
|---|---|---|
| **A 动画补间层** | `SceneCanvas` 渲染层 + 图元位置消费 | 消费 `SceneState`（不改其结构），输出带过渡的渲染；补间终态逐像素等于原 `SceneState` |
| **B 视觉设计令牌** | 新增 `scene/tokens.ts` + 各图元改用令牌 | 导出颜色/圆角/阴影/描边/间距/字体/缓动常量，签名先定稳 |
| **C AI 健壮性** | `ai/{client,parser,repair}`、`sandbox/runGenerator` + fallback 场景 | 产出合法 `AnimationScript`（或合法 fallback 脚本），渲染层无需感知 |

**关键解耦原则**：

- A 不碰 `deriveSceneState`——只在「拿到每步 `SceneState` 后」做插值渲染。**补间只影响中间帧，终态必须等于原 `SceneState`**。
- B 只动样式常量，不动场景结构。
- C 只动生成管线，不动渲染层。

## 3. 工作线 A：关键场景补间层

### 3.1 目标

让高价值变化平滑过渡而非瞬移；纯高亮仍走轻量 CSS。

### 3.2 设计

在 `SceneCanvas` 与 `deriveSceneState` 之间插入插值渲染层（建议新建 `src/scene/interpolate.ts` + 一个 `useSceneTransition` hook）：

1. **双态持有**：同时持有「上一步 `SceneState`（prev）」与「当前步 `SceneState`（next）」。
2. **同 id 实体插值**：对 prev/next 中同 id 的实体插值 `position`、`opacity`，以及颜色（语义色之间按令牌做离散切换或淡入，不做 RGB 中间插值以免脏色）。新增实体淡入，移除实体淡出。
3. **rAF 驱动 + 统一缓动**：用 `requestAnimationFrame` 推进归一化进度 `t∈[0,1]`，缓动曲线取自 B 的令牌（默认 `cubic-bezier(0.22,1,0.36,1)`）。
4. **图元改造**：**采用「插值层产出中间态 `SceneState`，交给现有图元渲染」**——图元几乎不改，只是接收的 `position`/`opacity`/`state` 来自插值层而非 `deriveSceneState` 直出。对图元侵入最小，且天然保证「t=1 时中间态 == 原 SceneState」。（不采用「图元内部各自读 prev/next 插值」的方案，侵入大且难统一缓动。）
5. **分级补间**：仅对移动 / 出现 / 消失 / 语义色切换补间；`pulse`、`current-ring`、dash-flow 等保持轻量 CSS。
6. **可中断**：用户拖进度条或快速单步时，打断当前补间直接落到目标态，不排队。新 `next` 到来时以「当前显示态」为新的 prev 重新起算。
7. **速度联动 + 无障碍**：补间时长与播放速度联动（慢放=时长拉长）；尊重 `prefers-reduced-motion`（reduced 时补间时长趋零，等价于现状瞬移）。

### 3.3 风险与保障

- 这是「动核心渲染」，风险最高。
- 保障：现有 Scene Engine 测试全绿 + 新增回归测试「补间在 t=1 的落点 == 原 `deriveSceneState` 输出」（逐实体属性相等）。
- 性能：大场景（数百实体）下 rAF 插值需控制；仅对发生变化的实体插值，未变化实体不进插值循环。

### 3.4 验收标准

- swap / 指针移动 / 入栈出栈 / 连边在浅色场景下平滑移动，无跳变。
- 拖动进度条/快速单步不卡顿、不残留中间态。
- `prefers-reduced-motion` 下行为等价于现状。
- 终态回归测试全绿。

## 4. 工作线 B：视觉设计令牌（精修学术浅色）

### 4.1 目标

把分散的颜色/时长/圆角收敛成单一事实源，A 方向一次统一。

### 4.2 设计

1. **新增 `src/scene/tokens.ts`**，导出：
   - **语义色**：`idle / primary / compare / active / success / danger / window`，每个含 `{ stroke, fill, text }`。替换 `CellView.COLOR_MAP`、`SceneCanvas` window overlay 调色板与箭头 marker 色、`NodeView` 等散落色值。
   - **形状**：圆角档位、描边宽度档位、阴影层级。
   - **排版**：字号 scale、字重、等宽字体栈。
   - **动效**：统一缓动曲线 + 时长档位 `{ fast, base, slow }`（供 A 消费）。
2. **各 primitive 改引用令牌**，删除内联硬编码色值与重复 `<style>` keyframes（keyframes 收敛到共享定义）。
3. **A 方向观感校准**：克制配色、柔和阴影、清爽间距、对齐网格。
4. **状态可辨识度校准**：浅色下「比较/交换/完成」也要一眼可辨（借鉴方向 B 的辨识度，保持方向 A 的克制）。

### 4.3 契约（关键）

`tokens.ts` 的**导出签名必须最先定稳**（见 §6 第 0 步），A 与各图元都依赖它。签名定稳后，B 填充具体值与 A 消费缓动档位可并行，互不返工。

### 4.4 验收标准

- 全部 primitive 颜色/缓动来自 `tokens.ts`，无散落硬编码（grep 校验）。
- 整体观感统一为方向 A；关键状态辨识度通过目测核对。

## 5. 工作线 C：AI 生成健壮性

### 5.1 目标

自定义代码无论模型给什么：**永不白屏、永不卡死、永不裸报错**。

### 5.2 设计（分层防线）

1. **解析容错**：`parser` / `generatorParser` 增强对脏输出兼容——截断 JSON、markdown 代码块包裹、注释混入、尾随逗号等尽量救回。
2. **多级修复**：在现有 `repair` 基础上分级：本地结构修复 → 失败再回发 AI 修一次（现已有一次）→ 仍失败进入兜底。
3. **沙箱兜底**：`runGenerator` Worker 超时/抛错时，不再显示 undefined/空白，渲染「降级 fallback 场景」：至少画出 `initialState` + 明确错误说明卡片 + 重试入口。
4. **永不空白**：任何失败路径，渲染层都有可读兜底态，区分三类失败并给不同提示与操作：
   - 模型不可用（认证/网络/限流）
   - 解析失败（模型输出无法解析/修复）
   - 执行超时/运行期报错（沙箱）
5. **稳定性测试台**：复用现有 golden 语料，新增「脏输入 → 必须产出合法脚本或合法 fallback」回归用例，量化成功率。

### 5.3 契约

C 的产出仍是合法 `AnimationScript`（或 fallback 脚本），渲染层（A/B）无需感知，完全隔离。

### 5.4 验收标准

- 三类失败均有对应可读兜底态，无 undefined/白屏/裸报错。
- 稳定性语料台全绿，成功率指标记录在测试输出。

## 6. 并行 Agent 切分与集成

三个 agent，各占一条工作线，git worktree 物理隔离。

| Agent | 负责 | 主要触碰文件 | 冲突面 |
|---|---|---|---|
| **Agent-B** | 设计令牌 | 新建 `scene/tokens.ts`、各 primitive 改色 | 低（新增为主） |
| **Agent-A** | 补间渲染层 | `SceneCanvas.tsx`、新建 `scene/interpolate.ts`、图元位置消费 | 与 B 同改 primitive，用 tokens 契约规避 |
| **Agent-C** | AI 健壮性 | `ai/{parser,repair,client}`、`sandbox/runGenerator`、fallback 场景 | 几乎为零（独立目录） |

### 依赖与顺序

1. **第 0 步（协调者完成，非并行）**：先定稳 `tokens.ts` 的导出签名骨架（接口 + 占位值），作为 A、B 的共享契约提交到各 worktree 基线。
2. **并行阶段**：A、B、C 同时开工；C 全程独立。
3. **集成顺序**：先合 **B**（令牌落地）→ 再合 **A**（补间消费令牌缓动档位）→ **C** 任意时刻合入。
4. **回归保障**：每条线合入前 `npm run test` 全绿；A 额外跑「补间终态 == 原 SceneState」新测试；C 额外跑稳定性语料台。

### 每个 Agent 交付物

- 代码 + 对应新增/更新 Vitest + 自检通过。
- 协调者负责：tokens 契约、集成顺序、冲突仲裁、最终验收。

## 7. 参考来源

- **VisuAlgo**：补间动画质感、状态辨识度、教学表达。
- **algorithm-visualizer**：tracer/脚本驱动渲染的架构思路。
- **tldraw / excalidraw**：事件→场景→渲染的状态归一化、可中断动画、性能优化。

## 8. 测试策略

- 沿用 Vitest（48 个测试文件现状）。
- A：新增补间终态等价回归测试。
- B：新增 grep 式校验（无散落色值）+ 目测核对。
- C：扩展 golden 语料为稳定性测试台。
- 集成：全量 `npm run test` 作为每条线合入门槛。
