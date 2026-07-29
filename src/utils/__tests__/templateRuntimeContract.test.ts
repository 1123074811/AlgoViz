import { describe, expect, it } from 'vitest'
import { getCodeTemplate } from '@/data/codeTemplates'
import { generatePreset, PRESET_IDS } from '@/presets/generators'
import { runUserJsSandboxed } from '@/sandbox/runUserCode'
import { getLeetCodeDefault } from '@/utils/inputParser'
import { compileAlgorithmInput } from '@/workbench/inputCompiler'

describe('trusted template runtime matches its reusable animation', () => {
  for (const algorithmId of PRESET_IDS) {
    it(`${algorithmId}: browser languages expose one solve entry`, () => {
      expect(getCodeTemplate(algorithmId, 'javascript')).toMatch(/function\s+solve\s*\(/)
      expect(getCodeTemplate(algorithmId, 'python')).toMatch(/def\s+solve\s*\(/)
    })

    it(`${algorithmId}: JavaScript result equals preset result`, async () => {
      const compilation = compileAlgorithmInput(
        getLeetCodeDefault(algorithmId),
        'leetcode',
        algorithmId,
      )
      expect(compilation.status).toBe('ready')
      const runtime = await runUserJsSandboxed(
        getCodeTemplate(algorithmId, 'javascript'),
        compilation.value,
      )
      const script = generatePreset(algorithmId, compilation.value)

      expect(
        runtime.ok,
        `${runtime.error}; input=${JSON.stringify(compilation.value)}; expected=${JSON.stringify(script?.result)}`,
      ).toBe(true)
      expect(runtime.value).toEqual(script?.result)
    })
  }
})
