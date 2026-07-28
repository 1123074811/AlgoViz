import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import '@/i18n'

vi.mock('../useSceneTransition', () => ({
  useSceneTransition: (scene: unknown) => scene,
}))

import SceneCanvas from '../SceneCanvas'

const script: AnimationScript = {
  algorithm: 'array-demo',
  initialState: { type: 'array', data: [3, 1, 2] },
  presentation: { engine: 'scene', module: 'array' },
  complexity: {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(1)',
  },
  steps: [{
    stepId: 1,
    codeLine: 0,
    description: { zh: '创建数组', en: 'Create array' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'array.create', values: [3, 1, 2] }],
    stats: { comparisons: 0, swaps: 0, accesses: 3 },
  }],
}

describe('SceneCanvas interactions', () => {
  it('renders its empty state', () => {
    render(<SceneCanvas script={null} currentStep={0} />)
    expect(screen.getByText('Select an algorithm to visualize')).toBeTruthy()
  })

  it('renders a scene and handles zoom, pan, wheel, reset and fullscreen', () => {
    const onToggleFullscreen = vi.fn()
    const { container } = render(
      <SceneCanvas
        script={script}
        currentStep={1}
        currentStepData={script.steps[0]}
        onToggleFullscreen={onToggleFullscreen}
      />,
    )

    expect(screen.getByText('创建数组')).toBeTruthy()
    fireEvent.click(screen.getByTitle('Zoom In'))
    fireEvent.click(screen.getByTitle('Zoom Out'))
    fireEvent.click(screen.getByTitle('Reset View'))
    fireEvent.click(screen.getByTitle('全屏'))
    expect(onToggleFullscreen).toHaveBeenCalledOnce()

    const canvas = container.querySelector('.cursor-grab')
    expect(canvas).not.toBeNull()
    fireEvent.mouseDown(canvas!, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseMove(canvas!, { clientX: 130, clientY: 120 })
    fireEvent.mouseUp(canvas!)
    fireEvent.wheel(canvas!, { deltaY: -100 })
  })
})
