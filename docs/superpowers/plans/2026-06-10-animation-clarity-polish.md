# 动画清晰度与前端打磨实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 围绕"输入自定义算法代码 → AI 输出美观、准确、清晰的动画"这一核心场景,补齐播放导航、动画章节感、画布可读性、AI 生成质量与校验覆盖,并清理工程障碍。**不做任何教学交互类功能**(预测问答、对比模式、伪代码面板、增长曲线均不在本计划内)。

**Architecture:** 六个相互独立的 Phase。P1 播放导航(可拖进度条 + 步骤列表 + goToStep API);P2 动画阶段标记(b.phase → 进度条分段 + 阶段标题);P3 画布清晰度(颜色图例 + 动作差异化节奏 + 死代码清理);P4 AI 生成质量(回溯搜索树质量规则 + 输入变化重校验 + 三态校验徽标);P5 Python 真值执行(Pyodide 懒加载,可选);P6 Visualizer 拆分(纯重构)。

**Tech Stack:** React 18 + TypeScript 6 + Vitest 4(jsdom;**测试文件必须显式 `import { describe, it, expect } from 'vitest'`**,tsconfig 未启用 vitest 全局类型——上一轮就栽在这里)。路径别名 `@/` → `src/`。

---

## 背景:本轮要解决什么

上一轮(`2026-06-10-functional-gaps-1-6.md`)已完成:AI 动画语义校验(@expect + JS 真值)、双语描述、力导向/重心法布局、脱钩提示、截断提示、回溯搜索树语法糖。**渲染层经勘察已相当扎实**:补间(easeOutCubic + reduced-motion)、swap 弧线轨迹、滚轮缩放、viewBox 内容自适应都已存在,不要重做。

本轮针对勘察确认的真实缺口:

| # | 缺口 | 证据 |
|---|------|------|
| 1 | **进度条不可拖拽**,只能逐步前进/后退,几百步的动画无法快速定位 | `PlaybackControls.tsx` ~95 行的"进度条"是纯展示 div(width %);`useAnimationEngine` 无 `goToStep` API |
| 2 | **步骤说明只显示当前一条**,无法浏览全部步骤、点击跳转 | `Visualizer/index.tsx` ~802 行只渲染 `currentStepData.description` 单块 |
| 3 | **长动画无章节感**:几百步从头平铺到尾,用户不知道动画进行到算法哪个阶段 | `AnimationStep` 无 phase 字段,builder 无对应 API |
| 4 | **画布无颜色图例**:黄=比较、红=冲突、绿=完成等语义色没有任何解释 | `src/scene/` 下无 Legend 组件 |
| 5 | **所有动作等速**:交换/插入这类"大动作"与高亮"小动作"补间时长相同,动画节奏单调 | `SceneCanvas.tsx` `durationForSpeed()` 只看速度不看动作类型 |
| 6 | **EventTimeline 是死代码**:展示裸事件名 + 硬编码中文,且未被任何页面引用 | `grep -rn "EventTimeline" src --include="*.tsx"` 无引用 |
| 7 | **输入变化后不再校验**:live-regen 重生成的动画无 verification 标记 | `useAIGenerator.ts` ~354 行 live-regen effect 直接 `runGeneratorSandboxed`,不走 `verifyAndTag` |
| 8 | **校验通过/跳过状态不可见**:UI 只在 fail 时显示警示,用户无从知道"这个动画校验过了吗、用什么校验的" | `VerificationNotice.tsx` 仅渲染 fail |
| 9 | **回溯搜索树只靠提示词**:模型偷懒不建搜索树时质量门不拦 | `src/ai/quality/rules/category.ts` recursion 规则只查 callstack |
| 10 | **Python 代码无真值校验**:只有 JS 走真实执行,Python(自定义代码最常见语言)只能靠 @expect 自报 | `verifyAndTag` 仅 `language==='javascript'` 分支 |
| 11 | **Visualizer/index.tsx ~900 行**:状态与 JSX 揉在一起,后续打磨成本高 | 文件行数 |
| 12 | lint 余 4 个 unused-vars warning | `npm run lint` |

### 关键现有接口(直接对接,不要重新发明)

| 接口 | 位置 | 要点 |
|---|---|---|
| `useAnimationEngine(script)` | `src/hooks/useAnimationEngine.ts` | 返回 `{ visualState, currentStepData, isPlaying, speed, currentStep, totalSteps, setSpeed, stepForward, stepBackward, reset, goToEnd, togglePlay, loadScript }`;内部 `updatePlayback(updater)` 更新 `{ script, currentStep, isPlaying }` |
| `PlaybackControls` | `src/components/Controls/PlaybackControls.tsx` | props 见文件头 interface;Visualizer 与 Playground **共用**,改一处两页受益;进度展示在 `~95` 行的 div |
| `AnimationStep` | `src/types/animation.ts:175` | `{ stepId, codeLine, description, action, events?, stats, teachingState? }`;`StepAction = { type: ActionType, targets, color, ... }` |
| `AnimationBuilder` | `src/sandbox/builder.ts` | `pendingDesc`/`pendingDescEn` 模式(`desc()` 暂存 → `add()` 消费并清空),新增 phase 照抄此模式;`add()` 在 ~350 行构造 step 对象 |
| `SceneCanvasInner` | `src/scene/SceneCanvas.tsx` | 已接收 `currentStepData?: AnimationStep \| null` prop;`durationForSpeed(speed)` 在 ~47 行;补间 key 在 ~103 行 |
| `SEMANTIC_COLORS` | `src/scene/tokens.ts:11` | `idle/primary/compare/active/success/danger/window`,每色 `{ stroke, fill, text }` |
| `verifyAndTag(script, args)` | `src/hooks/useAIGenerator.ts:39` | args: `{ expectRaw?, language, userCode, input, sourceCode }`;JS 走真值、否则 @expect;写 `script.verification` 并消毒行号 |
| `VerificationNotice` | `src/pages/Visualizer/VerificationNotice.tsx` | 现仅 fail 渲染 |
| `CATEGORY_RULES` | `src/ai/quality/rules/category.ts:54` | `Record<AlgorithmCategory, QualityRule[]>`,recursion 数组在 ~73 行;`QualityRule = { id, appliesTo?, check(ctx) }`;`QualityContext` 含 `script`、`sourceCode?`、`structuresCreated`(有 create 事件的结构族集合)、`opCountByFamily` |
| `runUserJsSandboxed` | `src/sandbox/runUserCode.ts` | Worker + 内联回退模式,P5 的 Python 版照抄此结构 |
| useAIGenerator live-regen | `src/hooks/useAIGenerator.ts` ~354 行 | `generator` state 现为 `{ body, type }`,effect 内无 userCode/language 可用——P4.2 需扩展 |
| i18n | `src/i18n/locales/zh.json` / `en.json` | 平铺 JSON;组件内 `useTranslation()` |

### 前置条件与统一验收

- [ ] **Task 0: 基线确认**

Run: `git status --short`
Expected: 空输出。不为空则停下来请用户处理。

每个 Phase 完成后的统一验收:

```bash
npx tsc --noEmit && npm run lint && npx vitest run
```

**所有新测试文件第一行必须是 `import { describe, it, expect } from 'vitest'`**(用到 `vi` 再加上 `vi`)。

---

# Phase 1: 播放导航升级

### Task 1.1: useAnimationEngine 增加 goToStep

**Files:**
- Modify: `src/hooks/useAnimationEngine.ts`
- Test: `src/hooks/__tests__/useAnimationEngine.goToStep.test.tsx`

- [ ] **Step 1: 写失败测试**

