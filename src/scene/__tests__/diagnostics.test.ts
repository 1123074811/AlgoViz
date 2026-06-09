import { describe, it, expect } from 'vitest'
import { diagnoseSceneScript } from '../diagnostics'
import { deriveSceneState } from '../SceneEngine'
import { generateReservoir } from '@/presets/reservoir'
import { generateConvexHull } from '@/presets/convexHull'
import { generateKmpAutomaton } from '@/presets/kmpAutomaton'
import { generateTarjanScc } from '@/presets/tarjanScc'

describe('diagnostics — 新模块事件已注册(无误报)', () => {
  const cases = [
    ['reservoir', generateReservoir([5, 3, 8, 1, 9, 2])],
    ['convexHull', generateConvexHull([[0, 0], [4, 0], [2, 3], [1, 1]])],
    ['kmpAutomaton', generateKmpAutomaton('aba', 'ababa')],
    ['tarjanScc', generateTarjanScc()],
  ] as const

  for (const [name, script] of cases) {
    it(`${name}: 不产生「未注册的 Scene event」警告`, () => {
      const diags = diagnoseSceneScript(script)
      const unregistered = diags.filter((d) => d.message.includes('未注册'))
      expect(unregistered, unregistered.map((d) => d.message).join(' | ')).toHaveLength(0)
    })

    it(`${name}: 第 0 帧(初始)即渲染出场景实体,非空白`, () => {
      const scene = deriveSceneState(script, 0)
      const count = Object.keys(scene.entities).length + Object.keys(scene.edges).length
      expect(count).toBeGreaterThan(0)
    })
  }
})
