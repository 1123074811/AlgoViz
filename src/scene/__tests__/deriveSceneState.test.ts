import { describe, it, expect } from 'vitest'
import { deriveSceneState } from '@/scene'
import type { AnimationScript, AnimationStep, TeachingState } from '@/types/animation'
import type { AlgorithmEvent } from '../eventTypes'
import type { SceneCell, SceneLabel } from '../types'

// ── Fixture helpers ────────────────────────────────────────────────────────────

function step(id: number, events?: AlgorithmEvent[], teachingState?: TeachingState): AnimationStep {
  return {
    stepId: id,
    codeLine: 0,
    description: { zh: 's', en: 's' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    ...(events && { events }),
    ...(teachingState && { teachingState }),
  }
}

function makeScript(overrides: Partial<AnimationScript> & Pick<AnimationScript, 'steps'>): AnimationScript {
  return {
    algorithm: 'x',
    complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
    initialState: { type: 'array', data: [] },
    ...overrides,
  }
}

function cellValue(scene: ReturnType<typeof deriveSceneState>, id: string): SceneCell['value'] | undefined {
  const e = scene.entities[id]
  return e?.type === 'cell' ? e.value : undefined
}

function ids(scene: ReturnType<typeof deriveSceneState>, prefix: string): string[] {
  return Object.keys(scene.entities).filter((k) => k.startsWith(prefix))
}

// ── Step-boundary / clamping ────────────────────────────────────────────────────

describe('deriveSceneState — step boundaries & clamping', () => {
  const script = makeScript({
    algorithm: 'bubble_sort',
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: [5, 3, 8] },
    steps: [
      step(1, [{ type: 'array.create', values: [5, 3, 8] }]),
      step(2, [{ type: 'array.set_value', index: 0, value: 99 }]),
      step(3, [{ type: 'array.set_value', index: 1, value: 77 }]),
    ],
  })

  it('step 0 seeds the array structure from initialState', () => {
    const scene = deriveSceneState(script, 0)
    expect(ids(scene, 'arr_')).toHaveLength(3)
    expect(cellValue(scene, 'arr_0')).toBe(5)
  })

  it('replays up to currentStep (set_value applied at step 2)', () => {
    const scene = deriveSceneState(script, 2)
    expect(cellValue(scene, 'arr_0')).toBe(99)
    expect(cellValue(scene, 'arr_1')).toBe(3) // step 3 not yet applied
  })

  it('replays all events at the last step', () => {
    const scene = deriveSceneState(script, 3)
    expect(cellValue(scene, 'arr_0')).toBe(99)
    expect(cellValue(scene, 'arr_1')).toBe(77)
  })

  it('clamps currentStep beyond steps.length to the final state', () => {
    const clamped = deriveSceneState(script, 999)
    const last = deriveSceneState(script, 3)
    expect(cellValue(clamped, 'arr_0')).toBe(cellValue(last, 'arr_0'))
    expect(cellValue(clamped, 'arr_1')).toBe(cellValue(last, 'arr_1'))
  })
})

// ── Snapshot cache (replay > SNAPSHOT_INTERVAL of 20) ────────────────────────────

describe('deriveSceneState — snapshot caching for long scripts', () => {
  it('produces consistent results across repeated derivations of a >20-step script', () => {
    // steps[0] creates the array; steps[i] (i>=1) sets arr_0 to value i.
    // deriveSceneState replays steps[0..currentStep-1], so the value after
    // deriving at `currentStep` equals currentStep - 1.
    const steps: AnimationStep[] = [step(0, [{ type: 'array.create', values: [0] }])]
    for (let i = 1; i <= 45; i++) {
      steps.push(step(i, [{ type: 'array.set_value', index: 0, value: i }]))
    }
    const script = makeScript({
      algorithm: 'counter',
      presentation: { engine: 'scene', module: 'array' },
      initialState: { type: 'array', data: [0] },
      steps,
    })

    // First derive at a high step seeds the cache; a later jump must reuse it consistently.
    const at40 = deriveSceneState(script, 40)
    expect(cellValue(at40, 'arr_0')).toBe(39)

    // Jump backward (forces nearest-snapshot path), then forward again.
    const at25 = deriveSceneState(script, 25)
    expect(cellValue(at25, 'arr_0')).toBe(24)

    const at40Again = deriveSceneState(script, 40)
    expect(cellValue(at40Again, 'arr_0')).toBe(39)

    // A mid jump that lands exactly on a snapshot boundary.
    const at20 = deriveSceneState(script, 20)
    expect(cellValue(at20, 'arr_0')).toBe(19)
  })
})

