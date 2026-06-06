import type {
  CallStackCompilerResult,
  CallStackEvent,
  CallStackFrame,
  CallStackFrameInput,
  CallStackModel,
  CallStackOverlayPatchCommand,
  CallStackSceneCommand,
} from "../overlays/callStackTypes";

const DEFAULT_STACK_ID = "callstack";
const DEFAULT_STACK_TITLE = "Call Stack";

const last = <T>(items: T[]): T | undefined => items[items.length - 1];

const createEmptyModel = (id = DEFAULT_STACK_ID): CallStackModel => ({
  id,
  title: DEFAULT_STACK_TITLE,
  frames: [],
  highlightedFrameIds: [],
});

const normalizeBindings = (
  bindings: CallStackFrameInput["parameters"],
) => bindings ?? {};

const normalizeFrame = (
  frame: CallStackFrameInput,
  depth: number,
  fallbackId: string,
): CallStackFrame => ({
  id: frame.id ?? fallbackId,
  functionName: frame.functionName,
  parameters: normalizeBindings(frame.parameters),
  locals: normalizeBindings(frame.locals),
  returnValue: frame.returnValue,
  status: frame.status ?? (frame.active ? "active" : "pending"),
  active: frame.active ?? false,
  highlighted: frame.highlighted ?? false,
  depth,
});

const reindexFrames = (frames: CallStackFrame[]): CallStackFrame[] =>
  frames.map((frame, index) => ({ ...frame, depth: index }));

const setActiveFrame = (
  model: CallStackModel,
  activeFrameId: string | undefined,
): CallStackModel => {
  const resolvedActiveFrameId = model.frames.some(
    (frame) =>
      frame.id === activeFrameId &&
      frame.status !== "returned" &&
      frame.status !== "popped",
  )
    ? activeFrameId
    : undefined;

  return {
    ...model,
    activeFrameId: resolvedActiveFrameId,
    frames: model.frames.map((frame) => ({
      ...frame,
      active: frame.id === resolvedActiveFrameId,
      status:
        frame.id === resolvedActiveFrameId
          ? "active"
          : frame.status === "active"
            ? "pending"
            : frame.status,
    })),
  };
};

const setHighlightedFrames = (
  model: CallStackModel,
  highlightedFrameIds: string[],
): CallStackModel => {
  const frameIds = new Set(model.frames.map((frame) => frame.id));
  const uniqueIds = [...new Set(highlightedFrameIds)].filter((frameId) =>
    frameIds.has(frameId),
  );

  return {
    ...model,
    highlightedFrameIds: uniqueIds,
    frames: model.frames.map((frame) => ({
      ...frame,
      highlighted: uniqueIds.includes(frame.id),
    })),
  };
};

const resolveFrameIndex = (
  model: CallStackModel,
  selector: { frameId?: string; index?: number },
): number => {
  if (selector.frameId) {
    return model.frames.findIndex((frame) => frame.id === selector.frameId);
  }

  if (typeof selector.index === "number") {
    const resolvedIndex =
      selector.index < 0 ? model.frames.length + selector.index : selector.index;
    return resolvedIndex >= 0 && resolvedIndex < model.frames.length
      ? resolvedIndex
      : -1;
  }

  return model.frames.length - 1;
};

const resolveFrameId = (
  model: CallStackModel,
  selector: { frameId?: string; index?: number },
): string | undefined => {
  const index = resolveFrameIndex(model, selector);
  return index >= 0 ? model.frames[index]?.id : undefined;
};

