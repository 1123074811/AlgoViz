# Phase A Overlay Integration Status

This note records the current implementation state for Phase A of the animation foundation work.

## Current Status

Phase A is now integrated into the Scene Engine at the TypeScript level.

Implemented overlay families:

- CallStack
- DPTable
- Grid

Shared integration points are wired through:

- `src/scene/types.ts`
- `src/scene/commandTypes.ts`
- `src/scene/eventTypes.ts`
- `src/scene/eventCompiler.ts`
- `src/scene/SceneEngine.ts`
- `src/scene/SceneCanvas.tsx`
- `src/sandbox/builder.ts`

Verification:

- `npx tsc --noEmit` passes.
- `npm run build` and Vitest currently fail during Vite/Vitest config loading because Vite 8 calls `exec("net use")` internally on Windows and the sandbox rejects that child process with `spawn EPERM`. TypeScript completes before that Vite step.

## Completed Slices

### CallStack

Files:

- `src/scene/overlays/callStackTypes.ts`
- `src/scene/compilers/callStackCompiler.ts`
- `src/scene/primitives/CallStackView.tsx`
- `src/scene/compilers/__tests__/callStackCompiler.test.ts`

Supported events:

- `callstack.create`
- `callstack.push`
- `callstack.update`
- `callstack.return`
- `callstack.pop`
- `callstack.highlight`

Command shape:

- `overlay.callstack.set`
- `overlay.callstack.patch`

### DPTable

Files:

- `src/scene/overlays/dpTypes.ts`
- `src/scene/compilers/dpCompiler.ts`
- `src/scene/primitives/DPTableView.tsx`
- `src/scene/compilers/__tests__/dpCompiler.test.ts`

Supported events:

- `dp.create`
- `dp.set`
- `dp.highlight`
- `dp.dependency`
- `dp.formula`
- `dp.traceback`
- `dp.roll`

Command shape:

- `dp-table.model`

### Grid

Files:

- `src/scene/overlays/gridTypes.ts`
- `src/scene/compilers/gridCompiler.ts`
- `src/scene/primitives/GridView.tsx`
- `src/scene/compilers/__tests__/gridCompiler.test.ts`

Supported events:

- `grid.create`
- `grid.set_cell`
- `grid.visit`
- `grid.frontier`
- `grid.path`
- `grid.wall`
- `grid.weight`
- `grid.arrow`

Command shape:

- `grid.model`

## Shared Overlay Layer

Files:

- `src/scene/overlays/index.ts`
- `src/scene/overlays/overlayCompiler.ts`
- `src/scene/overlays/AlgorithmOverlays.tsx`

Responsibilities:

- Export overlay event and command unions.
- Detect overlay events with `isAlgorithmOverlayEvent`.
- Compile CallStack, DPTable, and Grid events to overlay commands.
- Render all active overlays above the SVG scene through `AlgorithmOverlays`.

## Scene Engine Integration

The shared scene state now supports:

```ts
scene.overlays = {
  callStack,
  dpTables,
  grids,
}
```

The shared scene command union now includes:

- `CallStackSceneCommand`
- `DPOverlayCommand`
- `GridSceneCommand`

`eventCompiler.ts` routes `callstack.*`, `dp.*`, and `grid.*` events before the existing compiler registry.

`SceneEngine.ts` applies overlay commands into `scene.overlays` and clones overlay state in snapshots.

`SceneCanvas.tsx` renders:

```tsx
<AlgorithmOverlays overlays={scene.overlays} />
```

## Builder APIs

`AnimationBuilder` now includes:

- `callStackCreate`
- `callPush`
- `callUpdate`
- `callReturn`
- `callPop`
- `callHighlight`
- `gridCreate`
- `gridSet`
- `gridVisit`
- `gridFrontier`
- `gridPath`
- `gridWall`
- `gridWeight`
- `gridArrow`
- `dpCreate`
- `dpSet`
- `dpHighlight`
- `dpDependency`
- `dpFormula`
- `dpTraceback`

## Remaining Verification

Run these outside the restricted sandbox or after allowing Vite's Windows child-process lookup:

```bash
npm run build
npm test -- --run src/scene/compilers/__tests__/callStackCompiler.test.ts src/scene/compilers/__tests__/dpCompiler.test.ts src/scene/compilers/__tests__/gridCompiler.test.ts
```

Known blocker in the current sandbox:

```text
[plugin externalize-deps] Error: spawn EPERM
```

The failure occurs while Vite/Vitest loads config, inside Vite's Windows safe realpath path that calls `exec("net use")`.
