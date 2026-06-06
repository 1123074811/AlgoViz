import { describe, expect, it } from "vitest";

import {
  compileCallStackEvents,
  reduceCallStackEvent,
} from "../callStackCompiler";
import type { CallStackEvent } from "../../overlays/callStackTypes";

describe("callStackCompiler", () => {
  it("pushes a frame and marks it active", () => {
    const result = compileCallStackEvents([
      { type: "callstack.create", id: "main" },
      {
        type: "callstack.push",
        id: "main",
        frame: {
          id: "fib-3",
          functionName: "fib",
          parameters: { n: 3 },
        },
      },
    ]);

    expect(result.model.frames).toHaveLength(1);
    expect(result.model.activeFrameId).toBe("fib-3");
    expect(result.model.frames[0]).toMatchObject({
      id: "fib-3",
      functionName: "fib",
      parameters: { n: 3 },
      active: true,
      status: "active",
      depth: 0,
    });
    expect(result.commands[result.commands.length - 1]).toMatchObject({
      type: "overlay.callstack.patch",
      reason: "callstack.push",
      id: "main",
    });
  });

  it("updates locals without replacing the frame identity", () => {
    const created = reduceCallStackEvent(undefined, {
      type: "callstack.create",
      frames: [
        {
          id: "partition",
          functionName: "partition",
          parameters: { lo: 0, hi: 4 },
        },
      ],
    });
    const updated = reduceCallStackEvent(created, {
      type: "callstack.update",
      frameId: "partition",
      locals: { pivot: 7, i: 1 },
    });

    expect(updated.frames).toHaveLength(1);
    expect(updated.frames[0]).toMatchObject({
      id: "partition",
      parameters: { lo: 0, hi: 4 },
      locals: { pivot: 7, i: 1 },
      status: "active",
    });
  });

  it("records return values and activates the caller", () => {
    const result = compileCallStackEvents([
      { type: "callstack.create" },
      {
        type: "callstack.push",
        frame: { id: "fib-3", functionName: "fib", parameters: { n: 3 } },
      },
      {
        type: "callstack.push",
        frame: { id: "fib-2", functionName: "fib", parameters: { n: 2 } },
      },
      {
        type: "callstack.return",
        frameId: "fib-2",
        value: 1,
      },
    ]);

    expect(result.model.activeFrameId).toBe("fib-3");
    expect(result.model.frames.find((frame) => frame.id === "fib-2")).toMatchObject({
      returnValue: 1,
      status: "returned",
      active: false,
    });
    expect(result.model.frames.find((frame) => frame.id === "fib-3")).toMatchObject({
      status: "active",
      active: true,
    });
  });

  it("pops the top frame and reindexes depths", () => {
    const events: CallStackEvent[] = [
      { type: "callstack.create" },
      { type: "callstack.push", frame: { id: "root", functionName: "root" } },
      { type: "callstack.push", frame: { id: "child", functionName: "child" } },
      { type: "callstack.pop" },
    ];
    const result = compileCallStackEvents(events);

    expect(result.model.frames.map((frame) => frame.id)).toEqual(["root"]);
    expect(result.model.frames[0]).toMatchObject({
      depth: 0,
      active: true,
      status: "active",
    });
    expect(result.model.activeFrameId).toBe("root");
  });

  it("highlights selected frames and can make one active", () => {
    const result = compileCallStackEvents([
      { type: "callstack.create" },
      { type: "callstack.push", frame: { id: "a", functionName: "a" } },
      { type: "callstack.push", frame: { id: "b", functionName: "b" } },
      {
        type: "callstack.highlight",
        frameId: "a",
        clear: true,
        active: true,
      },
    ]);

    expect(result.model.highlightedFrameIds).toEqual(["a"]);
    expect(result.model.activeFrameId).toBe("a");
    expect(result.model.frames.find((frame) => frame.id === "a")).toMatchObject({
      highlighted: true,
      active: true,
      status: "active",
    });
    expect(result.model.frames.find((frame) => frame.id === "b")).toMatchObject({
      highlighted: false,
      active: false,
      status: "pending",
    });
  });
});
