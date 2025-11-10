import React, { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { TOOLS } from '../utils/constants'
import '../styles/Toolbar.css'

export default function Toolbar() {
  const { tool, setTool, color, setColor, size, setSize, undo, redo, clear, latency, emit } = useSocket()
  const [picker, setPicker] = useState(color)
  const [uploading, setUploading] = useState(false)
  const [showShapes, setShowShapes] = useState(false)

  useEffect(() => setPicker(color), [color])

  const handleToolSelect = (selectedTool) => {
    setTool(selectedTool);
    console.log('Selected tool:', selectedTool);
    setShowShapes(false);
  };

  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-xs text-slate-400 mb-1">Tool</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleToolSelect(TOOLS.BRUSH)} className={`btn ${tool===TOOLS.BRUSH?'btn-active':''}`}>Brush</button>
          <button onClick={() => handleToolSelect(TOOLS.ERASER)} className={`btn ${tool===TOOLS.ERASER?'btn-active':''}`}>Eraser</button>
          <button onClick={() => handleToolSelect(TOOLS.LINE)} className={`btn ${tool===TOOLS.LINE?'btn-active':''}`}>Line</button>
          <button onClick={() => handleToolSelect(TOOLS.RECT)} className={`btn ${tool===TOOLS.RECT?'btn-active':''}`}>Rect</button>
          <button onClick={() => handleToolSelect(TOOLS.CIRCLE)} className={`btn ${tool===TOOLS.CIRCLE?'btn-active':''}`}>Circle</button>
          <button onClick={() => handleToolSelect(TOOLS.TEXT)} className={`btn ${tool===TOOLS.TEXT?'btn-active':''}`}>Text</button>
        </div>
        <div className="mt-2">
          <button onClick={() => setShowShapes(!showShapes)} className="btn w-full">More Shapes & Tools</button>
          {showShapes && (
            <div className="shapes-popup">
              <div className="shapes-section">
                <h3 className="shapes-title">Drawing Tools</h3>
                <div className="shapes-grid">
                  <button onClick={() => handleToolSelect(TOOLS.PENCIL)} className={`shape-btn ${tool === TOOLS.PENCIL ? 'btn-active' : ''}`}>Pencil</button>
                  <button onClick={() => handleToolSelect(TOOLS.PEN)} className={`shape-btn ${tool === TOOLS.PEN ? 'btn-active' : ''}`}>Pen</button>
                  <button onClick={() => handleToolSelect(TOOLS.ELLIPSE)} className={`shape-btn ${tool === TOOLS.ELLIPSE ? 'btn-active' : ''}`}>Ellipse</button>
                  <button onClick={() => handleToolSelect(TOOLS.TRIANGLE)} className={`shape-btn ${tool === TOOLS.TRIANGLE ? 'btn-active' : ''}`}>Triangle</button>
                </div>
              </div>
              <div className="shapes-section">
                <h3 className="shapes-title">Advanced Shapes</h3>
                <div className="shapes-grid">
                  <button onClick={() => handleToolSelect(TOOLS.STAR)} className={`shape-btn ${tool === TOOLS.STAR ? 'btn-active' : ''}`}>Star</button>
                  <button onClick={() => handleToolSelect(TOOLS.HEXAGON)} className={`shape-btn ${tool === TOOLS.HEXAGON ? 'btn-active' : ''}`}>Hexagon</button>
                  <button onClick={() => handleToolSelect(TOOLS.ARROW)} className={`shape-btn ${tool === TOOLS.ARROW ? 'btn-active' : ''}`}>Arrow</button>
                </div>
              </div>
            </div>
          )}
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

      <ImageUpload uploading={uploading} setUploading={setUploading} emit={emit} />

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

function ImageUpload({ uploading, setUploading, emit }){
  return (
    <div>
      <input
        id="img-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setUploading(true)
          try {
            const reader = new FileReader()
            reader.onload = () => {
              const src = reader.result
              emit('commit_op', {
                type: 'image',
                data: { x: 80, y: 80, w: 240, h: 180, src }
              })
              setUploading(false)
            }
            reader.readAsDataURL(file)
          } catch {
            setUploading(false)
          }
        }}
      />
      <label htmlFor="img-upload" className={`btn w-full ${uploading?'opacity-50 pointer-events-none':''}`}>Image Upload</label>
    </div>
  )
}