创建 `src/hooks/__tests__/useAnimationEngine.goToStep.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimationEngine } from '../useAnimationEngine'
import type { AnimationScript } from '@/types/animation'

function makeScript(stepCount: number): AnimationScript {
  return {
    algorithm: 'test',
    complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [1, 2, 3] },
    steps: Array.from({ length: stepCount }, (_, i) => ({
      stepId: i + 1,
      codeLine: 0,
      description: { zh: `步骤 ${i + 1}`, en: `Step ${i + 1}` },
      action: { type: 'highlight' as const, targets: [], color: 'primary' as const },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    })),
  }
}

describe('goToStep', () => {
  it('jumps to an arbitrary step and pauses playback', () => {
    const { result } = renderHook(() => useAnimationEngine(makeScript(10)))
    act(() => result.current.togglePlay())
    act(() => result.current.goToStep(7))
    expect(result.current.currentStep).toBe(7)
    expect(result.current.isPlaying).toBe(false)
  })

  it('clamps to [0, totalSteps]', () => {
    const { result } = renderHook(() => useAnimationEngine(makeScript(5)))
    act(() => result.current.goToStep(99))
    expect(result.current.currentStep).toBe(5)
    act(() => result.current.goToStep(-3))
    expect(result.current.currentStep).toBe(0)
  })

  it('floors non-integer input', () => {
    const { result } = renderHook(() => useAnimationEngine(makeScript(10)))
    act(() => result.current.goToStep(4.7))
    expect(result.current.currentStep).toBe(4)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/hooks/__tests__/useAnimationEngine.goToStep.test.tsx`
Expected: FAIL — `goToStep` 不存在。

- [ ] **Step 3: 实现**

`src/hooks/useAnimationEngine.ts` 在 `goToEnd` 定义之后追加:

```ts
  /** 跳转到任意步(进度条拖拽 / 步骤列表点击)。跳转即暂停,避免和自动播放打架。 */
  const goToStep = useCallback((step: number) => {
    updatePlayback((prev) => ({
      ...prev,
      isPlaying: false,
      currentStep: Math.max(0, Math.min(Math.floor(step), totalSteps)),
    }))
  }, [totalSteps, updatePlayback])
```

并把 `goToStep` 加入返回对象(`goToEnd,` 之后)。

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/hooks/__tests__/useAnimationEngine.goToStep.test.tsx`
Expected: PASS

```bash
git add src/hooks/useAnimationEngine.ts src/hooks/__tests__/useAnimationEngine.goToStep.test.tsx
git commit -m "feat(engine): goToStep 任意跳步 API"
```

### Task 1.2: 进度条可拖拽

**Files:**
- Modify: `src/components/Controls/PlaybackControls.tsx`
- Modify: `src/pages/Visualizer/index.tsx`、`src/pages/Playground/index.tsx`(传 `onSeek`)
- Test: `src/components/Controls/__tests__/PlaybackControls.seek.test.tsx`

- [ ] **Step 1: 写失败测试**

创建 `src/components/Controls/__tests__/PlaybackControls.seek.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlaybackControls from '../PlaybackControls'

const baseProps = {
  isPlaying: false,
  currentStep: 3,
  totalSteps: 10,
  speed: 1,
  onReset: () => {},
  onStepBackward: () => {},
  onTogglePlay: () => {},
  onStepForward: () => {},
  onGoToEnd: () => {},
  onSpeedChange: () => {},
}

describe('PlaybackControls seek bar', () => {
  it('renders a scrubbable slider when onSeek is provided', () => {
    const onSeek = vi.fn()
    render(<PlaybackControls {...baseProps} onSeek={onSeek} />)
    const slider = screen.getByRole('slider', { name: /progress|进度/i })
    expect(slider).toBeTruthy()
    fireEvent.change(slider, { target: { value: '7' } })
    expect(onSeek).toHaveBeenCalledWith(7)
  })

  it('slider reflects currentStep / totalSteps', () => {
    render(<PlaybackControls {...baseProps} onSeek={() => {}} />)
    const slider = screen.getByRole('slider', { name: /progress|进度/i }) as HTMLInputElement
    expect(slider.value).toBe('3')
    expect(slider.max).toBe('10')
  })

  it('falls back to the display-only bar without onSeek', () => {
    render(<PlaybackControls {...baseProps} />)
    expect(screen.queryByRole('slider', { name: /progress|进度/i })).toBeNull()
  })
})
```

注意:页面里还有速度滑杆(也是 role slider),所以测试用 aria-label 过滤——实现时进度滑杆必须带 `aria-label`。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/components/Controls/__tests__/PlaybackControls.seek.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/components/Controls/PlaybackControls.tsx`:

(a) props interface 追加:

```ts
  /** 进度条拖拽/点击跳步。不传则进度条保持纯展示(向后兼容)。 */
  onSeek?: (step: number) => void
```

(b) labels 类型与 `defaultLabels` 追加 `progress: 'Progress'`(可选字段,与现有 labels 模式一致)。

(c) 进度展示块(`~95` 行的 `<div className="h-1.5 bg-slate-100 ...">` 及其内部 fill div)替换为:

```tsx
        {onSeek ? (
          <input
            type="range"
            min={0}
            max={totalSteps}
            step={1}
            value={currentStep}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            disabled={disabled || totalSteps === 0}
            aria-label={labels.progress ?? 'Progress'}
            className="seek-bar flex-1 sm:w-28 md:w-32 max-w-48 h-1.5 cursor-pointer accent-primary"
          />
        ) : (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex-1 sm:w-28 md:w-32 max-w-48">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
```

(d) 文件底部 `<style>` 块追加滑杆轨道样式(保持与原 div 视觉一致的细轨道):

```css
        .seek-bar { -webkit-appearance:none; appearance:none; background:#F1F5F9; border-radius:9999px; outline:none; }
        .seek-bar::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:var(--color-primary,#3B82F6); border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,.25); cursor:grab; }
        .seek-bar::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:var(--color-primary,#3B82F6); border:2px solid #fff; cursor:grab; }
        .seek-bar:disabled { opacity:.45; cursor:not-allowed; }
```

(e) 两个页面接线:
- `src/pages/Visualizer/index.tsx`:从 `useAnimationEngine` 解构处追加 `goToStep`,`<PlaybackControls` 调用处追加 `onSeek={goToStep}`。
- `src/pages/Playground/index.tsx`(~81 行解构、~542 行调用):同样追加。

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/components/Controls && npx tsc --noEmit`
Expected: PASS

```bash
git add src/components/Controls/PlaybackControls.tsx src/components/Controls/__tests__/PlaybackControls.seek.test.tsx src/pages/Visualizer/index.tsx src/pages/Playground/index.tsx
git commit -m "feat(ui): 播放进度条支持拖拽与点击跳步"
```

### Task 1.3: 步骤列表面板(浏览 + 点击跳转)

**Files:**
- Create: `src/components/Controls/StepListPanel.tsx`
- Modify: `src/pages/Visualizer/index.tsx`(当前步说明块之后插入)
- Modify: `src/i18n/locales/zh.json`、`en.json`
- Test: `src/components/Controls/__tests__/StepListPanel.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StepListPanel from '../StepListPanel'
import type { AnimationStep } from '@/types/animation'

function makeSteps(n: number): AnimationStep[] {
  return Array.from({ length: n }, (_, i) => ({
    stepId: i + 1,
    codeLine: 0,
    description: { zh: `中文说明 ${i + 1}`, en: `English desc ${i + 1}` },
    action: { type: 'highlight' as const, targets: [], color: 'primary' as const },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  }))
}

