import { describe, expect, it } from 'vitest';

import { compileDPEvent, compileDPEvents, DP_TABLE_COMMAND_TYPE } from '../dpCompiler';
import type { DPTableCollection } from '../../overlays/dpTypes';

describe('dpCompiler', () => {
  it('creates a DP table model from dimensions, labels, and initial values', () => {
    const result = compileDPEvent({
      type: 'dp.create',
      id: 'fib',
      rows: 2,
      cols: 3,
      rowLabels: ['base', 'step'],
      colLabels: ['0', '1', '2'],
      values: [
        [0, 1, 1],
        [1, 2, 3],
      ],
      title: 'Fibonacci',
    });

    const model = result.state.fib;

    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toMatchObject({
      type: DP_TABLE_COMMAND_TYPE,
      tableId: 'fib',
      patch: { op: 'create' },
    });
    expect(model).toMatchObject({
      id: 'fib',
      kind: 'dp-table',
      title: 'Fibonacci',
      rowCount: 2,
      colCount: 3,
      rowLabels: ['base', 'step'],
      colLabels: ['0', '1', '2'],
    });
    expect(model.cells[1][2].value).toBe(3);
  });

  it('sets a cell value without mutating the previous state', () => {
    const created = compileDPEvent({
      type: 'dp.create',
      id: 'knapsack',
      rows: 2,
      cols: 2,
      defaultValue: 0,
    });

    const updated = compileDPEvent(
      {
        type: 'dp.set',
        id: 'knapsack',
        row: 1,
        col: 1,
        value: 7,
        label: 'take',
        formula: 'max(skip,take)',
        metadata: { item: 1 },
      },
      created.state,
    );

    expect(created.state.knapsack.cells[1][1].value).toBe(0);
    expect(updated.state.knapsack.cells[1][1]).toMatchObject({
      value: 7,
      label: 'take',
      formula: 'max(skip,take)',
      metadata: { item: 1 },
    });
    expect(updated.commands[0].patch).toMatchObject({
      op: 'set',
      cell: { row: 1, col: 1 },
      value: 7,
    });
  });

  it('replaces, adds, removes, and clears highlights by kind', () => {
    const { state } = compileDPEvents([
      { type: 'dp.create', id: 'lis', rows: 2, cols: 2 },
      { type: 'dp.highlight', id: 'lis', row: 0, col: 0, kind: 'current' },
      { type: 'dp.highlight', id: 'lis', row: 0, col: 1, kind: 'candidate', mode: 'add' },
      { type: 'dp.highlight', id: 'lis', row: 1, col: 1, kind: 'candidate', mode: 'add' },
      { type: 'dp.highlight', id: 'lis', row: 0, col: 1, kind: 'candidate', mode: 'remove' },
    ]);

    expect(state.lis.cells[0][0].highlights).toEqual(['current']);
    expect(state.lis.cells[0][1].highlights).toEqual([]);
    expect(state.lis.cells[1][1].highlights).toEqual(['candidate']);

    const cleared = compileDPEvent(
      {
        type: 'dp.highlight',
        id: 'lis',
        kind: 'candidate',
        mode: 'clear',
      },
      state,
    );

    expect(cleared.state.lis.cells[1][1].highlights).toEqual([]);
    expect(cleared.state.lis.cells[0][0].highlights).toEqual(['current']);
  });

  it('records dependency edges and supports add and clear modes', () => {
    const created = compileDPEvent({ type: 'dp.create', id: 'edit', rows: 3, cols: 3 });
    const replaced = compileDPEvent(
      {
        type: 'dp.dependency',
        id: 'edit',
        sources: [
          { row: 1, col: 1 },
          { row: 1, col: 2 },
        ],
        target: { row: 2, col: 2 },
        label: 'min + 1',
      },
      created.state,
    );
    const added = compileDPEvent(
      {
        type: 'dp.dependency',
        id: 'edit',
        from: { row: 2, col: 1 },
        to: { row: 2, col: 2 },
        kind: 'candidate',
        mode: 'add',
      },
      replaced.state,
    );

    expect(replaced.state.edit.dependencies).toHaveLength(2);
    expect(added.state.edit.dependencies).toHaveLength(3);
    expect(added.state.edit.dependencies[2]).toMatchObject({
      from: { row: 2, col: 1 },
      to: { row: 2, col: 2 },
      kind: 'candidate',
    });

    const cleared = compileDPEvent({ type: 'dp.dependency', id: 'edit', mode: 'clear' }, added.state);
    expect(cleared.state.edit.dependencies).toEqual([]);
  });

  it('stores formulas on the formula list and target cells', () => {
    const created = compileDPEvent({ type: 'dp.create', id: 'coin', rows: 2, cols: 4 });
    const withFormula = compileDPEvent(
      {
        type: 'dp.formula',
        id: 'coin',
        row: 1,
        col: 3,
        text: 'dp[i][j-c]+1',
      },
      created.state,
    );

    expect(withFormula.state.coin.formulas).toEqual([
      {
        target: { row: 1, col: 3 },
        text: 'dp[i][j-c]+1',
      },
    ]);
    expect(withFormula.state.coin.cells[1][3].formula).toBe('dp[i][j-c]+1');

    const cleared = compileDPEvent(
      {
        type: 'dp.formula',
        id: 'coin',
        target: { row: 1, col: 3 },
        mode: 'clear',
      },
      withFormula.state,
    );

    expect(cleared.state.coin.formulas).toEqual([]);
    expect(cleared.state.coin.cells[1][3].formula).toBeUndefined();
  });

  it('replaces, appends, and clears traceback paths', () => {
    const created = compileDPEvent({ type: 'dp.create', id: 'lcs', rows: 3, cols: 3 });
    const replaced = compileDPEvent(
      {
        type: 'dp.traceback',
        id: 'lcs',
        path: [
          { row: 2, col: 2 },
          { row: 1, col: 1 },
        ],
      },
      created.state,
    );
    const appended = compileDPEvent(
      {
        type: 'dp.traceback',
        id: 'lcs',
        row: 0,
        col: 0,
        mode: 'append',
      },
      replaced.state,
    );

    expect(appended.state.lcs.traceback).toEqual([
      { row: 2, col: 2 },
      { row: 1, col: 1 },
      { row: 0, col: 0 },
    ]);

    const cleared = compileDPEvent({ type: 'dp.traceback', id: 'lcs', mode: 'clear' }, appended.state);
    expect(cleared.state.lcs.traceback).toEqual([]);
  });

  it('sets and clears rolling-window metadata', () => {
    const created = compileDPEvent({ type: 'dp.create', id: 'path', rows: 4, cols: 4 });
    const rolled = compileDPEvent(
      {
        type: 'dp.roll',
        id: 'path',
        axis: 'row',
        activeIndex: 2,
        window: {
          startRow: 1,
          endRow: 2,
          startCol: 0,
          endCol: 3,
        },
        label: 'previous row',
      },
      created.state,
    );

    expect(rolled.state.path.roll).toEqual({
      enabled: true,
      axis: 'row',
      activeIndex: 2,
      window: {
        startRow: 1,
        endRow: 2,
        startCol: 0,
        endCol: 3,
      },
      label: 'previous row',
    });

    const cleared = compileDPEvent({ type: 'dp.roll', id: 'path', mode: 'clear' }, rolled.state);
    expect(cleared.state.path.roll).toBeUndefined();
  });

  it('throws when non-create events target missing tables', () => {
    const state: DPTableCollection = {};

    expect(() =>
      compileDPEvent(
        {
          type: 'dp.set',
          id: 'missing',
          row: 0,
          col: 0,
          value: 1,
        },
        state,
      ),
    ).toThrow('must be created');
  });
});
