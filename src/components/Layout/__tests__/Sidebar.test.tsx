import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import Sidebar from '@/components/Layout/Sidebar'
import { useAlgorithmStore } from '@/store/algorithmStore'

// 逐个选择基本值/稳定引用，避免对象选择器导致的快照缓存循环。
function getActions() {
  const setSearchQuery = renderHook(() => useAlgorithmStore((s) => s.setSearchQuery)).result
  const setActiveCategory = renderHook(() => useAlgorithmStore((s) => s.setActiveCategory)).result
  const setSelectedAlgorithm = renderHook(() => useAlgorithmStore((s) => s.setSelectedAlgorithm)).result
  return {
    setSearchQuery: setSearchQuery.current,
    setActiveCategory: setActiveCategory.current,
    setSelectedAlgorithm: setSelectedAlgorithm.current,
  }
}

function readState() {
  const searchQuery = renderHook(() => useAlgorithmStore((s) => s.searchQuery)).result
  const activeCategory = renderHook(() => useAlgorithmStore((s) => s.activeCategory)).result
  const selectedAlgorithm = renderHook(() => useAlgorithmStore((s) => s.selectedAlgorithm)).result
  return {
    get current() {
      return {
        searchQuery: searchQuery.current,
        activeCategory: activeCategory.current,
        selectedAlgorithm: selectedAlgorithm.current,
      }
    },
  }
}

function renderSidebar(props?: Partial<{ collapsed: boolean; onToggle: () => void }>) {
  const onToggle = props?.onToggle ?? vi.fn()
  const utils = render(
    <MemoryRouter>
      <Sidebar collapsed={props?.collapsed ?? false} onToggle={onToggle} />
    </MemoryRouter>
  )
  return { ...utils, onToggle }
}

beforeEach(() => {
  act(() => {
    i18n.changeLanguage('zh')
  })
  const actions = getActions()
  act(() => {
    actions.setSearchQuery('')
    actions.setActiveCategory('all')
    actions.setSelectedAlgorithm(null)
  })
})

describe('Sidebar — 展开态', () => {
  it('渲染搜索框、分类按钮与算法列表', () => {
    renderSidebar()
    expect(screen.getByPlaceholderText('搜索算法...')).toBeTruthy()
    expect(screen.getByText('全部')).toBeTruthy()
    expect(screen.getByText('排序算法')).toBeTruthy()
    // 默认 all 分类下出现某个排序算法（中文名）
    expect(screen.getByText('冒泡排序')).toBeTruthy()
  })

  it('点击分类按钮更新 store 并过滤列表', () => {
    const state = readState()
    renderSidebar()
    act(() => {
      fireEvent.click(screen.getByText('图算法'))
    })
    expect(state.current.activeCategory).toBe('graph')
    // 排序算法应被过滤掉，图算法应出现
    expect(screen.queryByText('冒泡排序')).toBeNull()
    expect(screen.getByText('广度优先搜索')).toBeTruthy()
  })

  it('输入搜索词更新 store 并过滤列表', () => {
    const state = readState()
    renderSidebar()
    const input = screen.getByPlaceholderText('搜索算法...') as HTMLInputElement
    act(() => {
      fireEvent.change(input, { target: { value: '快速' } })
    })
    expect(state.current.searchQuery).toBe('快速')
    expect(input.value).toBe('快速')
    expect(screen.getByText('快速排序')).toBeTruthy()
    expect(screen.queryByText('冒泡排序')).toBeNull()
  })

  it('无匹配时显示无结果提示', () => {
    renderSidebar()
    const input = screen.getByPlaceholderText('搜索算法...')
    act(() => {
      fireEvent.change(input, { target: { value: 'zzz-不存在' } })
    })
    expect(screen.getByText('无匹配算法')).toBeTruthy()
  })

  it('点击算法项设置所选算法并跳转', () => {
    const state = readState()
    renderSidebar()
    act(() => {
      fireEvent.click(screen.getByText('冒泡排序'))
    })
    expect(state.current.selectedAlgorithm?.id).toBe('bubble_sort')
  })

  it('英文环境下显示英文算法名', () => {
    act(() => {
      i18n.changeLanguage('en')
    })
    renderSidebar()
    expect(screen.getByText('Bubble Sort')).toBeTruthy()
  })
})

describe('Sidebar — 折叠态', () => {
  it('折叠时仅渲染分类图标按钮，无搜索框', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByPlaceholderText('搜索算法...')).toBeNull()
    // 菜单按钮 title 为 "首页"
    expect(screen.getByTitle('首页')).toBeTruthy()
    // 分类按钮以 title 形式存在
    expect(screen.getByTitle('排序算法')).toBeTruthy()
  })

  it('折叠态点击分类按钮设置分类并触发 onToggle 展开', () => {
    const state = readState()
    const onToggle = vi.fn()
    renderSidebar({ collapsed: true, onToggle })
    act(() => {
      fireEvent.click(screen.getByTitle('图算法'))
    })
    expect(state.current.activeCategory).toBe('graph')
    expect(onToggle).toHaveBeenCalled()
  })
})
