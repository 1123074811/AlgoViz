import { useState } from 'react'
import type { Diagnostic } from '@/utils/codeCompiler'
import type { InputCompilation } from '@/workbench/inputCompiler'

export interface TerminalRunState {
  status: 'waiting' | 'running' | 'waiting-input' | 'ready' | 'error'
  output?: string
  stderr?: string
  result?: string
  message?: string
  stdinPrompt?: string
  interactive?: boolean
  traceDiagnostics?: string[]
}

interface WorkbenchTerminalProps {
  input: string
  onInputChange: (value: string) => void
  operationInput?: string
  onOperationInputChange?: (value: string) => void
  operationLabel?: string
  inputCompilation: InputCompilation
  operationCompilation?: InputCompilation | null
  codeDiagnostics: Diagnostic[]
  runState: TerminalRunState
  dirty: boolean
  interactive?: boolean
  disabled?: boolean
  onRun: () => void
  onRuntimeInput?: (value: string) => void
  lang: 'zh' | 'en'
}

export default function WorkbenchTerminal({
  input,
  onInputChange,
  operationInput,
  onOperationInputChange,
  operationLabel,
  inputCompilation,
  operationCompilation,
  codeDiagnostics,
  runState,
  dirty,
  interactive = false,
  disabled = false,
  onRun,
  onRuntimeInput,
  lang,
}: WorkbenchTerminalProps) {
  const [runtimeInput, setRuntimeInput] = useState('')
  const errors = codeDiagnostics.filter(item => item.severity === 'error')
  const inputDiagnostic = inputCompilation.diagnostics[0]
  const operationDiagnostic = operationCompilation?.diagnostics[0]
  const prompt = interactive
    ? runState.status === 'waiting-input'
        ? (runState.stdinPrompt || (lang === 'zh' ? '程序正在等待输入' : 'Program is waiting for input'))
        : dirty && runState.status !== 'running' && !runState.interactive
          ? (lang === 'zh' ? '代码已修改，按 Ctrl+Enter 编译运行' : 'Code changed; press Ctrl+Enter to compile and run')
          : runState.message
    : inputCompilation.status === 'incomplete'
      ? (lang === 'zh' ? '等待输入完成…' : 'Waiting for input to complete…')
      : inputCompilation.status === 'error'
        ? inputDiagnostic?.message
        : dirty
          ? (lang === 'zh' ? '输入已修改，按 Ctrl+Enter 编译运行' : 'Input changed; press Ctrl+Enter to compile and run')
          : runState.message

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      if (!disabled) onRun()
    }
  }

  const submitRuntimeInput = () => {
    if (runState.status !== 'waiting-input' || !onRuntimeInput) return
    onRuntimeInput(runtimeInput)
    setRuntimeInput('')
  }

  return (
    <section className="flex-1 min-h-0 bg-slate-950 text-slate-200 font-code flex flex-col border-t border-slate-800">
      <header className="h-8 px-3 flex items-center justify-between border-b border-slate-800 bg-slate-900 shrink-0">
        <span className="text-[11px] font-semibold tracking-wide text-slate-300">TERMINAL · AlgoViz</span>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled || runState.status === 'running' || runState.status === 'waiting-input'}
          className="rounded border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runState.status === 'running'
            ? (lang === 'zh' ? '运行中…' : 'Running…')
            : runState.status === 'waiting-input'
              ? (lang === 'zh' ? '等待输入…' : 'Waiting for input…')
            : (lang === 'zh' ? '运行 Ctrl+Enter' : 'Run Ctrl+Enter')}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2 text-xs leading-relaxed">
        {!interactive && (
          <label className="flex items-start gap-2">
            <span className="select-none text-sky-400 shrink-0">stdin&gt;</span>
            <textarea
              value={input}
              onChange={event => onInputChange(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              spellCheck={false}
              rows={Math.max(3, Math.min(8, input.split('\n').length + 1))}
              className="min-h-16 flex-1 resize-y border-0 bg-transparent p-0 text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-60"
            />
          </label>
        )}

        {!interactive && operationInput !== undefined && onOperationInputChange && (
          <label className="mt-2 flex items-center gap-2 border-t border-slate-800 pt-2">
            <span className="select-none text-violet-400 shrink-0">{operationLabel ?? 'arg'}&gt;</span>
            <input
              value={operationInput}
              onChange={event => onOperationInputChange(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-slate-100 outline-none disabled:opacity-60"
            />
          </label>
        )}

        <div className="mt-2 border-t border-slate-800 pt-2 whitespace-pre-wrap break-words">
          {errors.map((error, index) => (
            <div key={`${error.type}-${error.line}-${index}`} className="text-red-300">
              [compile:{error.type}] {error.line}:{error.column ?? 1} {error.message}
            </div>
          ))}
          {runState.traceDiagnostics?.map((diagnostic, index) => (
            <div key={`${diagnostic}-${index}`} className="text-red-300">
              {diagnostic}
            </div>
          ))}
          {!interactive && inputCompilation.status !== 'ready' && inputDiagnostic && (
            <div className={inputCompilation.status === 'incomplete' ? 'text-amber-300' : 'text-red-300'}>
              [stdin:{inputDiagnostic.code}] {inputDiagnostic.line}:{inputDiagnostic.column} {inputDiagnostic.message}
            </div>
          )}
          {!interactive && operationCompilation && operationCompilation.status !== 'ready' && operationDiagnostic && (
            <div className={operationCompilation.status === 'incomplete' ? 'text-amber-300' : 'text-red-300'}>
              [arg:{operationDiagnostic.code}] {operationDiagnostic.line}:{operationDiagnostic.column} {operationDiagnostic.message}
            </div>
          )}
          {prompt && errors.length === 0 && (
            <div className={runState.status === 'error' ? 'text-red-300' : 'text-slate-400'}>
              [runtime] {prompt}
            </div>
          )}
          {runState.output !== undefined && (interactive || (!dirty && inputCompilation.status === 'ready')) && (
            <div className="mt-1 text-emerald-300">
              <span className="text-emerald-500">stdout&gt; </span>
              {runState.output}
            </div>
          )}
          {runState.stderr && (
            <div className="mt-1 text-red-300">
              <span className="text-red-500">stderr&gt; </span>
              {runState.stderr}
            </div>
          )}
          {runState.result !== undefined && (
            <div className="mt-1 text-violet-300">
              <span className="text-violet-500">result&gt; </span>
              {runState.result}
            </div>
          )}
          {interactive && runState.status === 'waiting-input' && (
            <label className="mt-2 flex items-center gap-2 border-t border-slate-800 pt-2">
              <span className="select-none text-sky-400 shrink-0">stdin&gt;</span>
              <input
                autoFocus
                value={runtimeInput}
                onChange={event => setRuntimeInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submitRuntimeInput()
                  }
                }}
                disabled={disabled}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-slate-100 outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={submitRuntimeInput}
                disabled={disabled}
                className="text-[10px] text-sky-300 hover:text-sky-200 disabled:opacity-50"
              >
                Enter
              </button>
            </label>
          )}
        </div>
      </div>
    </section>
  )
}
