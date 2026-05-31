import type { AnimationScript, ActionColor } from '@/types/animation'
import { makeStep } from './utils'

export function generateTrie(words?: string[]): AnimationScript {
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const wordList = words && words.length > 0 ? words : ['cat', 'car', 'dog']

  steps.push(makeStep(sid++, 0,
    `Trie（字典树/前缀树）演示。插入 "${wordList.join('", "')}"，每个节点代表一个字符，共享相同前缀的单词共用路径`,
    `Trie (prefix tree) demo. Insert "${wordList.join('", "')}". Each node is a character; words with same prefix share the path`,
    'highlight', [], 'primary', 0, 0, 0,
    { tree: { nodeStates: [{ id: 'root', role: 'root', color: 'primary' as ActionColor }] } },
  ))
  steps[0].events = [{ type: 'tree.create', variant: 'trie', rootId: 'root', nodes: [{ id: 'root', value: '∅' }], edges: [] }]

  // Insert "cat"
  steps.push(makeStep(sid++, 3,
    `插入 "cat"：从根开始，逐字符 c→a→t。c 不存在，创建新节点。a 不存在，创建新节点。t 不存在，创建新节点，标记为单词结束`,
    `Insert "cat": from root, char by char c→a→t. c missing: create. a missing: create. t missing: create, mark as word end`,
    'insert', [1, 2, 3], 'success', 0, 0, 3,
    {
      tree: {
        traversalPath: ['root', 'c', 'a', 't'],
        nodeStates: [
          { id: 'root', role: 'root', color: 'primary' as ActionColor },
          { id: 'c', role: 'current', color: 'warning' as ActionColor },
          { id: 'a', role: 'current', color: 'warning' as ActionColor },
          { id: 't', role: 'child', color: 'success' as ActionColor },
        ],
      },
    },
  ))
  steps[1].events = [{ type: 'tree.insert', parentId: 'root', node: { id: 'c', value: 'c' } }, { type: 'tree.insert', parentId: 'c', node: { id: 'a', value: 'a' } }, { type: 'tree.insert', parentId: 'a', node: { id: 't', value: 't' } }]

  // Insert "car"
  steps.push(makeStep(sid++, 3,
    `插入 "car"：从根开始 c→a→r。c 和 a 已存在，复用前缀路径 ca。r 不存在，在 a 下创建新子节点 r，标记为单词结束`,
    `Insert "car": c→a→r. "c" and "a" exist, reuse prefix "ca". "r" missing, create under "a", mark as word end`,
    'insert', [1, 2, 4], 'success', 0, 0, 3,
    {
      tree: {
        traversalPath: ['root', 'c', 'a', 'r'],
        nodeStates: [
          { id: 'root', role: 'root', color: 'primary' as ActionColor },
          { id: 'c', role: 'path', color: 'success' as ActionColor },
          { id: 'a', role: 'path', color: 'success' as ActionColor },
          { id: 'r', role: 'child', color: 'success' as ActionColor },
        ],
      },
    },
  ))
  steps[2].events = [{ type: 'tree.insert', parentId: 'a', node: { id: 'r', value: 'r' } }]

  // Insert "dog"
  steps.push(makeStep(sid++, 3,
    `插入 "dog"：从根开始 d→o→g。d 不存在（"d" 与 "c" 不同），创建全新分支 d→o→g，标记 g 为单词结束`,
    `Insert "dog": d→o→g. "d" missing, create new branch d→o→g, mark "g" as word end`,
    'insert', [5, 6, 7], 'success', 0, 0, 3,
    {
      tree: {
        traversalPath: ['root', 'd', 'o', 'g'],
        nodeStates: [
          { id: 'root', role: 'root', color: 'primary' as ActionColor },
          { id: 'd', role: 'current', color: 'warning' as ActionColor },
          { id: 'o', role: 'current', color: 'warning' as ActionColor },
          { id: 'g', role: 'child', color: 'success' as ActionColor },
        ],
      },
    },
  ))
  steps[3].events = [{ type: 'tree.insert', parentId: 'root', node: { id: 'd', value: 'd' } }, { type: 'tree.insert', parentId: 'd', node: { id: 'o', value: 'o' } }, { type: 'tree.insert', parentId: 'o', node: { id: 'g', value: 'g' } }]

  // Search "cat" — found
  steps.push(makeStep(sid++, 7,
    `查找 "cat"：c ✓ → a ✓ → t ✓（且 t 有单词结束标记）→ 单词存在！Trie 查找每步只比较一个字符，时间复杂度 O(k)，k 为单词长度`,
    `Search "cat": c ✓ → a ✓ → t ✓ (t has word-end mark) → word exists! Trie lookup O(k) where k is word length`,
    'compare', [1, 2, 3], 'success', 3, 0, 3,
    { tree: { traversalPath: ['root', 'c', 'a', 't'] } },
  ))
  steps[4].events = [{ type: 'tree.visit', nodeId: 'c' }, { type: 'tree.visit', nodeId: 'a' }, { type: 'tree.visit', nodeId: 't' }]

  // Search "can" — not found
  steps.push(makeStep(sid++, 8,
    `查找 "can"：c ✓ → a ✓ → n？✗（a 下没有子节点 n）。Trie 可高效判断前缀/单词是否存在，不存在时提前终止`,
    `Search "can": c ✓ → a ✓ → n? ✗ (no child n under a). Trie efficiently checks prefix/word existence, early termination on mismatch`,
    'compare', [1, 2], 'danger', 2, 0, 2,
    { tree: { traversalPath: ['root', 'c', 'a'] } },
  ))
  steps[5].events = [{ type: 'tree.visit', nodeId: 'c' }, { type: 'tree.visit', nodeId: 'a' }]

  steps.push(makeStep(sid++, 9,
    `Trie 构建完成。3 个单词共享 ca 前缀，d 分支独立。Trie 广泛应用于自动补全、拼写检查、IP 路由等场景`,
    `Trie complete. 3 words, "ca" prefix shared by 2 words. Trie used in autocomplete, spell checker, IP routing`,
    'mark', [], 'success', 5, 0, 8,
    {
      tree: {
        nodeStates: [
          { id: 'root', role: 'root', color: 'primary' as ActionColor },
          { id: 'c', role: 'path', color: 'success' as ActionColor },
          { id: 'd', role: 'path', color: 'success' as ActionColor },
        ],
      },
    },
  ))
  steps[6].events = [{ type: 'tree.visit', nodeId: 'root' }]

  return {
    algorithm: 'trie',
    complexity: { time: { best: 'O(k)', average: 'O(k)', worst: 'O(k)' }, space: 'O(n*k)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'trie' },
    initialState: {
      type: 'tree',
      data: [],
      root: 'root',
      treeNodes: [
        { id: 'root', value: '∅', label: 'root' },
        { id: 'c', value: 'c' },
        { id: 'a', value: 'a' },
        { id: 't', value: 't', metadata: { end: true } },
        { id: 'r', value: 'r', metadata: { end: true } },
        { id: 'd', value: 'd' },
        { id: 'o', value: 'o' },
        { id: 'g', value: 'g', metadata: { end: true } },
      ],
      children: {
        root: ['c', 'd'],
        c: ['a'],
        a: ['t', 'r'],
        d: ['o'],
        o: ['g'],
      },
    },
    steps,
  }
}
