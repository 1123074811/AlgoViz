import type {
  DPCellCoord,
  DPCellState,
  DPCompilerResult,
  DPCreateEvent,
  DPDependency,
  DPDependencyEvent,
  DPEvent,
  DPFormula,
  DPFormulaEvent,
  DPHighlightEvent,
  DPOverlayCommand,
  DPRollConfig,
  DPRollEvent,
  DPSetEvent,
  DPTableCollection,
  DPTableModel,
  DPTablePatch,
  DPTracebackEvent,
} from '../overlays/dpTypes';

export const DP_TABLE_COMMAND_TYPE = 'dp-table.model';
export const DEFAULT_DP_TABLE_ID = 'dp';

export function isDPEvent(event: { type?: string } | null | undefined): event is DPEvent {
  return typeof event?.type === 'string' && event.type.startsWith('dp.');
}

export function compileDPEvent(event: DPEvent, currentState: DPTableCollection = {}): DPCompilerResult {
  const tableId = resolveTableId(event);
  let model: DPTableModel;
  let patch: DPTablePatch;

  if (event.type === 'dp.create') {
    model = createDPTableModel(event);
    patch = { op: 'create', model };
  } else {
    const previous = currentState[tableId];

    if (!previous) {
      throw new Error(`DP table "${tableId}" must be created before handling ${event.type}.`);
    }

    switch (event.type) {
      case 'dp.set': {
        const result = applySet(previous, event);
        model = result.model;
        patch = result.patch;
        break;
      }
      case 'dp.highlight': {
        const result = applyHighlight(previous, event);
        model = result.model;
        patch = result.patch;
        break;
      }
      case 'dp.dependency': {
        const result = applyDependency(previous, event);
        model = result.model;
        patch = result.patch;
        break;
      }
      case 'dp.formula': {
        const result = applyFormula(previous, event);
        model = result.model;
        patch = result.patch;
        break;
      }
      case 'dp.traceback': {
        const result = applyTraceback(previous, event);
        model = result.model;
        patch = result.patch;
        break;
      }
      case 'dp.roll': {
        const result = applyRoll(previous, event);
        model = result.model;
        patch = result.patch;
        break;
      }
      default: {
        const exhaustive: never = event;
        throw new Error(`Unsupported DP event: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  const state = {
    ...currentState,
    [model.id]: model,
  };

  return omitUndefined({
    state,
    commands: [toCommand(model, patch)],
  });
}

export function compileDPEvents(events: DPEvent[], initialState: DPTableCollection = {}): DPCompilerResult {
  let state = initialState;
  const commands: DPOverlayCommand[] = [];

  for (const event of events) {
    const result = compileDPEvent(event, state);
    state = result.state;
    commands.push(...result.commands);
  }

  return { state, commands };
}

export function createDPTableModel(event: DPCreateEvent): DPTableModel {
  const values = event.values ?? [];
  const columnLabels = event.colLabels ?? event.columnLabels;
  const inferredRowCount = values.length || event.rowLabels?.length || 0;
  const inferredColCount = values.reduce((max, row) => Math.max(max, row.length), 0) || columnLabels?.length || 0;
  const rowCount = normalizeCount(event.rowCount ?? event.rows ?? inferredRowCount, 'rowCount');
  const colCount = normalizeCount(event.colCount ?? event.cols ?? inferredColCount, 'colCount');
  const defaultValue = event.defaultValue ?? null;

  const cells = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: colCount }, (_, col): DPCellState => ({
      value: values[row]?.[col] ?? defaultValue,
      highlights: [],
    })),
  );

  return {
    id: resolveTableId(event),
    kind: 'dp-table' as const,
    title: event.title,
    rowCount,
    colCount,
    rowLabels: createLabels(rowCount, event.rowLabels, 'i'),
    colLabels: createLabels(colCount, columnLabels, 'j'),
    cells,
    dependencies: [],
    formulas: [],
    traceback: [],
    className: event.className,
    style: event.style,
    metadata: event.metadata,
  };
}

function applySet(model: DPTableModel, event: DPSetEvent): { model: DPTableModel; patch: DPTablePatch } {
  const coord = { row: event.row, col: event.col };
  assertInBounds(model, coord);

  const next = cloneModel(model);
  const cell = next.cells[coord.row][coord.col];
  const formulaText = event.formula ?? cell.formula;

  next.cells[coord.row][coord.col] = omitUndefined({
    ...cell,
    value: event.value,
    label: event.label ?? cell.label,
    formula: formulaText,
    metadata: event.metadata ? { ...cell.metadata, ...event.metadata } : cell.metadata,
  });

  if (event.formula !== undefined) {
    next.formulas = replaceFormula(next.formulas, {
      target: coord,
      text: event.formula,
    });
  }

  return {
    model: next,
    patch: omitUndefined({
      op: 'set' as const,
      cell: coord,
      value: event.value,
      label: event.label,
      formula: event.formula,
      metadata: event.metadata,
    }),
  };
}

function applyHighlight(model: DPTableModel, event: DPHighlightEvent): { model: DPTableModel; patch: DPTablePatch } {
  const mode = event.mode ?? 'replace';
  const rawKind = event.kind;
  const kind = rawKind ?? 'current';
  const cells = uniqueCoords(resolveCells(event));
  const hasExplicitTargets = cells.length > 0;
  const targetKeys = new Set(cells.map(coordKey));

  for (const cell of cells) {
    assertInBounds(model, cell);
  }

  const next = cloneModel(model);

  next.cells = next.cells.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const targeted = hasExplicitTargets ? targetKeys.has(coordKey({ row: rowIndex, col: colIndex })) : mode === 'clear';
      const currentHighlights = cell.highlights ?? [];

      if (mode === 'replace') {
        const highlights = currentHighlights.filter((highlight) => highlight !== kind);
        return targetKeys.has(coordKey({ row: rowIndex, col: colIndex }))
          ? { ...cell, highlights: addHighlight(highlights, kind) }
          : { ...cell, highlights };
      }

      if (!targeted) {
        return cell;
      }

      if (mode === 'add') {
        return { ...cell, highlights: addHighlight(currentHighlights, kind) };
      }

      if (mode === 'remove') {
        return { ...cell, highlights: currentHighlights.filter((highlight) => highlight !== kind) };
      }

      if (mode === 'clear') {
        return {
          ...cell,
          highlights: rawKind ? currentHighlights.filter((highlight) => highlight !== rawKind) : [],
        };
      }

      return cell;
    }),
  );

  return {
    model: next,
    patch: { op: 'highlight', cells, kind: mode === 'clear' ? rawKind : kind, mode },
  };
}

function applyDependency(model: DPTableModel, event: DPDependencyEvent): { model: DPTableModel; patch: DPTablePatch } {
  const mode = event.mode ?? 'replace';
  const dependencies = mode === 'clear' ? [] : normalizeDependencies(event);

  for (const dependency of dependencies) {
    assertInBounds(model, dependency.from);
    assertInBounds(model, dependency.to);
  }

  const next = cloneModel(model);

  if (mode === 'clear') {
    next.dependencies = [];
  } else if (mode === 'add') {
    next.dependencies = [...next.dependencies, ...dependencies];
  } else {
    next.dependencies = dependencies;
  }

  return {
    model: next,
    patch: { op: 'dependency', dependencies, mode },
  };
}

function applyFormula(model: DPTableModel, event: DPFormulaEvent): { model: DPTableModel; patch: DPTablePatch } {
  const mode = event.mode ?? 'replace';
  const target = resolveFormulaTarget(event);
  const text = event.text ?? event.formula ?? '';
  const next = cloneModel(model);

  if (mode === 'clear') {
    if (target) {
      assertInBounds(model, target);
      next.formulas = next.formulas.filter((formula) => !sameCoord(formula.target, target));
      next.cells[target.row][target.col] = {
        ...next.cells[target.row][target.col],
        formula: undefined,
      };
    } else {
      next.formulas = [];
      next.cells = next.cells.map((row) => row.map((cell) => ({ ...cell, formula: undefined })));
    }

    return {
      model: next,
      patch: { op: 'formula', mode },
    };
  }

  if (!target) {
    throw new Error('dp.formula requires a target cell unless mode is "clear".');
  }

  assertInBounds(model, target);

  const formula: DPFormula = { target, text };
  next.formulas = mode === 'append' ? [...next.formulas, formula] : replaceFormula(next.formulas, formula);
  next.cells[target.row][target.col] = {
    ...next.cells[target.row][target.col],
    formula: text,
  };

  return {
    model: next,
    patch: { op: 'formula', formula, mode },
  };
}

function applyTraceback(model: DPTableModel, event: DPTracebackEvent): { model: DPTableModel; patch: DPTablePatch } {
  const mode = event.mode ?? 'replace';
  const path = mode === 'clear' ? [] : resolveTracebackPath(event).map((cell) => ({ ...cell }));

  for (const cell of path) {
    assertInBounds(model, cell);
  }

  const next = cloneModel(model);

  if (mode === 'clear') {
    next.traceback = [];
  } else if (mode === 'append') {
    next.traceback = [...next.traceback, ...path];
  } else {
    next.traceback = path;
  }

  return {
    model: next,
    patch: { op: 'traceback', path, mode },
  };
}

function applyRoll(model: DPTableModel, event: DPRollEvent): { model: DPTableModel; patch: DPTablePatch } {
  const next = cloneModel(model);

  if (event.mode === 'clear') {
    next.roll = undefined;
    return {
      model: next,
      patch: { op: 'roll' },
    };
  }

  const roll: DPRollConfig = {
    enabled: event.enabled ?? next.roll?.enabled ?? true,
    window: event.window ?? next.roll?.window,
    axis: event.axis ?? next.roll?.axis,
    activeIndex: event.activeIndex ?? next.roll?.activeIndex,
    label: event.label ?? next.roll?.label,
  };

  validateRoll(model, roll);
  next.roll = roll;

  return {
    model: next,
    patch: { op: 'roll', roll },
  };
}

function toCommand(model: DPTableModel, patch: DPTablePatch): DPOverlayCommand {
  return {
    type: DP_TABLE_COMMAND_TYPE,
    tableId: model.id,
    model,
    patch,
  };
}

function resolveTableId(event: { id?: string; tableId?: string }): string {
  return event.tableId ?? event.id ?? DEFAULT_DP_TABLE_ID;
}

function normalizeCount(value: number | undefined, name: string): number {
  const count = value ?? 0;

  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return count;
}

function createLabels(count: number, labels: string[] | undefined, prefix: string): string[] {
  return Array.from({ length: count }, (_, index) => labels?.[index] ?? `${prefix}${index}`);
}

function cloneModel(model: DPTableModel): DPTableModel {
  return omitUndefined({
    ...model,
    rowLabels: [...model.rowLabels],
    colLabels: [...model.colLabels],
    cells: model.cells.map((row) => row.map(cloneCell)),
    dependencies: model.dependencies.map((dependency) => ({
      ...dependency,
      from: { ...dependency.from },
      to: { ...dependency.to },
    })),
    formulas: model.formulas.map((formula) => ({
      ...formula,
      target: { ...formula.target },
    })),
    traceback: model.traceback.map((cell) => ({ ...cell })),
    roll: model.roll
      ? {
          ...model.roll,
          window: model.roll.window ? { ...model.roll.window } : undefined,
        }
      : undefined,
    metadata: model.metadata ? { ...model.metadata } : undefined,
  });
}

function cloneCell(cell: DPCellState): DPCellState {
  return omitUndefined({
    ...cell,
    highlights: [...cell.highlights],
    metadata: cell.metadata ? { ...cell.metadata } : undefined,
  });
}

function assertInBounds(model: DPTableModel, coord: DPCellCoord): void {
  if (!Number.isInteger(coord.row) || !Number.isInteger(coord.col)) {
    throw new Error(`DP cell coordinates must be integers. Received (${coord.row}, ${coord.col}).`);
  }

  if (coord.row < 0 || coord.row >= model.rowCount || coord.col < 0 || coord.col >= model.colCount) {
    throw new Error(
      `DP cell (${coord.row}, ${coord.col}) is outside table "${model.id}" bounds ${model.rowCount}x${model.colCount}.`,
    );
  }
}

function addHighlight(highlights: DPCellState['highlights'], kind: NonNullable<DPHighlightEvent['kind']>) {
  return highlights.includes(kind) ? highlights : [...highlights, kind];
}

function resolveCells(event: Pick<DPHighlightEvent, 'cells' | 'row' | 'col'>): DPCellCoord[] {
  if (event.cells) {
    return event.cells;
  }

  if (typeof event.row === 'number' && typeof event.col === 'number') {
    return [{ row: event.row, col: event.col }];
  }

  return [];
}

function normalizeDependencies(event: DPDependencyEvent): DPDependency[] {
  const normalize = (dependency: DPDependency): DPDependency => ({
    from: { ...dependency.from },
    to: { ...dependency.to },
    kind: dependency.kind ?? event.kind ?? 'dependency',
    label: dependency.label ?? event.label,
  });

  if (event.edges) {
    return event.edges.map(normalize);
  }

  if (event.from && event.to) {
    return [
      normalize({
        from: event.from,
        to: event.to,
      }),
    ];
  }

  if (event.sources && event.target) {
    const target = event.target;

    return event.sources.map((source) =>
      normalize({
        from: source,
        to: target,
      }),
    );
  }

  return [];
}

function resolveFormulaTarget(event: DPFormulaEvent): DPCellCoord | undefined {
  if (event.target) {
    return { ...event.target };
  }

  if (typeof event.row === 'number' && typeof event.col === 'number') {
    return { row: event.row, col: event.col };
  }

  return undefined;
}

function replaceFormula(formulas: DPFormula[], formula: DPFormula): DPFormula[] {
  return [...formulas.filter((item) => !sameCoord(item.target, formula.target)), formula];
}

function resolveTracebackPath(event: DPTracebackEvent): DPCellCoord[] {
  if (event.path) {
    return event.path;
  }

  if (event.cells) {
    return event.cells;
  }

  if (typeof event.row === 'number' && typeof event.col === 'number') {
    return [{ row: event.row, col: event.col }];
  }

  return [];
}

function validateRoll(model: DPTableModel, roll: DPRollConfig): void {
  const window = roll.window;

  if (!window) {
    return;
  }

  if (window.startRow !== undefined && (window.startRow < 0 || window.startRow >= model.rowCount)) {
    throw new Error(`roll.window.startRow is outside table "${model.id}" bounds.`);
  }

  if (window.endRow !== undefined && (window.endRow < 0 || window.endRow >= model.rowCount)) {
    throw new Error(`roll.window.endRow is outside table "${model.id}" bounds.`);
  }

  if (window.startCol !== undefined && (window.startCol < 0 || window.startCol >= model.colCount)) {
    throw new Error(`roll.window.startCol is outside table "${model.id}" bounds.`);
  }

  if (window.endCol !== undefined && (window.endCol < 0 || window.endCol >= model.colCount)) {
    throw new Error(`roll.window.endCol is outside table "${model.id}" bounds.`);
  }
}

function uniqueCoords(coords: DPCellCoord[]): DPCellCoord[] {
  const seen = new Set<string>();
  const unique: DPCellCoord[] = [];

  for (const coord of coords) {
    const key = coordKey(coord);

    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ ...coord });
    }
  }

  return unique;
}

function sameCoord(left: DPCellCoord, right: DPCellCoord): boolean {
  return left.row === right.row && left.col === right.col;
}

function coordKey(coord: DPCellCoord): string {
  return `${coord.row}:${coord.col}`;
}

function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
