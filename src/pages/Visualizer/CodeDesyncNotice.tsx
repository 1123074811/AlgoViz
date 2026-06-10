import { useTranslation } from 'react-i18next'

interface CodeDesyncNoticeProps {
  analyzing: boolean
  onAnalyze: () => void
  onRestore: () => void
}

/** 内置算法代码被编辑后的脱钩提示:动画仍来自内置演示,与编辑后的代码无关。 */
export function CodeDesyncNotice({ analyzing, onAnalyze, onRestore }: CodeDesyncNoticeProps) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-3 py-1.5 text-[11px] bg-amber-50 border-b border-amber-200 text-amber-800"
    >
      <span className="flex-1 leading-snug">{t('visualizer.codeDesync.message')}</span>
      <button
        onClick={onAnalyze}
        disabled={analyzing}
        className="shrink-0 px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {t('visualizer.codeDesync.analyze')}
      </button>
      <button
        onClick={onRestore}
        className="shrink-0 px-2 py-0.5 rounded border border-amber-300 hover:bg-amber-100"
      >
        {t('visualizer.codeDesync.restore')}
      </button>
    </div>
  )
}
