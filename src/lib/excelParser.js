import * as XLSX from 'xlsx';

// Constants for sheet names — must match exactly what's in the Excel file
const SUMMARY_SHEET  = 'الملخص';
const INVOICES_SHEET = 'تفاصيل الفواتير';

/**
 * Parses the Excel file and extracts the Inventory and Sales Tasks.
 * @param {File} file - The uploaded .xlsx file
 * @returns {Promise<{ products: Array, tasks: Array }>}
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // ── DEBUG ─────────────────────────────────────────────────────────
        console.log('📄 Sheets in file:', workbook.SheetNames);

        // ── 1. Parse Summary Sheet (Products / Inventory) ─────────────────
        if (!workbook.SheetNames.includes(SUMMARY_SHEET)) {
          throw new Error(
            `Missing sheet: "${SUMMARY_SHEET}". ` +
            `Found: ${workbook.SheetNames.join(', ')}`
          );
        }
        const summaryWS  = workbook.Sheets[SUMMARY_SHEET];
        const rawProducts = XLSX.utils.sheet_to_json(summaryWS, { defval: '' });

        if (rawProducts.length > 0) {
          console.log('📦 Product columns:', Object.keys(rawProducts[0]));
          console.log('📦 First product row:', rawProducts[0]);
        } else {
          console.warn('⚠️ No product rows found in', SUMMARY_SHEET);
        }

        const products = rawProducts.map((row) => ({
          code:            typeof row['الكود']           === 'string' ? row['الكود'].trim()  : (row['الكود']  ? String(row['الكود'])  : ''),
          name:            typeof row['الصنف']           === 'string' ? row['الصنف'].trim()  : String(row['الصنف']),
          total_sold:      parseInt(row['الكمية المباعة'],  10) || 0,
          inventory_count: parseInt(row['المخزون المتبقي'], 10) || 0,
          status:          row['الحالة'] || 'متوفر',
        })).filter(p => p.name && p.name !== 'undefined');

        // ── 2. Parse Invoices Sheet (Sales Tasks) ─────────────────────────
        if (!workbook.SheetNames.includes(INVOICES_SHEET)) {
          throw new Error(
            `Missing sheet: "${INVOICES_SHEET}". ` +
            `Found: ${workbook.SheetNames.join(', ')}`
          );
        }
        const invoicesWS = workbook.Sheets[INVOICES_SHEET];
        const rawTasks    = XLSX.utils.sheet_to_json(invoicesWS, {
          defval: '',
          raw:    true,
          dateNF: 'yyyy-mm-dd',
        });

        const parseExcelDate = (d) => {
          if (!d) return '';
          if (d instanceof Date && !isNaN(d)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          }
          if (typeof d === 'number') {
            const dateObj = new Date(Math.round((d - 25569) * 86400 * 1000));
            const y = dateObj.getUTCFullYear();
            const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          }
          if (typeof d === 'string') {
            const datePart = d.trim().split(/\s+/)[0];
            const parts = datePart.split(/[-/.]/);
            if (parts.length === 3 && parts.every(p => !isNaN(parseInt(p)))) {
              let y, m, day;
              if (parts[0].length === 4) {
                y = parts[0]; m = parts[1]; day = parts[2];
              } else if (parts[2].length === 4) {
                y = parts[2]; m = parts[1]; day = parts[0];
              } else {
                const py = parseInt(parts[2], 10);
                y = (py < 50 ? '20' : '19') + String(py).padStart(2, '0');
                m = parts[1]; day = parts[0];
              }
              return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else {
              const pd = new Date(datePart);
              if (!isNaN(pd.getTime())) {
                const y = pd.getFullYear();
                const m = String(pd.getMonth() + 1).padStart(2, '0');
                const day = String(pd.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
              }
              return datePart;
            }
          }
          return String(d);
        };

        if (rawTasks.length > 0) {
          console.log('📋 Task columns:', Object.keys(rawTasks[0]));
          console.log('📋 First task row:', rawTasks[0]);
        } else {
          console.warn('⚠️ No task rows found in', INVOICES_SHEET);
        }

        const tasks = rawTasks.map((row) => {
          // Detect actual date key flexibly 
          const dateKey = Object.keys(row).find(k => k && k.trim() === 'التاريخ');
          const d = dateKey ? row[dateKey] : row['التاريخ'];
          const dateStr = parseExcelDate(d);

          return {
            date:              dateStr,
            invoice_number:    row['رقم الفاتورة'] || '',
            sequence_type:     row['نوع التسلسل'] || '',
            template_name:     row['النماذج'] || '',
            product_name:      typeof row['الصنف'] === 'string' ? row['الصنف'].trim() : String(row['الصنف']),
            quantity_required: parseInt(row['الكمية'], 10) || 0,
            notes:             row['ملاحظات']   || '',
            status:            'Pending',
          };
        }).filter(t => t.invoice_number && t.product_name && t.quantity_required > 0);

        console.log(`✅ Final: ${products.length} products, ${tasks.length} tasks`);

        resolve({ products, tasks });
      } catch (err) {
        console.error('❌ Parse error:', err.message);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Generates and downloads a blank Excel template for the user to fill out.
 */
export const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet Template
  const summaryData = [
    { 'الكود': '', 'الصنف': '', 'الكمية المباعة': 0, 'المخزون المتبقي': 0, 'الحالة': 'متوفر' }
  ];
  const summaryWS = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, SUMMARY_SHEET);

  // 2. Invoices Sheet Template
  const invoicesData = [
    { 'التاريخ': '2024-01-01', 'رقم الفاتورة': '', 'نوع التسلسل': '', 'النماذج': '', 'الصنف': '', 'الكمية': 0, 'ملاحظات': '' }
  ];
  const invoicesWS = XLSX.utils.json_to_sheet(invoicesData);
  XLSX.utils.book_append_sheet(wb, invoicesWS, INVOICES_SHEET);

  XLSX.writeFile(wb, 'Sales_Tracker_Template.xlsx');
};
