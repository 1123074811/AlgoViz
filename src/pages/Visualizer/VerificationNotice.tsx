import { useTranslation } from 'react-i18next'
import type { AnimationScript } from '@/types/animation'

interface VerificationNoticeProps {
  verification: AnimationScript['verification']
}

/** AI 动画一致性校验状态：fail 警示，pass/skipped 也以小徽标可见。 */
export function VerificationNotice({ verification }: VerificationNoticeProps) {
  const { t } = useTranslation()
  if (!verification) return null

  if (verification.status === 'pass') {
    return (
      <div role="status" className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
        <span aria-hidden>✓</span>
        {verification.source === 'js-exec' || verification.source === 'py-exec'
          ? t('visualizer.verification.passExec')
          : t('visualizer.verification.passExpect')}
      </div>
    )
  }

  if (verification.status === 'skipped') {
    return (
      <div role="status" className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[10px] text-slate-500">
        {t('visualizer.verification.skipped', { reason: verification.message ?? '' })}
      </div>
    )
  }

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
