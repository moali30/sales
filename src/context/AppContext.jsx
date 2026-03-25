import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load available datasets on mount (non-archived only for the main dropdown)
  const fetchDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDatasets(data || []);
      const active = data?.filter(d => !d.is_archived) || [];
      if (active.length > 0 && !activeDatasetId) {
        setActiveDatasetId(active[0].id);
      }
    } catch (err) {
      console.error('Error fetching datasets:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Delete a dataset and all its cascaded data
  const deleteDataset = async (id) => {
    const { error } = await supabase.from('datasets').delete().eq('id', id);
    if (error) throw error;
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (activeDatasetId === id) {
      const remaining = datasets.filter(d => d.id !== id && !d.is_archived);
      setActiveDatasetId(remaining[0]?.id || null);
    }
  };

  // Toggle archive status on a dataset
  const archiveDataset = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('datasets')
      .update({ is_archived: newStatus })
      .eq('id', id);
    if (error) throw error;
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, is_archived: newStatus } : d));
    // If we archived the currently active dataset, switch to another
    if (newStatus && activeDatasetId === id) {
      const remaining = datasets.filter(d => d.id !== id && !d.is_archived);
      setActiveDatasetId(remaining[0]?.id || null);
    }
  };

  // Update dataset name
  const updateDataset = async (id, newName) => {
    const { error } = await supabase
      .from('datasets')
      .update({ name: newName })
      .eq('id', id);
    if (error) throw error;
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  // Only non-archived datasets shown in the header dropdown
  const activeDatasets = datasets.filter(d => !d.is_archived);

  const value = {
    datasets,         // all datasets (for management page)
    activeDatasets,   // non-archived (for header dropdown)
    setDatasets,
    activeDatasetId,
    setActiveDatasetId,
    loading,
    deleteDataset,
    archiveDataset,
    updateDataset,
    refetchDatasets: fetchDatasets,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
