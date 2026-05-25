import Editor, { type OnMount } from '@monaco-editor/react'

export type SupportedCodeLanguage = 'python' | 'javascript' | 'cpp' | 'java' | string

interface CodeEditorPanelProps {
  value: string
  language: SupportedCodeLanguage
  onChange: (value: string) => void
  onMount?: OnMount
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
  disabled = false,
  title,
  subtitle,
  rightSlot,
  className = '',
}: CodeEditorPanelProps) {
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
          onMount={onMount}
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
          }}
        />
      </div>
    </div>
  )
}
