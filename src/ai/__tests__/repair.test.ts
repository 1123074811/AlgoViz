import { describe, it, expect } from 'vitest'
import { needsAIRepair, allRecoverable } from '../repair'
import type { AIErrorReport, AIValidationIssue } from '../errors'

function report(issues: AIValidationIssue[], canRetry = true): AIErrorReport {
  return {
    stage: 'schema_validation',
    title: '测试',
    message: '测试',
    issues,
    suggestions: [],
    canRetry,
    rawResponse: '',
  }
}

function iss(recoverable: boolean): AIValidationIssue {
  return { path: '', code: 'x', message: 'm', severity: recoverable ? 'warning' : 'error', recoverable }
}

describe('needsAIRepair', () => {
  // 全部可恢复 → 不应触发二次 AI 请求（本地修复 + 宽松归一化即可）
  it('所有 issue 均可恢复时不触发 AI 修复', () => {
    expect(needsAIRepair(report([iss(true), iss(true)]))).toBe(false)
  })

  // 存在不可恢复 issue → 需要 AI 修复
  it('存在不可恢复 issue 时触发 AI 修复', () => {
    expect(needsAIRepair(report([iss(true), iss(false)]))).toBe(true)
  })

  // canRetry=false → 永不触发
  it('canRetry 为 false 时不触发', () => {
    expect(needsAIRepair(report([iss(false)], false))).toBe(false)
  })

  // 空 issues → 不触发
  it('无 issue 时不触发', () => {
    expect(needsAIRepair(report([]))).toBe(false)
  })
})

describe('allRecoverable', () => {
  it('全部可恢复返回 true', () => {
    expect(allRecoverable([iss(true), iss(true)])).toBe(true)
  })
  it('含不可恢复返回 false', () => {
    expect(allRecoverable([iss(true), iss(false)])).toBe(false)
  })
  it('空数组返回 false', () => {
    expect(allRecoverable([])).toBe(false)
  })
})
