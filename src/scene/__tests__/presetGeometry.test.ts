import { describe, expect, it } from 'vitest'
import { PRESET_IDS, generatePreset } from '../../presets/generators'
import { deriveSceneState } from '../SceneEngine'
import { validateSceneGeometry } from '../geometry'

describe('all preset geometry', () => {
  it('has no overlapping visible primitives at any step', () => {
    const failures: string[] = []
    for (const presetId of PRESET_IDS) {
      const script = generatePreset(presetId, undefined)
      if (!script) continue
      for (let step = 0; step <= script.steps.length; step++) {
        const violations = validateSceneGeometry(deriveSceneState(script, step))
          .filter(item => item.type === 'overlap' || item.type === 'edge-obstacle')
        failures.push(...violations.map(item => `${presetId}@${step}: ${item.message}`))
        if (failures.length >= 40) break
      }
      if (failures.length >= 40) break
    }
    expect(failures).toEqual([])
  }, 60_000)
})
