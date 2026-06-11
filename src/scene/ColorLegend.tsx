import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SEMANTIC_COLORS } from './tokens'

const LEGEND_ITEMS = [
  { color: SEMANTIC_COLORS.primary, key: 'current' },
  { color: SEMANTIC_COLORS.compare, key: 'comparing' },
  { color: SEMANTIC_COLORS.success, key: 'done' },
  { color: SEMANTIC_COLORS.danger, key: 'conflict' },
  { color: SEMANTIC_COLORS.idle, key: 'untouched' },
] as const

/** 画布角落的语义色图例，可折叠，色值与渲染 token 同源。 */
export default function ColorLegend() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-slate-200 bg-white/90 shadow-sm backdrop-blur text-[10px] text-slate-600 select-none">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={t('scene.legend.toggle')}
        className="flex w-full items-center gap-1 px-2 py-1 font-semibold text-slate-500 hover:text-slate-700"
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: SEMANTIC_COLORS.compare.stroke }}
        />
        {t('scene.legend.title')}
        <span className="ml-auto text-slate-300">{open ? '-' : '+'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 px-2 pb-1.5">
          {LEGEND_ITEMS.map(({ color, key }) => (
            <div key={key} className="flex items-center gap-1.5" data-testid="legend-swatch">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm border"
                style={{ background: color.fill, borderColor: color.stroke }}
              />
              <span>{t(`scene.legend.${key}`)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
