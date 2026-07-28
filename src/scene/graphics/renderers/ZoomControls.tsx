import { useTranslation } from 'react-i18next'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

/**
 * 浮动缩放/平移/全屏控件簇。
 * 从 SceneCanvas 拆分出来，降低主组件复杂度。
 */
export default function ZoomControls({ onZoomIn, onZoomOut, onReset, isFullscreen, onToggleFullscreen }: ZoomControlsProps) {
  const { t } = useTranslation()

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute top-4 right-4 flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md z-10 select-none"
    >
      <button
        onClick={onZoomIn}
        title="Zoom In"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
        </svg>
      </button>
      <button
        onClick={onZoomOut}
        title="Zoom Out"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
      <div className="h-4 w-px bg-slate-200 mx-0.5" />
      <button
        onClick={onReset}
        title="Reset View"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </button>
      {onToggleFullscreen && (
        <>
          <div className="h-4 w-px bg-slate-200 mx-0.5" />
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? t('scene.fullscreen.exit') : t('scene.fullscreen.enter')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-all"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 6l5-5m0 0v4m0-4h-4m-6l-5 5m0 0v-4m0 4h4m6-6l5 5m0 0v-4m0 4h-4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
