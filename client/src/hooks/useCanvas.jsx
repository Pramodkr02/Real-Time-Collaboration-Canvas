import { useCallback, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { TOOLS, THROTTLE_MS } from "../utils/constants";

export default function useCanvas({ canvasRef, bufferRef, containerRef }) {
  const {
    socket,
    tool,
    color,
    size,
    onRoomState,
    onDrawStroke,
    emit,
    registerCanvas,
    trackCursor,
    roomId,
  } = useSocket();
  const drawingRef = useRef(false);
  const strokeIdRef = useRef(null);
  const rafRef = useRef(null);
  const needsRepaintRef = useRef(false);
  const historyRef = useRef([]);
  const liveStrokeRef = useRef(null); // { tool, color, width, path: [{x,y}] }
  const remoteLiveRef = useRef(new Map()); // userId -> { tool, color, width, path: [] }
  const imageCacheRef = useRef(new Map()); // src -> HTMLImageElement
  const bootstrappedRef = useRef(false);
  const previewOpRef = useRef(null); // { type, data } for shapes/text previews
  const outBufferRef = useRef([]); // batched points for network

  const paintAll = useCallback(() => {
    const canvas = canvasRef.current;
    const buffer = bufferRef.current;
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext("2d");
    const bctx = buffer.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bctx.clearRect(0, 0, buffer.width, buffer.height);

    historyRef.current.forEach((op) => {
      if (op.type === "clear") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bctx.clearRect(0, 0, buffer.width, buffer.height);
        return;
      }
      if (op.type === "stroke") {
        const { tool, color, width, path } = op.data;
        const target = ctx;
        target.save();
        if (tool === TOOLS.ERASER)
          target.globalCompositeOperation = "destination-out";
        target.strokeStyle = color;
        target.lineWidth = width;
        target.lineCap = "round";
        target.lineJoin = "round";
        if (path && path.length) {
          target.beginPath();
          path.forEach((p, i) => {
            if (i === 0) target.moveTo(p.x, p.y);
            else target.lineTo(p.x, p.y);
          });
          target.stroke();
        }
        target.restore();
      } else if (op.type === "line") {
        const { color, width, x1, y1, x2, y2 } = op.data;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      } else if (op.type === "rect") {
        const { color, width, x, y, w, h } = op.data;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      } else if (op.type === "circle") {
        const { color, width, cx, cy, r } = op.data;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (op.type === "text") {
        const { color, x, y, text, size = 18, font = 'Inter, system-ui, sans-serif' } = op.data;
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${size}px ${font}`;
        ctx.fillText(text || "", x, y);
        ctx.restore();
      } else if (op.type === "image") {
        const { x, y, w, h, src } = op.data || {};
        if (!src) return;
        let img = imageCacheRef.current.get(src);
        if (!img) {
          img = new Image();
          img.onload = () => scheduleRepaint();
          img.src = src;
          imageCacheRef.current.set(src, img);
        }
        if (img.complete) ctx.drawImage(img, x, y, w, h);
      }
    });

    // draw live local stroke (not yet committed)
    if (liveStrokeRef.current) {
      const { tool, color, width, path } = liveStrokeRef.current;
      const target = ctx;
      target.save();
      if (tool === TOOLS.ERASER)
        target.globalCompositeOperation = "destination-out";
      target.strokeStyle = color;
      target.lineWidth = width;
      target.lineCap = "round";
      target.lineJoin = "round";
      if (path && path.length) {
        target.beginPath();
        path.forEach((p, i) => {
          if (i === 0) target.moveTo(p.x, p.y);
          else target.lineTo(p.x, p.y);
        });
        target.stroke();
      }
      target.restore();
    }

    // draw preview shape/text
    if (previewOpRef.current) {
      const op = previewOpRef.current;
      if (op.type === 'line') {
        const { color, width, x1, y1, x2, y2 } = op.data;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
      } else if (op.type === 'rect') {
        const { color, width, x, y, w, h } = op.data;
        ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.strokeRect(x,y,w,h); ctx.restore();
      } else if (op.type === 'circle') {
        const { color, width, cx, cy, r } = op.data;
        ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke(); ctx.restore();
      }
    }

    // draw live remote strokes
    if (remoteLiveRef.current.size) {
      for (const stroke of remoteLiveRef.current.values()) {
        const { tool, color, width, path } = stroke;
        const target = ctx;
        target.save();
        if (tool === TOOLS.ERASER)
          target.globalCompositeOperation = "destination-out";
        target.strokeStyle = color;
        target.lineWidth = width;
        target.lineCap = "round";
        target.lineJoin = "round";
        if (path && path.length) {
          target.beginPath();
          path.forEach((p, i) => {
            if (i === 0) target.moveTo(p.x, p.y);
            else target.lineTo(p.x, p.y);
          });
          target.stroke();
        }
        target.restore();
      }
    }
  }, [canvasRef, bufferRef]);

  const scheduleRepaint = useCallback(() => {
    if (needsRepaintRef.current) return;
    needsRepaintRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      needsRepaintRef.current = false;
      paintAll();
    });
  }, [paintAll]);

  useEffect(() => {
    if (!socket) return;
    // bootstrap from localStorage before first server state lands
    if (!bootstrappedRef.current) {
      try {
        const key = `cc_ops_${roomId || 'default'}`;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(local) && local.length) {
          historyRef.current = local;
          scheduleRepaint();
        }
      } catch {}
      bootstrappedRef.current = true;
    }
    const off1 = onRoomState(({ ops }) => {
      historyRef.current = ops;
      scheduleRepaint();
    });
    const off2 = onDrawStroke((d) => {
      const id = d.userId;
      if (d.end) {
        const live = remoteLiveRef.current.get(id);
        const path = d.path || d.pathChunk || live?.path || [];
        historyRef.current.push({
          opId: `${Date.now()}`,
          userId: id,
          type: "stroke",
          data: {
            tool: d.tool || live?.tool,
            color: d.color || live?.color,
            width: d.width || live?.width,
            path,
          },
          timestamp: Date.now(),
        });
        remoteLiveRef.current.delete(id);
        scheduleRepaint();
      } else {
        // start or chunk
        if (!remoteLiveRef.current.has(id)) {
          const startPath = [];
          if (typeof d.x === "number" && typeof d.y === "number")
            startPath.push({ x: d.x, y: d.y });
          remoteLiveRef.current.set(id, {
            tool: d.tool,
            color: d.color,
            width: d.width,
            path: startPath,
          });
        }
        const s = remoteLiveRef.current.get(id);
        if (Array.isArray(d.pathChunk) && d.pathChunk.length) {
          s.path.push(...d.pathChunk.map((p) => ({ x: p.x, y: p.y })));
        }
        scheduleRepaint();
      }
    });
    return () => {
      off1();
      off2();
    };
  }, [socket, onRoomState, onDrawStroke, scheduleRepaint]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const buffer = bufferRef.current;
    const parent = containerRef.current;
    if (!canvas || !parent || !buffer) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = parent.clientWidth + "px";
    canvas.style.height = parent.clientHeight + "px";
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const bctx = buffer.getContext("2d");
    bctx.scale(dpr, dpr);
    scheduleRepaint();
  }, [canvasRef, bufferRef, containerRef, scheduleRepaint]);

  const emitThrottled = useRef(0);

  const handlePoint = useCallback(
    (x, y, isStart = false, isEnd = false) => {
      // Only used for brush/eraser
      const payload = { x, y, color, width: size, tool };
      if (isStart) {
        strokeIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        emit("start_stroke", payload);
        liveStrokeRef.current = { tool, color, width: size, path: [{ x, y }] };
        outBufferRef.current = [];
      } else {
        outBufferRef.current.push({ x, y });
        const now = Date.now();
        if (now - emitThrottled.current >= THROTTLE_MS || isEnd) {
          emitThrottled.current = now;
          const chunk = outBufferRef.current.splice(0, outBufferRef.current.length);
          if (chunk.length) {
            emit("draw_stroke", { pathChunk: chunk, color, width: size, tool });
          }
        }
        if (liveStrokeRef.current) liveStrokeRef.current.path.push({ x, y });
      }
      if (isEnd) {
        emit("end_stroke", { strokeId: strokeIdRef.current });
        if (liveStrokeRef.current) {
          historyRef.current.push({
            opId: `${Date.now()}`,
            userId: "self",
            type: "stroke",
            data: liveStrokeRef.current,
            timestamp: Date.now(),
          });
          liveStrokeRef.current = null;
        }
      }
      scheduleRepaint();
    },
    [emit, tool, color, size, scheduleRepaint]
  );

  const onMouse = useCallback(
    (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (e.type === "mousedown") {
        drawingRef.current = true;
        if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) {
          handlePoint(x, y, true, false);
        } else if (tool === TOOLS.LINE) {
          previewOpRef.current = { type: 'line', data: { color, width: size, x1: x, y1: y, x2: x, y2: y } };
        } else if (tool === TOOLS.RECT) {
          previewOpRef.current = { type: 'rect', data: { color, width: size, x, y, w: 0, h: 0 } };
        } else if (tool === TOOLS.CIRCLE) {
          previewOpRef.current = { type: 'circle', data: { color, width: size, cx: x, cy: y, r: 0 } };
        } else if (tool === TOOLS.TEXT) {
          const text = prompt('Enter text');
          if (text && text.trim()) {
            emit('commit_op', { type: 'text', data: { text: text.trim(), x, y, color, size } });
          }
        }
      } else if (e.type === "mousemove") {
        trackCursor(x, y);
        if (drawingRef.current) {
          if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) handlePoint(x, y, false, false);
          else if (tool === TOOLS.LINE && previewOpRef.current) previewOpRef.current.data.x2 = x, previewOpRef.current.data.y2 = y;
          else if (tool === TOOLS.RECT && previewOpRef.current) previewOpRef.current.data.w = x - previewOpRef.current.data.x, previewOpRef.current.data.h = y - previewOpRef.current.data.y;
          else if (tool === TOOLS.CIRCLE && previewOpRef.current) previewOpRef.current.data.r = Math.hypot(x - previewOpRef.current.data.cx, y - previewOpRef.current.data.cy);
        }
      } else if (e.type === "mouseup" || e.type === "mouseleave") {
        if (drawingRef.current) {
          if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) handlePoint(x, y, false, true);
          else if (previewOpRef.current) {
            emit('commit_op', { type: previewOpRef.current.type, data: previewOpRef.current.data });
            previewOpRef.current = null;
          }
        }
        drawingRef.current = false;
      }
    },
    [handlePoint, trackCursor, tool, color, size, emit]
  );

  const onTouch = useCallback(
    (e) => {
      const t = e.touches[0] || e.changedTouches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      if (e.type === "touchstart") {
        drawingRef.current = true;
        if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) {
          handlePoint(x, y, true, false);
        } else if (tool === TOOLS.LINE) {
          previewOpRef.current = { type: 'line', data: { color, width: size, x1: x, y1: y, x2: x, y2: y } };
        } else if (tool === TOOLS.RECT) {
          previewOpRef.current = { type: 'rect', data: { color, width: size, x, y, w: 0, h: 0 } };
        } else if (tool === TOOLS.CIRCLE) {
          previewOpRef.current = { type: 'circle', data: { color, width: size, cx: x, cy: y, r: 0 } };
        }
      } else if (e.type === "touchmove") {
        trackCursor(x, y);
        if (drawingRef.current) {
          if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) handlePoint(x, y, false, false);
          else if (tool === TOOLS.LINE && previewOpRef.current) previewOpRef.current.data.x2 = x, previewOpRef.current.data.y2 = y;
          else if (tool === TOOLS.RECT && previewOpRef.current) previewOpRef.current.data.w = x - previewOpRef.current.data.x, previewOpRef.current.data.h = y - previewOpRef.current.data.y;
          else if (tool === TOOLS.CIRCLE && previewOpRef.current) previewOpRef.current.data.r = Math.hypot(x - previewOpRef.current.data.cx, y - previewOpRef.current.data.cy);
        }
      } else if (e.type === "touchend" || e.type === "touchcancel") {
        if (drawingRef.current) {
          if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) handlePoint(x, y, false, true);
          else if (previewOpRef.current) { emit('commit_op', { type: previewOpRef.current.type, data: previewOpRef.current.data }); previewOpRef.current = null; }
        }
        drawingRef.current = false;
      }
    },
    [handlePoint, trackCursor, tool, color, size, emit]
  );

  const attach = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    registerCanvas(c);
    c.addEventListener("mousedown", onMouse);
    c.addEventListener("mousemove", onMouse);
    c.addEventListener("mouseup", onMouse);
    c.addEventListener("mouseleave", onMouse);

    c.addEventListener("touchstart", onTouch, { passive: true });
    c.addEventListener("touchmove", onTouch, { passive: true });
    c.addEventListener("touchend", onTouch);
    c.addEventListener("touchcancel", onTouch);
    resize();
    return () => {
      c.removeEventListener("mousedown", onMouse);
      c.removeEventListener("mousemove", onMouse);
      c.removeEventListener("mouseup", onMouse);
      c.removeEventListener("mouseleave", onMouse);
      c.removeEventListener("touchstart", onTouch);
      c.removeEventListener("touchmove", onTouch);
      c.removeEventListener("touchend", onTouch);
      c.removeEventListener("touchcancel", onTouch);
    };
  }, [canvasRef, onMouse, onTouch, registerCanvas, resize]);

  // Autosave every 5s
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const key = `cc_ops_${roomId || 'default'}`;
        localStorage.setItem(key, JSON.stringify(historyRef.current));
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [roomId]);

  return { attach, resize };
}
