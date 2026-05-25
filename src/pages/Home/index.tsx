import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Icon, categoryIcons } from '@/icons'
import { useAlgorithmStore, type AlgorithmCategory } from '@/store/algorithmStore'

const CATEGORY_INFO: Record<
  AlgorithmCategory,
  { name: string; description: string; icon: (typeof categoryIcons)[keyof typeof categoryIcons] }
> = {
  sorting: { name: '排序算法', description: '冒泡、选择、插入、快排等经典排序', icon: 'arrow-up-down' },
  graph: { name: '图算法', description: 'BFS、DFS、Dijkstra、拓扑排序等', icon: 'git-graph' },
  'data-structure': { name: '数据结构', description: '链表、树、堆、哈希表等基础结构', icon: 'database' },
  dp: { name: '动态规划', description: '背包、LCS、编辑距离等经典DP', icon: 'hash' },
  'search-backtrack': { name: '搜索与回溯', description: '二分查找、回溯、N皇后', icon: 'search' },
  advanced: { name: '进阶专题', description: 'KMP、线段树、树状数组等', icon: 'brain' },
  interview: { name: '面试高频', description: 'LeetCode Hot 100 精选', icon: 'zap' },
  contest: { name: '竞赛专题', description: 'ACM 常用算法模板', icon: 'filter' },
}

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
                开始学习
              </span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-6 py-2.5 bg-white text-slate-700 rounded-lg font-medium
                         border border-border hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Icon name="settings" size={16} />
                配置 AI
              </span>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            算法分类
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(CATEGORY_INFO) as [AlgorithmCategory, (typeof CATEGORY_INFO)[AlgorithmCategory]][]).map(
              ([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleCategoryClick(key)}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border
                             bg-white hover:border-primary hover:shadow-md hover:shadow-primary-50
                             transition-all duration-200 cursor-pointer text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center
                                  group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon name={info.icon} size={20} className="text-primary group-hover:text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-sm text-slate-800 mb-1">{info.name}</h3>
                    <p className="text-xs text-slate-400">{info.description}</p>
                  </div>
                </button>
              )
            )}
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">核心特性</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {[
              { icon: 'brain' as const, title: 'AI 驱动的动画', desc: 'AI 实时分析用户代码，生成结构化动画数据，而非预置动画' },
              { icon: 'code2' as const, title: '多语言代码编辑', desc: '支持 Python、JavaScript、C++、Java，Monaco Editor 实时高亮' },
              { icon: 'eye' as const, title: '所见即所得', desc: '条形图、力导向图、层次树等多种渲染器，动画流畅 300ms' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-surface text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <Icon name={feature.icon} size={20} className="text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-slate-800 mb-1">{feature.title}</h3>
                <p className="text-xs text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
