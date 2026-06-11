import type { OnMount } from '@monaco-editor/react'
import type { AnimationScript } from '@/types/animation'
import type { VisualState } from '@/hooks/useAnimationEngine'
import type { AlgorithmType } from '@/store/algorithmStore'
import type { CodeLang } from '@/data/algorithms'
import { ALGORITHM_DEFAULT_INPUTS } from '@/data/algorithms'
import CodeEditorPanel from '@/components/Editor/CodeEditorPanel'
import InputDataPanel from '@/components/Editor/InputDataPanel'
import RunDataPanel from '@/components/Editor/RunDataPanel'
import type { Diagnostic } from '@/utils/codeCompiler'
import { parseInputData } from '@/ai'
import { getLeetCodeDefault, getLeetCodePlaceholder } from '@/utils/inputParser'
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
  animationScript: AnimationScript | null
  visualState: VisualState
  currentStep: number
  totalSteps: number
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
  animationScript,
  visualState,
  currentStep,
  totalSteps,
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
          <div className="flex items-center gap-1.5 px-1.5 py-1 border-b border-border bg-muted/30 shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              {lang === 'zh' ? '格式' : 'Fmt'}
            </span>
            <select
              value={inputFormat}
              onChange={(e) => {
                const format = e.target.value as 'leetcode' | 'json'
                setInputFormat(format)
                localStorage.setItem('algoviz-input-format', format)
                if (selectedAlgorithm.id) {
                  if (format === 'leetcode') {
                    const lcDefault = getLeetCodeDefault(selectedAlgorithm.id)
                    if (lcDefault) setInputData(lcDefault)
                  } else {
                    const defInput = ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]
                    if (defInput) setInputData(defInput.value)
                  }
                }
              }}
              className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="leetcode">LeetCode</option>
              <option value="json">JSON</option>
            </select>
          </div>
          {hasOperations ? (
            <div className="flex flex-col gap-2 flex-1 min-h-0 p-1">
              <InputDataPanel
                value={inputData}
                onChange={setInputData}
                title={lang === 'zh' ? '原始数据 (初始结构)' : 'Original Data (Initial Structure)'}
                helperText={lang === 'zh' ? '用于构建初始数据结构的数组' : 'Initial elements for building the data structure'}
                placeholder={
                  inputFormat === 'leetcode'
                    ? getLeetCodePlaceholder(selectedAlgorithm.id)
                    : (ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]?.value ?? '[5, 3, 8, 1, 9, 2]')
                }
                disabled={aiAnalyzing}
                className="h-24 xl:flex-1 xl:h-auto xl:min-h-0"
              />
              <InputDataPanel
                value={operationParam}
                onChange={setOperationParam}
                title={(() => {
                  if (currentOperationId === 'insert') return lang === 'zh' ? '操作输入 (插入节点的值)' : 'Operation Parameter (Value to Insert)'
                  if (currentOperationId === 'delete') return lang === 'zh' ? '操作输入 (删除节点的值)' : 'Operation Parameter (Value to Delete)'
                  if (currentOperationId === 'range_query') return lang === 'zh' ? '操作输入 (范围查询 low, high)' : 'Operation Parameter (Range Query low, high)'
                  return lang === 'zh' ? '操作输入 (查找节点的值)' : 'Operation Parameter (Value to Search)'
                })()}
                helperText={
                  currentOperationId === 'range_query'
                    ? lang === 'zh' ? '输入范围，如 30, 60' : 'Enter range, e.g. 30, 60'
                    : lang === 'zh' ? '输入一个具体的数值' : 'Enter a specific numeric value'
                }
                placeholder={currentOperationId === 'range_query' ? '30, 60' : '5'}
                disabled={aiAnalyzing}
                className="h-20 xl:h-24 xl:shrink-0"
              />
              <RunDataPanel
                script={animationScript}
                visualState={visualState}
                currentStep={currentStep}
                totalSteps={totalSteps}
                lang={lang}
                title={lang === 'zh' ? '操作输出' : 'Operation Output'}
                className="h-20 xl:h-24 xl:shrink-0"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1 min-h-0 p-1">
              <InputDataPanel
                value={inputData}
                onChange={setInputData}
                title={t('visualizer.inputData')}
                helperText={(() => {
                  const def = ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]
                  if (def) return def.hint
                  const info = parseInputData(inputData)
                  return info.valid ? `类型: ${info.kind} · ${info.summary}` : '支持数组、字符串、JSON 对象'
                })()}
                placeholder={(() => {
                  if (inputFormat === 'leetcode') return getLeetCodePlaceholder(selectedAlgorithm.id)
                  const def = ALGORITHM_DEFAULT_INPUTS[selectedAlgorithm.id]
                  return def?.value ?? '[5, 3, 8, 1, 9, 2]'
                })()}
                disabled={aiAnalyzing}
                className="h-28 xl:flex-1 xl:h-auto xl:min-h-0"
              />
              <RunDataPanel
                script={animationScript}
                visualState={visualState}
                currentStep={currentStep}
                totalSteps={totalSteps}
                lang={lang}
                className="h-20 xl:h-24 xl:shrink-0"
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
