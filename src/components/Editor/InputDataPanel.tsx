import type { ReactNode } from 'react'
import Editor from '@monaco-editor/react'

interface InputDataPanelProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  title?: ReactNode
  helperText?: string
  placeholder?: string
  error?: string | null
  className?: string
}

function detectLanguage(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json'
  }
  return 'plaintext'
}

export default function InputDataPanel({
  value,
  onChange,
  disabled = false,
  title = 'Input Data',
  helperText,
  placeholder = '[5, 3, 8, 1, 9, 2]',
  error,
  className = '',
}: InputDataPanelProps) {
  const language = detectLanguage(value)

  return (
    <div className={`border-t border-border bg-surface p-3 flex flex-col min-h-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-1.5 shrink-0">
        <span className="text-xs font-medium text-slate-500 shrink-0">{title}</span>
        {helperText && <span className="text-[10px] text-muted truncate">{helperText}</span>}
      </div>
      <div className="flex-1 min-h-0 relative border border-border rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-primary-200 focus-within:border-primary transition-colors">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={(val) => onChange(val ?? '')}
          theme="light"
          options={{
            readOnly: disabled,
            fontSize: 12,
            fontFamily: 'var(--font-code)',
            lineNumbers: 'off',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 6, bottom: 6 },
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            renderLineHighlight: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
            },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'advanced',
            formatOnType: true,
            formatOnPaste: true,
            contextmenu: false,
            suggest: { showWords: false },
            quickSuggestions: false,
          }}
        />
        {!value && placeholder && (
          <div className="absolute top-1.5 left-2 pointer-events-none text-slate-400 text-xs font-code select-none whitespace-pre-wrap leading-relaxed">
            {placeholder}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-[10px] text-danger leading-relaxed shrink-0">{error}</p>}
    </div>
  )
}
