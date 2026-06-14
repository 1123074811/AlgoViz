import { arrayCompiler } from './compilers/arrayCompiler'
import { automatonCompiler } from './compilers/automatonCompiler'
import { bitsetCompiler } from './compilers/bitsetCompiler'
import { dequeCompiler } from './compilers/dequeCompiler'
import { geometryCompiler } from './compilers/geometryCompiler'
import { graphAnalysisCompiler } from './compilers/graphAnalysisCompiler'
import { graphCompiler } from './compilers/graphCompiler'
import { hashTableCompiler } from './compilers/hashTableCompiler'
import { heapCompiler } from './compilers/heapCompiler'
import { linkedListCompiler } from './compilers/linkedListCompiler'
import { mapCompiler } from './compilers/mapCompiler'
import { mathCompiler } from './compilers/mathCompiler'
import { matrixCompiler } from './compilers/matrixCompiler'
import { pointerCompiler } from './compilers/pointerCompiler'
import { probCompiler } from './compilers/probCompiler'
import { queueCompiler } from './compilers/queueCompiler'
import { setCompiler } from './compilers/setCompiler'
import { stackCompiler } from './compilers/stackCompiler'
import { stringCompiler } from './compilers/stringCompiler'
import { treeCompiler } from './compilers/treeCompiler'
import { unionFindCompiler } from './compilers/unionFindCompiler'

/**
 * 事件编译器的唯一注册表与匹配顺序的单一事实源。
 *
 * `compileEvent` 用 `find(c => c.supports(event))` 派发——**先匹配先生效**，
 * 因此顺序是契约：窄匹配的结构编译器（pointer/linkedList/tree/unionFind）
 * 必须排在通用的 array 之前。新增一个结构 = 实现一个 compiler（含 supports/compile）
 * 后按合适位置加入本数组即可，无需改动 eventCompiler.ts。
 */
export const sceneEventCompilers = [
  pointerCompiler, linkedListCompiler, treeCompiler, unionFindCompiler,
  arrayCompiler, matrixCompiler, graphCompiler, stackCompiler, queueCompiler,
  stringCompiler, setCompiler, mapCompiler, dequeCompiler, hashTableCompiler,
  heapCompiler, bitsetCompiler, mathCompiler, geometryCompiler,
  automatonCompiler, probCompiler, graphAnalysisCompiler,
]
