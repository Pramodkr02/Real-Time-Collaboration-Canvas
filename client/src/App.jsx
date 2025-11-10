import { useState, useEffect } from "react";
import { SocketProvider, useSocket } from "./context/SocketContext";
import CanvasBoard from "./components/CanvasBoard";
import Toolbar from "./components/Toolbar";
import UsersList from "./components/UsersList";
import CursorOverlay from "./components/CursorOverlay";
import "./styles/App.css";







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
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="bg-slate-900 p-8 rounded-lg border border-slate-800">
          <h1 className="text-2xl font-bold mb-4">Collaborative Canvas</h1>
          <div className="flex gap-2">
            <input
              defaultValue={localStorage.getItem("cc_username") || ""}
              onChange={(e) => setUser({ username: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleLogin(user?.username || "")}
              placeholder="Enter username"
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={() => handleLogin(user?.username || "")}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 font-medium"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
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
  const { connectionStatus, username, roomId } = useSocket();
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
                setCurrentPage("profile");
              }}
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Profile
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
        </div>
      </header>

      {renderPage()}
    </>
  );
}


