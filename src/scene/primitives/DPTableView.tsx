import type { ReactNode } from 'react';

import type {
  DPCellCoord,
  DPCellState,
  DPHighlightKind,
  DPTableModel,
  DPTableViewProps,
} from '../overlays/dpTypes';

const highlightClassNames: Record<DPHighlightKind, string> = {
  current: 'border-sky-500 bg-sky-50 text-sky-950 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.55)]',
  dependency: 'border-amber-400 bg-amber-50 text-amber-950',
  candidate: 'border-violet-400 bg-violet-50 text-violet-950',
  answer: 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.55)]',
};

export function DPTableView({ model, className, renderValue }: DPTableViewProps) {
  const tracebackIndex = createTracebackIndex(model.traceback);
  const dependencyIndex = createDependencyIndex(model);
  const formulas = model.formulas.length > 0 ? model.formulas : formulasFromCells(model);
  const activeFormula = latestFormula(model, formulas);
  const activeDependencies = activeFormula
    ? model.dependencies.filter((dependency) => sameCoord(dependency.to, activeFormula.target))
    : [];

  return (
    <section
      className={cx(
        'flex h-full w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900 shadow-sm',
        model.className,
        className,
      )}
      style={model.style}
      data-dp-table-id={model.id}
    >
      {model.title ? (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
          <h3 className="text-sm font-semibold leading-5 text-slate-900">{model.title}</h3>
          {model.roll?.enabled ? (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {model.roll.label ?? rollLabel(model)}
            </span>
          ) : null}
        </header>
      ) : null}

      {activeFormula ? (
        <FormulaFocus model={model} formula={activeFormula} dependencies={activeDependencies} />
      ) : null}

      <div className="p-3">
        <table className="w-full min-w-max table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 h-9 min-w-14 border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-500" />
              {model.colLabels.map((label, col) => (
                <th
                  key={`col-${col}`}
                  className={cx(
                    'h-9 min-w-16 border border-slate-200 bg-slate-50 px-2 text-center text-xs font-semibold text-slate-600',
                    isRollCol(model, col) && 'bg-slate-100 text-slate-900',
                  )}
                  scope="col"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.cells.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <th
                  className={cx(
                    'sticky left-0 z-10 h-12 min-w-14 border border-slate-200 bg-slate-50 px-2 text-center text-xs font-semibold text-slate-600',
                    isRollRow(model, rowIndex) && 'bg-slate-100 text-slate-900',
                  )}
                  scope="row"
                >
                  {model.rowLabels[rowIndex] ?? `i${rowIndex}`}
                </th>
                {row.map((cell, colIndex) => {
                  const coord = { row: rowIndex, col: colIndex };
                  const key = coordKey(coord);
                  const traceStep = tracebackIndex.get(key);
                  const dependencyMarks = dependencyIndex.get(key);

                  return (
                    <td key={key} className="border border-slate-200 p-0 align-middle">
                      <CellView
                        cell={cell}
                        coord={coord}
                        traceStep={traceStep}
                        dependencyMarks={dependencyMarks}
                        inRollWindow={isInRollWindow(model, coord)}
                        renderValue={renderValue}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formulas.length > 0 ? (
        <footer className="border-t border-slate-200 bg-slate-50 px-3 py-2">
          <ol className="flex flex-wrap gap-2">
            {formulas.map((formula, index) => (
              <li
                key={`${coordKey(formula.target)}-${index}`}
                className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700"
              >
                <span className="font-semibold text-slate-500">{cellName(model, formula.target)}</span>
                <span className="mx-1 text-slate-400">=</span>
                {formula.text}
              </li>
            ))}
          </ol>
        </footer>
      ) : null}
    </section>
  );
}

function FormulaFocus({
  dependencies,
  formula,
  model,
}: {
  dependencies: Array<{ from: DPCellCoord; label?: string | undefined }>;
  formula: { target: DPCellCoord; text: string };
  model: DPTableModel;
}) {
  const targetCell = model.cells[formula.target.row]?.[formula.target.col];
  const value = formatValue(targetCell?.value);

  return (
    <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-amber-50 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">当前 DP 方程</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-sm text-slate-900">
            <span className="rounded border border-sky-200 bg-white px-2 py-1 font-semibold text-sky-800">
              {cellName(model, formula.target)}
            </span>
            <span className="text-slate-400">=</span>
            <span className="rounded border border-slate-200 bg-white px-2 py-1">{formula.text}</span>
          </div>
        </div>
        <div className="shrink-0 rounded border border-emerald-200 bg-white px-3 py-1.5 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">结果</div>
          <div className="font-mono text-sm font-bold text-emerald-700">{value}</div>
        </div>
      </div>
      {dependencies.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-slate-500">依赖</span>
          {dependencies.map((dependency, index) => (
            <span key={`${coordKey(dependency.from)}-${index}`} className="rounded border border-amber-200 bg-white px-2 py-1 font-mono text-amber-800">
              {cellName(model, dependency.from)}
              {dependency.label ? <span className="ml-1 text-slate-400">{dependency.label}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CellView({
  cell,
  coord,
  dependencyMarks,
  inRollWindow,
  renderValue,
  traceStep,
}: {
  cell: DPCellState;
  coord: DPCellCoord;
  dependencyMarks?: DependencyMarks;
  inRollWindow: boolean;
  renderValue?: (cell: DPCellState, coord: DPCellCoord) => ReactNode;
  traceStep?: number;
}) {
  const value = renderValue ? renderValue(cell, coord) : formatValue(cell.value);

  return (
    <div
      className={cx(
        'relative flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 px-2 py-1 text-center transition-colors',
        'border border-transparent',
        cell.highlights.map((highlight) => highlightClassNames[highlight]).join(' '),
        traceStep !== undefined && 'ring-2 ring-indigo-500 ring-inset',
        inRollWindow && 'outline outline-1 -outline-offset-2 outline-slate-400',
      )}
      data-row={coord.row}
      data-col={coord.col}
    >
      <div className="min-h-5 max-w-full truncate font-mono text-sm font-semibold leading-5">{value}</div>

      {cell.label ? <div className="max-w-full truncate text-[10px] font-medium leading-3 text-slate-500">{cell.label}</div> : null}

      {cell.formula ? (
        <div className="max-w-full truncate font-mono text-[10px] leading-3 text-slate-500">{cell.formula}</div>
      ) : null}

      {traceStep !== undefined ? (
        <span className="absolute right-1 top-1 rounded bg-indigo-600 px-1 text-[10px] font-semibold leading-4 text-white">
          {traceStep + 1}
        </span>
      ) : null}

      {dependencyMarks ? <DependencyBadges marks={dependencyMarks} /> : null}
    </div>
  );
}

function DependencyBadges({ marks }: { marks: DependencyMarks }) {
  const badges = [
    marks.incoming > 0 ? { key: 'in', label: `in ${marks.incoming}`, className: 'bg-amber-100 text-amber-800' } : null,
    marks.outgoing > 0 ? { key: 'out', label: `out ${marks.outgoing}`, className: 'bg-sky-100 text-sky-800' } : null,
  ].filter(Boolean) as { key: string; label: string; className: string }[];

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-1 right-1 flex gap-1">
      {badges.map((badge) => (
        <span key={badge.key} className={cx('rounded px-1 text-[9px] font-semibold leading-3', badge.className)}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

type DependencyMarks = {
  incoming: number;
  outgoing: number;
};

function createDependencyIndex(model: DPTableModel): Map<string, DependencyMarks> {
  const index = new Map<string, DependencyMarks>();

  for (const dependency of model.dependencies) {
    const fromKey = coordKey(dependency.from);
    const toKey = coordKey(dependency.to);
    const fromMarks = index.get(fromKey) ?? { incoming: 0, outgoing: 0 };
    const toMarks = index.get(toKey) ?? { incoming: 0, outgoing: 0 };

    index.set(fromKey, { ...fromMarks, outgoing: fromMarks.outgoing + 1 });
    index.set(toKey, { ...toMarks, incoming: toMarks.incoming + 1 });
  }

  return index;
}

function createTracebackIndex(path: DPCellCoord[]): Map<string, number> {
  const index = new Map<string, number>();

  path.forEach((coord, step) => {
    index.set(coordKey(coord), step);
  });

  return index;
}

function latestFormula(model: DPTableModel, formulas: Array<{ target: DPCellCoord; text: string }>) {
  const currentCell = findHighlightedCell(model, 'current');
  if (currentCell) {
    const formula = formulas.find((item) => sameCoord(item.target, currentCell));
    if (formula) return formula;
  }
  return formulas[formulas.length - 1];
}

function findHighlightedCell(model: DPTableModel, highlight: DPHighlightKind): DPCellCoord | undefined {
  for (let row = 0; row < model.cells.length; row++) {
    for (let col = 0; col < model.cells[row].length; col++) {
      if (model.cells[row][col].highlights.includes(highlight)) return { row, col };
    }
  }
  return undefined;
}

function formulasFromCells(model: DPTableModel) {
  return model.cells.flatMap((row, rowIndex) =>
    row.flatMap((cell, colIndex) =>
      cell.formula
        ? [
            {
              target: { row: rowIndex, col: colIndex },
              text: cell.formula,
            },
          ]
        : [],
    ),
  );
}

function isInRollWindow(model: DPTableModel, coord: DPCellCoord): boolean {
  const window = model.roll?.window;

  if (!model.roll?.enabled || !window) {
    return false;
  }

  const startRow = window.startRow ?? 0;
  const endRow = window.endRow ?? model.rowCount - 1;
  const startCol = window.startCol ?? 0;
  const endCol = window.endCol ?? model.colCount - 1;

  return coord.row >= startRow && coord.row <= endRow && coord.col >= startCol && coord.col <= endCol;
}

function isRollRow(model: DPTableModel, row: number): boolean {
  return model.roll?.enabled === true && model.roll.axis === 'row' && model.roll.activeIndex === row;
}

function isRollCol(model: DPTableModel, col: number): boolean {
  return model.roll?.enabled === true && model.roll.axis === 'col' && model.roll.activeIndex === col;
}

function rollLabel(model: DPTableModel): string {
  if (!model.roll?.axis || model.roll.activeIndex === undefined) {
    return 'rolling';
  }

  return `${model.roll.axis} ${model.roll.activeIndex}`;
}

function cellName(model: DPTableModel, coord: DPCellCoord): string {
  const row = model.rowLabels[coord.row] ?? `i${coord.row}`;
  const col = model.colLabels[coord.col] ?? `j${coord.col}`;

  return `${row},${col}`;
}

function formatValue(value: DPCellState['value']): ReactNode {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return value;
}

function coordKey(coord: DPCellCoord): string {
  return `${coord.row}:${coord.col}`;
}

function sameCoord(left: DPCellCoord, right: DPCellCoord): boolean {
  return left.row === right.row && left.col === right.col;
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}
