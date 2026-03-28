import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
  Check, AlertCircle, Calendar, ChevronRight, ShoppingBag,
  ArrowLeftRight, X, Search, CalendarRange, Plus, Minus, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────
function toDateStr(d) { return d.toISOString().split('T')[0]; }

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToSat = (day + 1) % 7; // Saturday = start of week
  const start = new Date(now); start.setDate(now.getDate() - diffToSat);
  const end   = new Date(start); end.setDate(start.getDate() + 6);
  return { start: toDateStr(start), end: toDateStr(end) };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toDateStr(start), end: toDateStr(end) };
}

function formatFullDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

// ─── Add Sale Modal ─────────────────────────────────────────────────────────
function AddSaleModal({ products, activeDatasetId, onClose, onAdded }) {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(toDateStr(new Date()));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  }, [products, search]);

  const handleSave = async () => {
    if (!selectedProduct) return toast.error('اختر منتجاً');
    if (quantity < 1) return toast.error('الكمية غير صالحة');
    if (!date) return toast.error('تاريخ غير صالح');

    setLoading(true);
    try {
      const { error } = await supabase.from('sales_transactions').insert({
        dataset_id: activeDatasetId,
        product_id: selectedProduct.id,
        quantity_required: quantity,
        date: date,
        status: 'Pending',
        notes: notes || null
      });
      if (error) throw error;
      toast.success('تمت إضافة التخطيط بنجاح');
      onAdded();
      onClose();
    } catch (err) {
      toast.error('فشلت الإضافة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">إضافة تخطيط بيع جديد</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">اختر المنتج وحدد الكمية والتاريخ</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Product Selection */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">المنتج</label>
            {!selectedProduct ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث بالاسم كود..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                  autoFocus
                />
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                {search.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-20 fade-in">
                    {filtered.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-4">لا توجد منتجات مطابقة</p>
                    ) : (
                      filtered.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); setSearch(''); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center group"
                        >
                          <div>
                            {p.code && <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">{p.code}</p>}
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">{p.name}</p>
                          </div>
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">مخزون: {p.inventory_count}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-primary/20 bg-primary/5 rounded-xl fade-in">
                <div>
                  <p className="text-sm font-bold text-primary">{selectedProduct.name}</p>
                  <p className="text-[10px] font-semibold text-primary/60 mt-0.5">المخزون الحالي: {selectedProduct.inventory_count}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-3 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">الكمية المطلوبة</label>
              <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-slate-200">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full py-3 px-1 text-center bg-white border-x border-slate-200 text-sm font-bold focus:outline-none"
                />
                <button onClick={() => setQuantity(quantity + 1)} className="p-3 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب أي ملاحظات إضافية..."
              className="w-full px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px]"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
          <button
            onClick={handleSave}
            disabled={loading || !selectedProduct}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 text-white font-bold transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={18} /> إضافة التخطيط</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Swap Modal ──────────────────────────────────────────────────────────────
function SwapModal({ task, products, onClose, onSwapped }) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() =>
    products.filter(p =>
      p.id !== task.product_id &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       (p.code || '').toLowerCase().includes(search.toLowerCase()))
    ), [products, search, task.product_id]);

  const handleSwap = async (newProduct) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sales_transactions')
        .update({ product_id: newProduct.id })
        .eq('id', task.id);
      if (error) throw error;
      toast.success(`تم استبدال المنتج بـ "${newProduct.name}"`);
      onSwapped();
      onClose();
    } catch (err) {
      toast.error('فشل الاستبدال: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">استبدال المنتج</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              الحالي: <span className="font-bold text-slate-700">{task.products?.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن منتج بديل..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
            />
            <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">لا توجد منتجات مطابقة</p>
          ) : filtered.map(p => (
            <button
              key={p.id}
              onClick={() => handleSwap(p)}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 mb-2 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all text-left group"
            >
              <div>
                {p.code && <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">{p.code}</p>}
                <p className="font-semibold text-slate-800 group-hover:text-primary transition-colors text-sm">{p.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase font-black mb-0.5">مخزون</p>
                <span className={`inline-block px-2 py-1 bg-slate-100 rounded text-xs font-bold ${p.inventory_count <= 10 ? 'text-rose-500 bg-rose-50' : 'text-slate-700'}`}>
                  {p.inventory_count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────
function TaskCard({ task, onMarkDone, onUndoDone, onSwap, onUpdateQty }) {
  const isDone = task.status === 'Done' || task.status === 'Confirmed';
  const isLow = (task.products?.inventory_count ?? 0) <= 0;
  const isInsufficient = (task.products?.inventory_count ?? 0) < task.quantity_required;
  const [editingQty, setEditingQty] = useState(false);
  const [qtyValue, setQtyValue] = useState(task.quantity_required);

  const handleSaveQty = () => {
    if (qtyValue > 0 && qtyValue !== task.quantity_required) {
      onUpdateQty(task.id, qtyValue);
    } else {
      setQtyValue(task.quantity_required);
    }
    setEditingQty(false);
  };

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group
      ${isDone ? 'border-emerald-200 bg-emerald-50/20 opacity-80' : 'border-slate-200/60'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {task.sequence_type && (
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
                {task.sequence_type}
              </span>
            )}
            {task.invoice_number && (
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                #{task.invoice_number}
              </span>
            )}
            {isLow && (
              <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                <AlertCircle size={10} /> نفذ المخزون
              </span>
            )}
          </div>
          {task.products?.code && (
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{task.products.code}</p>
          )}
          <h3 className={`text-lg font-bold truncate transition-colors flex items-center gap-2 ${isDone ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-slate-900 group-hover:text-primary'}`}>
            {task.products?.name}
            {isDone && <Check size={16} className="text-emerald-500 shrink-0" />}
          </h3>
          {task.notes && (
            <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg inline-block border border-slate-100">
              {task.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-5 md:gap-8 bg-slate-50/50 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none">
          <div className="flex items-center gap-8 md:px-6 md:border-x border-slate-100 h-full">
            <div className={`text-center group/edit ${isDone ? 'opacity-50 pointer-events-none' : ''}`}>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">الكمية المطلوبة</p>
              {editingQty ? (
                <div className="flex items-center bg-white border border-primary text-primary rounded-lg shadow-inner mt-1">
                  <button onClick={() => setQtyValue(Math.max(1, qtyValue - 1))} className="p-1.5 hover:bg-primary-50 transition-colors"><Minus size={14} /></button>
                  <input type="number" value={qtyValue} onChange={e => setQtyValue(parseInt(e.target.value) || 1)} className="w-10 text-center font-bold bg-transparent border-none p-0 focus:ring-0 text-[15px]" autoFocus onKeyDown={e => e.key === 'Enter' && handleSaveQty()} onBlur={handleSaveQty} />
                  <button onClick={() => setQtyValue(qtyValue + 1)} className="p-1.5 hover:bg-primary-50 transition-colors"><Plus size={14} /></button>
                  <button onMouseDown={e => { e.preventDefault(); handleSaveQty(); }} className="p-1.5 bg-primary text-white hover:bg-primary-hover rounded-l-[7px] transition-colors shadow-none ml-[1px]"><Check size={14} /></button>
                </div>
              ) : (
                <div 
                  onClick={() => setEditingQty(true)}
                  className="inline-flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1 -mt-1 -ml-3 hover:bg-slate-100 rounded-lg transition-colors"
                  title="تعديل الكمية"
                >
                  <span className="font-bold text-2xl text-slate-800 tracking-tight leading-none">{task.quantity_required}</span>
                  {!isDone && <span className="opacity-0 group-hover/edit:opacity-100 text-primary transition-opacity"><Plus size={12} strokeWidth={3} className="-mb-2 -ml-1 text-slate-300"/></span>}
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5">في المخزون</p>
              <div className={`inline-flex px-3 py-1 rounded-lg border font-bold text-lg tracking-tight ${isInsufficient ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-100 text-slate-700 border-transparent'}`}>
                {task.products?.inventory_count}
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {!isDone && (
              <button
                onClick={() => onSwap(task)}
                className="flex-1 sm:flex-none glass-button bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
                title="استبدال المنتج"
              >
                <ArrowLeftRight size={14} />
                استبدال
              </button>
            )}
            {isDone ? (
              <button
                onClick={() => onUndoDone(task)}
                className="flex-1 sm:flex-none bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                تراجع
                <RotateCcw size={14} />
              </button>
            ) : (
              <button
                onClick={() => onMarkDone(task)}
                disabled={isInsufficient}
                className="flex-1 sm:flex-none glass-button bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:grayscale text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all group/btn relative"
              >
                تأكيد
                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'today',  label: 'اليوم',       icon: Calendar },
  { id: 'week',   label: 'هذا الأسبوع', icon: Calendar },
  { id: 'month',  label: 'هذا الشهر',   icon: Calendar },
  { id: 'custom', label: 'مخصص',        icon: CalendarRange },
];

export default function Tasks() {
  const { activeDatasetId } = useAppContext();
  const [tasks, setTasks] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  
  const [swapTask, setSwapTask] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const fetchIdRef = React.useRef(0);

  const fetchTasks = useCallback(async () => {
    if (!activeDatasetId) return;
    const currentFetchId = ++fetchIdRef.current;
    if (tasks.length === 0) setLoading(true); // only show global loading if empty
    try {
      const [tasksRes, productsRes] = await Promise.all([
        supabase
          .from('sales_transactions')
          .select(`*, products(id, code, name, inventory_count)`)
          .eq('dataset_id', activeDatasetId)
          .order('date', { ascending: true }),
        supabase
          .from('products')
          .select('id, code, name, inventory_count')
          .eq('dataset_id', activeDatasetId)
          .order('name')
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (productsRes.error) throw productsRes.error;

      if (currentFetchId !== fetchIdRef.current) return;

      setTasks(tasksRes.data || []);
      setAllProducts(productsRes.data || []);
    } catch (err) {
      console.error(err);
      if (currentFetchId === fetchIdRef.current) setError('فشل تحميل المهام.');
    } finally {
      if (currentFetchId === fetchIdRef.current) setLoading(false);
    }
  }, [activeDatasetId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleMarkDone = async (task) => {
    try {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Done' } : t));
      const { error } = await supabase.rpc('mark_sale_done', {
        sale_id: task.id,
        prod_id: task.product_id,
        qty: task.quantity_required
      });
      if (error) {
        toast.error('فشل إتمام العملية.');
        fetchTasks();
      } else {
        toast.success('تم تأكيد العملية ✓');
      }
    } catch (err) {
      toast.error('خطأ غير متوقع.');
      fetchTasks();
    }
  };

  const handleUndoDone = async (task) => {
    try {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Pending' } : t));
      
      const { data: currentProduct, error: prodErr } = await supabase.from('products').select('inventory_count, total_sold').eq('id', task.product_id).single();
      if(prodErr) throw prodErr;

      await Promise.all([
        supabase.from('sales_transactions').update({ status: 'Pending' }).eq('id', task.id),
        supabase.from('products').update({ 
          inventory_count: currentProduct.inventory_count + task.quantity_required,
          total_sold: Math.max(0, currentProduct.total_sold - task.quantity_required)
        }).eq('id', task.product_id)
      ]);

      toast.success('تم التراجع وإعادة الكمية للمخزون');
      fetchTasks();
    } catch(err) {
      toast.error('حدث خطأ أثناء التراجع');
      fetchTasks();
    }
  };

  const handleUpdateQty = async (id, newQty) => {
    try {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, quantity_required: newQty } : t));
      const { error } = await supabase.from('sales_transactions').update({ quantity_required: newQty }).eq('id', id);
      if (error) {
        toast.error('لم يتم تحديث الكمية');
        fetchTasks();
      } else {
        toast.success('تم تحديث الكمية');
      }
    } catch (err) {
      toast.error('حدث خطأ');
      fetchTasks();
    }
  };

  // ── Filter by Tab ──
  const today = toDateStr(new Date());
  const weekRange = getWeekRange();
  const monthRange = getMonthRange();

  const tabFilteredTasks = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return tasks.filter(t => t.date === today);
      case 'week':
        return tasks.filter(t => t.date >= weekRange.start && t.date <= weekRange.end);
      case 'month':
        return tasks.filter(t => t.date >= monthRange.start && t.date <= monthRange.end);
      case 'custom':
        if (!customFrom && !customTo) return tasks;
        return tasks.filter(t => {
          if (customFrom && t.date < customFrom) return false;
          if (customTo   && t.date > customTo)   return false;
          return true;
        });
      default:
        return tasks;
    }
  }, [tasks, activeTab, today, customFrom, customTo]);

  const groupedTasks = useMemo(() => {
    const groups = {};
    tabFilteredTasks.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.keys(groups).sort().map(date => ({
      date,
      tasks: groups[date]
    }));
  }, [tabFilteredTasks]);

  if (!activeDatasetId) {
    return (
      <div className="p-8 text-center mt-12 fade-in">
        <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner border border-primary/10">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">لا يوجد ملف بيانات نشط</h2>
        <p className="text-slate-500 font-medium text-sm">قم برفع أو تحديد ملف بيانات من القائمة المنسدلة للبدء</p>
      </div>
    );
  }

  return (
    <>
      {swapTask && (
        <SwapModal
          task={swapTask}
          products={allProducts}
          onClose={() => setSwapTask(null)}
          onSwapped={fetchTasks}
        />
      )}

      {showAddModal && (
        <AddSaleModal
          products={allProducts}
          activeDatasetId={activeDatasetId}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchTasks}
        />
      )}

      <div className="p-4 md:p-10 max-w-5xl mx-auto pb-32 md:pb-10 fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-5 px-2 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Check size={20} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">تخطيط المبيعات</h1>
            </div>
            <p className="text-slate-500 text-sm mt-2 font-medium">مراجعة وتأكيد المبيعات وإدارتها بفعالية وسهولة.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 relative">
            <div className="flex gap-2">
              <div className="bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 shadow-inner">
                {tasks.length} إجمالي
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2 group/btn"
            >
              <Plus size={16} className="group-hover/btn:scale-125 transition-transform" />
              إضافة بيع
            </button>
          </div>
        </div>

        {/* Time Tabs */}
        <div className="bg-white/50 p-2 rounded-2xl border border-slate-200 backdrop-blur-md mb-6 inline-flex overflow-x-auto max-w-full hide-scrollbar snap-x">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 snap-center
                ${activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-white/80' : 'text-slate-400'} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom Range Pickers */}
        {activeTab === 'custom' && (
          <div className="flex flex-wrap items-end gap-4 mb-6 p-5 bg-white border border-primary/20 rounded-2xl shadow-sm fade-in">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">من تاريخ</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">إلى تاريخ</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                className="px-5 py-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl transition-colors h-[46px]"
              >
                مسح
              </button>
            )}
          </div>
        )}



        {error && (
          <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl mb-6 text-sm font-bold border border-rose-200 flex items-center gap-3 fade-in">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">جارٍ تحديث البيانات...</p>
          </div>
        ) : tabFilteredTasks.length === 0 ? (
          <div className="text-center py-20 px-4 bg-white border border-dashed border-slate-200 rounded-3xl fade-in shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-slate-300">
              <Check size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ممتاز! لا توجد مهام مؤجلة</h3>
            <p className="text-slate-500 text-sm font-medium">اختر نطاقاً آخر أو قم بإضافة تخطيط بيع جديد.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm flex items-center justify-center gap-2 mx-auto"
            >
              <Plus size={16} /> إضافة مهمة جديدة
            </button>
          </div>
        ) : (
          <div className="space-y-8 fade-in mt-6">
            {groupedTasks.map(group => (
              <div key={group.date} className="space-y-4">
                <div className="flex items-center justify-between px-3">
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    تاريخ: <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{formatFullDate(group.date)}</span>
                    <span className="text-xs text-slate-400 font-bold mr-2">({group.tasks.length} مهام)</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {group.tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkDone={handleMarkDone}
                      onUndoDone={handleUndoDone}
                      onSwap={setSwapTask}
                      onUpdateQty={handleUpdateQty}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
