import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Search, Package, AlertCircle, TrendingDown, X, Calendar, ShoppingBag, ArrowDownRight, ArrowUpRight, FileText, Plus, Check, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

function formatFullDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

function ProductReportModal({ product, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' or 'confirmed'

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sales_transactions')
          .select('*')
          .eq('product_id', product.id)
          .order('date', { ascending: true });

        if (error) throw error;
        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [product.id]);

  const stats = useMemo(() => {
    const confirmed = transactions.filter(t => t.status === 'Confirmed' || t.status === 'Done');
    const pending = transactions.filter(t => t.status === 'Pending');
    const totalConfirmedQty = confirmed.reduce((sum, t) => sum + (t.quantity_required || 0), 0);
    const totalPendingQty = pending.reduce((sum, t) => sum + (t.quantity_required || 0), 0);
    const totalQty = transactions.reduce((sum, t) => sum + (t.quantity_required || 0), 0);
    const uniqueDates = [...new Set(transactions.map(t => t.date))];
    return { confirmed: confirmed.length, pending: pending.length, totalConfirmedQty, totalPendingQty, totalQty, uniqueDates: uniqueDates.length };
  }, [transactions]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{product.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">تقرير حركة الصنف</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors">
              <X size={14} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">المخزون الحالي</p>
            <p className={`text-xl font-bold tracking-tight ${product.inventory_count <= 0 ? 'text-rose-500' : product.inventory_count <= 10 ? 'text-amber-500' : 'text-slate-800'}`}>
              {product.inventory_count}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">تم البيع</p>
            <p className="text-xl font-bold text-emerald-600 tracking-tight">{product.total_sold}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">قيد الانتظار</p>
            <p className="text-xl font-bold text-amber-600 tracking-tight">{stats.totalPendingQty}</p>
          </div>
          <div className="bg-primary/5 rounded-xl p-3 text-center border border-primary/10">
            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">إجمالي العمليات</p>
            <p className="text-xl font-bold text-primary tracking-tight">{transactions.length}</p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filters */}
          <div className="flex bg-slate-100 p-1 mx-6 mt-6 rounded-xl relative">
            <button 
              onClick={() => setFilterType('all')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              جميع الحركات
            </button>
            <button 
              onClick={() => setFilterType('confirmed')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filterType === 'confirmed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              المبيعات المؤكدة فقط
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جارٍ تحميل الحركات...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400">لا توجد حركات مسجلة لهذا الصنف</p>
              </div>
            ) : (
              transactions
                .filter(tx => filterType === 'all' || tx.status === 'Confirmed' || tx.status === 'Done')
                .map((tx, idx) => {
                  const isDone = tx.status === 'Confirmed' || tx.status === 'Done';
                  return (
                    <div key={tx.id || idx} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isDone ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {tx.invoice_number && (
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              #{tx.invoice_number}
                            </span>
                          )}
                          {tx.sequence_type && (
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                              {tx.sequence_type}
                            </span>
                          )}
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isDone ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100'}`}>
                            {isDone ? 'مؤكد' : 'معلّق'}
                          </span>
                        </div>
                        {tx.notes && (
                          <p className="text-xs text-slate-500 mt-1.5 truncate font-medium">{tx.notes}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-slate-800 tracking-tight">{tx.quantity_required}</p>
                        <div className="flex flex-col text-right mt-0.5">
                          <p className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1"><Calendar size={10} /> {tx.date}</p>
                          <p className="text-[10px] font-extrabold text-slate-500 mt-0.5">{formatFullDate(tx.date)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
            {!loading && transactions.filter(tx => filterType === 'all' || tx.status === 'Confirmed' || tx.status === 'Done').length === 0 && (
               <div className="text-center py-10">
                 <Filter size={32} className="mx-auto text-slate-200 mb-3" />
                 <p className="text-xs font-bold text-slate-400">لا توجد حركات مؤكدة لهذا الصنف حتى الآن</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Card (Mobile) ─────────────────────────────────────────────────
function InventoryCard({ product, onClick }) {
  const isLowStock = product.inventory_count <= 10;
  return (
    <div onClick={onClick} className="glass-card p-5 flex flex-col gap-4 group transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-primary/20">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-primary transition-colors">{product.name}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">SKU-Live-Stream</p>
        </div>
        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${product.inventory_count > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'}`}>
          {product.inventory_count > 0 ? 'Available' : 'Deficit'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 py-2">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
          <p className={`text-xl font-bold tracking-tight ${isLowStock ? 'text-rose-500' : 'text-slate-800'}`}>{product.inventory_count}</p>
        </div>
        <div className="border-l border-slate-100 pl-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact</p>
          <p className="text-xl font-bold text-slate-800 tracking-tight">{product.total_sold}</p>
        </div>
      </div>

      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
         <div className={`h-full ${isLowStock ? 'bg-rose-500' : 'bg-primary'} rounded-full`} style={{ width: `${Math.min((product.inventory_count / 100) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

// ─── Add Product Modal ───────────────────────────────────────────────────────
function AddProductModal({ activeDatasetId, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('يرجى إدخال اسم الصنف');
    const quantityCount = parseInt(qty, 10);
    if (isNaN(quantityCount) || quantityCount < 0) return toast.error('الكمية يجب أن تكون رقماً صحيحاً وموجباً');

    setLoading(true);
    try {
      const { error } = await supabase.from('products').insert({
        dataset_id: activeDatasetId,
        name: name.trim(),
        code: code.trim() || null,
        inventory_count: quantityCount,
        total_sold: 0,
        status: 'متوفر'
      });
      if (error) throw error;
      toast.success('تمت إضافة الصنف بنجاح');
      onAdded();
      onClose();
    } catch (err) {
      toast.error('حدث خطأ أثناء إضافة الصنف: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">إضافة صنف جديد</h3>
            <p className="text-xs text-slate-500 mt-0.5">أدخل بيانات الصنف لتسجيله في المخزون</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">اسم الصنف <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: منتج أ"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">كود الصنف (اختياري)</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="SKU-..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">الكمية الافتتاحية <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 text-white font-bold transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={18} /> حفظ الصنف</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Inventory Component ────────────────────────────────────────────────
export default function Inventory() {
  const { activeDatasetId } = useAppContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (!activeDatasetId) return;

    const fetchInventory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('dataset_id', activeDatasetId)
          .order('name', { ascending: true });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching inventory:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [activeDatasetId]);

  const fetchInventoryManual = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('dataset_id', activeDatasetId)
        .order('name', { ascending: true });
      if (!error) setProducts(data || []);
    } finally {
      setLoading(false);
    }
  };

  if (!activeDatasetId) return (
    <div className="p-12 text-center text-slate-400 mt-20">
      <Package size={48} className="mx-auto mb-4 opacity-20" />
      <p className="text-xs font-black uppercase tracking-widest">Connect Dataset to View Inventory</p>
    </div>
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto flex flex-col gap-8 pb-32 md:pb-10">
      {/* Product Report Modal */}
      {selectedProduct && (
        <ProductReportModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal 
           activeDatasetId={activeDatasetId} 
           onClose={() => setShowAddModal(false)} 
           onAdded={fetchInventoryManual} 
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-1">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Resource Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">إدارة المخزون، وتتبع حركات الأصناف بسهولة.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative group w-full sm:w-80">
            <input
              type="text"
              placeholder="ابحث بالاسم أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm text-sm font-semibold placeholder:text-slate-400"
            />
            <Search className="absolute left-4 top-4 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white px-6 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            إضافة صنف
          </button>
        </div>
      </div>

      <div className="fade-in">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Databases</p>
           </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Nominal</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Availability</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Confirmed Sales</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(product => (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="hover:bg-primary/5 transition-all duration-300 group cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{product.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">اضغط لعرض حركة الصنف</div>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <span className={`text-lg font-black tracking-tight ${product.inventory_count <= 10 ? 'text-rose-500' : 'text-slate-900'}`}>
                           {product.inventory_count}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-center font-bold text-slate-500">{product.total_sold}</td>
                      <td className="px-8 py-5 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                          ${product.inventory_count > 0 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse'}`}>
                          {product.inventory_count > 10 ? <Package size={12} /> : product.inventory_count > 0 ? <AlertCircle size={12} /> : <TrendingDown size={12} />}
                          {product.inventory_count > 10 ? 'Healthy' : product.inventory_count > 0 ? 'Low Stock' : 'Deficit'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Grid View */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredProducts.map(product => (
                <InventoryCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-20 text-center bg-white border border-slate-200 border-dashed rounded-2xl">
                <Search size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No matching resources found.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
