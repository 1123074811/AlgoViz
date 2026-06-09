import { describe, it, expect } from 'vitest'
import { classifyFailure, inferSampleInputFromCode } from '../useAIGenerator'

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

describe('inferSampleInputFromCode', () => {
  it('从 Python 函数签名推断 intervals 示例，避免空输入执行为 null', () => {
    const code = `
class Solution:
    def intersectionSizeTwo(self, intervals: List[List[int]]) -> int:
        return 0
`
    expect(inferSampleInputFromCode(code)).toBe('intervals = [[1,3],[2,5],[3,6]]')
  })

  it('从多输入数组题签名推断 nums + target 示例', () => {
    const code = 'public int[] twoSum(int[] nums, int target) { return new int[0]; }'
    expect(inferSampleInputFromCode(code)).toBe('nums = [2, 7, 11, 15]; target = 9')
  })

  it('无法识别时不凭空覆盖用户输入', () => {
    expect(inferSampleInputFromCode('console.log("hello")')).toBeUndefined()
  })
})
