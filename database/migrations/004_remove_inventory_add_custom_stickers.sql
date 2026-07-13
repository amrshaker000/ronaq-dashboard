-- ============================================
-- Ronaq Dashboard — Database Migration
-- Version: 004_remove_inventory_add_custom_stickers
-- Date: 2026-07-13
-- ============================================

-- 1. DROP INVENTORY TABLES & POLICIES
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS product_cost_history CASCADE;

-- 2. DROP ENUMS
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS movement_reason CASCADE;

-- 3. UPDATE PRODUCTS TABLE
ALTER TABLE products 
  DROP COLUMN IF EXISTS stock_quantity,
  DROP COLUMN IF EXISTS min_stock_level,
  DROP COLUMN IF EXISTS cost_price;

-- Drop low stock index
DROP INDEX IF EXISTS idx_products_low_stock;

-- Update products price to default 10 EGP (for standard stickers)
UPDATE products SET price = 10.00;

-- 4. UPDATE ORDER_ITEMS TABLE
ALTER TABLE order_items
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS material VARCHAR(50) DEFAULT 'glossy',
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_image_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_size VARCHAR(50);
