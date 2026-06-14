export {
  DEFAULT_ALGORITHMS,
  type AlgorithmCategory,
  type AlgorithmType,
  type Difficulty,
} from './algorithmCatalog'
export { ALGORITHM_DEFS, type AlgorithmDefinition } from './algorithmDefs'
export {
  ALGORITHM_DEFAULT_INPUTS,
  getAlgorithmDescription,
  type AlgorithmDefaultInput,
  type AlgorithmLang,
} from './algorithmMetadata'
// 仅 re-export 类型（类型在打包时被擦除，零运行时成本）。
// getCodeTemplate(运行时函数)刻意不在此 barrel re-export —— 否则 store 经本 barrel
// 引入 DEFAULT_ALGORITHMS 时会把 4975 行的 codeTemplates 拖进首屏主包。
// 唯一运行时消费者 Visualizer 改为直接从 '@/data/codeTemplates' 引入，
// 使模板随 Visualizer 懒加载 chunk 加载，移出初始包。
export type { CodeLang } from './codeTemplates'
