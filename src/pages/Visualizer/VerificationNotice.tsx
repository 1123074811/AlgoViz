import { useTranslation } from 'react-i18next'
import type { AnimationScript } from '@/types/animation'

interface VerificationNoticeProps {
  verification: AnimationScript['verification']
}

/** AI 动画一致性校验失败时的警示条。pass/skipped 不渲染任何内容。 */
export function VerificationNotice({ verification }: VerificationNoticeProps) {
  const { t } = useTranslation()
  if (!verification || verification.status !== 'fail') return null
  return (
    <div
      role="alert"
      className="mx-3 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed bg-amber-50 border border-amber-300 text-amber-800"
    >
      <span className="font-semibold">{t('visualizer.verification.failTitle')}</span>
      <span className="ml-1">
        {t('visualizer.verification.failDetail', {
          expected: verification.expected ?? '?',
          actual: verification.actual ?? '?',
        })}
      </span>
    </div>
  )
}
