# Phase 3: 专属可视化元素 + 渲染健壮性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 为哈希表、纯数学/变量、集合、字符串构建从零设计的专属可视化元素；同时修复矩形节点文本溢出与节点重叠（渲染健壮性）。

**Architecture:** 专属可视化模式 = 编译器发出带结构前缀的实体（`hashbucket_*` 等）→ `renderContainers`（SceneCanvas）按前缀检测 → 专属 View 组件画结构外观。Builder 加对应方法，提示词文档化，AI 生成器即可调用。

**分波：** Wave 1 = 哈希表端到端（范式）+ Stream A 渲染健壮性（并行，文件不重叠）。Wave 2 = 纯数学/集合/字符串（沿用哈希表范式，逐个串行或受控并行）。

---

## 共享架构参考（所有专属结构遵循）

- 事件族定义：`src/scene/eventTypes.ts`（加新 union 成员，并入 `AlgorithmEvent`）
- 编译器：`src/scene/compilers/<name>Compiler.ts`，`supports: e => e.type.startsWith('<prefix>.')`，发出 `create_cell`/`create_node`/`set_state`/`connect` 命令；在 `src/scene/eventCompiler.ts` 的 `compilers` 数组注册
- 实体前缀约定：用唯一前缀（如 `hashbucket_`、`hashentry_`、`mathvar_`），供 renderContainers 检测
- 专属 View：`src/scene/primitives/<Name>View.tsx`，在 `SceneCanvas.tsx` 的 `renderContainers()` 里按前缀检测并渲染
- Builder：`src/sandbox/builder.ts` 加方法（链式返回 this），发对应事件
- 提示词：`src/ai/generatorPrompt.ts` 文档化新方法

---

## Task 1: 哈希表专属元素（端到端范式）

**Files:**
- Modify: `src/scene/eventTypes.ts`（加 `HashTableAlgorithmEvent`）
- Create: `src/scene/compilers/hashTableCompiler.ts`
- Modify: `src/scene/eventCompiler.ts`（注册）
- Create: `src/scene/primitives/HashTableView.tsx`
- Modify: `src/scene/SceneCanvas.tsx`（renderContainers 检测 `hashbucket_`）
- Modify: `src/sandbox/builder.ts`（hash 方法）
- Modify: `src/ai/generatorPrompt.ts`（文档化）
- Test: `src/scene/compilers/__tests__/hashTableCompiler.test.ts`

> **前提：** 无依赖。可与 Task 2 并行（文件不重叠）。

### Step 1: 事件族

在 `eventTypes.ts` 加：
```ts
export type HashTableAlgorithmEvent =
  | { type: 'hashtable.create'; capacity: number }
  | { type: 'hashtable.put'; key: string; value: number | string; bucket: number; collision?: boolean }
  | { type: 'hashtable.get'; key: string; bucket: number; found: boolean }
  | { type: 'hashtable.remove'; key: string; bucket: number }
  | { type: 'hashtable.highlight_bucket'; bucket: number }
```
并入 `AlgorithmEvent` union 末尾：`| HashTableAlgorithmEvent`。

### Step 2: 编译器

创建 `hashTableCompiler.ts`。设计：
- `hashtable.create(capacity)`：发出 `capacity` 个桶 cell，id=`hashbucket_<i>`，横排，位置 `x = startX + i*CELL_W`，y=固定。value 为空，state.role='idle'，meta 存 `{ bucket: i }`。再发一个 label `hashtable_loadfactor` 显示 `0/capacity`。
- `hashtable.put(key,value,bucket,collision)`：在该 bucket 下方链位置发出 entry cell，id=`hashentry_<bucket>_<chainIndex>`，value=`${key}:${value}`，state.color = collision? 'warning':'success'。chainIndex = 该 bucket 已有 entry 数。更新 loadfactor label。highlight 该 bucket。
- `hashtable.get(key,bucket,found)`：highlight bucket + 该 entry，color found?'success':'danger'。
- `hashtable.remove(key,bucket)`：标记对应 entry state.role='deleted'（compiler 下次清理）或直接 remove_entity。
- `hashtable.highlight_bucket(bucket)`：set_state 该 bucket pulse。

cell 尺寸用自适应宽度（依赖 Task 2 的 `measureCellWidth`，若 Task 2 未完成可先用固定 `width: 56`，Task 2 完成后切换）。

注册：`eventCompiler.ts` 的 `compilers` 数组加 `hashTableCompiler`，import 之。

### Step 3: HashTableView

