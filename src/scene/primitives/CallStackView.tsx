import type { ReactNode } from "react";

import type {
  CallStackBindings,
  CallStackFrame,
  CallStackModel,
  CallStackValue,
} from "../overlays/callStackTypes";

export interface CallStackViewProps {
  model: CallStackModel;
  className?: string;
  emptyLabel?: ReactNode;
}

const statusLabel: Record<CallStackFrame["status"], string> = {
  pending: "等待",
  active: "执行中",
  returned: "已返回",
  popped: "已弹出",
  error: "异常",
};

const functionLabel: Record<string, string> = {
  dfs: "深度搜索",
  solve: "求解",
  backtrack: "回溯",
  search: "搜索",
  helper: "辅助函数",
};

const bindingLabel: Record<string, string> = {
  pos: "位置",
  row: "行",
  col: "列",
  cell: "格子",
  digit: "数字",
  trying: "尝试",
  valid: "已找到",
  result: "结果",
  path: "路径",
  depth: "深度",
};

const formatValue = (value: CallStackValue): string => {
  if (value === undefined) {
    return "未定义";
  }

  if (value === null) {
    return "空";
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const toLabel = (name: string): string => bindingLabel[name] ?? name;
const toFunctionLabel = (name: string): string => functionLabel[name] ?? name;

const BindingChips = ({ bindings }: { bindings: CallStackBindings }) => {
  const entries = Object.entries(bindings).slice(0, 6);
  if (!entries.length) return null;

  return (
    <dl className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([name, value]) => (
        <div
          className="flex max-w-full items-center gap-1 rounded bg-slate-50 px-2 py-1 text-[11px] ring-1 ring-slate-200"
          key={name}
        >
          <dt className="shrink-0 text-slate-500">{toLabel(name)}</dt>
          <dd className="min-w-0 truncate font-mono text-slate-800">
            {formatValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const FrameCard = ({ frame }: { frame: CallStackFrame }) => {
  const hasReturnValue =
    frame.returnValue !== undefined || frame.status === "returned";

  return (
    <li
      className={cx(
        "relative rounded-md border bg-white px-2.5 py-2 shadow-sm transition-colors",
        frame.active && "border-sky-400 bg-sky-50/60 shadow-md ring-1 ring-sky-100",
        frame.highlighted && !frame.active && "border-amber-300 bg-amber-50",
        frame.status === "returned" && "border-emerald-200 bg-emerald-50",
        frame.status === "error" && "border-rose-300 bg-rose-50",
        !frame.active &&
          !frame.highlighted &&
          frame.status !== "returned" &&
          frame.status !== "error" &&
          "border-slate-200",
      )}
      style={{ marginLeft: `${Math.min(frame.depth, 4) * 6}px` }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white font-mono text-[11px] text-slate-500 ring-1 ring-slate-200">
              {frame.depth}
            </span>
            <h3 className="min-w-0 truncate text-[13px] font-semibold text-slate-900">
              {toFunctionLabel(frame.functionName)}
            </h3>
          </div>
        </div>
        <span
          className={cx(
            "shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ring-1",
            frame.active && "border-sky-200 bg-sky-50 text-sky-700",
            frame.highlighted &&
              !frame.active &&
              "bg-amber-100 text-amber-800 ring-amber-200",
            frame.status === "returned" &&
              "bg-emerald-100 text-emerald-700 ring-emerald-200",
            frame.status === "error" &&
              "bg-rose-100 text-rose-700 ring-rose-200",
            !frame.active &&
              !frame.highlighted &&
              frame.status !== "returned" &&
              frame.status !== "error" &&
              "bg-slate-50 text-slate-600 ring-slate-200",
          )}
        >
          {statusLabel[frame.status]}
        </span>
      </div>

      <div>
        <BindingChips bindings={{ ...frame.parameters, ...frame.locals }} />
        {hasReturnValue ? (
          <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[11px] ring-1 ring-emerald-200">
            <span className="shrink-0 text-emerald-700">返回</span>
            <code className="min-w-0 truncate font-mono text-emerald-800">
              {formatValue(frame.returnValue)}
            </code>
          </div>
        ) : null}
      </div>
    </li>
  );
};

export const CallStackView = ({
  model,
  className,
  emptyLabel = "当前步骤暂无递归调用",
}: CallStackViewProps) => {
  const frames = [...model.frames].reverse();
  const visibleFrames = frames.slice(0, 5);
  const hiddenCount = Math.max(0, frames.length - visibleFrames.length);

  return (
    <section
      className={cx(
        "flex h-full min-h-0 flex-col rounded-md border border-slate-200 bg-white",
        className,
      )}
      data-overlay-id={model.id}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 className="truncate text-sm font-semibold text-slate-900">
          {model.title}
        </h2>
        <span className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
          {model.frames.length} 层
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2.5">
        {frames.length ? (
          <ol className="space-y-1.5">
            {visibleFrames.map((frame) => (
              <FrameCard frame={frame} key={frame.id} />
            ))}
            {hiddenCount > 0 ? (
              <li className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-center text-[11px] text-slate-500">
                其余 {hiddenCount} 层递归已折叠
              </li>
            ) : null}
          </ol>
        ) : (
          <div className="flex h-full min-h-28 items-center justify-center rounded border border-dashed border-slate-100 bg-slate-50/50 px-3 text-center text-xs text-slate-400">
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default CallStackView;
