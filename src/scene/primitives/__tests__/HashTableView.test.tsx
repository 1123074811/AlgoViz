import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HashTableView from '@/scene/primitives/HashTableView'
import type { SceneCell } from '@/scene/types'

function bucket(index: number, x: number): SceneCell {
  return {
    id: `hashbucket_${index}`,
    type: 'cell',
    position: { x, y: 100 },
    size: { width: 56, height: 44 },
    col: index,
  }
}

function entry(bucketIdx: number, chainIdx: number, value: string, x: number, y: number): SceneCell {
  return {
    id: `hashentry_${bucketIdx}_${chainIdx}`,
    type: 'cell',
    position: { x, y },
    size: { width: 56, height: 40 },
    value,
    col: chainIdx,
    meta: { bucket: bucketIdx },
  }
}

function texts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text')).map(t => t.textContent ?? '')
}

describe('HashTableView', () => {
  it('空 buckets 返回 null', () => {
    const { container } = render(<svg><HashTableView buckets={[]} entries={[]} /></svg>)
    expect(container.querySelector('g')).toBeNull()
  })

  it('渲染 frame、标题、桶索引与默认负载因子', () => {
    const buckets = [bucket(0, 100), bucket(1, 160), bucket(2, 220)]
    const entries = [entry(0, 0, 'a', 100, 200)]
    const { container } = render(<svg><HashTableView buckets={buckets} entries={entries} /></svg>)

    const t = texts(container)
    expect(t).toContain('哈希表·链地址法')
    expect(t).toContain('负载因子')
    // index labels 0,1,2
    expect(t).toContain('0')
    expect(t).toContain('1')
    expect(t).toContain('2')
    // default load factor entries/buckets = 1/3
    expect(t).toContain('1/3')
    // outer frame + load-factor panel rect = 2 rects
    expect(container.querySelectorAll('rect').length).toBe(2)
  })

  it('hideTitle 隐藏标题但保留其它文本', () => {
    const buckets = [bucket(0, 100)]
    const { container } = render(<svg><HashTableView buckets={buckets} entries={[]} hideTitle /></svg>)
    const t = texts(container)
    expect(t).not.toContain('哈希表·链地址法')
    expect(t).toContain('负载因子')
  })

  it('链地址法：多条目桶渲染链连接线', () => {
    const buckets = [bucket(0, 100), bucket(1, 160)]
    const entries = [
      entry(0, 0, 'a', 100, 200),
      entry(0, 1, 'b', 100, 260),
      entry(0, 2, 'c', 100, 320),
    ]
    const { container } = render(<svg><HashTableView buckets={buckets} entries={entries} /></svg>)
    // axis lines for frame are rect, chain links are <line>: 3 entries → 3 segments
    expect(container.querySelectorAll('line').length).toBe(3)
  })

  it('使用 loadFactorCell 的值与位置', () => {
    const buckets = [bucket(0, 100)]
    const lfCell: SceneCell = {
      id: 'hash_lf',
      type: 'cell',
      position: { x: 400, y: 100 },
      value: '0.75',
    }
    const { container } = render(
      <svg><HashTableView buckets={buckets} entries={[]} loadFactorCell={lfCell} /></svg>,
    )
    expect(texts(container)).toContain('0.75')
    const panel = Array.from(container.querySelectorAll('g')).find(
      g => g.getAttribute('transform')?.includes('400'),
    )
    expect(panel).toBeTruthy()
  })

  it('entry 无 meta.bucket 时从 id 解析桶索引', () => {
    const buckets = [bucket(0, 100)]
    const e: SceneCell = {
      id: 'hashentry_0_0',
      type: 'cell',
      position: { x: 100, y: 200 },
      size: { width: 56, height: 40 },
      value: 'z',
      col: 0,
    }
    const { container } = render(<svg><HashTableView buckets={buckets} entries={[e]} /></svg>)
    // chain link drawn → one line
    expect(container.querySelectorAll('line').length).toBe(1)
  })

  it('size 缺失时使用默认桶尺寸', () => {
    const b: SceneCell = { id: 'hashbucket_0', type: 'cell', position: { x: 100, y: 100 }, col: 0 }
    const { container } = render(<svg><HashTableView buckets={[b]} entries={[]} /></svg>)
    expect(container.querySelectorAll('rect').length).toBe(2)
  })
})
