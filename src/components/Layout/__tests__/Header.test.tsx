import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import Header from '@/components/Layout/Header'
import { useAlgorithmStore } from '@/store/algorithmStore'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>
  )
}

beforeEach(() => {
  // 复位到中文，保证断言确定性
  act(() => {
    i18n.changeLanguage('zh')
  })
})

describe('Header', () => {
  it('渲染品牌名与全部导航项', () => {
    renderAt('/')
    expect(screen.getAllByText('AlgoViz').length).toBeGreaterThan(0)
    expect(screen.getByText('首页')).toBeTruthy()
    expect(screen.getByText('可视化工作台')).toBeTruthy()
    expect(screen.getByText('AI 代码实验室')).toBeTruthy()
    expect(screen.getByText('API 配置')).toBeTruthy()
  })

  it('当前路由对应的导航项处于激活态', () => {
    renderAt('/settings')
    const activeLink = screen.getByText('API 配置').closest('a')
    expect(activeLink?.className).toContain('bg-primary-50')
    const homeLink = screen.getByText('首页').closest('a')
    expect(homeLink?.className).not.toContain('bg-primary-50')
  })

  it('中文时语言按钮显示 EN', () => {
    renderAt('/')
    expect(screen.getByText('EN')).toBeTruthy()
  })

  it('点击语言按钮切换 i18n 语言并写入 store', () => {
    const { result } = renderHook(() => useAlgorithmStore((s) => s.language))
    renderAt('/')
    const toggle = screen.getByTitle('语言')
    act(() => {
      fireEvent.click(toggle)
    })
    expect(i18n.language).toBe('en')
    expect(result.current).toBe('en')
    // 切回展示中文按钮
    expect(screen.getByText('中')).toBeTruthy()
  })
})
