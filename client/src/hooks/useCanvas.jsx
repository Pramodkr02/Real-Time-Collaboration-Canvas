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
  } = useSocket();
  const drawingRef = useRef(false);
  const strokeIdRef = useRef(null);
  const rafRef = useRef(null);
  const needsRepaintRef = useRef(false);
  const historyRef = useRef([]);
  const liveStrokeRef = useRef(null); // { tool, color, width, path: [{x,y}] }
  const remoteLiveRef = useRef(new Map()); // userId -> { tool, color, width, path: [] }

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
      // ignore legacy chunk ops; we now use 'stroke' only
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
      const payload = { x, y, color, width: size, tool };
      if (isStart) {
        strokeIdRef.current = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        emit("start_stroke", payload);
        liveStrokeRef.current = { tool, color, width: size, path: [{ x, y }] };
      } else {
        const now = Date.now();
        if (now - emitThrottled.current >= THROTTLE_MS || isEnd) {
          emitThrottled.current = now;
          emit("draw_stroke", {
            pathChunk: [{ x, y }],
            color,
            width: size,
            tool,
          });
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
        handlePoint(x, y, true, false);
      } else if (e.type === "mousemove") {
        trackCursor(x, y);
        if (drawingRef.current) handlePoint(x, y, false, false);
      } else if (e.type === "mouseup" || e.type === "mouseleave") {
        if (drawingRef.current) handlePoint(x, y, false, true);
        drawingRef.current = false;
      }
    },
    [handlePoint, trackCursor]
  );

  const onTouch = useCallback(
    (e) => {
      const t = e.touches[0] || e.changedTouches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      if (e.type === "touchstart") {
        drawingRef.current = true;
        handlePoint(x, y, true, false);
      } else if (e.type === "touchmove") {
        trackCursor(x, y);
        if (drawingRef.current) handlePoint(x, y, false, false);
      } else if (e.type === "touchend" || e.type === "touchcancel") {
        if (drawingRef.current) handlePoint(x, y, false, true);
        drawingRef.current = false;
      }
    },
    [handlePoint, trackCursor]
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

  return { attach, resize };
}
