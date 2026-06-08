import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'

type LayoutEditor = {
  layout: () => void
}

export function useResizablePanels(editorRef: RefObject<LayoutEditor | null>) {
  const [leftWidth, setLeftWidth] = useState(35)
  const [rightWidth, setRightWidth] = useState(22)
  const [editorHeight, setEditorHeight] = useState(62)
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1280)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLeftResizeStart = useCallback((e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = leftWidth
    const containerWidth = window.innerWidth

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidth = Math.min(50, Math.max(20, startWidth + deltaPercent))
      setLeftWidth(newWidth)
      editorRef.current?.layout()
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      setTimeout(() => editorRef.current?.layout(), 20)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [editorRef, leftWidth])

  const handleRightResizeStart = useCallback((e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightWidth
    const containerWidth = window.innerWidth

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidth = Math.min(35, Math.max(15, startWidth - deltaPercent))
      setRightWidth(newWidth)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [rightWidth])

  const handleEditorHeightResizeStart = useCallback((e: MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = editorHeight
    const leftPanelElement = document.getElementById('left-workspace-panel')
    if (!leftPanelElement) return
    const containerHeight = leftPanelElement.getBoundingClientRect().height

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const deltaPercent = (deltaY / containerHeight) * 100
      const newHeight = Math.min(82, Math.max(30, startHeight + deltaPercent))
      setEditorHeight(newHeight)
      editorRef.current?.layout()
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      setTimeout(() => editorRef.current?.layout(), 20)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [editorHeight, editorRef])

  return {
    leftWidth,
    rightWidth,
    editorHeight,
    isDesktop,
    handleLeftResizeStart,
    handleRightResizeStart,
    handleEditorHeightResizeStart,
  }
}
