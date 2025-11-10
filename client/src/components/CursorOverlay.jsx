import React from 'react'
import { useSocket } from '../context/SocketContext'

export default function CursorOverlay() {
  const { cursors } = useSocket()
  return (
    <div className="pointer-events-none absolute inset-0">
      {cursors.map(c => (
        <div key={c.userId} className="absolute -translate-x-1 -translate-y-1 text-[10px]" style={{ left: c.x, top: c.y }}>
          <div className="h-3 w-3 rounded-full border border-white" style={{ background: c.color }} />
        </div>
      ))}
    </div>
  )
}