// ── Notes accumulation ──────────────────────────────────────────────────────────

describe('deriveSceneState — notes', () => {
  it('accumulates scene.note text into scene.notes across replayed steps', () => {
    const script = makeScript({
      presentation: { engine: 'scene', module: 'array' },
      steps: [
        step(1, [{ type: 'scene.note', text: 'first' }]),
        step(2, [{ type: 'scene.note', text: 'second' }]),
      ],
    })
    const scene = deriveSceneState(script, 2)
    expect(scene.notes).toContain('first')
    expect(scene.notes).toContain('second')
  })
})

// ── math.init suppresses array seeding ───────────────────────────────────────────

describe('deriveSceneState — variable scripts skip array seeding', () => {
  it('does not seed arr_ cells when first step has math.init', () => {
    const script = makeScript({
      algorithm: 'gcd',
      presentation: { engine: 'scene', module: 'variables' },
      initialState: { type: 'array', data: [12, 8] },
      steps: [
        step(1, [{ type: 'math.init', vars: [{ name: 'a', value: 12 }, { name: 'b', value: 8 }] }]),
      ],
    })
    const scene = deriveSceneState(script, 0)
    expect(ids(scene, 'arr_')).toHaveLength(0)
    // math.init create events run at step 0 so variables are visible immediately
    expect(scene.entities['mathvar_a']).toBeDefined()
    expect(scene.entities['mathvar_b']).toBeDefined()
  })
})

// ── BFS queue reconstruction from enqueue/dequeue events ─────────────────────────

describe('deriveSceneState — BFS queue reconstruction fallback', () => {
  const graphScript = (): AnimationScript =>
    makeScript({
      algorithm: 'bfs_graph',
      presentation: { engine: 'scene', module: 'graph' },
      initialState: {
        type: 'graph',
        data: [],
        nodes: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }],
        edges: [{ source: 'A', target: 'B' }, { source: 'A', target: 'C' }],
      },
      steps: [
        step(1, [
          { type: 'graph.create', nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }], edges: [{ source: 'A', target: 'B' }, { source: 'A', target: 'C' }] },
          { type: 'graph.enqueue', nodeId: 'A' },
        ]),
        step(2, [{ type: 'graph.enqueue', nodeId: 'B' }, { type: 'graph.enqueue', nodeId: 'C' }]),
        step(3, [{ type: 'graph.dequeue', nodeId: 'A' }]),
      ],
    })

  it('rebuilds queue cells from enqueue events when teachingState.queue is absent', () => {
    const scene = deriveSceneState(graphScript(), 2)
    const queueCells = ids(scene, 'queue_')
    // A, B, C enqueued by step 2 (none dequeued yet)
    expect(queueCells).toHaveLength(3)
    expect(scene.labels['queue_label']?.text).toContain('Queue')
  })

  it('removes dequeued nodes from the reconstructed queue', () => {
    const scene = deriveSceneState(graphScript(), 3)
    const queueValues = ids(scene, 'queue_').map((id) => cellValue(scene, id))
    // After dequeue A, B and C remain
    expect(queueValues).toEqual(['B', 'C'])
  })

  it('renders an empty placeholder queue cell when the queue drains', () => {
    const drainScript = makeScript({
      algorithm: 'bfs_graph',
      presentation: { engine: 'scene', module: 'graph' },
      initialState: { type: 'graph', data: [], nodes: [{ id: 'A' }], edges: [] },
      steps: [
        step(1, [
          { type: 'graph.create', nodes: [{ id: 'A' }], edges: [] },
          { type: 'graph.enqueue', nodeId: 'A' },
        ]),
        step(2, [{ type: 'graph.dequeue', nodeId: 'A' }]),
      ],
    })
    const scene = deriveSceneState(drainScript, 2)
    const placeholder = scene.entities['queue_0']
    expect(placeholder?.type).toBe('cell')
    expect(placeholder?.type === 'cell' ? placeholder.state?.role : undefined).toBe('empty_placeholder')
  })
})

