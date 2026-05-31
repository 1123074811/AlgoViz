import type { ReactNode } from 'react'

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
  return (
    <div className={`border-t border-border bg-surface p-3 flex flex-col min-h-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-1.5 shrink-0">
        <span className="text-xs font-medium text-slate-500 shrink-0">{title}</span>
        {helperText && <span className="text-[10px] text-muted truncate">{helperText}</span>}
      </div>
      <textarea
        className={`w-full flex-1 min-h-0 resize-none rounded-md border bg-white p-2 text-sm font-code outline-none focus:ring-1 transition-colors disabled:bg-slate-50 disabled:text-slate-400 ${
          error ? 'border-danger focus:border-danger focus:ring-red-100' : 'border-border focus:border-primary focus:ring-primary-200'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error && <p className="mt-1 text-[10px] text-danger leading-relaxed shrink-0">{error}</p>}
    </div>
  )
}
