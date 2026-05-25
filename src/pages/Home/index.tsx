import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Icon, categoryIcons } from '@/icons'
import { useAlgorithmStore, type AlgorithmCategory } from '@/store/algorithmStore'

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setActiveCategory = useAlgorithmStore((s) => s.setActiveCategory)

  useEffect(() => {
    document.title = `AlgoViz — ${t('app.tagline')}`
  }, [t])

  const handleCategoryClick = (cat: AlgorithmCategory) => {
    setActiveCategory(cat)
    navigate('/visualizer')
  }

  const categoryKeys: AlgorithmCategory[] = [
    'sorting', 'graph', 'data-structure', 'dp',
    'search-backtrack', 'advanced', 'interview', 'contest',
  ]

  const features = [
    { icon: 'brain' as const, i18nKey: 'home.features.ai' },
    { icon: 'code2' as const, i18nKey: 'home.features.editor' },
    { icon: 'eye' as const, i18nKey: 'home.features.visualization' },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-12">
        <section className="text-center mb-16">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-200">
            <span className="text-white font-bold text-2xl">AV</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            {t('app.name')}
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">
            {t('app.tagline')}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => navigate('/visualizer')}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium
                         hover:bg-primary-700 transition-colors cursor-pointer border-none
                         shadow-sm shadow-primary-200"
            >
              <span className="flex items-center gap-2">
                <Icon name="play" size={16} />
                {t('home.startLearning')}
              </span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2.5 bg-white text-slate-700 rounded-lg font-medium
                         border border-border hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Icon name="settings" size={16} />
                {t('home.configureAI')}
              </span>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            {t('home.algorithmCategories')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryKeys.map((key) => (
              <button
                key={key}
                onClick={() => handleCategoryClick(key)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border
                           bg-white hover:border-primary hover:shadow-md hover:shadow-primary-50
                           transition-all duration-200 cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center
                                group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon
                    name={categoryIcons[key] || 'code2'}
                    size={20}
                    className="text-primary group-hover:text-white"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-sm text-slate-800 mb-1">
                    {t(`home.categories.${key}.name`)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t(`home.categories.${key}.desc`)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {t('home.keyFeatures')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {features.map((feature) => (
              <div
                key={feature.i18nKey}
                className="p-6 rounded-xl border border-border bg-surface text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <Icon name={feature.icon} size={20} className="text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-slate-800 mb-1">
                  {t(`${feature.i18nKey}.title`)}
                </h3>
                <p className="text-xs text-slate-400">
                  {t(`${feature.i18nKey}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
