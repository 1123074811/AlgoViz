import { useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'

export type SupportedCodeLanguage = 'python' | 'javascript' | 'cpp' | 'java' | string
export interface EditorDiagnostic {
  severity: 'error' | 'warning'
  type: string
  message: string
  line: number
  column?: number
  context?: string
}

interface CodeEditorPanelProps {
  value: string
  language: SupportedCodeLanguage
  onChange: (value: string) => void
  onMount?: OnMount
  diagnostics?: EditorDiagnostic[]
  disabled?: boolean
  title?: string
  subtitle?: string
  rightSlot?: React.ReactNode
  className?: string
}

export function mapMonacoLanguage(language: SupportedCodeLanguage): string {
  if (language === 'cpp') return 'cpp'
  if (language === 'javascript') return 'javascript'
  if (language === 'java') return 'java'
  return 'python'
}

export default function CodeEditorPanel({
  value,
  language,
  onChange,
  onMount,
  diagnostics = [],
  disabled = false,
  title,
  subtitle,
  rightSlot,
  className = '',
}: CodeEditorPanelProps) {
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    const model = editor?.getModel()
    if (!editor || !monaco || !model) return

    const markers = diagnostics.map((diagnostic) => {
      const lineNumber = Math.min(Math.max(diagnostic.line || 1, 1), model.getLineCount())
      const maxColumn = model.getLineMaxColumn(lineNumber)
      const startColumn = Math.min(Math.max(diagnostic.column || 1, 1), maxColumn)
      const endColumn = diagnostic.column
        ? Math.min(startColumn + 1, maxColumn)
        : maxColumn

      return {
        severity: diagnostic.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
        message: `[${diagnostic.type}] ${diagnostic.message}${diagnostic.context ? `\n${diagnostic.context}` : ''}`,
        startLineNumber: lineNumber,
        startColumn,
        endLineNumber: lineNumber,
        endColumn,
        source: 'AlgoViz',
      }
    })

    monaco.editor.setModelMarkers(model, 'algoviz-compiler', markers)
    return () => {
      monaco.editor.setModelMarkers(model, 'algoviz-compiler', [])
    }
  }, [diagnostics, value, language])

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    editor.addAction({
      id: 'duplicate-line-ctrl-d',
      label: 'Duplicate Line',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD
      ],
      run: (ed) => {
        ed.trigger('keyboard', 'editor.action.copyLinesDownAction', null)
      }
    })

    if (onMount) {
      onMount(editor, monaco)
    }
  }

  return (
    <div className={`flex flex-col min-h-0 bg-white ${className}`}>
      {(title || subtitle || rightSlot) && (
        <div className="h-9 border-b border-border flex items-center justify-between px-3 bg-surface shrink-0 gap-2">
          <div className="min-w-0">
            {title && <span className="text-xs font-medium text-slate-600 truncate block">{title}</span>}
            {subtitle && <span className="text-[10px] text-muted truncate block">{subtitle}</span>}
          </div>
          {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
        </div>
      )}
      <div className="flex-1 overflow-hidden min-h-0">
        <Editor
          height="100%"
          language={mapMonacoLanguage(language)}
          value={value}
          onChange={(val) => onChange(val ?? '')}
          onMount={handleEditorMount}
          theme="light"
          options={{
            readOnly: disabled,
            fontSize: 13,
            fontFamily: 'var(--font-code)',
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 8 },
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 4,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'line',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderValidationDecorations: 'on',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'advanced',
            formatOnType: true,
            formatOnPaste: true,
          }}
        />
      </div>
    </div>
  )
}
