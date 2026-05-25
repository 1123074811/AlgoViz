import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)')
    const sync = () => setSidebarCollapsed(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
        <main className="flex-1 overflow-hidden bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
