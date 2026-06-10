import { Icon } from '@/icons'
import type { AlgorithmDefinition } from '@/data/algorithms'

export default function DefinitionCard({
  def,
  lang,
  expanded,
  onToggle,
}: {
  def: AlgorithmDefinition
  lang: 'zh' | 'en'
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-surface">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer border-none bg-transparent p-0"
      >
        <span>{lang === 'zh' ? '详细定义' : 'Definition'}</span>
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 text-[10px] text-slate-600 leading-relaxed">
          <p>{lang === 'zh' ? def.definition : def.definitionEn}</p>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '提出者：' : 'Inventor: '}</span>
            {def.inventor} ({def.year})
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '过程：' : 'Procedure:'}</span>
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              {(lang === 'zh' ? def.procedure : def.procedureEn).map((step, i) => (
                <li key={i} className="text-[10px]">
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">
              {lang === 'zh' ? '复杂度详解' : 'Complexity Details'}
            </span>
            <p className="mt-0.5">
              <strong>{lang === 'zh' ? '时间：' : 'Time: '}</strong>
              {lang === 'zh' ? def.timeComplexity.explanation : def.timeComplexity.explanationEn}
            </p>
            <p className="mt-0.5">
              <strong>{lang === 'zh' ? '空间：' : 'Space: '}</strong>
              {lang === 'zh' ? def.spaceComplexity.explanation : def.spaceComplexity.explanationEn}
            </p>
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '特性：' : 'Properties: '}</span>
            <span>
              {lang === 'zh'
                ? `稳定=${def.properties.stable ? '是' : '否'} 原地=${def.properties.inPlace ? '是' : '否'} 自适应=${def.properties.adaptive ? '是' : '否'}`
                : `Stable=${def.properties.stable} In-place=${def.properties.inPlace} Adaptive=${def.properties.adaptive}`}
            </span>
          </div>
          <div className="border-t border-border pt-2">
            <span className="font-semibold">{lang === 'zh' ? '适用场景：' : 'Use Cases: '}</span>
            {lang === 'zh' ? def.useCases : def.useCasesEn}
          </div>
        </div>
      )}
    </div>
  )
}
