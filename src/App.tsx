import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import MainLayout from '@/components/Layout/MainLayout'
import { ErrorFallback } from '@/components/ErrorBoundary'

const Home = lazy(() => import('@/pages/Home'))
const Visualizer = lazy(() => import('@/pages/Visualizer'))
const Settings = lazy(() => import('@/pages/Settings'))
const Playground = lazy(() => import('@/pages/Playground'))

function LoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback
          {...props}
          title="应用渲染失败"
          description="顶层界面遇到异常，已保留错误信息以便恢复。"
        />
      )}
    >
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<Suspense fallback={<LoadingFallback />}><Home /></Suspense>} />
          <Route element={<MainLayout />}>
            <Route path="/visualizer" element={<Suspense fallback={<LoadingFallback />}><Visualizer /></Suspense>} />
          </Route>
          <Route path="/settings" element={<Suspense fallback={<LoadingFallback />}><Settings /></Suspense>} />
          <Route path="/playground" element={<Suspense fallback={<LoadingFallback />}><Playground /></Suspense>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
