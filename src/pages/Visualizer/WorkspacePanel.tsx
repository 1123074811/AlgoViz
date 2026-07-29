import type { OnMount } from '@monaco-editor/react'
import type { AlgorithmType } from '@/store/algorithmStore'
import type { CodeLang } from '@/data/algorithms'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import WorkbenchTerminal, { type TerminalRunState } from '@/components/Editor/WorkbenchTerminal'
import type { Diagnostic } from '@/utils/codeCompiler'
import type { InputCompilation } from '@/workbench/inputCompiler'
import { CodeDesyncNotice } from './CodeDesyncNotice'

interface WorkspacePanelProps {
  selectedAlgorithm: AlgorithmType
  code: string
  defaultCode: string
  codeLanguage: CodeLang
  setCodeLanguage: (lang: CodeLang) => void
  setCode: (code: string) => void
  codeDiagnostics: Diagnostic[]
  showCodeDesync: boolean
  aiAnalyzing: boolean
  onAIAnalyze: () => void
  onEditorMount: OnMount
  editorHeight: number
  isDesktop: boolean
  inputFormat: 'leetcode' | 'json'
  setInputFormat: (format: 'leetcode' | 'json') => void
  inputData: string
  setInputData: (value: string) => void
  hasOperations: boolean | undefined
  currentOperationId: string
  operationParam: string
  setOperationParam: (value: string) => void
  inputCompilation: InputCompilation
  operationCompilation: InputCompilation | null
  terminalRunState: TerminalRunState
  workbenchDirty: boolean
  interactiveProgram: boolean
  onRun: () => void
  onRuntimeInput: (value: string) => void
  lang: 'zh' | 'en'
  t: (key: string) => string
  handleEditorHeightResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void
}

export default function WorkspacePanel({
  selectedAlgorithm,
  code,
  defaultCode,
  codeLanguage,
  setCodeLanguage,
  setCode,
  codeDiagnostics,
  showCodeDesync,
  aiAnalyzing,
  onAIAnalyze,
  onEditorMount,
  editorHeight,
  isDesktop,
  inputFormat,
  setInputFormat,
  inputData,
  setInputData,
  hasOperations,
  currentOperationId,
  operationParam,
  setOperationParam,
  inputCompilation,
  operationCompilation,
  terminalRunState,
  workbenchDirty,
  interactiveProgram,
  onRun,
  onRuntimeInput,
  lang,
  t,
  handleEditorHeightResizeStart,
}: WorkspacePanelProps) {
  return (
    <>
      <div
        className="flex-1 xl:flex-none flex flex-col min-h-0"
        style={isDesktop ? { height: `${editorHeight}%` } : undefined}
      >
        {showCodeDesync && (
          <CodeDesyncNotice
            analyzing={aiAnalyzing}
            onAnalyze={onAIAnalyze}
            onRestore={() => setCode(defaultCode)}
          />
        )}
        <CodeEditorPanel
          value={code}
          language={codeLanguage}
          onChange={setCode}
          onMount={onEditorMount}
          diagnostics={codeDiagnostics}
          disabled={aiAnalyzing}
          title={selectedAlgorithm.name}
          className="flex-1"
          rightSlot={
            <>
              <select
                value={codeLanguage}
                onChange={(e) => {
                  const nextLang = e.target.value as CodeLang
                  setCodeLanguage(nextLang)
                  localStorage.setItem('algoviz-editor-code-lang', nextLang)
                }}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border
                         bg-white text-slate-600 outline-none cursor-pointer
                         focus:border-primary"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
              {selectedAlgorithm.hasPreset && (
                <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                  {t('sidebar.presetBadge')}
                </span>
              )}
            </>
          }
        />
      </div>

      <div
        onMouseDown={handleEditorHeightResizeStart}
        className="hidden xl:flex h-[6px] hover:h-[10px] w-full cursor-row-resize hover:bg-primary/10 hover:border-t hover:border-b hover:border-primary/20 transition-all shrink-0 select-none items-center justify-center bg-slate-50 border-t border-b border-border group"
        title={lang === 'zh' ? '拖动调整高度' : 'Drag to resize'}
      >
        <div className="h-[1.5px] w-5 bg-slate-300 group-hover:bg-primary rounded-full transition-all" />
      </div>

      <div
        className="xl:flex-none flex flex-col xl:overflow-hidden overflow-y-auto shrink-0 min-h-0"
        style={isDesktop ? { height: `${100 - editorHeight}%` } : undefined}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {!interactiveProgram && <div className="flex items-center gap-1.5 px-1.5 py-1 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              {lang === 'zh' ? '格式' : 'Fmt'}
            </span>
            <select
              value={inputFormat}
              onChange={(e) => {
                const format = e.target.value as 'leetcode' | 'json'
                setInputFormat(format)
                localStorage.setItem('algoviz-input-format', format)
              }}
              className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="leetcode">LeetCode</option>
              <option value="json">JSON</option>
            </select>
          </div>}
          <WorkbenchTerminal
            input={inputData}
            onInputChange={setInputData}
            operationInput={hasOperations ? operationParam : undefined}
            onOperationInputChange={hasOperations ? setOperationParam : undefined}
            operationLabel={currentOperationId || 'arg'}
            inputCompilation={inputCompilation}
            operationCompilation={operationCompilation}
            codeDiagnostics={codeDiagnostics}
            runState={terminalRunState}
            dirty={workbenchDirty}
            interactive={interactiveProgram}
            disabled={aiAnalyzing}
            onRun={onRun}
            onRuntimeInput={onRuntimeInput}
            lang={lang}
          />
        </div>
      </div>
    </>
  )
}
