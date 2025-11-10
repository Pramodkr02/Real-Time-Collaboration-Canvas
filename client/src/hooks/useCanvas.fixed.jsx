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
  const liveStrokeRef = useRef(null);
  const remoteLiveRef = useRef(new Map());
  const imageCacheRef = useRef(new Map());
  const bootstrappedRef = useRef(false);
  const previewOpRef = useRef(null);
  const outBufferRef = useRef([]);
  const emitThrottled = useRef(0);

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
      }
    });

    // draw live local stroke
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

    // draw preview shape
    if (previewOpRef.current) {
      const op = previewOpRef.current;
      if (op.type === "line") {
        const { color, width, x1, y1, x2, y2 } = op.data;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      } else if (op.type === "rect") {
        const { color, width, x, y, w, h } = op.data;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
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

  function handlePoint(x, y, isStart = false, isEnd = false) {
    // Only used for brush/eraser
    const payload = { x, y, color, width: size, tool };
    if (isStart) {
      strokeIdRef.current = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      emit("start_stroke", payload);
      liveStrokeRef.current = { tool, color, width: size, path: [{ x, y }] };
      outBufferRef.current = [];
    } else {
      outBufferRef.current.push({ x, y });
      const now = Date.now();
      if (now - emitThrottled.current >= THROTTLE_MS || isEnd) {
        emitThrottled.current = now;
        const chunk = outBufferRef.current.splice(0);
        emit("stroke", { points: chunk, stroke: strokeIdRef.current });
        if (isEnd) {
          emit("end_stroke");
          liveStrokeRef.current = null;
        }
      }
      if (liveStrokeRef.current) liveStrokeRef.current.path.push({ x, y });
    }
    if (isEnd) {
      emit("end_stroke", { strokeId: strokeIdRef.current });
      if (liveStrokeRef.current) {
        historyRef.current.push({
          opId: Date.now().toString(),
          userId: "self",
          type: "stroke",
          data: liveStrokeRef.current,
          timestamp: Date.now(),
        });
        liveStrokeRef.current = null;
      }
    }
  }

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
          previewOpRef.current = {
            type: "line",
            data: { color, width: size, x1: x, y1: y, x2: x, y2: y },
          };
        } else if (tool === TOOLS.RECT) {
          previewOpRef.current = {
            type: "rect",
            data: { color, width: size, x, y, w: 0, h: 0 },
          };
        }
        trackCursor(x, y);
      } else if (e.type === "mousemove") {
        if (drawingRef.current) {
          if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) {
            handlePoint(x, y, false, false);
          } else if (tool === TOOLS.LINE && previewOpRef.current) {
            previewOpRef.current.data.x2 = x;
            previewOpRef.current.data.y2 = y;
            scheduleRepaint();
          } else if (tool === TOOLS.RECT && previewOpRef.current) {
            previewOpRef.current.data.w = x - previewOpRef.current.data.x;
            previewOpRef.current.data.h = y - previewOpRef.current.data.y;
            scheduleRepaint();
          }
        }
        trackCursor(x, y);
      } else if (e.type === "mouseup" || e.type === "mouseleave") {
        if (drawingRef.current) {
          if (tool === TOOLS.BRUSH || tool === TOOLS.ERASER) {
            handlePoint(x, y, false, true);
          } else if (
            (tool === TOOLS.LINE || tool === TOOLS.RECT) &&
            previewOpRef.current
          ) {
            const op = {
              ...previewOpRef.current,
              id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
              timestamp: Date.now(),
            };
            scheduleRepaint();
            emit("commit_op", op);
            previewOpRef.current = null;
          }
        }
        drawingRef.current = false;
      }
    },
    [handlePoint, trackCursor, tool, color, size, emit]
  );

  const handleTouch = useCallback(
    (e) => {
      e.preventDefault();
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const mockEvent = {
        type: e.type.replace("touch", "mouse"),
        clientX: touch.clientX,
        clientY: touch.clientY,
      };

      onMouse(mockEvent);
    },
    [canvasRef, onMouse]
  );

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

  const attach = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    registerCanvas(c);
    c.addEventListener("mousedown", onMouse);
    c.addEventListener("mousemove", onMouse);
    c.addEventListener("mouseup", onMouse);
    c.addEventListener("mouseleave", onMouse);

    c.addEventListener("touchstart", handleTouch, { passive: true });
    c.addEventListener("touchmove", handleTouch, { passive: true });
    c.addEventListener("touchend", handleTouch);
    c.addEventListener("touchcancel", handleTouch);
    return () => {
      c.removeEventListener("mousedown", onMouse);
      c.removeEventListener("mousemove", onMouse);
      c.removeEventListener("mouseup", onMouse);
      c.removeEventListener("mouseleave", onMouse);
      c.removeEventListener("touchstart", handleTouch);
      c.removeEventListener("touchmove", handleTouch);
      c.removeEventListener("touchend", handleTouch);
      c.removeEventListener("touchcancel", handleTouch);
    };
  }, [canvasRef, onMouse, handleTouch, registerCanvas]);

  useEffect(() => {
    if (!socket) return;
    // bootstrap from localStorage before first server state lands
    if (!bootstrappedRef.current) {
      try {
        const key = "cc_ops_" + (roomId || "default");
        const local = JSON.parse(localStorage.getItem(key) || "[]");
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
          opId: Date.now().toString(),
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

  // Autosave every 5s
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const key = "cc_ops_" + (roomId || "default");
        localStorage.setItem(key, JSON.stringify(historyRef.current));
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [roomId]);

  return { attach, resize };
}