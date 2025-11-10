import React from "react";
import { useSocket } from "../context/SocketContext";
import "../styles/UsersList.css";

export default function UsersList() {
  const { users, self, drawingUsers } = useSocket();
  return (
    <div className="p-3 border-b border-slate-800">
      <div className="text-xs text-slate-400 mb-2">Online</div>
      <ul className="space-y-1">
        {users.map((u) => (
          <li
            key={u.userId}
            className={`flex items-center gap-2 ${
              u.userId === self?.userId ? "font-semibold" : ""
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: u.color }}
            />
            <span className="flex-1">{u.username}</span>
            {drawingUsers?.includes(u.userId) && (
              <span className="text-xs text-emerald-400">drawing</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