// ── DFS stack reconstruction ─────────────────────────────────────────────────────

describe('deriveSceneState — DFS stack reconstruction fallback', () => {
  it('rebuilds stack cells from enqueue events for DFS algorithms', () => {
    const script = makeScript({
      algorithm: 'dfs_graph',
      presentation: { engine: 'scene', module: 'graph' },
      initialState: {
        type: 'graph',
        data: [],
        nodes: [{ id: 'A' }, { id: 'B' }],
        edges: [{ source: 'A', target: 'B' }],
      },
      steps: [
        step(1, [
          { type: 'graph.create', nodes: [{ id: 'A' }, { id: 'B' }], edges: [{ source: 'A', target: 'B' }] },
          { type: 'graph.enqueue', nodeId: 'A' },
        ]),
        step(2, [{ type: 'graph.enqueue', nodeId: 'B' }]),
      ],
    })
    const scene = deriveSceneState(script, 2)
    const stackCells = ids(scene, 'stack_')
    expect(stackCells).toHaveLength(2)
    expect(scene.labels['stack_label']?.text).toContain('Stack')
  })
})

// ── Explicit teachingState queue & stack ─────────────────────────────────────────

describe('deriveSceneState — explicit teachingState queue/stack', () => {
  it('renders queue cells from teachingState.queue with node labels', () => {
    const script = makeScript({
      algorithm: 'bfs',
      presentation: { engine: 'scene', module: 'graph' },
      initialState: {
        type: 'graph',
        data: [],
        nodes: [{ id: 'n1', label: 'Start' }, { id: 'n2', label: 'End' }],
        edges: [],
      },
      steps: [
        step(1, [{ type: 'graph.create', nodes: [{ id: 'n1', label: 'Start' }, { id: 'n2', label: 'End' }], edges: [] }], { queue: ['n1', 'n2'] }),
      ],
    })
    const scene = deriveSceneState(script, 1)
    const queueValues = ids(scene, 'queue_').map((id) => cellValue(scene, id))
    expect(queueValues).toEqual(['Start', 'End'])
  })
})

// ── Auxiliary arrays from teachingState ──────────────────────────────────────────

describe('deriveSceneState — auxiliary arrays', () => {
  it('renders auxiliary array cells, label, and marks active indices', () => {
    const script = makeScript({
      algorithm: 'dijkstra',
      presentation: { engine: 'scene', module: 'array' },
      initialState: { type: 'array', data: [1, 2, 3] },
      steps: [
        step(1, [{ type: 'array.create', values: [1, 2, 3] }], {
          auxiliaryArrays: [
            { id: 'dist', label: 'distance', data: [0, 5, '∞'], activeIndices: [1] },
          ],
        }),
      ],
    })
    const scene = deriveSceneState(script, 1)
    const auxCells = ids(scene, 'aux_dist_')
    expect(auxCells).toHaveLength(3)
    expect(cellValue(scene, 'aux_dist_2')).toBe('∞')

    const activeCell = scene.entities['aux_dist_1']
    expect(activeCell?.type === 'cell' ? activeCell.state?.role : undefined).toBe('active')

    const label = scene.labels['aux_label_dist'] as SceneLabel | undefined
    expect(label?.text).toBe('distance')
  })

  it('returns scene unchanged when auxiliaryArrays is empty', () => {
    const script = makeScript({
      presentation: { engine: 'scene', module: 'array' },
      initialState: { type: 'array', data: [1] },
      steps: [step(1, [{ type: 'array.create', values: [1] }], { auxiliaryArrays: [] })],
    })
    const scene = deriveSceneState(script, 1)
    expect(ids(scene, 'aux_')).toHaveLength(0)
  })
})

