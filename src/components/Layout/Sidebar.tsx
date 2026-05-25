import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { useNavigate } from 'react-router-dom'
import { Icon, categoryIcons, algorithmTypeIcons, type IconName } from '@/icons'
import { useAlgorithmStore, type AlgorithmCategory, type Difficulty } from '@/store/algorithmStore'

const CATEGORIES: { key: AlgorithmCategory | 'all'; icon: IconName }[] = [
  { key: 'all', icon: 'home' },
  { key: 'sorting', icon: 'arrow-up-down' },
  { key: 'graph', icon: 'git-graph' },
  { key: 'data-structure', icon: 'database' },
  { key: 'dp', icon: 'table2' },
  { key: 'search-backtrack', icon: 'search' },
  { key: 'advanced', icon: 'brain' },
  { key: 'interview', icon: 'zap' },
  { key: 'contest', icon: 'filter' },
]

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: 'difficulty.easy', className: 'bg-green-100 text-green-700' },
  medium: { label: 'difficulty.medium', className: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'difficulty.hard', className: 'bg-red-100 text-red-700' },
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const searchQuery = useAlgorithmStore((s) => s.searchQuery)
  const setSearchQuery = useAlgorithmStore((s) => s.setSearchQuery)
  const activeCategory = useAlgorithmStore((s) => s.activeCategory)
  const setActiveCategory = useAlgorithmStore((s) => s.setActiveCategory)
  const algorithms = useAlgorithmStore((s) => s.algorithms)
  const selectedAlgorithm = useAlgorithmStore((s) => s.selectedAlgorithm)
  const setSelectedAlgorithm = useAlgorithmStore((s) => s.setSelectedAlgorithm)

  const filteredAlgos = useMemo(() => {
    let result = algorithms
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) => {
          const globalIdx = algorithms.findIndex((x) => x.id === a.id) + 1
          return a.name.toLowerCase().includes(q) ||
            a.nameEn.toLowerCase().includes(q) ||
            String(globalIdx) === q
        }
      )
    }
    return result
  }, [algorithms, activeCategory, searchQuery])

  const handleSelect = (algo: (typeof algorithms)[0]) => {
    setSelectedAlgorithm(algo)
    navigate('/visualizer')
  }

  if (collapsed) {
    return (
      <aside className="w-14 border-r border-border bg-surface flex flex-col items-center py-3 gap-1 shrink-0">
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded-md
                     text-muted hover:text-slate-700 hover:bg-slate-200
                     transition-colors cursor-pointer border-none bg-transparent mb-2"
          title={t('nav.home')}
        >
          <Icon name="menu" size={18} />
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveCategory(cat.key)
              onToggle()
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-md
              transition-colors cursor-pointer border-none bg-transparent
              ${activeCategory === cat.key
                ? 'text-primary bg-primary-50'
                : 'text-muted hover:text-slate-700 hover:bg-slate-200'
              }`}
            title={t(`sidebar.${cat.key}`)}
          >
            <Icon name={cat.icon} size={18} />
          </button>
        ))}
      </aside>
    )
  }

  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm text-slate-700">
          {t('app.name')}
        </span>
        <button
          onClick={onToggle}
          className="w-7 h-7 flex items-center justify-center rounded-md
                     text-muted hover:text-slate-700 hover:bg-slate-200
                     transition-colors cursor-pointer border-none bg-transparent"
        >
          <Icon name="chevron-left" size={16} />
        </button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('sidebar.search')}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border
                       bg-white outline-none focus:border-primary focus:ring-1 focus:ring-primary-200
                       transition-colors placeholder:text-muted"
          />
        </div>
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
              transition-colors cursor-pointer border-none
              ${activeCategory === cat.key
                ? 'bg-primary text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-border'
              }`}
          >
            <Icon name={cat.icon} size={12} />
            {t(`sidebar.${cat.key}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">
          {filteredAlgos.map((algo) => {
            const diff = difficultyConfig[algo.difficulty]
            const isSelected = selectedAlgorithm?.id === algo.id
            // Find global index for numbering
            const globalIdx = algorithms.findIndex((a) => a.id === algo.id) + 1
            return (
              <button
                key={algo.id}
                onClick={() => handleSelect(algo)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left
                  transition-colors cursor-pointer border-none text-sm
                  ${isSelected
                    ? 'bg-primary-50 text-primary'
                    : 'hover:bg-slate-100 text-slate-700'
                  }`}
              >
                <span className="text-[10px] text-muted font-code w-5 text-right shrink-0">
                  {globalIdx}
                </span>
                <Icon
                  name={algorithmTypeIcons[algo.id] || categoryIcons[algo.category] || 'code2'}
                  size={14}
                />
                <span className="flex-1 truncate font-medium">
                  {i18n.language === 'zh' ? algo.name : algo.nameEn}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${diff.className}`}
                >
                  {t(diff.label)}
                </span>
              </button>
            )
          })}
          {filteredAlgos.length === 0 && (
            <p className="text-xs text-muted text-center py-6">
              {searchQuery ? t('sidebar.noResults') : t('sidebar.noAlgorithms')}
            </p>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted text-center">
          {t('app.tagline')}
        </p>
      </div>
    </aside>
  )
}
