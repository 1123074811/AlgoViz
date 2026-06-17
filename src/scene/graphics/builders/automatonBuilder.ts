import type { AutomatonAlgorithmEvent } from '../../eventTypes'

type AutomatonState = { id: string; label?: string; accepting?: boolean; start?: boolean }

/**
 * automaton 域图元构建器:语义方法 → AutomatonAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const automatonBuilder = {
  create: (states: AutomatonState[]): AutomatonAlgorithmEvent => ({ type: 'automaton.create', states }),
  transition: (id: string, from: string, to: string, label: string): AutomatonAlgorithmEvent => ({ type: 'automaton.transition', id, from, to, label }),
  activate: (stateId: string): AutomatonAlgorithmEvent => ({ type: 'automaton.activate', stateId }),
  consume: (symbol: string, index: number): AutomatonAlgorithmEvent => ({ type: 'automaton.consume', symbol, index }),
  clear: (): AutomatonAlgorithmEvent => ({ type: 'automaton.clear' }),
}
