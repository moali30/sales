import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Package, TrendingUp, AlertTriangle, ArrowUpRight, BarChart3, ShoppingBag, AlertCircle, LayoutDashboard } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color, trend, unit }) {
  const colorMap = {
    indigo: 'bg-primary/5 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600'
  };

  return (
    <div className="glass-card p-6 flex flex-col gap-4 group transition-all duration-300 hover:border-slate-300">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[color] || colorMap.indigo}`}>
          <Icon size={24} />
        </div>
        <ArrowUpRight size={16} className="text-slate-300 transition-colors group-hover:text-primary" />
      </div>
      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
          {unit && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{unit}</span>}
        </div>
      </div>
      {trend && (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
           <div className={`h-full ${color === 'rose' ? 'bg-rose-500' : 'bg-primary'} rounded-full transition-all duration-1000`} style={{ width: trend }} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { activeDatasetId } = useAppContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeDatasetId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [
          { count: productsCount, error: errProds },
          { count: lowStockCount, error: errLow },
          { count: totalPlanned, error: errPlanned },
          { count: totalDone, error: errDone }
        ] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('dataset_id', activeDatasetId),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('dataset_id', activeDatasetId).lte('inventory_count', 10),
          supabase.from('sales_transactions').select('*', { count: 'exact', head: true }).eq('dataset_id', activeDatasetId),
          supabase.from('sales_transactions').select('*', { count: 'exact', head: true }).eq('dataset_id', activeDatasetId).eq('status', 'Done')
        ]);

        if (errProds || errLow || errPlanned || errDone) {
          throw new Error('Failed to fetch some statistics');
        }

        setStats({
          productsCount: productsCount || 0,
          totalPlanned: totalPlanned || 0,
          totalDone: totalDone || 0,
          lowStockCount: lowStockCount || 0
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeDatasetId]);

  if (!activeDatasetId) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
           <LayoutDashboard size={40} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Operational Insight Unavailable</h2>
        <p className="text-slate-400 text-sm mt-2 font-medium max-w-xs mx-auto italic">Select a dataset from the cloud control to synthesize live metrics.</p>
      </div>
    );
  }

  const salesProgress = stats && stats.totalPlanned > 0 ? Math.round((stats.totalDone / stats.totalPlanned) * 100) : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Summary</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Real-time performance analytics for current stream.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Feed</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Network</p>
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Catalog Volume" 
            value={stats.productsCount} 
            unit="items"
            icon={ShoppingBag} 
            color="indigo" 
          />
          <StatCard 
            title="Sales Pipeline" 
            value={`${stats.totalDone}/${stats.totalPlanned}`}
            unit="Confirmed Ops"
            icon={TrendingUp} 
            color="cyan"
            trend={`${salesProgress}%`}
          />
          <StatCard 
            title="Critical Stock" 
            value={stats.lowStockCount} 
            unit="Alerts Active"
            icon={AlertCircle} 
            color="rose"
            trend={stats.lowStockCount > 0 ? "100%" : "0%"}
          />
        </div>
      )}
    </div>
  );
}