describe('StepListPanel', () => {
  it('renders one row per step in the requested language', () => {
    render(<StepListPanel steps={makeSteps(5)} currentStep={2} lang="zh" onJump={() => {}} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('中文说明 3')).toBeTruthy()
  })

  it('renders English descriptions when lang="en"', () => {
    render(<StepListPanel steps={makeSteps(2)} currentStep={1} lang="en" onJump={() => {}} />)
    expect(screen.getByText('English desc 1')).toBeTruthy()
  })

  it('marks the current step row and jumps on click', () => {
    const onJump = vi.fn()
    render(<StepListPanel steps={makeSteps(5)} currentStep={2} lang="zh" onJump={onJump} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows[1].getAttribute('aria-current')).toBe('step')
    fireEvent.click(rows[4])
    expect(onJump).toHaveBeenCalledWith(5)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/components/Controls/__tests__/StepListPanel.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现**

创建 `src/components/Controls/StepListPanel.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import type { AnimationStep } from '@/types/animation'

interface StepListPanelProps {
  steps: AnimationStep[]
  /** 1-based 当前步;0 = 未开始。 */
  currentStep: number
  lang: 'zh' | 'en'
  /** 点击某行 → 跳到该步(传 1-based 步号)。 */
  onJump: (step: number) => void
  /** 面板最大高度,默认 16rem。 */
  maxHeight?: string
}

/**
 * 全部步骤说明列表:当前步高亮 + 自动滚动定位,点击任意行跳转。
 * 动画几百步时是快速定位"算法做到哪了"的主要入口,配合可拖进度条使用。
 */
export default function StepListPanel({ steps, currentStep, lang, onJump, maxHeight = '16rem' }: StepListPanelProps) {
  const currentRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' })
  }, [currentStep])

  if (steps.length === 0) return null

  return (
    <ul
      role="list"
      className="overflow-y-auto rounded-lg border border-border divide-y divide-slate-100 bg-white"
      style={{ maxHeight }}
    >
      {steps.map((step, i) => {
        const isCurrent = i === currentStep - 1
        return (
          <li
            key={step.stepId}
            ref={isCurrent ? currentRef : undefined}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => onJump(i + 1)}
            className={`flex items-start gap-2 px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
              isCurrent ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`shrink-0 font-code text-[10px] mt-0.5 w-7 text-right ${isCurrent ? 'text-blue-500 font-semibold' : 'text-slate-300'}`}>
              {step.stepId}
            </span>
            <span className="leading-relaxed">{lang === 'zh' ? step.description.zh : step.description.en}</span>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: 接入 Visualizer**

`src/pages/Visualizer/index.tsx`:

(a) import:`import StepListPanel from '@/components/Controls/StepListPanel'`

(b) 在 `{/* Current Step Description */}` 块(~802 行)的 **JSX 之后**插入:

```tsx
            {/* All Steps List */}
            {animationScript && animationScript.steps.length > 1 && (
              <div className="p-3 rounded-lg border border-border bg-surface">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">
                  {t('visualizer.stepList.title')}
                </h4>
                <StepListPanel
                  steps={animationScript.steps}
                  currentStep={currentStep}
                  lang={lang === 'zh' ? 'zh' : 'en'}
                  onJump={goToStep}
                />
              </div>
            )}
```

(c) i18n:`zh.json` 的 `visualizer` 下追加 `"stepList": { "title": "全部步骤" }`;`en.json` 对应 `"stepList": { "title": "All steps" }`。

- [ ] **Step 5: 运行确认通过 + Phase 验收 + 提交**

Run: `npx vitest run src/components/Controls src/pages && npx tsc --noEmit && npm run lint`
Expected: PASS

```bash
git add src/components/Controls/StepListPanel.tsx src/components/Controls/__tests__/StepListPanel.test.tsx src/pages/Visualizer/index.tsx src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(ui): 步骤列表面板,支持浏览全部步骤与点击跳转"
```

---

# Phase 2: 动画阶段标记(长动画章节感)

**思路:** AI 在算法进入新阶段时调用 `b.phase('建堆', 'Build heap')`,标记附着在下一个步骤上(`step.phase`)。UI 两处消费:① 步骤列表里渲染阶段分隔头;② 播放控制条显示当前阶段名。让几百步的动画有"目录"。

### Task 2.1: 类型 + builder b.phase

**Files:**
- Modify: `src/types/animation.ts`(AnimationStep)
- Modify: `src/sandbox/builder.ts`
- Test: `src/sandbox/__tests__/builderPhase.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('b.phase', () => {
  it('attaches the phase marker to the next emitted step only', () => {
    const b = new AnimationBuilder('heap_sort', 'array')
    b.phase('建堆', 'Build heap')
    b.arrayCreate([3, 1, 2])
    b.compare(0, 1)
    const script = b.build()
    expect(script.steps[0].phase).toEqual({ zh: '建堆', en: 'Build heap' })
    expect(script.steps[1].phase).toBeUndefined()
  })

  it('defaults en to zh when omitted', () => {
    const b = new AnimationBuilder('t', 'array')
    b.phase('排序')
    b.arrayCreate([1])
    expect(b.build().steps[0].phase).toEqual({ zh: '排序', en: '排序' })
  })

  it('is chainable with desc', () => {
    const b = new AnimationBuilder('t', 'array')
    b.phase('初始化', 'Init').desc('建数组', 'Create array').arrayCreate([1])
    const step = b.build().steps[0]
    expect(step.phase?.en).toBe('Init')
    expect(step.description.en).toBe('Create array')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/sandbox/__tests__/builderPhase.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

(a) `src/types/animation.ts` 的 `AnimationStep` 接口追加(`teachingState?` 之后):

```ts
  /** 阶段标记:该步开启算法的一个新阶段(如 建堆/排序)。UI 据此分段进度条与步骤列表。 */
  phase?: { zh: string; en: string }
```

(b) `src/sandbox/builder.ts`:
- 类字段(`pendingDescEn` 旁)追加 `private pendingPhase: { zh: string; en: string } | null = null`;
- `desc()` 附近追加:

```ts
  /** 标记算法进入新阶段(附着到下一个操作步骤),如 b.phase('建堆', 'Build heap')。 */
  phase(zh: string, en?: string): this { this.pendingPhase = { zh, en: en ?? zh }; return this }
```

- `add()` 正常路径构造 step 对象处,在 `events: allEvents,` 之后追加:

```ts
      ...(this.pendingPhase && { phase: this.pendingPhase }),
```

并在步骤推入后的清理区(`this.pendingDescEn = ''` 之后)追加 `this.pendingPhase = null`。截断分支(`if (this.truncated)`)的清理也追加 `this.pendingPhase = null`。

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/sandbox/__tests__/builderPhase.test.ts && npx vitest run src/sandbox`
Expected: PASS

```bash
git add src/types/animation.ts src/sandbox/builder.ts src/sandbox/__tests__/builderPhase.test.ts
git commit -m "feat(builder): b.phase 阶段标记"
```

### Task 2.2: UI 消费阶段标记

**Files:**
- Modify: `src/components/Controls/StepListPanel.tsx`(阶段分隔头)
- Modify: `src/components/Controls/PlaybackControls.tsx`(当前阶段名)
- Modify: `src/pages/Visualizer/index.tsx`、`src/pages/Playground/index.tsx`(传 currentPhase)
- Test: `src/components/Controls/__tests__/StepListPanel.test.tsx`(追加)

- [ ] **Step 1: 写失败测试**

在 `StepListPanel.test.tsx` 追加:

```tsx
it('renders a phase header row before steps that carry a phase marker', () => {
  const steps = makeSteps(4)
  steps[0] = { ...steps[0], phase: { zh: '建堆', en: 'Build heap' } }
  steps[2] = { ...steps[2], phase: { zh: '排序', en: 'Sort' } }
  render(<StepListPanel steps={steps} currentStep={1} lang="zh" onJump={() => {}} />)
  expect(screen.getByText('建堆')).toBeTruthy()
  expect(screen.getByText('排序')).toBeTruthy()
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/components/Controls/__tests__/StepListPanel.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现**

(a) `StepListPanel.tsx`:顶部 import 增加 `Fragment`(`import { Fragment, useEffect, useRef } from 'react'`),`steps.map` 整体替换为(阶段头用 `role="presentation"` 的 li,不计入 listitem 查询,保持 ul>li 合法嵌套):

```tsx
      {steps.map((step, i) => {
        const isCurrent = i === currentStep - 1
        return (
          <Fragment key={step.stepId}>
            {step.phase && (
              <li
                role="presentation"
                className="sticky top-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500"
              >
                {lang === 'zh' ? step.phase.zh : step.phase.en}
              </li>
            )}
            <li
              ref={isCurrent ? currentRef : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onJump(i + 1)}
              className={`flex items-start gap-2 px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                isCurrent ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`shrink-0 font-code text-[10px] mt-0.5 w-7 text-right ${isCurrent ? 'text-blue-500 font-semibold' : 'text-slate-300'}`}>
                {step.stepId}
              </span>
              <span className="leading-relaxed">{lang === 'zh' ? step.description.zh : step.description.en}</span>
            </li>
          </Fragment>
        )
      })}
```

(`role="presentation"` 的阶段头不带隐式 listitem 角色,Task 1.3 测试中 `getAllByRole('listitem')` 的数量断言保持 = 步骤数,不受影响。)

(b) `PlaybackControls.tsx` props 追加:

```ts
  /** 当前阶段名(由页面按 currentStep 从 steps 推导),显示在步数旁。 */
  currentPhase?: string
```

步数显示 `<span ...>{currentStep} / {totalSteps}</span>` 之前插入:

```tsx
        {currentPhase && (
          <span className="hidden sm:inline max-w-24 truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
            {currentPhase}
          </span>
        )}
```

(c) 两个页面计算并传入(以 Visualizer 为例,Playground 同样;`lang` 用页面已有的语言变量):

```ts
  const currentPhase = useMemo(() => {
    if (!animationScript || currentStep === 0) return undefined
    for (let i = Math.min(currentStep, animationScript.steps.length) - 1; i >= 0; i--) {
      const p = animationScript.steps[i].phase
      if (p) return lang === 'zh' ? p.zh : p.en
    }
    return undefined
  }, [animationScript, currentStep, lang])
```

`<PlaybackControls ... currentPhase={currentPhase} />`。

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/components/Controls && npx tsc --noEmit`
Expected: PASS

```bash
git add src/components/Controls/StepListPanel.tsx src/components/Controls/PlaybackControls.tsx src/pages/Visualizer/index.tsx src/pages/Playground/index.tsx src/components/Controls/__tests__/StepListPanel.test.tsx
git commit -m "feat(ui): 步骤列表阶段分隔头 + 播放条当前阶段名"
```

### Task 2.3: 提示词要求 AI 标记阶段

**Files:**
- Modify: `src/ai/prompt/core.ts`
- Test: `src/ai/__tests__/promptAssembly.test.ts`(追加)

- [ ] **Step 1: 写失败测试**

```ts
it('CORE_PROMPT documents b.phase', () => {
  const prompt = CORE_PROMPT('Python')
  expect(prompt).toContain('b.phase')
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/ai/__tests__/promptAssembly.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/ai/prompt/core.ts` 的 `### 通用` 小节,`b.note` 文档行之后追加:

```
- \`b.phase(中文阶段名, 'English phase')\`：算法进入**新阶段**时调用(附着到下一个操作)。例:堆排序的 '建堆'/'排序'、滑动窗口的 '扩张窗口'/'收缩窗口'、Dijkstra 的 '初始化'/'松弛迭代'。超过 ~40 步的动画**必须**划分 2~5 个阶段,让用户在进度条和步骤列表里看清算法结构;短动画可不调用
```

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/ai/__tests__/promptAssembly.test.ts`
Expected: PASS

```bash
git add src/ai/prompt/core.ts src/ai/__tests__/promptAssembly.test.ts
git commit -m "feat(ai): 提示词要求长动画调用 b.phase 划分阶段"
```

---

# Phase 3: 画布清晰度打磨

### Task 3.1: 颜色图例

**Files:**
- Create: `src/scene/ColorLegend.tsx`
- Modify: `src/scene/SceneCanvas.tsx`(画布左下角挂载)
- Modify: `src/i18n/locales/zh.json`、`en.json`
- Test: `src/scene/__tests__/ColorLegend.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ColorLegend from '../ColorLegend'
import '@/i18n'

describe('ColorLegend', () => {
  it('renders the five core semantic swatches', () => {
    render(<ColorLegend />)
    // 五个语义条目:当前/比较/完成/冲突/未处理
    expect(screen.getAllByTestId('legend-swatch')).toHaveLength(5)
  })

  it('collapses to an icon button and expands back', () => {
    render(<ColorLegend />)
    const toggle = screen.getByRole('button')
    fireEvent.click(toggle)
    expect(screen.queryAllByTestId('legend-swatch')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getAllByTestId('legend-swatch')).toHaveLength(5)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/scene/__tests__/ColorLegend.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现**

创建 `src/scene/ColorLegend.tsx`(色值直接取 `SEMANTIC_COLORS`,与画布渲染同源,永不漂移):

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SEMANTIC_COLORS } from './tokens'

const LEGEND_ITEMS = [
  { color: SEMANTIC_COLORS.primary, key: 'current' },
  { color: SEMANTIC_COLORS.compare, key: 'comparing' },
  { color: SEMANTIC_COLORS.success, key: 'done' },
  { color: SEMANTIC_COLORS.danger, key: 'conflict' },
  { color: SEMANTIC_COLORS.idle, key: 'untouched' },
] as const

/** 画布角落的语义色图例:解释 黄=比较中、绿=完成、红=交换/冲突 等,可折叠。 */
export default function ColorLegend() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-slate-200 bg-white/90 shadow-sm backdrop-blur text-[10px] text-slate-600 select-none">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('scene.legend.toggle')}
        className="flex w-full items-center gap-1 px-2 py-1 font-semibold text-slate-500 hover:text-slate-700"
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: SEMANTIC_COLORS.compare.stroke }}
        />
        {t('scene.legend.title')}
        <span className="ml-auto text-slate-300">{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 px-2 pb-1.5">
          {LEGEND_ITEMS.map(({ color, key }) => (
            <div key={key} className="flex items-center gap-1.5" data-testid="legend-swatch">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm border"
                style={{ background: color.fill, borderColor: color.stroke }}
              />
              <span>{t(`scene.legend.${key}`)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

i18n,`zh.json` 顶层追加 `scene` 命名空间(若已存在则并入):

```json
"scene": {
  "legend": {
    "title": "图例",
    "toggle": "展开/收起图例",
    "current": "当前操作",
    "comparing": "比较中",
    "done": "完成 / 命中",
    "conflict": "交换 / 冲突",
    "untouched": "未处理"
  }
}
```

`en.json`:

```json
"scene": {
  "legend": {
    "title": "Legend",
    "toggle": "Toggle legend",
    "current": "Active",
    "comparing": "Comparing",
    "done": "Done / Hit",
    "conflict": "Swap / Conflict",
    "untouched": "Untouched"
  }
}
```

- [ ] **Step 4: 挂载到画布**

`src/scene/SceneCanvas.tsx` 的 `SceneCanvasInner` 中,找到包裹 `<svg>` 的相对定位容器(带 `containerRef` 的 div),在 svg 元素之后、容器闭合前插入:

```tsx
      {!isEmpty && <ColorLegend />}
```

顶部 import:`import ColorLegend from './ColorLegend'`。确认容器有 `relative` 定位(绝对定位的 zoom 按钮已在其中,应已有;若无则补 `relative`)。

- [ ] **Step 5: 运行确认通过 + 提交**

Run: `npx vitest run src/scene && npx tsc --noEmit`
Expected: PASS

```bash
git add src/scene/ColorLegend.tsx src/scene/__tests__/ColorLegend.test.tsx src/scene/SceneCanvas.tsx src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(scene): 画布语义色图例(可折叠,与 SEMANTIC_COLORS 同源)"
```

### Task 3.2: 动作差异化节奏

**Files:**
- Modify: `src/scene/SceneCanvas.tsx`
- Test: `src/scene/__tests__/durationForStep.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { durationForStep } from '../SceneCanvas'

describe('durationForStep', () => {
  it('slows down structural motion (swap/move/insert/delete)', () => {
    expect(durationForStep(1, 'swap')).toBeGreaterThan(durationForStep(1, 'highlight'))
    expect(durationForStep(1, 'insert')).toBeGreaterThan(durationForStep(1, 'compare'))
  })
  it('speeds up annotations', () => {
    expect(durationForStep(1, 'annotate')).toBeLessThan(durationForStep(1, 'highlight'))
  })
  it('still scales with playback speed', () => {
    expect(durationForStep(4, 'swap')).toBeLessThan(durationForStep(0.5, 'swap'))
  })
  it('falls back to base duration without an action', () => {
    expect(durationForStep(1, undefined)).toBe(durationForStep(1, 'highlight'))
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/scene/__tests__/durationForStep.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

`src/scene/SceneCanvas.tsx`:

(a) `durationForSpeed` 之后追加导出函数:

```ts
/** 结构性大动作(交换/移动/插入/删除)放慢 1.35×,旁注类加快 0.7×,其余用基准时长。
 *  让"元素真的动了"的步骤看得清,纯标注步骤不拖节奏。 */
export function durationForStep(speedMultiplier: number, actionType: string | undefined): number {
  const base = durationForSpeed(speedMultiplier)
  if (actionType === 'swap' || actionType === 'move' || actionType === 'insert' || actionType === 'delete') {
    return Math.round(base * 1.35)
  }
  if (actionType === 'annotate' || actionType === 'mark') {
    return Math.round(base * 0.7)
  }
  return base
}
```

(b) `SceneCanvasInner` 中补间调用处,把:

```ts
  const scene = useSceneTransition(targetScene, durationForSpeed(speed), transitionKey)
```

改为:

```ts
  const scene = useSceneTransition(targetScene, durationForStep(speed, currentStepData?.action?.type), transitionKey)
```

(`currentStepData` 已是 SceneCanvasInner 的现有 prop,无需新增。)

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/scene && npx tsc --noEmit`
Expected: PASS

```bash
git add src/scene/SceneCanvas.tsx src/scene/__tests__/durationForStep.test.ts
git commit -m "feat(scene): 按动作类型差异化补间节奏(大动作慢、旁注快)"
```

### Task 3.3: 死代码与 lint 清理

**Files:**
- Delete: `src/scene/EventTimeline.tsx`(无任何页面引用的开发期遗留组件)
- Modify: lint warning 涉及的 3 个测试文件

- [ ] **Step 1: 确认 EventTimeline 无引用后删除**

Run: `grep -rn "EventTimeline" src --include="*.ts*" | grep -v "scene/EventTimeline"`
Expected: 仅可能出现 `src/scene/index.ts` 的导出行(若有,一并删掉该导出);无其他引用。

```bash
git rm src/scene/EventTimeline.tsx
```

若存在 `src/scene/__tests__/EventTimeline*.test.*` 一并 `git rm`;若 `src/scene/index.ts` 有导出行,删除之。

- [ ] **Step 2: 清理 4 个 lint warning**

按 `npm run lint` 输出逐个处理(均为 unused-vars,直接删除未使用的变量/导入):
- `src/hooks/__tests__/useAIGenerator.coverage.test.tsx:210` 的 `applyScript`
- `src/hooks/__tests__/useAnimationEngine.coverage.test.tsx:1` 的 `afterEach`、`beforeEach`
- `src/sandbox/__tests__/builderCoverage.test.ts:133` 的 `descOf`

- [ ] **Step 3: 验收 + 提交**

Run: `npm run lint && npx vitest run src/scene src/hooks src/sandbox && npx tsc --noEmit`
Expected: lint **0 error 0 warning**,测试全 PASS。

```bash
git add -A
git commit -m "chore: 删除死组件 EventTimeline,清零 lint warning"
```

---

# Phase 4: AI 生成质量强化

### Task 4.1: 回溯搜索树质量规则

**Files:**
- Modify: `src/ai/quality/rules/category.ts`(recursion 规则数组,~73 行)
- Test: `src/ai/quality/__tests__/searchTreeRule.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/ai/quality/__tests__/searchTreeRule.test.ts`(`buildQualityContext` 从 `../types` 导入;构造脚本的方式参照同目录既有规则测试,核心是 steps[].events):

```ts
import { describe, it, expect } from 'vitest'
import { searchTreeRule } from '../rules/category'
import { buildQualityContext } from '../types'
import type { AnimationScript } from '@/types/animation'

function scriptWithEvents(eventsPerStep: Array<Array<{ type: string } & Record<string, unknown>>>): AnimationScript {
  return {
    algorithm: 'n_queens',
    complexity: { time: { best: 'O(n!)', average: 'O(n!)', worst: 'O(n!)' }, space: 'O(n)' },
    initialState: { type: 'array', data: [] },
    steps: eventsPerStep.map((events, i) => ({
      stepId: i + 1,
      codeLine: 0,
      description: { zh: 's', en: 's' },
      action: { type: 'highlight' as const, targets: [], color: 'primary' as const },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: events as never,
    })),
  }
}

const BACKTRACK_CODE = 'def solve(board):\n    # backtrack\n    pass'

describe('searchTreeRule', () => {
  it('flags backtracking scripts that drive the call stack but never build a search tree', () => {
    const script = scriptWithEvents([
      [{ type: 'callstack.create' }],
      [{ type: 'callstack.push', frame: { functionName: '回溯' } }],
      [{ type: 'callstack.pop' }],
    ])
    const ctx = buildQualityContext(script, 'recursion', BACKTRACK_CODE)
    const issues = searchTreeRule.check(ctx)
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('recursion.missing-search-tree')
    expect(issues[0].severity).toBe('error')
  })

  it('passes when tree events are present', () => {
    const script = scriptWithEvents([
      [{ type: 'callstack.create' }],
      [{ type: 'tree.create', variant: 'binary', rootId: 'st_0', nodes: [{ id: 'st_0', value: '根' }], edges: [] }],
      [{ type: 'callstack.push', frame: { functionName: '回溯' } }],
      [{ type: 'tree.insert', parentId: 'st_0', node: { id: 'st_1', value: 'x' } }],
    ])
    const ctx = buildQualityContext(script, 'recursion', BACKTRACK_CODE)
    expect(searchTreeRule.check(ctx)).toHaveLength(0)
  })

  it('does not fire for non-backtracking recursion (e.g. plain tree DFS)', () => {
    const script = scriptWithEvents([
      [{ type: 'callstack.create' }],
      [{ type: 'callstack.push', frame: { functionName: '深度搜索' } }],
    ])
    const ctx = buildQualityContext(script, 'recursion', 'def dfs(root):\n    if not root: return\n    dfs(root.left)')
    expect(searchTreeRule.check(ctx)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/ai/quality/__tests__/searchTreeRule.test.ts`
Expected: FAIL — `searchTreeRule` 未导出。

- [ ] **Step 3: 实现**

`src/ai/quality/rules/category.ts`:

(a) 文件中(其他规则定义旁)新增并导出:

```ts
/** 回溯特征:算法名或源代码命中任一关键词即视为回溯/枚举类。 */
const BACKTRACK_PATTERN = /backtrack|回溯|n_?queens?|sudoku|数独|permut|combin|subset|全排列|组合|子集/i

/**
 * recursion.missing-search-tree(error):回溯类算法驱动了调用栈,
 * 但从未构建搜索树(无 tree.* 事件)。调用栈只能展示"当前路径",
 * 搜索空间的形状与剪枝位置必须靠搜索树呈现(b.searchRoot/searchTry)。
 */
export const searchTreeRule: QualityRule = {
  id: 'recursion.missing-search-tree',
  appliesTo: ['recursion'],
  check(ctx) {
    const hay = `${ctx.script.algorithm ?? ''}\n${ctx.sourceCode ?? ''}`
    if (!BACKTRACK_PATTERN.test(hay)) return []
    let hasCallstackPush = false
    let hasTreeEvent = false
    for (const step of ctx.script.steps ?? []) {
      for (const ev of step.events ?? []) {
        if (ev.type === 'callstack.push') hasCallstackPush = true
        if (ev.type.startsWith('tree.')) hasTreeEvent = true
      }
    }
    if (!hasCallstackPush || hasTreeEvent) return []
    return [{
      code: 'recursion.missing-search-tree',
      severity: 'error',
      message: '回溯算法只画了调用栈,没有搜索树:用户看不到搜索空间形状与剪枝发生的位置。',
      hint: '在调用栈之外补建搜索树:第一步 b.searchRoot(初始状态标签);每次做选择 const id = b.searchTry(父节点id, 选择标签);冲突/剪枝 b.searchFail(id);撤销 b.searchBack(id);到达解 b.searchOk(id)。只展开前 2~4 层代表性分支。',
    }]
  },
}
```

(`QualityRule`/`QualityIssue` 类型与文件内既有规则一致;若 `appliesTo` 字段不在 `QualityRule` 类型上则去掉该字段——它已通过 CATEGORY_RULES.recursion 限定类别。)

(b) `CATEGORY_RULES` 的 `recursion: [...]` 数组中追加 `searchTreeRule`。

- [ ] **Step 4: 运行确认通过 + 提交**

Run: `npx vitest run src/ai/quality && npx tsc --noEmit`
Expected: PASS

```bash
git add src/ai/quality/rules/category.ts src/ai/quality/__tests__/searchTreeRule.test.ts
git commit -m "feat(quality): 回溯算法缺搜索树时质量门拦截并回修"
```

### Task 4.2: 输入变化后重校验(JS 真值)

**思路:** `generator` state 从 `{ body, type }` 扩为 `{ body, type, verify?: { language, userCode } }`。live-regen 重生成成功后,对 JS 代码再跑一次 `verifyAndTag`——**只用真值执行,不用 @expect**(@expect 只对样例输入成立,换输入后比对它必然误报)。

**Files:**
- Modify: `src/hooks/useAIGenerator.ts`
- Test: `src/hooks/__tests__/useAIGenerator.verify.test.ts`(追加)

- [ ] **Step 1: 写失败测试**

在 `useAIGenerator.verify.test.ts` 追加(验证 verifyAndTag 在 expectRaw 缺失时只走 js-exec):

```ts
describe('verifyAndTag for live-regen (no @expect)', () => {
  it('verifies via JS ground truth alone when expectRaw is omitted', async () => {
    const script = scriptWithResult(9)
    const userCode = 'function add(nums, target) { return nums[0] + target }'
    const outcome = await verifyAndTag(script, {
      language: 'javascript', userCode, input: { nums: [5], target: 4 }, sourceCode: userCode,
    })
    expect(outcome.status).toBe('pass')
    expect(script.verification?.source).toBe('js-exec')
  })

  it('tags skipped (not fail) for non-JS code without expectRaw', async () => {
    const script = scriptWithResult(9)
    const outcome = await verifyAndTag(script, {
      language: 'python', userCode: 'def f(): pass', input: [], sourceCode: 'def f(): pass',
    })
    expect(outcome.status).toBe('skipped')
  })
})
```

- [ ] **Step 2: 运行确认**

Run: `npx vitest run src/hooks/__tests__/useAIGenerator.verify.test.ts`
Expected: 这两条可能直接 PASS(verifyAndTag 已支持 expectRaw 缺省)——若 PASS 说明纯函数层无需改动,直接进 Step 3 接线。

- [ ] **Step 3: 实现接线**

`src/hooks/useAIGenerator.ts`:

(a) `generator` state 类型扩展(两处:`useState` 泛型与 `UseAIGeneratorReturn.generator` 类型):

```ts
  { body: string; type: GeneratorType; verify?: { language: string; userCode: string } }
```

(b) `analyze` 内所有 `setGenerator({ body: ..., type: genType })` 调用(共 3 处:初次、运行期修复后、质量门修复后、校验修复后——逐一搜索 `setGenerator({`)统一改为携带 verify:

```ts
  setGenerator({ body: <对应body>, type: genType, verify: { language: params.language, userCode: params.code } })
```

(c) live-regen effect 的 `generator` 分支,`if (result.ok && result.script)` 内,`applyScriptRef.current(result.script)` **之前**插入:

```ts
        if (generator.verify) {
          await verifyAndTag(result.script, {
            language: generator.verify.language,
            userCode: generator.verify.userCode,
            input: parsed.value,
            sourceCode: generator.verify.userCode,
            // 不传 expectRaw:@expect 只对样例输入成立,输入已变化
          })
        }
```

(d) `setLive` 的 generator 分支签名同步放宽(`{ generator: { body, type, verify? } }`),透传即可。

- [ ] **Step 4: 验收 + 提交**

Run: `npx vitest run src/hooks && npx tsc --noEmit`
Expected: PASS

```bash
git add src/hooks/useAIGenerator.ts src/hooks/__tests__/useAIGenerator.verify.test.ts
git commit -m "feat(ai): 输入变化重生成后用 JS 真值重校验动画"
```

### Task 4.3: 校验状态徽标(三态可见)

**思路:** 把"动画校验过没有、用什么校验的"做成始终可见的小徽标:**pass** 绿色(区分 真实执行/AI 推演 两档强度)、**skipped** 中性灰(带原因)、**fail** 维持现有醒目警示条。

**Files:**
- Modify: `src/pages/Visualizer/VerificationNotice.tsx`
- Modify: `src/i18n/locales/zh.json`、`en.json`
- Test: `src/pages/Visualizer/__tests__/VerificationNotice.test.tsx`(改造)

- [ ] **Step 1: 改写测试**

`VerificationNotice.test.tsx` 中 `renders nothing when verification passed` 用例**替换**为:

```tsx
  it('shows a green badge with source strength on pass', () => {
    render(<VerificationNotice verification={{ status: 'pass', source: 'js-exec' }} />)
    const badge = screen.getByRole('status')
    expect(badge.textContent).toMatch(/真实执行|real execution/i)
  })

  it('shows a neutral badge with the reason on skipped', () => {
    render(<VerificationNotice verification={{ status: 'skipped', message: '生成器未调用 b.result,无法比对' }} />)
    expect(screen.getByRole('status').textContent).toContain('b.result')
  })
```

保留 `renders nothing when verification is absent` 与 fail 用例不变。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/pages/Visualizer/__tests__/VerificationNotice.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现**

`VerificationNotice.tsx` 整体替换为:

```tsx
import { useTranslation } from 'react-i18next'
import type { AnimationScript } from '@/types/animation'

interface VerificationNoticeProps {
  verification: AnimationScript['verification']
}

/** AI 动画一致性校验状态:fail 醒目警示;pass 绿色徽标(区分校验强度);skipped 中性灰。 */
export function VerificationNotice({ verification }: VerificationNoticeProps) {
  const { t } = useTranslation()
  if (!verification) return null

  if (verification.status === 'fail') {
    return (
      <div
        role="alert"
        className="mx-3 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed bg-amber-50 border border-amber-300 text-amber-800"
      >
        <span className="font-semibold">{t('visualizer.verification.failTitle')}</span>
        <span className="ml-1">
          {t('visualizer.verification.failDetail', {
            expected: verification.expected ?? '?',
            actual: verification.actual ?? '?',
          })}
        </span>
      </div>
    )
  }

  if (verification.status === 'pass') {
    return (
      <div role="status" className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
        <span aria-hidden>✓</span>
        {verification.source === 'js-exec'
          ? t('visualizer.verification.passExec')
          : t('visualizer.verification.passExpect')}
      </div>
    )
  }

  return (
    <div role="status" className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[10px] text-slate-500">
      {t('visualizer.verification.skipped', { reason: verification.message ?? '' })}
    </div>
  )
}
```

i18n,`zh.json` 的 `visualizer.verification` 追加:

```json
"passExec": "已通过一致性校验(真实执行原代码比对)",
"passExpect": "已通过一致性校验(AI 推演结果比对)",
"skipped": "未校验:{{reason}}"
```

`en.json`:

```json
"passExec": "Consistency check passed (verified by executing your code)",
"passExpect": "Consistency check passed (verified against AI-derived expectation)",
"skipped": "Not verified: {{reason}}"
```

- [ ] **Step 4: 验收 + 提交**

Run: `npx vitest run src/pages/Visualizer && npx tsc --noEmit`
Expected: PASS

```bash
git add src/pages/Visualizer/VerificationNotice.tsx src/pages/Visualizer/__tests__/VerificationNotice.test.tsx src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(ui): 校验状态三态徽标(pass/skipped/fail + 校验强度)"
```

---

# Phase 5: Python 真值执行(Pyodide,可选增强)

**取舍说明:** Python 大概率是自定义代码的主力语言,目前只能靠 @expect(AI 自报,弱)。Pyodide 提供浏览器内真实执行,代价是首次 ~6-10MB CDN 下载。设计原则:**懒加载**(首次校验 Python 代码时才加载)、**单例复用**(Worker 常驻,加载一次反复用)、**静默降级**(加载失败/超时 → 自动落回 @expect 路径,绝不阻塞动画展示)。

### Task 5.1: runUserPython 模块

**Files:**
- Create: `src/sandbox/runUserPython.ts`
- Create: `src/sandbox/pythonWorker.ts`
- Test: `src/sandbox/__tests__/runUserPython.test.ts`

- [ ] **Step 1: 写失败测试**

纯函数部分可测(入口推断与调用源码拼装);真实 Pyodide 执行依赖网络,测试只覆盖到"无 Worker 环境直接返回不可用",不 mock Pyodide:

```ts
import { describe, it, expect } from 'vitest'
import { buildPyCallSource, runUserPySandboxed } from '../runUserPython'

describe('buildPyCallSource', () => {
  it('builds a json-printing call for def with named-object input', () => {
    const code = 'def two_sum(nums, target):\n    return [0, 1]'
    const src = buildPyCallSource(code, { nums: [2, 7], target: 9 })
    expect(src).toContain('two_sum([2, 7], 9)')
    expect(src).toContain('json.dumps')
  })
  it('passes bare array input as a single argument', () => {
    const src = buildPyCallSource('def sort_arr(nums):\n    return sorted(nums)', [3, 1, 2])
    expect(src).toContain('sort_arr([3, 1, 2])')
  })
  it('returns null without a def', () => {
    expect(buildPyCallSource('x = 1', [1])).toBeNull()
  })
  it('serializes nested structures and booleans as Python literals', () => {
    const src = buildPyCallSource('def f(grid, flag):\n    return 1', { grid: [[1, 0], [0, 1]], flag: true })
    expect(src).toContain('f([[1, 0], [0, 1]], True)')
  })
})

describe('runUserPySandboxed', () => {
  it('reports unavailable in environments without Worker (no crash, graceful skip)', async () => {
    const result = await runUserPySandboxed('def f(x):\n    return x', [1])
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/sandbox/__tests__/runUserPython.test.ts`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现 Worker**

创建 `src/sandbox/pythonWorker.ts`:

```ts
/**
 * Pyodide 常驻 Worker:首条消息触发 CDN 加载(一次),之后复用实例执行。
 * 任何阶段失败都回发 { ok:false },由调用方降级到 @expect 路径。
 */
export interface PyRequest { source: string }
export interface PyResult { ok: boolean; value?: unknown; error?: string }

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'

interface PyodideLike {
  runPythonAsync: (code: string) => Promise<unknown>
}

let pyodidePromise: Promise<PyodideLike> | null = null

function ensurePyodide(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      // 经典 worker 注入:importScripts 同步加载 CDN 脚本
      ;(self as unknown as { importScripts: (url: string) => void }).importScripts(PYODIDE_URL)
      const loadPyodide = (self as unknown as { loadPyodide: (opts: { indexURL: string }) => Promise<PyodideLike> }).loadPyodide
      return loadPyodide({ indexURL: PYODIDE_URL.replace(/\/pyodide\.js$/, '/') })
    })()
  }
  return pyodidePromise
}

self.onmessage = async (ev: MessageEvent<PyRequest>) => {
  const post = (r: PyResult) => (self as unknown as Worker).postMessage(r)
  try {
    const py = await ensurePyodide()
    const raw = await py.runPythonAsync(ev.data.source)
    // source 末尾是 json.dumps(...),返回 JSON 字符串
    post({ ok: true, value: typeof raw === 'string' ? JSON.parse(raw) : raw })
  } catch (e) {
    post({ ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
```

- [ ] **Step 4: 实现入口模块**

创建 `src/sandbox/runUserPython.ts`:

```ts
export interface PyExecResult { ok: boolean; value?: unknown; error?: string }

/** JS 值 → Python 字面量(true→True、null→None,数组/对象递归)。 */
function toPyLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(toPyLiteral).join(', ')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${JSON.stringify(k)}: ${toPyLiteral(v)}`)
    return `{${entries.join(', ')}}`
  }
  return 'None'
}

/**
 * 从 Python 代码中找第一个 def 作为入口,拼出"定义 + 调用 + json 序列化输出"。
 * 入参派发规则与 JS 版一致:对象且形参名全命中 → 按形参顺序;否则整体作为唯一实参。
 * 找不到 def 返回 null。
 */
export function buildPyCallSource(userCode: string, input: unknown): string | null {
  const match = userCode.match(/def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/)
  if (!match) return null
  const name = match[1]
  const params = match[2]
    .split(',')
    .map(p => p.trim().split(/[=:\s]/)[0])
    .filter(p => p && p !== 'self')

  let args: unknown[]
  if (
    input !== null && typeof input === 'object' && !Array.isArray(input) &&
    params.length > 0 && params.every(p => p in (input as Record<string, unknown>))
  ) {
    args = params.map(p => (input as Record<string, unknown>)[p])
  } else {
    args = [input]
  }
  const argSource = args.map(toPyLiteral).join(', ')
  return `import json\n${userCode}\njson.dumps(${name}(${argSource}))`
}

let workerSingleton: Worker | null = null
let firstCallDone = false

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!workerSingleton) {
    try {
      workerSingleton = new Worker(new URL('./pythonWorker.ts', import.meta.url))
    } catch {
      return null
    }
  }
  return workerSingleton
}

/**
 * 在常驻 Pyodide Worker 中真实执行用户 Python 函数。
 * 首次调用含 CDN 加载,超时放宽到 25s;后续调用 8s。
 * 失败(无 Worker / 加载失败 / 超时 / 运行错误)一律 { ok:false },调用方静默降级。
 */
export function runUserPySandboxed(userCode: string, input: unknown): Promise<PyExecResult> {
  const source = buildPyCallSource(userCode, input)
  if (!source) return Promise.resolve({ ok: false, error: '未找到可调用的 def 入口' })

  const worker = getWorker()
  if (!worker) return Promise.resolve({ ok: false, error: 'Worker 不可用' })

  const isFirstCall = !firstCallDone
  const timeoutMs = isFirstCall ? 25000 : 8000

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup()
      // 超时后实例状态不可信,废弃单例,下次重建
      workerSingleton?.terminate()
      workerSingleton = null
      resolve({ ok: false, error: `Python 执行超时(>${timeoutMs}ms)` })
    }, timeoutMs)

    const onMessage = (ev: MessageEvent<PyExecResult>) => {
      cleanup()
      firstCallDone = true
      resolve(ev.data)
    }
    const onError = () => {
      cleanup()
      workerSingleton?.terminate()
      workerSingleton = null
      resolve({ ok: false, error: 'Python Worker 崩溃' })
    }
    const cleanup = () => {
      clearTimeout(timer)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ source })
  })
}
```

注意:Worker 用经典模式(`importScripts` 在 module worker 不可用),Vite 配置若强制 module worker,改用 `new Worker(new URL('./pythonWorker.ts', import.meta.url), { type: 'classic' })` 并验证构建产物;若 Vite 版本不支持经典 worker 打包,降级方案是把 pyodide 加载改为 worker 内 `await import(/* @vite-ignore */ PYODIDE_MJS_URL)`(CDN 的 `pyodide.mjs`)——实现时取一即可,验收标准是 Step 6 的手工验证。

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/sandbox/__tests__/runUserPython.test.ts`
Expected: PASS(jsdom 无 Worker → unavailable 路径)。

- [ ] **Step 6: verifyAndTag 接入 Python 分支**

`src/hooks/useAIGenerator.ts` 的 `verifyAndTag` 中,JS 分支之后追加:

```ts
  if (!outcome && args.language.toLowerCase() === 'python') {
    const truth = await runUserPySandboxed(args.userCode, args.input)
    if (truth.ok) {
      outcome = verifyAgainstGroundTruth(script, truth.value)
      if (outcome.status !== 'skipped') outcome = { ...outcome, source: 'py-exec' }
    }
  }
```

同步:
- `src/ai/verify.ts` 的 `VerifyOutcome.source` 与 `src/types/animation.ts` 的 `verification.source` 类型均扩为 `'expect' | 'js-exec' | 'py-exec'`;
- `VerificationNotice.tsx` 的 pass 分支条件改为 `verification.source === 'js-exec' || verification.source === 'py-exec'` 时显示 `passExec`;
- import:`import { runUserPySandboxed } from '@/sandbox/runUserPython'`。

- [ ] **Step 7: 手工验证(需联网)**

Run: `npm run dev`,在 Visualizer 输入一段 Python 算法(如两数之和),点 AI 分析。
Expected: 首次校验有数秒 Pyodide 加载延迟,随后出现绿色「真实执行」徽标;断网重试时静默落回 @expect 徽标,动画正常展示。

- [ ] **Step 8: 全量验收 + 提交**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: PASS

```bash
git add src/sandbox/runUserPython.ts src/sandbox/pythonWorker.ts src/sandbox/__tests__/runUserPython.test.ts src/hooks/useAIGenerator.ts src/ai/verify.ts src/types/animation.ts src/pages/Visualizer/VerificationNotice.tsx
git commit -m "feat(sandbox): Pyodide 懒加载真值执行,Python 代码也走真实校验"
```

---

# Phase 6: Visualizer 拆分(纯重构,行为零变化)

**原则:** 只移动代码,不改任何行为;每抽一个组件跑一次全量测试;现有测试全程保持绿色即验收标准。目标把 `src/pages/Visualizer/index.tsx` 从 ~900 行降到 ~450 行以下。

### Task 6.1: 抽出右侧信息面板

**Files:**
- Create: `src/pages/Visualizer/InfoPanel.tsx`
- Modify: `src/pages/Visualizer/index.tsx`

- [ ] **Step 1: 圈定移动范围**

右栏的连续 JSX 块(复杂度卡片、当前步说明、步骤列表、渲染引擎徽章、场景统计/诊断)整体移入 `InfoPanel.tsx`。props 按实际依赖列全(预计:`animationScript`、`currentStep`、`currentStepData`、`goToStep`、`lang`、`complexity`、`isSceneEngineActive`、`sceneEventStats`、`sceneDiagnosticSummary`、`t`——以实际引用为准,**用 TypeScript 报错驱动补全 props,不要凭记忆**)。

- [ ] **Step 2: 移动 + 替换调用点**

`index.tsx` 原位置替换为 `<InfoPanel {...props} />`。不改任何样式与逻辑。

- [ ] **Step 3: 验收 + 提交**

Run: `npx vitest run src/pages && npx tsc --noEmit && npm run lint`
Expected: 全 PASS,零行为变化。

```bash
git add src/pages/Visualizer/InfoPanel.tsx src/pages/Visualizer/index.tsx
git commit -m "refactor(visualizer): 右侧信息面板抽出为 InfoPanel"
```

### Task 6.2: 抽出代码作用域状态 hook

**Files:**
- Create: `src/pages/Visualizer/useCodeScope.ts`
- Modify: `src/pages/Visualizer/index.tsx`

- [ ] **Step 1: 移动逻辑**

把 `codeByScope`/`codeScopeKey`/`defaultCode`/`code`/`setCode`/`isCodeDirty` 这组状态与推导(index.tsx ~126-160 行)整体移入:

```ts
import { useState, useCallback } from 'react'

/** 代码编辑器的按作用域(算法+操作+语言)状态:模板推导、用户编辑、脱钩检测。 */
export function useCodeScope(args: {
  scopeKey: string
  defaultCode: string
}) {
  const [codeByScope, setCodeByScope] = useState<Record<string, string>>({})
  const code = codeByScope[args.scopeKey] ?? args.defaultCode
  const setCode = useCallback((nextValue: string) => {
    setCodeByScope((prev) =>
      prev[args.scopeKey] === nextValue ? prev : { ...prev, [args.scopeKey]: nextValue }
    )
  }, [args.scopeKey])
  const isCodeDirty = codeByScope[args.scopeKey] !== undefined && codeByScope[args.scopeKey] !== args.defaultCode
  return { code, setCode, isCodeDirty }
}
```

(`defaultCode`/`scopeKey` 的推导留在 index.tsx——它们依赖页面级状态;若原实现还有本 hook 未覆盖的分支,以原行为为准照搬,**不要顺手"优化"**。)

- [ ] **Step 2: 验收 + 提交**

Run: `npx vitest run src/pages && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 全 PASS。

```bash
git add src/pages/Visualizer/useCodeScope.ts src/pages/Visualizer/index.tsx
git commit -m "refactor(visualizer): 代码作用域状态抽出为 useCodeScope"
```

---

## 明确不做(Out of Scope)

- **一切教学交互**:预测问答、算法对比、伪代码面板、复杂度增长曲线、断点——用户明确排除。
- **画布内文本双语**(scene.note/调用栈帧名/区域标题):涉及事件协议改造,与本轮"清晰美观"目标正交。
- **swap 弧线/滚轮缩放/viewBox 自适应**:已存在,勿重做。
- **C++/Java 真值执行**:无浏览器内可行运行时,维持 @expect。
- **步骤列表虚拟滚动**:MAX_STEPS=600 封顶,普通渲染足够;不引入虚拟列表库。
- **Hot 100 题库扩充**:与动画质量无关。

## 风险与回归关注点

1. **P2 改 builder 步骤对象结构**(新增可选 phase 字段):序列化/快照类测试可能需更新断言;`AnimationStep` 是宽接口,风险低。
2. **P3.2 改补间时长**:`useSceneTransition` 的时长变化会影响视觉节奏类测试(若有);durationForStep 是纯函数已单测,集成层只改一行。
3. **P4.2 generator state 形状变化**:历史记录恢复(`setLive`)路径必须兼容无 `verify` 字段的旧条目——可选字段天然兼容,但要确认 `AIHistoryEntry` 持久化的 generatorBody/generatorType 恢复路径没有结构断言。
4. **P5 Vite worker 打包模式**:经典 worker + importScripts 在部分 Vite 版本需显式 `{ type: 'classic' }`;Step 4 给了备选方案,以 Step 7 手工验证为准。**P5 整体可选**,若 worker 打包受阻可整相跳过,不影响其他 Phase。
5. **P6 纯重构**:全程依赖现有测试护栏;每个 Task 单独提交,出问题可单独回滚。
6. **新测试文件必须显式 import vitest API**(教训来自上一轮)。

## 任务依赖与建议顺序

```
Task 0 ─→ P1(1.1→1.2→1.3)          播放导航,用户感知最强,先做
       ├→ P2(2.1→2.2→2.3)          依赖 P1.3 的 StepListPanel
       ├→ P3(3.1 / 3.2 / 3.3 互独立)
       ├→ P4(4.1 / 4.2→4.3)
       ├→ P5(5.1,可选,依赖 P4.3 的徽标文案)
       └→ P6(6.1→6.2,最后做——等界面改动都落定再拆)
```

串行推荐:**P1 → P2 → P3 → P4 → P5(可选)→ P6**。P2 依赖 P1.3,P5 依赖 P4.3,其余可并行;但 P1/P2/P6 都动 Visualizer/index.tsx 与 PlaybackControls,并行派发时注意文件冲突。