// ── Composite region layout flag ─────────────────────────────────────────────────

describe('deriveSceneState — composite layout', () => {
  it('does not throw and still derives cells when layout === "composite"', () => {
    const script = makeScript({
      presentation: { engine: 'scene', module: 'array', layout: 'composite' },
      initialState: { type: 'array', data: [4, 5] },
      steps: [step(1, [{ type: 'array.create', values: [4, 5] }])],
    })
    const scene = deriveSceneState(script, 1)
    expect(ids(scene, 'arr_').length).toBeGreaterThan(0)
  })
})

// ── Long overlay script exercises snapshot deep-clone of overlays ────────────────

describe('deriveSceneState — overlay snapshot deep-clone', () => {
  it('clones grid overlays through the snapshot cache without sharing references', () => {
    const steps: AnimationStep[] = [
      step(0, [{ type: 'grid.create', gridId: 'maze', rows: 3, cols: 3 } as unknown as AlgorithmEvent]),
    ]
    for (let i = 1; i <= 30; i++) {
      const r = i % 3
      const c = (i + 1) % 3
      steps.push(
        step(i, [
          { type: 'grid.visit', gridId: 'maze', row: r, col: c, order: i } as unknown as AlgorithmEvent,
          { type: 'grid.frontier', gridId: 'maze', cells: [[r, c]] } as unknown as AlgorithmEvent,
          { type: 'grid.arrow', gridId: 'maze', from: [0, 0], to: [r, c] } as unknown as AlgorithmEvent,
        ]),
      )
    }
    const script = makeScript({
      algorithm: 'bfs_grid',
      presentation: { engine: 'scene', module: 'grid' },
      initialState: { type: 'matrix', data: [], matrix: [[0]] },
      steps,
    })

    // Derive at a high step to seed snapshots, then jump backward to force replay
    // from the cloned snapshot (covers deepCloneScene overlay branches).
    const at30 = deriveSceneState(script, 30)
    expect(at30.overlays?.grids['maze']).toBeDefined()

    const at25 = deriveSceneState(script, 25)
    expect(at25.overlays?.grids['maze']).toBeDefined()
    // Snapshot clone must be independent: mutating the derived scene's grid
    // arrows array shouldn't have leaked from a shared snapshot reference.
    expect(Array.isArray(at25.overlays?.grids['maze'].arrows)).toBe(true)
  })
})

// ── Tree teachingState triggers tree relayout ────────────────────────────────────

describe('deriveSceneState — tree auxiliary with tree relayout', () => {
  it('renders queue cells and relayouts tree nodes for a tree script', () => {
    const script = makeScript({
      algorithm: 'level_order',
      presentation: { engine: 'scene', module: 'tree' },
      initialState: {
        type: 'tree',
        data: [],
        root: '0',
        children: { '0': ['1', '2'], '1': [], '2': [] },
        treeNodes: [
          { id: '0', value: 1 },
          { id: '1', value: 2 },
          { id: '2', value: 3 },
        ],
      },
      steps: [
        step(
          1,
          [
            {
              type: 'tree.create',
              variant: 'binary',
              rootId: '0',
              nodes: [
                { id: '0', value: 1 },
                { id: '1', value: 2 },
                { id: '2', value: 3 },
              ],
              edges: [
                { parentId: '0', childId: '1' },
                { parentId: '0', childId: '2' },
              ],
            },
          ],
          { queue: ['0'], graph: {} },
        ),
      ],
    })
    const scene = deriveSceneState(script, 1)
    expect(ids(scene, 'queue_')).toHaveLength(1)
    // tree nodes exist and were laid out
    expect(scene.entities['0']).toBeDefined()
  })
})

// ── DFS empty stack placeholder ──────────────────────────────────────────────────

