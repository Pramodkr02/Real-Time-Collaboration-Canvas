import React, { useEffect, useRef } from 'react'
import useCanvas from '../hooks/useCanvas'
import '../styles/CanvasBoard.css'

export default function CanvasBoard() {
  const canvasRef = useRef(null)
  const bufferRef = useRef(null)
  const containerRef = useRef(null)
  const { attach, resize } = useCanvas({ canvasRef, bufferRef, containerRef })

  useEffect(() => {
    attach()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [attach, resize])

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <canvas ref={bufferRef} className="hidden" style={{ touchAction: 'none' }} />
      <canvas ref={canvasRef} className="absolute inset-0 block" style={{ touchAction: 'none' }} />
    </div>
  )
}
