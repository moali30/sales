import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trash2, Archive, ArchiveRestore, FolderOpen, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-rose-500" />
        </div>
        <h3 className="text-center text-base font-bold text-slate-900 mb-2">تأكيد الحذف</h3>
        <p className="text-center text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors"
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Datasets() {
  const { datasets, deleteDataset, archiveDataset, updateDataset } = useAppContext();
  const [confirmDelete, setConfirmDelete] = useState(null); // holds dataset to delete
  const [loading, setLoading] = useState(null); // holds id of loading dataset
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleDelete = async (dataset) => {
    setLoading(dataset.id);
    try {
      await deleteDataset(dataset.id);
      toast.success(`تم حذف "${dataset.name}"`);
    } catch (err) {
      toast.error('فشل الحذف: ' + err.message);
    } finally {
      setLoading(null);
      setConfirmDelete(null);
    }
  };

  const handleArchive = async (dataset) => {
    setLoading(dataset.id);
    try {
      await archiveDataset(dataset.id, dataset.is_archived);
      toast.success(dataset.is_archived ? 'تم استعادة الملف' : 'تم أرشفة الملف');
    } catch (err) {
      toast.error('فشلت العملية: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleEditSave = async (id) => {
    if (!editName.trim()) return;
    setLoading(id);
    try {
      await updateDataset(id, editName.trim());
      toast.success('تم تحديث اسم الملف');
      setEditingId(null);
    } catch (err) {
      toast.error('فشل التحديث: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message={`هل تريد حذف "${confirmDelete.name}" نهائياً؟ سيتم حذف جميع المنتجات والمهام المرتبطة به.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="p-4 md:p-10 max-w-5xl mx-auto pb-32 md:pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">إدارة الملفات</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">حذف وأرشفة ملفات البيانات المرفوعة.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider">
              {datasets.length} ملف
            </div>
            <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider">
              {datasets.filter(d => d.is_archived).length} مؤرشف
            </div>
          </div>
        </div>

        {datasets.length === 0 ? (
          <div className="text-center py-20 glass-card border-dashed border-2">
            <FolderOpen size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-bold text-sm">لا توجد ملفات مرفوعة بعد</p>
            <p className="text-slate-400 text-xs mt-1">قم برفع ملف Excel من الشريط العلوي</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">اسم الملف</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center hidden md:table-cell">تاريخ الرفع</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">الحالة</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datasets.map(dataset => (
                  <tr key={dataset.id} className={`hover:bg-slate-50/50 transition-all group ${dataset.is_archived ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      {editingId === dataset.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(dataset.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleEditSave(dataset.id)}
                            disabled={loading === dataset.id}
                            className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={loading === dataset.id}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <p className="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors">{dataset.name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center hidden md:table-cell">
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(dataset.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${dataset.is_archived
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {dataset.is_archived ? 'مؤرشف' : 'نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(dataset.id);
                            setEditName(dataset.name);
                          }}
                          disabled={loading === dataset.id}
                          title="تعديل الاسم"
                          className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-40"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleArchive(dataset)}
                          disabled={loading === dataset.id}
                          title={dataset.is_archived ? 'استعادة' : 'أرشفة'}
                          className="p-2 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-40"
                        >
                          {dataset.is_archived
                            ? <ArchiveRestore size={16} />
                            : <Archive size={16} />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(dataset)}
                          disabled={loading === dataset.id}
                          title="حذف"
                          className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
