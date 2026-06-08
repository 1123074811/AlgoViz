import type { FallbackProps } from 'react-error-boundary'
import { Icon } from '@/icons'

export const REQUEST_AI_REPAIR_EVENT = 'algoviz:request-ai-repair'

interface ErrorFallbackProps extends FallbackProps {
  title?: string
  description?: string
  allowAIRepair?: boolean
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown render error'
}

function shouldReloadPage(error: unknown): boolean {
  const message = getErrorMessage(error)
  return /dynamically imported module|loading chunk|import\(|ERR_CONNECTION_REFUSED|Failed to fetch/i.test(message)
}

export default function ErrorFallback({
  error,
  resetErrorBoundary,
  title = '界面渲染失败',
  description = '当前视图遇到异常，已阻止错误继续扩散。',
  allowAIRepair = false,
}: ErrorFallbackProps) {
  const requestAIRepair = () => {
    window.dispatchEvent(new CustomEvent(REQUEST_AI_REPAIR_EVENT, {
      detail: { error: getErrorMessage(error) },
    }))
    resetErrorBoundary()
  }
  const reloadPage = () => window.location.reload()
  const needsReload = shouldReloadPage(error)

  return (
    <div className="h-full min-h-0 w-full bg-slate-50 p-4">
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-red-100 bg-white px-5 py-6 text-center shadow-sm">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Icon name="alert-circle" size={24} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <p className="text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
          <pre className="max-h-24 overflow-auto rounded-lg bg-slate-950 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-100">
            {getErrorMessage(error)}
          </pre>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={needsReload ? reloadPage : resetErrorBoundary}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Icon name="rotate-ccw" size={13} />
              {needsReload ? '重新加载页面' : '重试渲染'}
            </button>
            {allowAIRepair && !needsReload && (
              <button
                type="button"
                onClick={requestAIRepair}
                className="inline-flex items-center gap-1.5 rounded-md border border-violet-500 bg-violet-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-violet-600"
              >
                <Icon name="zap" size={13} />
                让 AI 再修复一次
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
