import React, { useState } from "react";

export default function Login({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0.8))] relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="blur-3xl opacity-50 w-[1200px] h-[1200px] bg-[conic-gradient(at_70%_30%,#ef4444_0deg,#8b5cf6_120deg,#06b6d4_240deg,#ef4444_360deg)] rounded-full -translate-x-1/3 -translate-y-1/3" />
      </div>

      <div className="relative z-10 w-full max-w-xl bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200 px-8 py-10 text-slate-800">
        <div className="flex items-center justify-center mb-6 select-none">
          <div className="w-9 h-9 mr-2 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400" />
          <div className="text-2xl font-semibold tracking-tight">CanvasFlow</div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-6">Log In to Your Creative Space</h1>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            // For demo purposes, accept any email/password combination
            // In production, this should validate with the server
            const username = email?.split("@")[0] || "guest";
            onSubmit(username);
          }}
        >
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-white border border-slate-300 rounded-lg py-3 pl-11 pr-3 text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
          </div>

          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white border border-slate-300 rounded-lg py-3 pl-11 pr-3 text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
            <a href="#" className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-sm">Forgot Password?</a>
          </div>

          <label className="flex items-center gap-2 select-none">
            <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
            <span className="text-slate-600">Remember me</span>
          </label>

          <button type="submit" className="w-full h-11 rounded-md bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow hover:from-indigo-600 hover:to-blue-600">Log In</button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-sm">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button type="button" className="h-11 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Google</button>
            <button type="button" className="h-11 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Apple</button>
            <button type="button" className="h-11 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Facebook</button>
          </div>

          <div className="text-center text-sm text-slate-600">
            Don’t have an account? <a className="text-blue-600" href="#">Sign Up</a>
          </div>
        </form>
      </div>
    </div>
  );
}
