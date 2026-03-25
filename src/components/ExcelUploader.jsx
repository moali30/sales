import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseExcelFile } from '../lib/excelParser';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';

export default function ExcelUploader() {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { setDatasets, setActiveDatasetId, datasets, refetchDatasets } = useAppContext();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds the 20MB limit. Please select a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Parse Excel
      const { products, tasks } = await parseExcelFile(file);
      
      const datasetName = file.name.replace('.xlsx', '') + ` (${new Date().toLocaleDateString()})`;

      // 2. Create Dataset record in Supabase
      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .insert([{ name: datasetName }])
        .select()
        .single();
        
      if (datasetError) throw datasetError;
      const newDatasetId = datasetData.id;

      // 3. Calculate total planned quantities per product to adjust starting inventory
      const plannedQuantitiesMap = {};
      tasks.forEach(t => {
        plannedQuantitiesMap[t.product_name] = (plannedQuantitiesMap[t.product_name] || 0) + t.quantity_required;
      });

      // 4. Prepare Products with foreign key and ADJUSTED starting inventory
      const productsToInsert = products.map(p => {
        const plannedQty = plannedQuantitiesMap[p.name] || 0;
        // Destructure code separately — only include it if the column exists in DB
        // Run migration SQL first: ALTER TABLE products ADD COLUMN IF NOT EXISTS code TEXT;
        const { code, ...rest } = p;
        return {
          ...rest,
          ...(code ? { code } : {}),   // safely include code only if DB column exists
          dataset_id: newDatasetId,
          inventory_count: p.inventory_count + plannedQty
        };
      });

      // 5. Insert Products and get back IDs to link tasks
      const { data: insertedProducts, error: productsError } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select();

      if (productsError) throw productsError;

      // 5. Build lookup map: Product Name -> Product UUID
      const productMap = {};
      insertedProducts.forEach(p => {
        productMap[p.name] = p.id;
      });

      // 6. Prepare Tasks with foreign keys
      const tasksToInsert = tasks.map(t => {
        const prodId = productMap[t.product_name];
        
        // Remove product_name since it's not a column in the database (we use product_id)
        const { product_name, ...dbTask } = t;
        
        return {
          ...dbTask,
          dataset_id: newDatasetId,
          product_id: prodId
        };
      }).filter(t => t.product_id); // Ensure integrity

      // 7. Insert Tasks
      if (tasksToInsert.length > 0) {
        const { error: tasksError } = await supabase
          .from('sales_transactions')
          .insert(tasksToInsert);
          
        if (tasksError) throw tasksError;
      }

      // 8. Update Context — refetch so archived/new state is consistent
      await refetchDatasets();
      setActiveDatasetId(newDatasetId);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      toast.success('Upload Successful!');

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to upload and process file.');
      setError(err.message || 'Failed to upload and process file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
       {error && <span className="text-red-500 text-sm">{error}</span>}
       <input 
          type="file" 
          accept=".xlsx" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
       />
       <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {isUploading ? 'Uploading...' : 'Upload Excel'}
        </button>
    </div>
  );
}
