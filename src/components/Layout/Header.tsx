import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@/icons'
import { useAlgorithmStore } from '@/store/algorithmStore'

export default function Header() {
  const { t, i18n } = useTranslation()
  const setLanguage = useAlgorithmStore((s) => s.setLanguage)
  const location = useLocation()

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
    setLanguage(next)
  }

  const navItems = [
    { path: '/', label: t('nav.home'), icon: 'home' as const },
    { path: '/visualizer', label: t('nav.visualizer'), icon: 'code2' as const },
    { path: '/playground', label: t('nav.playground'), icon: 'brain' as const },
    { path: '/settings', label: t('nav.settings'), icon: 'settings' as const },
  ]

  return (
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-3 md:px-6 shrink-0 z-10">
      <div className="flex items-center gap-3 md:gap-8 min-w-0">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AV</span>
          </div>
          <span className="font-bold text-lg text-primary tracking-tight hidden sm:inline">
            {t('app.name')}
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 md:gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors duration-150 no-underline
                  ${isActive
                    ? 'bg-primary-50 text-primary'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                <Icon name={item.icon} size={16} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <button
        onClick={toggleLang}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                   text-slate-600 hover:text-slate-900 hover:bg-slate-100
                   transition-colors duration-150 border-none cursor-pointer bg-transparent"
        title={t('nav.language')}
      >
        <Icon name="globe" size={16} />
        <span className="font-code text-xs">
          {i18n.language === 'zh' ? 'EN' : '中'}
        </span>
      </button>
    </header>
  )
}
