import type { AIHistoryEntry } from '@/store/algorithmStore'

export const INTERRUPTED_MSG = '分析已中断（已离开页面）'

export interface RestorePlan {
  /** 需从 'analyzing' 重置为 'error' 的孤儿历史项 id（请求已不再被本页跟踪）。 */
  reconcileIds: string[]
  /** clean=无历史清空;analyzing=后台仍在分析,保留进行中;restore=恢复 effective。 */
  mode: 'clean' | 'analyzing' | 'restore'
  /** 要恢复/保留的历史项（mode==='clean' 时为 null）。 */
  effective: AIHistoryEntry | null
}

/**
 * 进入 Playground(独立路由,会卸载重挂)时的恢复决策——纯函数,便于测试。
 *
 * - 没有进行中的请求时,任何残留 'analyzing' 都视为离开页面导致的中断 → 标记 error。
 * - 有最近历史:进行中则保留 analyzing;否则恢复(若该项本身是中断的 analyzing 则按 error 恢复)。
 * - 无历史:清空(覆盖可能来自其它页面的共享脚本)。
 */
export function planRestoreOnMount(history: AIHistoryEntry[], inFlight: boolean): RestorePlan {
  const reconcileIds = inFlight ? [] : history.filter(e => e.status === 'analyzing').map(e => e.id)
  const latest = history[0]
  if (!latest) return { reconcileIds, mode: 'clean', effective: null }
  if (inFlight && latest.status === 'analyzing') {
    return { reconcileIds, mode: 'analyzing', effective: latest }
  }
  const effective: AIHistoryEntry = latest.status === 'analyzing'
    ? { ...latest, status: 'error', error: INTERRUPTED_MSG }
    : latest
  return { reconcileIds, mode: 'restore', effective }
}
