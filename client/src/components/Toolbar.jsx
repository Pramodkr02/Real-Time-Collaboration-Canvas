import React, { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { TOOLS } from '../utils/constants'
import '../styles/Toolbar.css'

export default function Toolbar() {
  const { tool, setTool, color, setColor, size, setSize, undo, redo, clear, latency } = useSocket()
  const [picker, setPicker] = useState(color)

  useEffect(() => setPicker(color), [color])

  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-xs text-slate-400 mb-1">Tool</div>
        <div className="flex gap-2">
          <button onClick={() => setTool(TOOLS.BRUSH)} className={`btn ${tool===TOOLS.BRUSH?'btn-active':''}`}>Brush</button>
          <button onClick={() => setTool(TOOLS.ERASER)} className={`btn ${tool===TOOLS.ERASER?'btn-active':''}`}>Eraser</button>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-400 mb-1">Color</div>
        <input type="color" value={picker} onChange={(e)=>{ setPicker(e.target.value); setColor(e.target.value) }} />
      </div>

      <div>
        <div className="text-xs text-slate-400 mb-1">Size: {size}px</div>
        <input type="range" min="2" max="48" value={size} onChange={(e)=>setSize(parseInt(e.target.value))} />
      </div>

      <div className="flex gap-2">
        <button onClick={undo} className="btn">Undo</button>
        <button onClick={redo} className="btn">Redo</button>
        <button onClick={clear} className="btn btn-danger">Clear</button>
      </div>

      <div className="pt-2 text-xs text-slate-400">Latency: {latency} ms</div>
      <SavePNGBtn />
    </div>
  )
}

function SavePNGBtn() {
  const { getCanvas } = useSocket()
  return (
    <button
      className="btn w-full"
      onClick={() => {
        const c = getCanvas()
        if (!c) return
        const url = c.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = `canvas-${Date.now()}.png`
        a.click()
      }}
    >Save PNG</button>
  )
}
