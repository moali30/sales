import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Package, Database, FolderOpen } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAppContext } from './context/AppContext';
import ExcelUploader from './components/ExcelUploader';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Inventory from './components/Inventory';
import Datasets from './components/Datasets';
import { isConfigured } from './lib/supabase';

function NavItem({ to, icon: Icon, label, mobile = false }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  if (mobile) {
    return (
      <Link 
        to={to} 
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${isActive ? 'text-primary' : 'text-slate-400'}`}
      >
        <Icon size={20} />
        <span className="text-[10px] mt-1 font-bold uppercase tracking-tight">{label}</span>
      </Link>
    );
  }

  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
        ${isActive 
          ? 'bg-white/10 text-white shadow-sm' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}

function App() {
  const { activeDatasets, activeDatasetId, setActiveDatasetId, loading } = useAppContext();

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Database size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">System Configuration</h1>
          <p className="text-slate-500 mb-8 font-medium">
            Deploy your cloud database credentials to activate.
          </p>
          <div className="text-left bg-slate-900 p-6 rounded-2xl text-sm font-mono text-indigo-100 space-y-3 border border-slate-800">
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">Environment Control</p>
            <pre className="bg-black/40 p-4 rounded-xl mt-2 overflow-x-auto text-primary border border-white/5">
              VITE_SUPABASE_URL=...<br/>
              VITE_SUPABASE_ANON_KEY=...
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/40">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Sales<span className="text-primary">Center</span></h2>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-1.5">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/tasks" icon={CheckSquare} label="Planned Sales" />
            <NavItem to="/inventory" icon={Package} label="Inventory" />
            <div className="pt-2 border-t border-white/5 mt-2">
              <NavItem to="/datasets" icon={FolderOpen} label="Datasets" />
            </div>
          </nav>

          <div className="p-6">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Link</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Cloud systems are synchronized.</p>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-10 z-30 sticky top-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">Dataset</span>
                <div className="flex items-center gap-1">
                  <select 
                    className="bg-transparent border-none p-0 text-sm md:text-base font-bold text-slate-800 focus:ring-0 cursor-pointer appearance-none hover:text-primary transition-colors max-w-[120px] md:max-w-[160px] truncate"
                    value={activeDatasetId || ''}
                    onChange={(e) => setActiveDatasetId(e.target.value)}
                    disabled={loading || activeDatasets.length === 0}
                  >
                    {activeDatasets.length === 0 ? (
                      <option value="">No Active Set</option>
                    ) : (
                      activeDatasets.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))
                    )}
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 shrink-0 mt-0.5"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <ExcelUploader />
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-slate-50/50 pb-20 md:pb-0">
            <div className="fade-in">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/datasets" element={<Datasets />} />
              </Routes>
            </div>
          </div>

          {/* Mobile Bottom Nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 mobile-nav-blur flex items-center justify-around z-50">
            <NavItem mobile to="/" icon={LayoutDashboard} label="Overview" />
            <NavItem mobile to="/tasks" icon={CheckSquare} label="Planned" />
            <NavItem mobile to="/inventory" icon={Package} label="Stock" />
            <NavItem mobile to="/datasets" icon={FolderOpen} label="Files" />
          </nav>
        </main>
      </div>
    </Router>
  );
}

export default App;
