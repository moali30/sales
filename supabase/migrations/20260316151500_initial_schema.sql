-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Datasets Table
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_sold INTEGER DEFAULT 0,
  inventory_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'متوفر'
);

-- 3. Sales Transactions Table
CREATE TABLE sales_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  invoice_number TEXT,
  sequence_type TEXT,
  quantity_required INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  template_name TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Pending'
);

-- 4. Atomic RPC for "Done" button
CREATE OR REPLACE FUNCTION mark_sale_done(sale_id UUID, prod_id UUID, qty INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update Sale Status
  UPDATE sales_transactions 
  SET status = 'Done' 
  WHERE id = sale_id;

  -- Decrement Inventory, Increment Sold
  UPDATE products 
  SET inventory_count = inventory_count - qty,
      total_sold = total_sold + qty,
      status = CASE 
                  WHEN (inventory_count - qty) <= 0 THEN 'نفذ' 
                  ELSE 'متوفر' 
               END
  WHERE id = prod_id;
END;
$$;
