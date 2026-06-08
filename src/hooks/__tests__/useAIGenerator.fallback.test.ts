import { describe, it, expect } from 'vitest'
import { classifyFailure } from '../useAIGenerator'

describe('classifyFailure', () => {
  it('认证/网络错误归类 unavailable', () => {
    expect(classifyFailure({ stage: 'network' })).toBe('unavailable')
    expect(classifyFailure({ stage: 'auth_failed' })).toBe('unavailable')
    expect(classifyFailure({ stage: 'rate_limit' })).toBe('unavailable')
  })
  it('解析/schema 错误归类 parse', () => {
    expect(classifyFailure({ stage: 'json_parse' })).toBe('parse')
    expect(classifyFailure({ stage: 'schema_validation' })).toBe('parse')
    expect(classifyFailure({ stage: 'json_extract' })).toBe('parse')
  })
  it('沙箱 runtime 归类 runtime', () => {
    expect(classifyFailure({ kind: 'runtime' })).toBe('runtime')
  })
  it('未知错误兜底归类 parse', () => {
    expect(classifyFailure({})).toBe('parse')
  })
})
