import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from '../index'
import i18n from '@/i18n'
import { useAlgorithmStore } from '@/store/algorithmStore'

// Spy on navigation while keeping the real MemoryRouter intact.
const navSpy = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navSpy,
}))

// Probe component that surfaces the store's activeCategory into the DOM so we
// can assert the store effect of a click as observable rendered text — the
// vanilla store instance is not exported, only the selector hook.
function ActiveCategoryProbe() {
  const active = useAlgorithmStore((s) => s.activeCategory)
  return <div data-testid="active-category">{active}</div>
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
      <ActiveCategoryProbe />
    </MemoryRouter>
  )
}

describe('Home page', () => {
  beforeEach(() => {
    navSpy.mockClear()
    // Ensure deterministic language for translated assertions.
    i18n.changeLanguage('zh')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders without crashing and shows the brand/hero', () => {
    const { container } = renderHome()

    // Hero logo badge.
    expect(container.textContent).toContain('AV')
    // App name + tagline come from the real zh i18n bundle.
    expect(container.textContent).toContain('AlgoViz')
    expect(container.textContent).toContain('AI 驱动的算法可视化学习平台')

    // The H1 hero heading is the app name.
    const h1 = container.querySelector('h1')
    expect(h1).toBeTruthy()
    expect(h1?.textContent).toBe('AlgoViz')
  })

  it('renders all eight algorithm category cards', () => {
    const { container } = renderHome()

    // Category section heading.
    expect(container.textContent).toContain('算法分类')

    // The eight category cards each render the translated category name.
    const categoryNames = [
      '排序算法', '图算法', '数据结构', '动态规划',
      '搜索与回溯', '进阶专题', '面试高频', '竞赛专题',
    ]
    for (const name of categoryNames) {
      expect(container.textContent).toContain(name)
    }
  })

  it('sets document title from the tagline on mount', () => {
    renderHome()
    expect(document.title).toBe('AlgoViz — AI 驱动的算法可视化学习平台')
  })

  it('clicking a category card sets the active category AND navigates to /visualizer', () => {
    renderHome()

    // Find the sorting category card by its translated name, then its button ancestor.
    const sortingHeading = screen.getByText('排序算法')
    const card = sortingHeading.closest('button')
    expect(card).toBeTruthy()

    fireEvent.click(card as HTMLButtonElement)

    // Store action effect: active category becomes 'sorting' (observed via probe).
    expect(screen.getByTestId('active-category').textContent).toBe('sorting')
    // Navigation to the visualizer route.
    expect(navSpy).toHaveBeenCalledWith('/visualizer')
  })

  it('clicking a different category card sets that category', () => {
    renderHome()

    const graphHeading = screen.getByText('图算法')
    const card = graphHeading.closest('button')
    fireEvent.click(card as HTMLButtonElement)

    expect(screen.getByTestId('active-category').textContent).toBe('graph')
    expect(navSpy).toHaveBeenCalledWith('/visualizer')
  })

  it('hero "browse library" button navigates to /visualizer', () => {
    renderHome()

    const startBtn = screen.getByText('浏览算法库').closest('button')
    expect(startBtn).toBeTruthy()
    fireEvent.click(startBtn as HTMLButtonElement)

    expect(navSpy).toHaveBeenCalledWith('/visualizer')
  })

  it('hero "AI lab" button navigates to /playground', () => {
    const { container } = renderHome()

    // The AI lab CTA button in the hero section.
    const aiBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('AI 代码实验室')
    )
    expect(aiBtn).toBeTruthy()
    fireEvent.click(aiBtn as HTMLButtonElement)

    expect(navSpy).toHaveBeenCalledWith('/playground')
  })

  it('renders Header nav links (home/visualizer/playground/settings)', () => {
    const { container } = renderHome()

    // Header renders Link elements (anchors) for each nav route.
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) =>
      a.getAttribute('href')
    )
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/visualizer')
    expect(hrefs).toContain('/playground')
    expect(hrefs).toContain('/settings')

    // Nav labels from i18n.
    expect(container.textContent).toContain('首页')
  })
})
