import React, { useState } from "react";

export default function Settings() {
  const [tab, setTab] = useState("profile");

  return (
    <div className="h-full w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(2,6,23,1))]">
      <div className="w-[920px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <header className="px-8 pt-6 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-center">
            <div className="w-7 h-7 mr-2 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400" />
            <div className="text-xl font-semibold text-slate-800">CanvasFlow</div>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-800">Account Settings</h2>
        </header>
        <div className="grid grid-cols-[220px,1fr]">
          <aside className="bg-slate-50 border-r border-slate-200 p-4">
            <nav className="space-y-2">
              <button className={`w-full text-left px-3 py-2 rounded-md ${tab==='profile'?'bg-pink-100 text-slate-800 border-l-4 border-pink-500':'text-slate-600 hover:bg-slate-100'}`} onClick={()=>setTab('profile')}>Profile Information</button>
              <button className={`w-full text-left px-3 py-2 rounded-md ${tab==='security'?'bg-pink-100 text-slate-800 border-l-4 border-pink-500':'text-slate-600 hover:bg-slate-100'}`} onClick={()=>setTab('security')}>Security</button>
              <button className={`w-full text-left px-3 py-2 rounded-md ${tab==='billing'?'bg-pink-100 text-slate-800 border-l-4 border-pink-500':'text-slate-600 hover:bg-slate-100'}`} onClick={()=>setTab('billing')}>Billing</button>
            </nav>
          </aside>
          <section className="p-8 bg-white">
            {tab === 'profile' && <ProfileForm />}
            {tab === 'security' && <SecurityPanel />}
            {tab === 'billing' && <BillingPanel />}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProfileForm() {
  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-5 mb-6">
        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center relative">
          <span className="text-slate-500">👤</span>
          <span className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-sm">📷</span>
        </div>
        <div>
          <div className="text-sm text-slate-500">Profile picture</div>
          <div className="text-slate-400 text-sm">PNG/JPG up to 2MB</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Full Name" placeholder="Full Name" />
        <Input label="Email Address" placeholder="Email Address" />
        <Select label="Username" />
        <Select label="Bio" />
      </div>

      <div className="mt-4 flex gap-3 items-center">
        <Input className="max-w-[200px]" placeholder="Folar" />
        <button className="h-10 px-4 rounded-md bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow">Save Changes</button>
      </div>

      <div className="mt-8">
        <h3 className="font-semibold mb-3">Connected Accounts</h3>
        <div className="flex items-center gap-3 text-slate-600">
          <span>🔴 Google</span>
          <span>⚪ Apple</span>
          <button className="ml-auto h-9 px-4 rounded-md bg-slate-100 text-slate-700">Log Out</button>
        </div>
      </div>
    </div>
  );
}

function SecurityPanel(){
  return (
    <div className="max-w-xl space-y-4 text-slate-700">
      <h3 className="font-semibold text-lg">Security</h3>
      <p className="text-slate-500">Password, 2FA and sessions will appear here.</p>
      <button className="h-10 px-4 rounded-md bg-slate-900 text-white w-max">Change Password</button>
    </div>
  )
}

function BillingPanel(){
  return (
    <div className="max-w-xl space-y-4 text-slate-700">
      <h3 className="font-semibold text-lg">Billing</h3>
      <p className="text-slate-500">Your plan and invoices will appear here.</p>
      <button className="h-10 px-4 rounded-md bg-slate-900 text-white w-max">Manage Plan</button>
    </div>
  )
}

function Input({ label, placeholder, className }){
  return (
    <label className={`block ${className||''}`}>
      {label && <div className="text-sm text-slate-600 mb-1">{label}</div>}
      <input placeholder={placeholder} className="w-full h-10 rounded-md border border-slate-300 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </label>
  );
}

function Select({ label }){
  return (
    <label className="block">
      {label && <div className="text-sm text-slate-600 mb-1">{label}</div>}
      <div className="relative">
        <input placeholder={label} className="w-full h-10 rounded-md border border-slate-300 px-3 pr-8 shadow-sm focus:outline-none" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
      </div>
    </label>
  );
}
