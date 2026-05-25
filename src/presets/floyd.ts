import type { AnimationScript, TeachingState } from '@/types/animation'
import { makeStep } from './utils'

const INF = '∞'

function floydTeaching(k: number, i: number | null, j: number | null, improvement: string | null): TeachingState {
  const vars: Record<string, string | number | boolean | null> = {
    k,
    '中间节点(intermediate)': k,
  }
  if (i !== null) vars.i = i
  if (j !== null) vars.j = j
  if (improvement) vars['improvement'] = improvement
  return { variables: vars }
}

const floydPreset: AnimationScript = {
  algorithm: 'floyd',
  complexity: {
    time: { best: 'O(V³)', average: 'O(V³)', worst: 'O(V³)' },
    space: 'O(V²)',
  },
  initialState: {
    type: 'matrix',
    data: [0, 3, 999, 7, 8, 0, 2, 999, 999, 999, 0, 1, 6, 999, 999, 0],
  },
  steps: [
    makeStep(1, 2,
      '初始距离矩阵 (999=∞)。Floyd-Warshall 算法通过动态规划，以每个节点为中间点，逐步改进所有节点对的最短路径',
      'Initial distance matrix (999=∞). Floyd-Warshall uses DP to improve all-pairs shortest paths by considering each node as an intermediate',
      'highlight', [], 'primary', 0, 0, 16,
      floydTeaching(-1, null, null, '初始状态 / Initial')
    ),
    makeStep(2, 3,
      'k=0：以节点 0 为中间点。核心思想：dist[i][j] = min(dist[i][j], dist[i][0] + dist[0][j])，即检查绕过节点 0 是否更短',
      'k=0: node 0 as intermediate. Core idea: dist[i][j] = min(dist[i][j], dist[i][0] + dist[0][j]), check if going through node 0 is shorter',
      'highlight', [0], 'warning', 0, 0, 16,
      floydTeaching(0, null, null, '检查中间点 k=0 / Checking intermediate k=0')
    ),
    makeStep(3, 4,
      'k=0 完成：节点 0 没有入边，无路径可经 0 改进，矩阵无变化',
      'After k=0: node 0 has no incoming edges, no paths can be improved via 0, matrix unchanged',
      'compare', [], 'muted', 16, 0, 32,
      floydTeaching(0, null, null, '无改进 / No improvement')
    ),
    makeStep(4, 3,
      'k=1：以节点 1 为中间点。检查所有 (i,j) 对，看 dist[i][1] + dist[1][j] 是否小于当前 dist[i][j]',
      'k=1: node 1 as intermediate. Check all (i,j) pairs: can dist[i][1] + dist[1][j] beat current dist[i][j]?',
      'highlight', [4, 5, 6, 7], 'warning', 16, 0, 32,
      floydTeaching(1, null, null, '检查中间点 k=1 / Checking intermediate k=1')
    ),
    makeStep(5, 4,
      'k=1, i=0, j=2：dist[0][1]=3 + dist[1][2]=2 = 5 < dist[0][2]=∞，更新 dist[0][2]=5。通过节点 1 作为桥梁连通了 0→2',
      'k=1, i=0, j=2: 3+2=5 < ∞, update dist[0][2]=5. Node 1 acts as a bridge connecting 0→2 via 0→1→2',
      'compare', [2], 'success', 17, 0, 33,
      floydTeaching(1, 0, 2, '0→1→2: 3+2=5 < ∞, 更新(update) dist[0][2]=5')
    ),
    makeStep(6, 4,
      'k=1 完成：矩阵中 dist[0][2] 从 ∞ 改进为 5。Floyd 的三重循环顺序很重要：k 必须在最外层，保证每次使用的中间路径已经是最优的',
      'After k=1: dist[0][2] improved from ∞ to 5. Triple-loop order matters: k must be outermost to ensure intermediate subpaths are already optimal',
      'mark', [2], 'success', 32, 0, 48,
      floydTeaching(1, null, null, 'k=1 完成: dist[0][2]=5')
    ),
    makeStep(7, 3,
      'k=2：以节点 2 为中间点。现在 dist[0][2]=5 和 dist[1][2]=2 都已知，可以进一步改进更多路径',
      'k=2: node 2 as intermediate. Now dist[0][2]=5 and dist[1][2]=2 are known, enabling further improvements',
      'highlight', [8, 9, 10, 11], 'warning', 32, 0, 48,
      floydTeaching(2, null, null, '检查中间点 k=2 / Checking intermediate k=2')
    ),
    makeStep(8, 4,
      'k=2, i=0, j=3：dist[0][2]=5 + dist[2][3]=1 = 6 < dist[0][3]=7，更新 dist[0][3]=6。路径 0→1→2→3 比直接边 0→3(7) 更短',
      'k=2, i=0, j=3: 5+1=6 < 7, update dist[0][3]=6. Path 0→1→2→3 beats direct edge 0→3(7)',
      'compare', [3], 'success', 33, 0, 49,
      floydTeaching(2, 0, 3, '0→...→2→3: 5+1=6 < 7, 更新(update) dist[0][3]=6')
    ),
    makeStep(9, 4,
      'k=2, i=1, j=3：dist[1][2]=2 + dist[2][3]=1 = 3 < dist[1][3]=∞，更新 dist[1][3]=3。打通了 1→2→3 的新路径',
      'k=2, i=1, j=3: 2+1=3 < ∞, update dist[1][3]=3. New path 1→2→3 discovered',
      'compare', [7], 'success', 34, 0, 50,
      floydTeaching(2, 1, 3, '1→2→3: 2+1=3 < ∞, 更新(update) dist[1][3]=3')
    ),
    makeStep(10, 3,
      'k=3：以节点 3 为最后一个中间点。此时大部分最短路径已经确定，检查是否有经节点 3 的改进',
      'k=3: node 3 as final intermediate. Most shortest paths are already determined, check for any improvements via node 3',
      'highlight', [12, 13, 14, 15], 'warning', 34, 0, 50,
      floydTeaching(3, null, null, '检查中间点 k=3 (最后一步 / final)')
    ),
    makeStep(11, 5,
      'Floyd-Warshall 完成！所有节点对最短路径已计算。算法通过三重循环 O(V³) 时间、O(V²) 空间解决了全源最短路径问题',
      'Floyd-Warshall complete! All-pairs shortest paths computed. O(V³) time, O(V²) space solves the APSP problem elegantly with DP',
      'mark', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 'success', 64, 0, 80,
      floydTeaching(3, null, null, '完成 / Complete: 所有节点对最短路径')
    ),
  ],
}

export default floydPreset