创建 `HashTableView.tsx`，props `{ buckets: SceneCell[]; entries: SceneCell[]; loadFactorLabel?: SceneLabel }`。绘制：
- 桶数组：每个桶画方框 + 下方索引数字 `0,1,2...`
- 桶内 entry：在桶正下方竖直排列（冲突链），每个 entry 画圆角框含 `key:value`
- 冲突链连接线：bucket → entry1 → entry2 竖直细线
- 负载因子：右侧或底部显示 `loadFactor = n/cap`
- 颜色用 entry/bucket 的 state.color

### Step 4: renderContainers 接入

在 `SceneCanvas.tsx` `renderContainers` 里加：
```ts
const hashBuckets = cells.filter(c => c.id.startsWith('hashbucket_')).sort(byIndex)
const hashEntries = cells.filter(c => c.id.startsWith('hashentry_'))
```
并在返回的 `<>` 里：`{hashBuckets.length > 0 && <HashTableView buckets={hashBuckets} entries={hashEntries} loadFactorLabel={...} />}`。
注意：`hashbucket_`/`hashentry_` cell 已在 SceneCanvas 主体被 CellView 渲染；HashTableView 只画"外壳/链/索引/负载因子"，避免重复画 cell 本体（参照 ContainerView 只画容器不画 cell）。或在 HashTableView 内统一绘制并在主体过滤掉这些 cell——二选一，保持与 ContainerView 一致的做法。读 ContainerView.tsx 确认现有约定。

### Step 5: Builder 方法

`builder.ts` 加：
```ts
hashCreate(capacity: number): this { return this.add([{ type: 'hashtable.create', capacity }], this.act('highlight', [], 'primary')) }
hashPut(key: string, value: number | string, bucket: number, collision?: boolean): this {
  return this.add([{ type: 'hashtable.put', key, value, bucket, collision }], this.act('insert', [], collision ? 'warning' : 'success'))
}
hashGet(key: string, bucket: number, found: boolean): this {
  return this.add([{ type: 'hashtable.get', key, bucket, found }], this.act('highlight', [], found ? 'success' : 'danger'))
}
hashRemove(key: string, bucket: number): this {
  return this.add([{ type: 'hashtable.remove', key, bucket }], this.act('delete', [], 'danger'))
}
```
并在 `buildInitialState` 里：type 为 'matrix' 之外不影响；hashtable 用 type='array' 的 initialState（data:[]）即可，因为渲染走 events。Builder 构造时 type 传 'array'。

### Step 6: 提示词

`generatorPrompt.ts` 加一节"哈希表"：
```
### 哈希表（hash map / hash set）
- b.hashCreate(capacity)  创建桶数组，capacity=桶数（如 8）
- b.hashPut(key, value, bucket, collision?)  插入；bucket=hash(key)%capacity，collision=该桶已有元素时 true
- b.hashGet(key, bucket, found)  查找
- b.hashRemove(key, bucket)  删除
要点：自己用简单 hash（如字符串字符码和 % capacity）算 bucket；冲突用链地址法，collision 传 true
```
并在 @type 允许值不变（hashtable 算 array 渲染范畴，type 用 array）。

### Step 7: 测试 + 验证

`hashTableCompiler.test.ts`：create 产出 capacity 个 hashbucket_ cell；put 产出 hashentry_ cell 且 value 含 key:value；冲突 put 同 bucket 产出 chainIndex 递增的 entry。

```bash
npx tsc --noEmit && npm test && npx vite build
```

### Step 8: 提交
```bash
git add src/scene/eventTypes.ts src/scene/compilers/hashTableCompiler.ts src/scene/eventCompiler.ts src/scene/primitives/HashTableView.tsx src/scene/SceneCanvas.tsx src/sandbox/builder.ts src/ai/generatorPrompt.ts src/scene/compilers/__tests__/hashTableCompiler.test.ts
git commit -m "feat(scene): 哈希表专属可视化元素——桶数组+冲突链+负载因子

新增 hashtable.* 事件族 + hashTableCompiler + HashTableView（桶数组、
桶内 KV 条目、链地址法冲突链、负载因子）。builder 加 hashCreate/hashPut/
hashGet/hashRemove，提示词文档化。替代此前借用数组节点的渲染。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Stream A 渲染健壮性（与 Task 1 并行）

**Files:**
- Create: `src/scene/textMetrics.ts`
- Modify: `src/scene/primitives/NodeView.tsx`（矩形宽度自适应）
- Modify: `src/scene/layouts/treeLayout.ts`、`src/scene/layouts/graphLayout.ts`（按节点宽度防重叠）
- Modify: `src/scene/primitives/LabelView.tsx`（长文本截断/换行）
- Modify: `src/scene/primitives/CellView.tsx`（长 value 缩字号/截断）
- Test: `src/scene/__tests__/textMetrics.test.ts`

> **前提：** 无依赖。与 Task 1 并行（文件不重叠）。

### Step 1: textMetrics 工具

创建 `src/scene/textMetrics.ts`：
```ts
/** Estimate rendered text width (px) for monospace SVG text. */
export function measureTextWidth(text: string, fontSize = 14): number {
  // monospace char advance ≈ 0.6 × fontSize
  return text.length * fontSize * 0.6
}

