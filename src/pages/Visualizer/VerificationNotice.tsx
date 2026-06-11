import { useTranslation } from 'react-i18next'
import type { AnimationScript } from '@/types/animation'

interface VerificationNoticeProps {
  verification: AnimationScript['verification']
}

/**
 * AI 动画一致性校验状态徽标,按校验**强度**分色,杜绝把 AI 自证伪装成独立验证:
 *  - pass + 真实执行(js-exec/py-exec)→ 绿色「已验证」(强,可信)
 *  - pass + @expect(AI 自报期望)→ 琥珀色「AI 自查·未独立验证」(弱,不可全信)
 *      · degraded 时额外提示「真实执行不可用」,区分"语言不支持"与"环境降级"
 *  - skipped → 灰色 + 原因
 *  - fail → 琥珀警示 + 期望/实际
 */
export function VerificationNotice({ verification }: VerificationNoticeProps) {
  const { t } = useTranslation()
  if (!verification) return null

  if (verification.status === 'pass') {
    const realExec = verification.source === 'js-exec' || verification.source === 'py-exec'
    if (realExec) {
      return (
        <div role="status" className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
          <span aria-hidden>✓</span>
          {t('visualizer.verification.passExec')}
        </div>
      )
    }
    // @expect 路径 = AI 自证,绝不给绿色"已验证"。用琥珀色 + 诚实措辞。
    return (
      <div role="status" className="mx-3 mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-1 text-[10px] font-medium text-amber-700">
        <span aria-hidden>⚠</span>
        {verification.degraded
          ? t('visualizer.verification.passExpectDegraded')
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
