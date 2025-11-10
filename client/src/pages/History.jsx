import React from "react";

export default function History() {
  const items = [
    { id: 1, title: "Project Unicorn", time: "5m ago", action: "You edited" },
    { id: 2, title: "Main Brainstorm", time: "12m ago", action: "You shared" },
    { id: 3, title: "Project Unicorn", time: "36m ago", action: "You created" },
  ];

  return (
    <div className="h-full w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(2,6,23,1))]">
      <div className="w-[920px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <header className="px-8 pt-6 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-center">
            <div className="w-7 h-7 mr-2 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400" />
            <div className="text-xl font-semibold text-slate-800">CanvasFlow</div>
          </div>
        </header>
        <div className="grid grid-cols-[220px,1fr]">
          <aside className="bg-slate-50 border-r border-slate-200 p-4">
            <nav className="space-y-2 select-none">
              <div className="px-3 py-2 rounded-md text-slate-600">Profile Information</div>
              <div className="px-3 py-2 rounded-md bg-pink-100 border-l-4 border-pink-500 text-slate-800">Working History</div>
              <div className="px-3 py-2 rounded-md text-slate-600">Billing</div>
              <div className="px-3 py-2 rounded-md text-slate-600">My Creations</div>
            </nav>
          </aside>
          <section className="p-8 bg-white">
            <h3 className="font-semibold mb-4 text-slate-800">My Creations</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[1,2,3,4].map((i)=> (
                <div key={i} className="rounded-xl border border-slate-200 p-3 shadow-sm">
                  <div className="h-24 rounded-md bg-slate-100 mb-3" />
                  <div className="text-sm font-medium">Project {i}</div>
                  <div className="text-xs text-slate-500">Last edited 1h ago</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-3 text-slate-600">
              <button className="h-8 w-8 grid place-items-center rounded-md border border-slate-300">←</button>
              <button className="h-8 w-8 grid place-items-center rounded-md border border-slate-300">→</button>
              <button className="h-8 px-3 rounded-md border border-slate-300">≡</button>
            </div>

            <h3 className="font-semibold mb-3 text-slate-800">Working History</h3>
            <div className="space-y-3">
              {items.map((it)=> (
                <div key={it.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="w-12 h-9 rounded bg-slate-100" />
                  <div className="text-sm text-slate-700">
                    {it.action} <b>{it.title}</b> <span className="text-slate-400">({it.time})</span>
                  </div>
                  <div className="ml-auto flex -space-x-2">
                    <span className="w-6 h-6 rounded-full bg-green-200 grid place-items-center text-xs">A</span>
                    <span className="w-6 h-6 rounded-full bg-pink-200 grid place-items-center text-xs">S</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button className="h-10 px-4 rounded-md bg-indigo-600 text-white shadow">Load More</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