/** Adaptive width for a rectangular node holding the given text. */
export function measureNodeWidth(text: string, opts: { fontSize?: number; padding?: number; min?: number; max?: number } = {}): number {
  const { fontSize = 14, padding = 20, min = 48, max = 260 } = opts
  return Math.max(min, Math.min(max, Math.ceil(measureTextWidth(text, fontSize) + padding)))
}

/** Truncate text to fit a max width, adding an ellipsis. */
export function truncateToWidth(text: string, maxWidth: number, fontSize = 12): string {
  const charW = fontSize * 0.6
  const maxChars = Math.max(1, Math.floor(maxWidth / charW))
  return text.length <= maxChars ? text : text.slice(0, Math.max(1, maxChars - 1)) + '…'
}
```

### Step 2: NodeView 矩形宽度自适应

在 `renderRect` 里，宽度不再只用固定 `node.size.width`，而是取 `max(node.size.width, measureNodeWidth(最长字段文本))`。读 NodeView.tsx 当前 renderRect，计算所有 fields 文本中最长者的自适应宽度，与传入 width 取较大值，重新计算 fieldWidth。import `measureNodeWidth` from '../textMetrics'。

### Step 3: 布局防重叠

`treeLayout.ts`、`graphLayout.ts`：当前用固定水平间距。改为：相邻节点最小间距 = (左宽 + 右宽)/2 + GAP。读这两个 layout，找到水平定位逻辑，把固定间距替换为按节点 `size.width` 计算的动态间距（节点无 size 时用默认）。保证宽节点不重叠。

### Step 4: LabelView 长文本处理

`LabelView.tsx`：若 label.text 过长（如 > 30 字符），用 `truncateToWidth` 截断并加 `<title>` 显示全文；或按容器宽度截断。读 LabelView 当前渲染。

### Step 5: CellView 长 value 处理

`CellView.tsx`：value 过长时缩小字号或截断，使其不超出 cell 宽度。用 `truncateToWidth(value, cellWidth-6, fontSize)`。

### Step 6: 测试

`textMetrics.test.ts`：
- measureNodeWidth 短文本返回 min，长文本随长度增长，封顶 max
- truncateToWidth 超长加 …，不超原样返回

### Step 7: 验证 + 提交
```bash
npx tsc --noEmit && npm test && npx vite build
```
```bash
git add src/scene/textMetrics.ts src/scene/primitives/NodeView.tsx src/scene/layouts/treeLayout.ts src/scene/layouts/graphLayout.ts src/scene/primitives/LabelView.tsx src/scene/primitives/CellView.tsx src/scene/__tests__/textMetrics.test.ts
git commit -m "fix(scene): 渲染健壮性——矩形节点宽度自适应 + 布局防重叠 + 长文本截断

新增 textMetrics（measureNodeWidth/truncateToWidth）。矩形节点（B+树等）
宽度随最长字段文本自适应；tree/graph 布局按节点实际宽度算间距防重叠；
LabelView/CellView 长文本截断加省略号 + title 悬停看全文。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Wave 2（哈希表范式确立后）：纯数学/集合/字符串

沿用 Task 1 的"事件族 + 编译器 + 专属 View + renderContainers + builder + prompt"模式，逐个实现：

- **纯数学/变量面板**：`math.*` 事件（`math.create(names)`、`math.set(name,value)`、`math.highlight(name)`、`math.note`）→ `mathCompiler` 发 `mathvar_<name>` cell（带标签）→ `VariablesView` 横排寄存器面板 → builder `varInit/varSet/varHighlight`。
- **集合重做**：升级 `setCompiler` + 新 `SetView`（去重圈集合视觉，区别于数组）。
- **字符串重做**：升级 `stringCompiler` + 新 `StringView`（字符格子带下标 + 双指针/匹配高亮）。

每个一个 commit，沿用 Task 1 的验证流程。Wave 2 各任务都改 eventTypes/eventCompiler/builder/generatorPrompt/SceneCanvas，彼此有冲突，需串行或由协调者整合共享文件。

---

## 自检
- ✅ 哈希表专属元素（Task 1）：桶+KV+冲突链+负载因子，独立于数组
- ✅ 渲染健壮性（Task 2）：溢出+重叠修复，惠及所有元素
- ✅ 纯数学/集合/字符串（Wave 2）：沿用范式
- 类型一致：HashTableAlgorithmEvent 并入 AlgorithmEvent；builder hash* 方法发对应事件；prefix `hashbucket_`/`hashentry_` 编译器与 renderContainers 一致
