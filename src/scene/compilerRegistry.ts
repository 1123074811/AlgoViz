import { arrayCompiler } from './graphics/compile/arrayCompile'
import { automatonCompiler } from './graphics/compile/automatonCompile'
import { bitsetCompiler } from './graphics/compile/bitsetCompile'
import { dequeCompiler } from './graphics/compile/dequeCompile'
import { geometryCompiler } from './graphics/compile/geometryCompile'
import { graphAnalysisCompiler } from './graphics/compile/graphAnalysisCompile'
import { graphCompiler } from './graphics/compile/graphCompile'
import { hashTableCompiler } from './graphics/compile/hashTableCompile'
import { heapCompiler } from './graphics/compile/heapCompile'
import { linkedListCompiler } from './graphics/compile/linkedListCompile'
import { mapCompiler } from './graphics/compile/mapCompile'
import { mathCompiler } from './graphics/compile/mathCompile'
import { matrixCompiler } from './graphics/compile/matrixCompile'
import { pointerCompiler } from './graphics/compile/pointerCompile'
import { probCompiler } from './graphics/compile/probCompile'
import { queueCompiler } from './graphics/compile/queueCompile'
import { setCompiler } from './graphics/compile/setCompile'
import { skipListCompiler } from './graphics/compile/skipListCompile'
import { stackCompiler } from './graphics/compile/stackCompile'
import { stringCompiler } from './graphics/compile/stringCompile'
import { treeCompiler } from './graphics/compile/treeCompile'
import { unionFindCompiler } from './graphics/compile/unionFindCompile'

/**
 * 事件编译器的唯一注册表与匹配顺序的单一事实源。
 *
 * `compileEvent` 用 `find(c => c.supports(event))` 派发——**先匹配先生效**，
 * 因此顺序是契约：窄匹配的结构编译器（pointer/linkedList/tree/unionFind）
 * 必须排在通用的 array 之前。新增一个结构 = 实现一个 compiler（含 supports/compile）
 * 后按合适位置加入本数组即可，无需改动 eventCompiler.ts。
 */
export const sceneEventCompilers = [
  pointerCompiler, linkedListCompiler, skipListCompiler, treeCompiler, unionFindCompiler,
  arrayCompiler, matrixCompiler, graphCompiler, stackCompiler, queueCompiler,
  stringCompiler, setCompiler, mapCompiler, dequeCompiler, hashTableCompiler,
  heapCompiler, bitsetCompiler, mathCompiler, geometryCompiler,
  automatonCompiler, probCompiler, graphAnalysisCompiler,
]