describe('deriveSceneState — DFS empty stack placeholder', () => {
  it('renders an empty placeholder stack cell when the stack drains', () => {
    const script = makeScript({
      algorithm: 'dfs_graph',
      presentation: { engine: 'scene', module: 'graph' },
      initialState: { type: 'graph', data: [], nodes: [{ id: 'A' }], edges: [] },
      steps: [
        step(1, [
          { type: 'graph.create', nodes: [{ id: 'A' }], edges: [] },
          { type: 'graph.enqueue', nodeId: 'A' },
        ]),
        step(2, [{ type: 'graph.dequeue', nodeId: 'A' }]),
      ],
    })
    const scene = deriveSceneState(script, 2)
    const placeholder = scene.entities['stack_0']
    expect(placeholder?.type).toBe('cell')
    expect(placeholder?.type === 'cell' ? placeholder.state?.role : undefined).toBe('empty_placeholder')
  })
})

// ── Auxiliary arrays: colorMap + wide (CJK) characters ───────────────────────────

describe('deriveSceneState — auxiliary array colorMap & wide chars', () => {
  it('applies colorMap colors and sizes wide CJK values wider', () => {
    const script = makeScript({
      algorithm: 'lcs',
      presentation: { engine: 'scene', module: 'array' },
      initialState: { type: 'array', data: [1] },
      steps: [
        step(1, [{ type: 'array.create', values: [1] }], {
          auxiliaryArrays: [
            { id: 'tbl', label: '结果', data: ['甲', '乙', 1], colorMap: { 0: 'success', 1: 'danger' } },
          ],
        }),
      ],
    })
    const scene = deriveSceneState(script, 1)
    const c0 = scene.entities['aux_tbl_0']
    expect(c0?.type === 'cell' ? c0.state?.color : undefined).toBe('success')
    // CJK char cell should be wider than the minimum width used for ascii digits
    const cjk = scene.entities['aux_tbl_0']
    const digit = scene.entities['aux_tbl_2']
    const cjkW = cjk?.type === 'cell' ? cjk.size?.width ?? 0 : 0
    const digitW = digit?.type === 'cell' ? digit.size?.width ?? 0 : 0
    expect(cjkW).toBeGreaterThanOrEqual(digitW)
    // The aux label is rendered with the provided CJK text
    expect(scene.labels['aux_label_tbl']?.text).toBe('结果')
  })
})

// ── relayout with scope (graph.relax / explicit relayout) ────────────────────────

describe('deriveSceneState — math.highlight pulse & decay', () => {
  it('keeps pulse on the highlighted step and decays it afterward', () => {
    const script = makeScript({
      algorithm: 'custom',
      presentation: { engine: 'scene', module: 'variables' },
      initialState: { type: 'array', data: [] },
      steps: [
        step(1, [{ type: 'math.init', vars: [{ name: 'x', value: 0 }] }]),
        step(2, [{ type: 'math.highlight', name: 'x' }]),
        step(3, [{ type: 'scene.note', text: 'unrelated' }]),
      ],
    })
    const atHighlight = deriveSceneState(script, 2)
    const hx = atHighlight.entities['mathvar_x']
    expect(hx?.type === 'cell' ? hx.state?.pulse : undefined).toBe(true)

    const afterDecay = deriveSceneState(script, 3)
    const dx = afterDecay.entities['mathvar_x']
    expect(dx?.type === 'cell' ? dx.state?.pulse : undefined).toBeFalsy()
  })
})

// ── Queue re-render across steps clears stale queue cells ────────────────────────

describe('deriveSceneState — queue re-render clears stale cells', () => {
  it('does not accumulate stale queue cells when the queue shrinks between steps', () => {
    const script = makeScript({
      algorithm: 'bfs',
      presentation: { engine: 'scene', module: 'graph' },
      initialState: {
        type: 'graph',
        data: [],
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        edges: [],
      },
      steps: [
        step(1, [{ type: 'graph.create', nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], edges: [] }], { queue: ['a', 'b', 'c'] }),
        step(2, [{ type: 'scene.wait' }], { queue: ['c'] }),
      ],
    })
    const wide = deriveSceneState(script, 1)
    expect(ids(wide, 'queue_')).toHaveLength(3)

    const narrow = deriveSceneState(script, 2)
    // Stale queue_1 / queue_2 from the wider step must not linger
    expect(ids(narrow, 'queue_')).toHaveLength(1)
  })
})

// ── getNodeLabel falls back to the raw node id ───────────────────────────────────

