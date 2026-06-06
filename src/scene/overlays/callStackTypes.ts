export type CallStackFrameStatus =
  | "pending"
  | "active"
  | "returned"
  | "popped"
  | "error";

export type CallStackValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly CallStackValue[]
  | { readonly [key: string]: CallStackValue };

export type CallStackBindings = Record<string, CallStackValue>;

export interface CallStackFrame {
  id: string;
  functionName: string;
  parameters: CallStackBindings;
  locals: CallStackBindings;
  returnValue?: CallStackValue;
  status: CallStackFrameStatus;
  active: boolean;
  highlighted: boolean;
  depth: number;
}

export interface CallStackFrameInput {
  id?: string;
  functionName: string;
  parameters?: CallStackBindings;
  locals?: CallStackBindings;
  returnValue?: CallStackValue;
  status?: CallStackFrameStatus;
  active?: boolean;
  highlighted?: boolean;
}

export interface CallStackModel {
  id: string;
  title: string;
  frames: CallStackFrame[];
  activeFrameId?: string;
  highlightedFrameIds: string[];
  maxFrames?: number;
}

export type CallStackEvent =
  | {
      type: "callstack.create";
      id?: string;
      title?: string;
      frames?: CallStackFrameInput[];
      activeFrameId?: string;
      highlightedFrameIds?: string[];
      maxFrames?: number;
    }
  | {
      type: "callstack.push";
      id?: string;
      frame: CallStackFrameInput;
      active?: boolean;
    }
  | {
      type: "callstack.update";
      id?: string;
      frameId?: string;
      index?: number;
      updates?: Partial<
        Pick<
          CallStackFrame,
          | "functionName"
          | "parameters"
          | "locals"
          | "returnValue"
          | "status"
          | "active"
          | "highlighted"
        >
      >;
      parameters?: CallStackBindings;
      locals?: CallStackBindings;
    }
  | {
      type: "callstack.return";
      id?: string;
      frameId?: string;
      index?: number;
      value?: CallStackValue;
      pop?: boolean;
    }
  | {
      type: "callstack.pop";
      id?: string;
      frameId?: string;
      index?: number;
      count?: number;
    }
  | {
      type: "callstack.highlight";
      id?: string;
      frameId?: string;
      frameIds?: string[];
      index?: number;
      active?: boolean;
      clear?: boolean;
    };

export interface CallStackOverlayCommand {
  type: "overlay.callstack.set";
  overlay: "callstack";
  id: string;
  model: CallStackModel;
  reason: CallStackEvent["type"];
}

export interface CallStackOverlayPatchCommand {
  type: "overlay.callstack.patch";
  overlay: "callstack";
  id: string;
  patch: Partial<CallStackModel>;
  model: CallStackModel;
  reason: CallStackEvent["type"];
}

export type CallStackSceneCommand =
  | CallStackOverlayCommand
  | CallStackOverlayPatchCommand;

export interface CallStackCompilerResult {
  model: CallStackModel;
  commands: CallStackSceneCommand[];
}
