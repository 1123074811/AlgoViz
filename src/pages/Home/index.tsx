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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Hero */}
        <section className="text-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-200">
            <span className="text-white font-bold text-2xl">AV</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">{t('app.name')}</h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">{t('app.tagline')}</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => navigate('/playground')} className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all cursor-pointer border-none shadow-lg shadow-purple-200 flex items-center gap-2">
              <Icon name="zap" size={18} />
              AI 代码实验室
            </button>
            <button onClick={() => navigate('/visualizer')} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors cursor-pointer border-none shadow-sm shadow-primary-200 flex items-center gap-2">
              <Icon name="play" size={16} />
              {t('home.startLearning')}
            </button>
          </div>
        </section>

        {/* AI Analysis Feature — Core innovation */}
        <section className="mb-16 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
              <Icon name="zap" size={14} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">核心创新：AI 驱动代码 → 动画</h2>
          </div>

          {/* Workflow diagram */}
          <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
            {[
              { icon: 'code2', label: '粘贴/编写代码', desc: '任意 Python/JS/C++/Java 算法代码', color: 'bg-blue-500' },
              { icon: 'chevron-right', label: '', desc: '', color: '' },
              { icon: 'brain', label: 'AI 分析引擎', desc: '逐步模拟执行过程，生成结构化动画数据', color: 'bg-violet-500' },
              { icon: 'chevron-right', label: '', desc: '', color: '' },
              { icon: 'eye', label: '动画渲染', desc: '条形图/力导向图/树/矩阵等多种可视化', color: 'bg-green-500' },
            ].map((step, i) => (
              <div key={i} className={step.icon === 'chevron-right' ? 'text-slate-300 text-2xl font-bold' : 'flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border shadow-sm min-w-[160px]'}>
                {step.icon !== 'chevron-right' && (
                  <>
                    <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center`}>
                      <Icon name={step.icon as 'code2' | 'brain' | 'eye'} size={18} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                    <span className="text-[10px] text-slate-400 text-center leading-relaxed">{step.desc}</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { step: '1', title: '编写或粘贴代码', desc: '在 AI 代码实验室中自由编写或粘贴任意算法代码，支持 Python、JavaScript、C++、Java 四种语言' },
              { step: '2', title: 'AI 逐步分析', desc: 'AI 会逐行模拟代码执行，记录每一步操作（比较/交换/访问），生成标准 AnimationScript JSON' },
              { step: '3', title: '实时可视化播放', desc: '前端渲染引擎解析 JSON，驱动流畅动画：条形交换、节点高亮、矩阵填充，每步同步代码行' },
            ].map(item => (
              <div key={item.step} className="flex gap-3 p-4 rounded-xl bg-white/80 border border-border">
                <div className="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{item.step}</div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button onClick={() => navigate('/playground')} className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-sm hover:from-violet-600 hover:to-purple-700 transition-all cursor-pointer border-none shadow-lg shadow-purple-200 inline-flex items-center gap-2">
              <Icon name="zap" size={16} />
              立即体验 AI 代码实验室
            </button>
          </div>
        </section>

        {/* Algorithm Categories */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">{t('home.algorithmCategories')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryKeys.map((key) => (
              <button key={key} onClick={() => handleCategoryClick(key)} className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-white hover:border-primary hover:shadow-md hover:shadow-primary-50 transition-all duration-200 cursor-pointer text-left group">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon name={categoryIcons[key] || 'code2'} size={20} className="text-primary group-hover:text-white" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-sm text-slate-800 mb-1">{t(`home.categories.${key}.name`)}</h3>
                  <p className="text-xs text-slate-400">{t(`home.categories.${key}.desc`)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center pb-8">
          <p className="text-sm text-slate-400">
            51 个算法 · 4 种语言 · AI 驱动 · 开源项目
          </p>
        </section>
      </div>
    </div>
  )
}