const commandFor = (
  previousModel: CallStackModel | undefined,
  model: CallStackModel,
  reason: CallStackEvent["type"],
): CallStackSceneCommand => {
  if (!previousModel || reason === "callstack.create") {
    return {
      type: "overlay.callstack.set",
      overlay: "callstack",
      id: model.id,
      model,
      reason,
    };
  }

  const patch: CallStackOverlayPatchCommand["patch"] = {};

  if (previousModel.title !== model.title) {
    patch.title = model.title;
  }

  if (previousModel.activeFrameId !== model.activeFrameId) {
    patch.activeFrameId = model.activeFrameId;
  }

  if (previousModel.maxFrames !== model.maxFrames) {
    patch.maxFrames = model.maxFrames;
  }

  if (previousModel.frames !== model.frames) {
    patch.frames = model.frames;
  }

  if (previousModel.highlightedFrameIds !== model.highlightedFrameIds) {
    patch.highlightedFrameIds = model.highlightedFrameIds;
  }

  return {
    type: "overlay.callstack.patch",
    overlay: "callstack",
    id: model.id,
    patch,
    model,
    reason,
  };
};

export const reduceCallStackEvent = (
  currentModel: CallStackModel | undefined,
  event: CallStackEvent,
): CallStackModel => {
  const id = event.id ?? currentModel?.id ?? DEFAULT_STACK_ID;
  let model = currentModel ?? createEmptyModel(id);

  if (model.id !== id) {
    model = createEmptyModel(id);
  }

  switch (event.type) {
    case "callstack.create": {
      const frames = reindexFrames(
        (event.frames ?? []).map((frame, index) =>
          normalizeFrame(frame, index, `${id}:frame:${index}`),
        ),
      );
      const activeFrameId =
        event.activeFrameId ??
        frames.find((frame) => frame.active)?.id ??
        last(frames)?.id;

      return setHighlightedFrames(
        setActiveFrame(
          {
            id,
            title: event.title ?? DEFAULT_STACK_TITLE,
            frames,
            highlightedFrameIds: [],
            maxFrames: event.maxFrames,
          },
          activeFrameId,
        ),
        event.highlightedFrameIds ??
          frames.filter((frame) => frame.highlighted).map((frame) => frame.id),
      );
    }

    case "callstack.push": {
      const nextFrame = normalizeFrame(
        event.frame,
        model.frames.length,
        `${id}:frame:${model.frames.length}`,
      );
      const frames = reindexFrames([...model.frames, nextFrame]);
      const trimmedFrames =
        typeof model.maxFrames === "number" && frames.length > model.maxFrames
          ? frames.slice(frames.length - model.maxFrames)
          : frames;
      const nextModel = setHighlightedFrames(
        {
          ...model,
          frames: reindexFrames(trimmedFrames),
        },
        nextFrame.highlighted
          ? [...model.highlightedFrameIds, nextFrame.id]
          : model.highlightedFrameIds,
      );

      return setActiveFrame(
        nextModel,
        event.active === false ? model.activeFrameId : nextFrame.id,
      );
    }

    case "callstack.update": {
      const frameIndex = resolveFrameIndex(model, event);

      if (frameIndex < 0) {
        return model;
      }

      const frames = model.frames.map((frame, index) => {
        if (index !== frameIndex) {
          return frame;
        }

        return {
          ...frame,
          ...event.updates,
          parameters: event.parameters ?? event.updates?.parameters ?? frame.parameters,
          locals: event.locals ?? event.updates?.locals ?? frame.locals,
        };
      });
      let nextModel = { ...model, frames: reindexFrames(frames) };
      const updatedFrame = nextModel.frames[frameIndex];

      if (updatedFrame?.active) {
        nextModel = setActiveFrame(nextModel, updatedFrame.id);
      } else if (
        event.updates?.active === false &&
        model.activeFrameId === updatedFrame?.id
      ) {
        nextModel = setActiveFrame(nextModel, undefined);
      }

      if (typeof updatedFrame?.highlighted === "boolean") {
        const highlightedIds = nextModel.frames
          .filter((frame) => frame.highlighted)
          .map((frame) => frame.id);
        nextModel = setHighlightedFrames(nextModel, highlightedIds);
      }

      return nextModel;
    }

    case "callstack.return": {
      const frameIndex = resolveFrameIndex(model, event);

      if (frameIndex < 0) {
        return model;
      }

      const returnedFrameId = model.frames[frameIndex]?.id;
      const frames = model.frames.map((frame, index) =>
        index === frameIndex
          ? {
              ...frame,
              returnValue: event.value,
              status: "returned" as const,
              active: false,
            }
          : frame,
      );
      let nextModel: CallStackModel = {
        ...model,
        frames: reindexFrames(frames),
        activeFrameId:
          model.activeFrameId === returnedFrameId
            ? undefined
            : model.activeFrameId,
      };

      if (event.pop) {
        return reduceCallStackEvent(nextModel, {
          type: "callstack.pop",
          id,
          frameId: returnedFrameId,
        });
      }

      if (!nextModel.activeFrameId) {
        const nextActive = [...nextModel.frames]
          .reverse()
          .find((frame) => frame.status !== "returned")?.id;
        nextModel = setActiveFrame(nextModel, nextActive);
      }

      return nextModel;
    }

    case "callstack.pop": {
      const count = Math.max(1, event.count ?? 1);
      const frameIndex = resolveFrameIndex(model, event);

      if (frameIndex < 0) {
        return model;
      }

      const removeStart =
        event.frameId || typeof event.index === "number"
          ? frameIndex
          : Math.max(0, model.frames.length - count);
      const removeEnd =
        event.frameId || typeof event.index === "number"
          ? Math.min(model.frames.length, frameIndex + count)
          : model.frames.length;
      const removedIds = model.frames
        .slice(removeStart, removeEnd)
        .map((frame) => frame.id);
      const frames = reindexFrames([
        ...model.frames.slice(0, removeStart),
        ...model.frames.slice(removeEnd),
      ]);
      const activeFrameId =
        !model.activeFrameId || removedIds.includes(model.activeFrameId)
          ? last(frames)?.id
          : model.activeFrameId;
      const nextModel = {
        ...model,
        frames,
        activeFrameId,
        highlightedFrameIds: model.highlightedFrameIds.filter(
          (frameId) => !removedIds.includes(frameId),
        ),
      };

      return setHighlightedFrames(setActiveFrame(nextModel, activeFrameId), nextModel.highlightedFrameIds);
    }

    case "callstack.highlight": {
      const selectedFrameIds = [
        ...(event.frameIds ?? []),
        ...(event.frameId ? [event.frameId] : []),
        ...(typeof event.index === "number"
          ? [resolveFrameId(model, { index: event.index })].filter(
              (frameId): frameId is string => Boolean(frameId),
            )
          : []),
      ];
      const nextHighlightedIds = event.clear
        ? selectedFrameIds
        : [...model.highlightedFrameIds, ...selectedFrameIds];
      let nextModel = setHighlightedFrames(model, nextHighlightedIds);

      if (event.active && selectedFrameIds[0]) {
        nextModel = setActiveFrame(nextModel, selectedFrameIds[0]);
      }

      return nextModel;
    }

    default:
      return model;
  }
};

export const compileCallStackEvent = (
  currentModel: CallStackModel | undefined,
  event: CallStackEvent,
): CallStackCompilerResult => {
  const model = reduceCallStackEvent(currentModel, event);

  return {
    model,
    commands: [commandFor(currentModel, model, event.type)],
  };
};

export const compileCallStackEvents = (
  events: CallStackEvent[],
  initialModel?: CallStackModel,
): CallStackCompilerResult => {
  let model = initialModel;
  const commands: CallStackSceneCommand[] = [];

  for (const event of events) {
    const next = compileCallStackEvent(model, event);

    model = next.model;
    commands.push(...next.commands);
  }

  return {
    model: model ?? createEmptyModel(),
    commands,
  };
};

export type {
  CallStackCompilerResult,
  CallStackEvent,
  CallStackModel,
  CallStackSceneCommand,
};
