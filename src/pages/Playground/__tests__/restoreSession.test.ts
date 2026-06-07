import { describe, it, expect } from 'vitest'
import { planRestoreOnMount, INTERRUPTED_MSG } from '../restoreSession'
import type { AIHistoryEntry } from '@/store/algorithmStore'

function entry(over: Partial<AIHistoryEntry>): AIHistoryEntry {
  return {
    id: 'e1', timestamp: 1, algorithmId: 'playground', algorithmName: '自定义代码',
    code: 'x', language: 'python', inputData: '', status: 'success',
    ...over,
  } as AIHistoryEntry
}

describe('planRestoreOnMount', () => {
  it('无历史时返回 clean', () => {
    expect(planRestoreOnMount([], false)).toEqual({ reconcileIds: [], mode: 'clean', effective: null })
  })

  it('恢复最近的成功项', () => {
    const e = entry({ id: 'ok', status: 'success' })
    const plan = planRestoreOnMount([e], false)
    expect(plan.mode).toBe('restore')
    expect(plan.effective?.id).toBe('ok')
    expect(plan.reconcileIds).toEqual([])
  })

  it('无进行中请求时,残留 analyzing 视为中断并按 error 恢复', () => {
    const e = entry({ id: 'stuck', status: 'analyzing' })
    const plan = planRestoreOnMount([e], false)
    expect(plan.reconcileIds).toEqual(['stuck'])
    expect(plan.mode).toBe('restore')
    expect(plan.effective?.status).toBe('error')
    expect(plan.effective?.error).toBe(INTERRUPTED_MSG)
  })

  it('有进行中请求时,保留最近的 analyzing 不重置', () => {
    const e = entry({ id: 'running', status: 'analyzing' })
    const plan = planRestoreOnMount([e], true)
    expect(plan.reconcileIds).toEqual([])
    expect(plan.mode).toBe('analyzing')
    expect(plan.effective?.id).toBe('running')
  })

  it('恢复错误项以便返回时仍能看到错误', () => {
    const e = entry({ id: 'err', status: 'error', error: 'boom' })
    const plan = planRestoreOnMount([e], false)
    expect(plan.mode).toBe('restore')
    expect(plan.effective).toMatchObject({ id: 'err', status: 'error', error: 'boom' })
  })

  it('只重置孤儿 analyzing,不影响其它项', () => {
    const a = entry({ id: 'a', status: 'success' })
    const b = entry({ id: 'b', status: 'analyzing' })
    const c = entry({ id: 'c', status: 'error', error: 'x' })
    const plan = planRestoreOnMount([a, b, c], false)
    expect(plan.reconcileIds).toEqual(['b'])
    expect(plan.effective?.id).toBe('a') // 最近项是 a
  })
})
