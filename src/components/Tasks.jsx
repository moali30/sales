import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
  Check, AlertCircle, Calendar, ChevronRight, ShoppingBag,
  ArrowLeftRight, X, Search, CalendarRange, Plus, Minus, RotateCcw,
  CalendarClock, Undo2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────
function toDateStr(d) { return d.toISOString().split('T')[0]; }

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToSat = (day + 1) % 7;
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

function formatPrice(price) {
  if (!price || price === 0) return '';
  return new Intl.NumberFormat('ar-EG').format(price) + ' ج.م';
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function daysDiff(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

// Extract numeric part from invoice number for sorting (INV-4160 → 4160)
function invoiceNum(inv) {
  if (!inv) return 0;
  const match = inv.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
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

// ─── Postpone Modal ──────────────────────────────────────────────────────────
function PostponeModal({ invoiceGroup, allTasks, onClose, onPostponed }) {
  const [newDate, setNewDate] = useState(invoiceGroup.date);
  const [loading, setLoading] = useState(false);

  const currentDate = invoiceGroup.date;
  const currentInvNum = invoiceNum(invoiceGroup.invoice_number);

  // Calculate how many invoices would be affected
  const affectedCount = useMemo(() => {
    return allTasks.filter(t =>
      t.status !== 'Done' && t.status !== 'Confirmed' &&
      invoiceNum(t.invoice_number) > currentInvNum
    ).length;
  }, [allTasks, currentInvNum]);

  const handlePostpone = async () => {
    if (newDate === currentDate) return toast.error('اختر تاريخ مختلف');
    const diff = daysDiff(currentDate, newDate);
    if (diff === 0) return toast.error('اختر تاريخ مختلف');

    setLoading(true);
    try {
      // Get list of all tasks with invoice number >= current that are not Done
      const tasksToUpdate = allTasks.filter(t =>
        t.status !== 'Done' && t.status !== 'Confirmed' &&
        invoiceNum(t.invoice_number) >= currentInvNum
      );

      // Build batch updates
      const updates = tasksToUpdate.map(t => ({
        id: t.id,
        newDate: addDays(t.date, diff),
        oldDate: t.date
      }));

      // Execute updates
      for (const upd of updates) {
        const { error } = await supabase
          .from('sales_transactions')
          .update({ date: upd.newDate })
          .eq('id', upd.id);
        if (error) throw error;
      }

      toast.success(
        `تم تأجيل ${updates.length} فاتورة بمقدار ${Math.abs(diff)} يوم`,
        { duration: 5000 }
      );

      onPostponed({
        updates: updates.map(u => ({ id: u.id, oldDate: u.oldDate, newDate: u.newDate })),
        diff,
        count: updates.length
      });
      onClose();
    } catch (err) {
      toast.error('فشل التأجيل: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-amber-50/50 to-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <CalendarClock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">تأجيل الفاتورة</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                <span className="font-black text-amber-600">#{invoiceGroup.invoice_number}</span> — {formatFullDate(currentDate)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">التاريخ الجديد</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all"
            />
            {newDate !== currentDate && (
              <p className="text-xs font-bold mt-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 fade-in">
                فرق {Math.abs(daysDiff(currentDate, newDate))} يوم {daysDiff(currentDate, newDate) > 0 ? '(تأجيل)' : '(تقديم)'}
              </p>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">الفواتير المتأثرة</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{affectedCount + invoiceGroup.items.length}</span>
              <span className="text-sm font-bold text-slate-500">فاتورة / صنف ستتأجل</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium leading-relaxed">
              هذه الفاتورة + كل الفواتير بعدها (غير المؤكدة) ستتأجل بنفس الفرق الزمني
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handlePostpone}
            disabled={loading || newDate === currentDate}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CalendarClock size={16} /> تأجيل</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Card (Grouped) ─────────────────────────────────────────────────
function InvoiceCard({ invoiceGroup, onMarkAllDone, onUndoAllDone, onSwapItem, onUpdateItemQty, onPostpone }) {
  const allDone = invoiceGroup.items.every(t => t.status === 'Done' || t.status === 'Confirmed');
  const anyDone = invoiceGroup.items.some(t => t.status === 'Done' || t.status === 'Confirmed');
  const items = invoiceGroup.items;
  const isSingle = items.length === 1;

  // Check if any item has insufficient stock
  const hasInsufficient = items.some(t => (t.products?.inventory_count ?? 0) < t.quantity_required);

  // Total invoice value
  const totalValue = items.reduce((sum, t) => sum + ((t.unit_price || 0) * (t.quantity_required || 0)), 0);

  return (
    <div className={`bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden
      ${allDone ? 'border-emerald-200 bg-emerald-50/20 opacity-80' : 'border-slate-200/60'}`}>
      
      {/* Invoice Header */}
      <div className={`flex items-center justify-between px-5 py-3 border-b ${allDone ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {invoiceGroup.invoice_number && (
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
              #{invoiceGroup.invoice_number}
            </span>
          )}
          {!isSingle && (
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              {items.length} أصناف
            </span>
          )}
          {items[0]?.sequence_type && (
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
              {items[0].sequence_type}
            </span>
          )}
          {items[0]?.template_name && (
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
              <ShoppingBag size={10} /> نموذج: {items[0].template_name}
            </span>
          )}
          {allDone && (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Check size={10} /> مؤكدة
            </span>
          )}
        </div>
        {totalValue > 0 && (
          <div className="text-left">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">إجمالي الفاتورة</span>
            <span className="text-sm font-black text-primary tracking-tight">{formatPrice(totalValue)}</span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className={`divide-y ${allDone ? 'divide-emerald-100' : 'divide-slate-50'}`}>
        {items.map((task, idx) => {
          const isDone = task.status === 'Done' || task.status === 'Confirmed';
          const isLow = (task.products?.inventory_count ?? 0) <= 0;
          const isInsufficient = (task.products?.inventory_count ?? 0) < task.quantity_required;

          return (
            <div key={task.id} className="px-5 py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isLow && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        <AlertCircle size={10} /> نفذ المخزون
                      </span>
                    )}
                  </div>
                  {task.products?.code && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{task.products.code}</p>
                  )}
                  <h3 className={`text-[15px] font-bold truncate transition-colors ${isDone ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-slate-900'}`}>
                    {task.products?.name}
                    {isDone && <Check size={14} className="inline-block text-emerald-500 mr-1" />}
                  </h3>
                  {task.notes && (
                    <p className="text-xs text-slate-500 mt-1.5 font-medium bg-slate-50 p-1.5 rounded-lg inline-block border border-slate-100">
                      {task.notes}
                    </p>
                  )}
                </div>

                {/* Quantity, Price, Stock */}
                <div className="flex items-center gap-6 md:gap-8 bg-slate-50/50 md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none">
                  {/* Unit Price */}
                  {task.unit_price > 0 && (
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">سعر الوحدة</p>
                      <div className="inline-flex px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10 font-bold text-sm text-primary tracking-tight">
                        {formatPrice(task.unit_price)}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className={`text-center ${isDone ? 'opacity-50 pointer-events-none' : ''}`}>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">الكمية</p>
                    <span className="font-bold text-xl text-slate-800 tracking-tight leading-none">{task.quantity_required}</span>
                  </div>

                  {/* Stock */}
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">المخزون</p>
                    <div className={`inline-flex px-2.5 py-1 rounded-lg border font-bold text-sm tracking-tight ${isInsufficient ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-100 text-slate-700 border-transparent'}`}>
                      {task.products?.inventory_count}
                    </div>
                  </div>

                  {/* Swap button for individual item */}
                  {!isDone && isSingle && (
                    <button
                      onClick={() => onSwapItem(task)}
                      className="glass-button bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm"
                      title="استبدال المنتج"
                    >
                      <ArrowLeftRight size={13} />
                      <span className="hidden sm:inline">استبدال</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions Footer */}
      <div className={`flex items-center justify-between px-5 py-3 border-t ${allDone ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 bg-slate-50/30'}`}>
        {/* Postpone button */}
        <div>
          {!allDone && (
            <button
              onClick={() => onPostpone(invoiceGroup)}
              className="flex items-center gap-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 px-3 py-2 rounded-xl font-bold text-xs transition-all"
              title="تأجيل الفاتورة"
            >
              <CalendarClock size={14} />
              تأجيل
            </button>
          )}
        </div>

        {/* Confirm / Undo buttons */}
        <div className="flex gap-2">
          {allDone ? (
            <button
              onClick={() => onUndoAllDone(invoiceGroup)}
              className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
            >
              تراجع
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              onClick={() => onMarkAllDone(invoiceGroup)}
              disabled={hasInsufficient}
              className="glass-button bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:grayscale text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 transition-all group/btn"
            >
              {isSingle ? 'تأكيد' : `تأكيد الكل (${items.length})`}
              <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'today',   label: 'اليوم',        icon: Calendar },
  { id: 'overdue', label: 'متأخرة',       icon: AlertCircle },
  { id: 'week',    label: 'هذا الأسبوع', icon: Calendar },
  { id: 'month',   label: 'هذا الشهر',   icon: Calendar },
  { id: 'custom',  label: 'مخصص',         icon: CalendarRange },
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
  const [postponeGroup, setPostponeGroup] = useState(null);
  const [undoPostpone, setUndoPostpone] = useState(null); // stores undo info
  const fetchIdRef = React.useRef(0);

  const fetchTasks = useCallback(async () => {
    if (!activeDatasetId) return;
    const currentFetchId = ++fetchIdRef.current;
    if (tasks.length === 0) setLoading(true);
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

  // ── Mark all items in an invoice as Done ──
  const handleMarkAllDone = async (invoiceGroup) => {
    const items = invoiceGroup.items.filter(t => t.status !== 'Done' && t.status !== 'Confirmed');
    if (items.length === 0) return;

    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (items.find(i => i.id === t.id)) return { ...t, status: 'Done' };
      return t;
    }));

    try {
      for (const item of items) {
        const { error } = await supabase.rpc('mark_sale_done', {
          sale_id: item.id,
          prod_id: item.product_id,
          qty: item.quantity_required
        });
        if (error) throw error;
      }
      toast.success(`تم تأكيد ${items.length > 1 ? items.length + ' أصناف' : 'العملية'} ✓`);
    } catch (err) {
      toast.error('فشل إتمام العملية.');
      fetchTasks();
    }
  };

  // ── Undo all items in an invoice ──
  const handleUndoAllDone = async (invoiceGroup) => {
    const items = invoiceGroup.items.filter(t => t.status === 'Done' || t.status === 'Confirmed');
    if (items.length === 0) return;

    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (items.find(i => i.id === t.id)) return { ...t, status: 'Pending' };
      return t;
    }));

    try {
      for (const item of items) {
        const { data: currentProduct, error: prodErr } = await supabase
          .from('products').select('inventory_count, total_sold').eq('id', item.product_id).single();
        if (prodErr) throw prodErr;

        await Promise.all([
          supabase.from('sales_transactions').update({ status: 'Pending' }).eq('id', item.id),
          supabase.from('products').update({ 
            inventory_count: currentProduct.inventory_count + item.quantity_required,
            total_sold: Math.max(0, currentProduct.total_sold - item.quantity_required)
          }).eq('id', item.product_id)
        ]);
      }

      toast.success('تم التراجع وإعادة الكمية للمخزون');
      fetchTasks();
    } catch (err) {
      toast.error('حدث خطأ أثناء التراجع');
      fetchTasks();
    }
  };

  // ── Postpone handler ──
  const handlePostponed = (postponeInfo) => {
    setUndoPostpone(postponeInfo);
    fetchTasks();
  };

  // ── Undo Postpone ──
  const handleUndoPostpone = async () => {
    if (!undoPostpone) return;
    try {
      for (const upd of undoPostpone.updates) {
        const { error } = await supabase
          .from('sales_transactions')
          .update({ date: upd.oldDate })
          .eq('id', upd.id);
        if (error) throw error;
      }
      toast.success('تم التراجع عن التأجيل بنجاح');
      setUndoPostpone(null);
      fetchTasks();
    } catch (err) {
      toast.error('فشل التراجع عن التأجيل: ' + err.message);
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
      case 'overdue':
        return tasks.filter(t => t.date < today && t.status !== 'Done' && t.status !== 'Confirmed');
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

  // ── Group by date → then by invoice_number, sorted by invoice number ──
  const groupedByDate = useMemo(() => {
    const dateGroups = {};
    tabFilteredTasks.forEach(t => {
      if (!dateGroups[t.date]) dateGroups[t.date] = {};
      const invKey = t.invoice_number || `single_${t.id}`;
      if (!dateGroups[t.date][invKey]) dateGroups[t.date][invKey] = [];
      dateGroups[t.date][invKey].push(t);
    });

    return Object.keys(dateGroups).sort().map(date => {
      const invoiceMap = dateGroups[date];
      const invoiceGroups = Object.keys(invoiceMap)
        .map(invKey => ({
          invoice_number: invoiceMap[invKey][0].invoice_number || '',
          date,
          items: invoiceMap[invKey].sort((a, b) => (a.products?.name || '').localeCompare(b.products?.name || ''))
        }))
        .sort((a, b) => invoiceNum(a.invoice_number) - invoiceNum(b.invoice_number));

      return { date, invoiceGroups };
    });
  }, [tabFilteredTasks]);

  // Total task count for display
  const totalFilteredCount = tabFilteredTasks.length;

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

      {postponeGroup && (
        <PostponeModal
          invoiceGroup={postponeGroup}
          allTasks={tasks}
          onClose={() => setPostponeGroup(null)}
          onPostponed={handlePostponed}
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

        {/* Undo Postpone Banner */}
        {undoPostpone && (
          <div className="mb-6 flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl fade-in shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <CalendarClock size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">
                  تم تأجيل {undoPostpone.count} فاتورة بمقدار {Math.abs(undoPostpone.diff)} يوم
                </p>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">يمكنك التراجع عن التأجيل</p>
              </div>
            </div>
            <button
              onClick={handleUndoPostpone}
              className="flex items-center gap-2 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm"
            >
              <Undo2 size={14} />
              تراجع عن التأجيل
            </button>
          </div>
        )}

        {/* Time Tabs */}
        <div className="bg-white/50 p-2 rounded-2xl border border-slate-200 backdrop-blur-md mb-6 inline-flex overflow-x-auto max-w-full hide-scrollbar snap-x">
          {TABS.map(tab => {
            const isOverdueTab = tab.id === 'overdue';
            const overdueCount = isOverdueTab ? tasks.filter(t => t.date < today && t.status !== 'Done' && t.status !== 'Confirmed').length : 0;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 snap-center relative
                  ${activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}
                  ${isOverdueTab && activeTab !== tab.id ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50' : ''}`}
              >
                <tab.icon size={14} className={`${activeTab === tab.id ? 'text-white/80' : isOverdueTab ? 'text-rose-500' : 'text-slate-400'}`} />
                {tab.label}
                {isOverdueTab && overdueCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-md ml-1 shadow-sm">
                    {overdueCount}
                  </span>
                )}
              </button>
            );
          })}
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
        ) : totalFilteredCount === 0 ? (
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
            {groupedByDate.map(group => (
              <div key={group.date} className="space-y-4">
                <div className="flex items-center justify-between px-3">
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    تاريخ: <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{formatFullDate(group.date)}</span>
                    <span className="text-xs text-slate-400 font-bold mr-2">
                      ({group.invoiceGroups.reduce((s, g) => s + g.items.length, 0)} مهام — {group.invoiceGroups.length} فاتورة)
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {group.invoiceGroups.map(invGroup => (
                    <InvoiceCard
                      key={invGroup.invoice_number || invGroup.items[0]?.id}
                      invoiceGroup={invGroup}
                      onMarkAllDone={handleMarkAllDone}
                      onUndoAllDone={handleUndoAllDone}
                      onSwapItem={setSwapTask}
                      onUpdateItemQty={handleUpdateQty}
                      onPostpone={setPostponeGroup}
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
