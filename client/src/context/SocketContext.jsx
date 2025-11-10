import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import {
  TOOLS,
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  THROTTLE_MS,
} from "../utils/constants";
import { SERVER_URL } from "../config";

const Ctx = createContext(null);
export function SocketProvider({ children, username, roomId }) {
  const [tool, setTool] = useState(TOOLS.BRUSH);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState([]);
  const [drawingUsers, setDrawingUsers] = useState([]);
  const [latency, setLatency] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const selfRef = useRef(null);

  useEffect(() => {
    if (!username) return;
    const s = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      timeout: 20000,
      forceNew: true,
    });
    socketRef.current = s;

    s.on("connect", () => {
      console.log("Connected to server");
      setConnectionStatus("connected");
      s.emit("join_room", { roomId, username });
    });

    s.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnectionStatus("disconnected");
    });

    s.on("error", (error) => {
      console.error("Socket error:", error);
      setConnectionStatus("disconnected");
    });

    let pingTimer = setInterval(() => {
      const t0 = Date.now();
      s.timeout(1500).emit("ping", {}, () => {
        setLatency(Date.now() - t0);
      });
    }, 2000);

    s.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnectionStatus("disconnected");
    });

    s.on("room_state", ({ ops, users }) => {
      setUsers(users);
      selfRef.current = users.find((u) => u.userId === s.id) || null;
    });
    s.on("update_users", ({ users }) => {
      setUsers(users);
      selfRef.current = users.find((u) => u.userId === s.id) || null;
    });
    s.on("cursor_move", (p) => {
      setCursors((prev) => {
        const map = new Map(prev.map((c) => [c.userId, c]));
        map.set(p.userId, p);
        return Array.from(map.values());
      });
    });
    // track who is currently drawing (live strokes)
    s.on("draw_stroke", (d) => {
      try {
        const id = d.userId;
        if (!id) return;
        if (d.end) {
          setDrawingUsers((prev) => prev.filter((u) => u !== id));
        } else {
          setDrawingUsers((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }
      } catch (err) {
        console.warn("draw_stroke handler error", err);
      }
    });

    return () => {
      clearInterval(pingTimer);
      s.disconnect();
    };
  }, [username, roomId]);

  const onRoomStateHandlers = useRef([]);
  const onDrawHandlers = useRef([]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const h1 = (payload) =>
      onRoomStateHandlers.current.forEach((fn) => fn(payload));
    const h2 = (payload) => onDrawHandlers.current.forEach((fn) => fn(payload));
    s.on("room_state", h1);
    s.on("draw_stroke", h2);
    return () => {
      s.off("room_state", h1);
      s.off("draw_stroke", h2);
    };
  }, [socketRef.current]);

  const selfUser = useMemo(() => {
    const id = socketRef.current?.id;
    return users.find((u) => u.userId === id) || null;
  }, [users, socketRef.current?.id]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      tool,
      setTool,
      color,
      setColor,
      size,
      setSize,
      users,
      drawingUsers,
      self: selfUser,
      cursors,
      latency,
      connectionStatus,
      emit: (evt, data) =>
        socketRef.current && socketRef.current.emit(evt, data),
      undo: () =>
        socketRef.current &&
        socketRef.current.emit("undo", { userId: socketRef.current.id }),
      redo: () =>
        socketRef.current &&
        socketRef.current.emit("redo", { userId: socketRef.current.id }),
      clear: () =>
        socketRef.current &&
        socketRef.current.emit("clear", { userId: socketRef.current.id }),
      onRoomState: (fn) => {
        onRoomStateHandlers.current.push(fn);
        return () => {
          onRoomStateHandlers.current = onRoomStateHandlers.current.filter(
            (f) => f !== fn
          );
        };
      },
      onDrawStroke: (fn) => {
        onDrawHandlers.current.push(fn);
        return () => {
          onDrawHandlers.current = onDrawHandlers.current.filter(
            (f) => f !== fn
          );
        };
      },
      registerCanvas: (c) => {
        canvasRef.current = c;
      },
      getCanvas: () => canvasRef.current,
      trackCursor: (x, y) =>
        socketRef.current && socketRef.current.emit("cursor_move", { x, y }),
    }),
    [
      tool,
      color,
      size,
      users,
      selfUser,
      cursors,
      latency,
      connectionStatus,
      drawingUsers,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSocket() {
  return useContext(Ctx);
}