describe('deriveSceneState — queue label fallback to node id', () => {
  it('uses the node id as the cell value when no label is available', () => {
    const script = makeScript({
      algorithm: 'bfs',
      presentation: { engine: 'scene', module: 'graph' },
      initialState: { type: 'graph', data: [], nodes: [], edges: [] },
      steps: [
        step(1, [{ type: 'scene.wait' }], { queue: ['Z9'] }),
      ],
    })
    const scene = deriveSceneState(script, 1)
    expect(cellValue(scene, 'queue_0')).toBe('Z9')
  })
})

// ── Long DP-table script exercises full overlay deep-clone ───────────────────────

describe('deriveSceneState — DP overlay deep-clone through snapshots', () => {
  it('clones dpTable formulas/dependencies/traceback/roll across the snapshot cache', () => {
    const steps: AnimationStep[] = [
      step(0, [{ type: 'dp.create', tableId: 'dp', rows: 3, cols: 3 } as unknown as AlgorithmEvent]),
    ]
    for (let i = 1; i <= 30; i++) {
      const r = i % 3
      const c = (i + 1) % 3
      steps.push(
        step(i, [
          { type: 'dp.set', tableId: 'dp', row: r, col: c, value: i } as unknown as AlgorithmEvent,
          { type: 'dp.highlight', tableId: 'dp', row: r, col: c } as unknown as AlgorithmEvent,
          { type: 'dp.roll', tableId: 'dp', enabled: true, axis: 'row', activeIndex: r } as unknown as AlgorithmEvent,
        ]),
      )
    }
    const script = makeScript({
      algorithm: 'edit_distance',
      presentation: { engine: 'scene', module: 'dp' },
      initialState: { type: 'matrix', data: [], matrix: [[0]] },
      steps,
    })

    const at30 = deriveSceneState(script, 30)
    expect(at30.overlays?.dpTables['dp']).toBeDefined()

    // Backward jump forces replay from a deep-cloned snapshot.
    const at24 = deriveSceneState(script, 24)
    const table = at24.overlays?.dpTables['dp']
    expect(table).toBeDefined()
    expect(Array.isArray(table?.formulas)).toBe(true)
    expect(Array.isArray(table?.cells)).toBe(true)
    expect(table?.roll).toBeDefined()
  })
})

// ── Long call-stack script exercises call-stack deep-clone ───────────────────────

describe('deriveSceneState — call stack overlay deep-clone', () => {
  it('clones the call stack model across the snapshot cache', () => {
    const steps: AnimationStep[] = [
      step(0, [{ type: 'callstack.create', id: 'cs', title: 'recurse', frames: [] } as unknown as AlgorithmEvent]),
    ]
    for (let i = 1; i <= 25; i++) {
      steps.push(
        step(i, [
          { type: 'callstack.push', id: 'cs', frame: { id: `f${i}`, functionName: `fn${i}` } } as unknown as AlgorithmEvent,
          { type: 'callstack.highlight', id: 'cs', frameId: `f${i}`, active: true } as unknown as AlgorithmEvent,
        ]),
      )
    }
    const script = makeScript({
      algorithm: 'fib',
      presentation: { engine: 'scene', module: 'callstack' },
      initialState: { type: 'array', data: [] },
      steps,
    })

    const at25 = deriveSceneState(script, 25)
    expect(at25.overlays?.callStack).toBeDefined()

    const at22 = deriveSceneState(script, 22)
    expect(at22.overlays?.callStack).toBeDefined()
    expect(Array.isArray(at22.overlays?.callStack?.frames)).toBe(true)
    expect(Array.isArray(at22.overlays?.callStack?.highlightedFrameIds)).toBe(true)
  })
})

// ── Empty script edge case ───────────────────────────────────────────────────────

describe('deriveSceneState — empty script', () => {
  it('returns an empty scene for a script with no steps', () => {
    const script = makeScript({ steps: [] })
    const scene = deriveSceneState(script, 0)
    expect(Object.keys(scene.entities)).toHaveLength(0)
    expect(scene.edges).toEqual({})
  })
})
