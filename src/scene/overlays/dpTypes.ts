import type { CSSProperties, ReactNode } from 'react';

export type DPCellCoord = {
  row: number;
  col: number;
};

export type DPHighlightKind = 'current' | 'dependency' | 'candidate' | 'answer';

export type DPCellValue = string | number | boolean | null;

export type DPCellState = {
  value: DPCellValue;
  label?: string | undefined;
  highlights: DPHighlightKind[];
  formula?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type DPDependency = {
  from: DPCellCoord;
  to: DPCellCoord;
  kind?: 'dependency' | 'candidate' | 'choice' | undefined;
  label?: string | undefined;
};

export type DPFormula = {
  target: DPCellCoord;
  text: string;
};

export type DPRollConfig = {
  enabled: boolean;
  window?: {
    startRow?: number | undefined;
    endRow?: number | undefined;
    startCol?: number | undefined;
    endCol?: number | undefined;
  } | undefined;
  axis?: 'row' | 'col' | undefined;
  activeIndex?: number | undefined;
  label?: string | undefined;
};

export type DPTableModel = {
  id: string;
  kind: 'dp-table';
  title?: string | undefined;
  rowCount: number;
  colCount: number;
  rowLabels: string[];
  colLabels: string[];
  cells: DPCellState[][];
  dependencies: DPDependency[];
  formulas: DPFormula[];
  traceback: DPCellCoord[];
  roll?: DPRollConfig | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type DPTableCollection = Record<string, DPTableModel>;

export type DPCreateEvent = {
  type: 'dp.create';
  id?: string;
  tableId?: string;
  rows?: number;
  rowCount?: number;
  cols?: number;
  colCount?: number;
  rowLabels?: string[];
  colLabels?: string[];
  columnLabels?: string[];
  values?: DPCellValue[][];
  defaultValue?: DPCellValue;
  title?: string;
  className?: string;
  style?: CSSProperties;
  metadata?: Record<string, unknown>;
};

export type DPSetEvent = {
  type: 'dp.set';
  id?: string;
  tableId?: string;
  row: number;
  col: number;
  value: DPCellValue;
  label?: string;
  formula?: string;
  metadata?: Record<string, unknown>;
};

export type DPHighlightEvent = {
  type: 'dp.highlight';
  id?: string;
  tableId?: string;
  row?: number;
  col?: number;
  cells?: DPCellCoord[];
  kind?: DPHighlightKind;
  mode?: 'replace' | 'add' | 'remove' | 'clear';
};

export type DPDependencyEvent = {
  type: 'dp.dependency';
  id?: string;
  tableId?: string;
  from?: DPCellCoord;
  to?: DPCellCoord;
  edges?: DPDependency[];
  sources?: DPCellCoord[];
  target?: DPCellCoord;
  kind?: DPDependency['kind'];
  label?: string;
  mode?: 'replace' | 'add' | 'clear';
};

export type DPFormulaEvent = {
  type: 'dp.formula';
  id?: string;
  tableId?: string;
  row?: number;
  col?: number;
  target?: DPCellCoord;
  text?: string;
  formula?: string;
  mode?: 'replace' | 'append' | 'clear';
};

export type DPTracebackEvent = {
  type: 'dp.traceback';
  id?: string;
  tableId?: string;
  path?: DPCellCoord[];
  cells?: DPCellCoord[];
  row?: number;
  col?: number;
  mode?: 'replace' | 'append' | 'clear';
};

export type DPRollEvent = {
  type: 'dp.roll';
  id?: string;
  tableId?: string;
  enabled?: boolean;
  window?: DPRollConfig['window'];
  axis?: DPRollConfig['axis'];
  activeIndex?: number;
  label?: string;
  mode?: 'set' | 'clear';
};

export type DPEvent =
  | DPCreateEvent
  | DPSetEvent
  | DPHighlightEvent
  | DPDependencyEvent
  | DPFormulaEvent
  | DPTracebackEvent
  | DPRollEvent;

export type DPTablePatch =
  | { op: 'create'; model: DPTableModel }
  | {
      op: 'set';
      cell: DPCellCoord;
      value: DPCellValue;
      label?: string | undefined;
      formula?: string | undefined;
      metadata?: Record<string, unknown> | undefined;
    }
  | { op: 'highlight'; cells: DPCellCoord[]; kind?: DPHighlightKind | undefined; mode: NonNullable<DPHighlightEvent['mode']> }
  | { op: 'dependency'; dependencies: DPDependency[]; mode: NonNullable<DPDependencyEvent['mode']> }
  | { op: 'formula'; formula?: DPFormula | undefined; mode: NonNullable<DPFormulaEvent['mode']> }
  | { op: 'traceback'; path: DPCellCoord[]; mode: NonNullable<DPTracebackEvent['mode']> }
  | { op: 'roll'; roll?: DPRollConfig | undefined };

export type DPOverlayCommand = {
  type: 'dp-table.model';
  tableId: string;
  model: DPTableModel;
  patch: DPTablePatch;
};

export type DPCompilerResult = {
  state: DPTableCollection;
  commands: DPOverlayCommand[];
};

export type DPTableViewProps = {
  model: DPTableModel;
  className?: string | undefined;
  renderValue?: ((cell: DPCellState, coord: DPCellCoord) => ReactNode) | undefined;
};
