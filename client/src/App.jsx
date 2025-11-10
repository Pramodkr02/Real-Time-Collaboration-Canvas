import { useState, useEffect } from "react";
import { SocketProvider, useSocket } from "./context/SocketContext";
import CanvasBoard from "./components/CanvasBoard";
import Toolbar from "./components/Toolbar";
import UsersList from "./components/UsersList";
import CursorOverlay from "./components/CursorOverlay";
import "./styles/App.css";






import Login from "./pages/Login";
import Settings from "./pages/Settings";
import History from "./pages/History";

export default function App() {
  const [user, setUser] = useState(null);
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "default";

  const handleLogin = (username) => {
    const userObj = { username: username.trim() };
    localStorage.setItem("cc_username", username.trim());
    setUser(userObj);
  };



  useEffect(() => {
    const titleBase = "Collaborative Canvas";
    const namePart = user?.username || "";
    document.title = namePart
      ? `${titleBase} — ${namePart} (${roomId})`
      : `${titleBase} (${roomId})`;
  }, [user, roomId]);

  if (!user) {
    return <Login onSubmit={handleLogin} />;
  }

  return (
    <SocketProvider username={user.username} roomId={roomId}>
      <div className="h-screen w-screen grid grid-rows-[auto,1fr]">
        <AppContent />
      </div>
    </SocketProvider>
  );
}


function AppContent() {
  const { connectionStatus, username, roomId, users } = useSocket();
  const [currentPage, setCurrentPage] = useState("canvas");

  const ProfilePage = () => (
    <main className="h-full p-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-slate-400 mt-2">
        This is where user profile information would go.
      </p>
    </main>
  );

  const CanvasPage = () => (
    <main className="grid grid-cols-[260px,1fr] h-full">
      <aside className="border-r border-slate-800 overflow-auto">
        <UsersList />
        <Toolbar />
      </aside>
      <section className="relative">
        <CanvasBoard />
        <CursorOverlay />
      </section>
    </main>
  );

  const renderPage = () => {
    switch (currentPage) {
      case "profile":
        return <ProfilePage />;
      case "settings":
        return <Settings />;
      case "history":
        return <History />;
      case "canvas":
      default:
        return <CanvasPage />;
    }
  };

  return (
    <>
      <header className="border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-lg font-semibold">Collaborative Canvas</h1>
          <nav className="flex items-center gap-4 ml-8">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage("canvas");
              }}
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Canvas
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage("settings");
              }}
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Settings
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage("history");
              }}
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              History
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {connectionStatus && (
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : connectionStatus === "connected"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm text-slate-400 capitalize">
                {connectionStatus}
              </span>
            </div>
          )}
          <div className="flex -space-x-2 items-center">
            {(users||[]).slice(0,5).map(u => (
              <div key={u.userId} className="w-7 h-7 rounded-full border border-slate-800 text-[10px] font-semibold grid place-items-center" style={{ background: u.color||'#94a3b8', color: '#0f172a' }} title={u.username}>
                {u.username?.slice(0,2).toUpperCase()}
              </div>
            ))}
            {users && users.length>5 && (
              <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-800 text-[10px] grid place-items-center">+{users.length-5}</div>
            )}
          </div>
        </div>
      </header>

      {renderPage()}
    </>
  );
}



