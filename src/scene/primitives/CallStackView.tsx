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
  pending: "Waiting",
  active: "Active",
  returned: "Returned",
  popped: "Popped",
  error: "Error",
};

const formatValue = (value: CallStackValue): string => {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
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

const BindingList = ({
  label,
  bindings,
}: {
  label: string;
  bindings: CallStackBindings;
}) => {
  const entries = Object.entries(bindings);

  if (!entries.length) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-normal text-slate-500">
        {label}
      </div>
      <dl className="grid grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
        {entries.map(([name, value]) => (
          <div className="contents" key={name}>
            <dt className="min-w-0 truncate font-medium text-slate-500">
              {name}
            </dt>
            <dd className="min-w-0 truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const FrameCard = ({ frame }: { frame: CallStackFrame }) => {
  const hasReturnValue =
    frame.returnValue !== undefined || frame.status === "returned";

  return (
    <li
      className={cx(
        "relative rounded-md border bg-white p-3 shadow-sm transition-colors",
        frame.active && "border-sky-500 ring-2 ring-sky-100",
        frame.highlighted && !frame.active && "border-amber-400 bg-amber-50",
        frame.status === "returned" && "border-emerald-300 bg-emerald-50",
        frame.status === "error" && "border-rose-400 bg-rose-50",
        !frame.active &&
          !frame.highlighted &&
          frame.status !== "returned" &&
          frame.status !== "error" &&
          "border-slate-200",
      )}
      style={{ marginLeft: `${frame.depth * 10}px` }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
              {frame.depth}
            </span>
            <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {frame.functionName}
            </h3>
          </div>
        </div>
        <span
          className={cx(
            "shrink-0 rounded border px-2 py-0.5 text-[11px] font-medium",
            frame.active && "border-sky-200 bg-sky-50 text-sky-700",
            frame.highlighted &&
              !frame.active &&
              "border-amber-200 bg-amber-100 text-amber-800",
            frame.status === "returned" &&
              "border-emerald-200 bg-emerald-100 text-emerald-700",
            frame.status === "error" &&
              "border-rose-200 bg-rose-100 text-rose-700",
            !frame.active &&
              !frame.highlighted &&
              frame.status !== "returned" &&
              frame.status !== "error" &&
              "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          {statusLabel[frame.status]}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <BindingList label="Parameters" bindings={frame.parameters} />
        <BindingList label="Locals" bindings={frame.locals} />
        {hasReturnValue ? (
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="shrink-0 font-medium text-slate-500">Return</span>
            <code className="min-w-0 truncate rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800">
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
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-500">
          {model.frames.length}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {frames.length ? (
          <ol className="space-y-2">
            {frames.map((frame) => (
              <FrameCard frame={frame} key={frame.id} />
            ))}
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
