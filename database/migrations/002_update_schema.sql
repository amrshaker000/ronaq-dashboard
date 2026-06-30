-- ============================================
-- Ronaq Dashboard — Database Migration
-- Version: 002_update_schema
-- Date: 2026-06-28
-- ============================================

-- 1. UPDATE PRODUCT CATEGORIES
-- Rename old enum
ALTER TYPE product_category RENAME TO old_product_category;

-- Create new enum
CREATE TYPE product_category AS ENUM (
  'Random', 'Islamic', 'Palestine', 'programing',
  'Graphic Design', 'Marketing', 'QUOTES', 'Spshial',
  'movie', 'AI', 'Carton', 'smiski',
  'Doctor', 'Cats', 'dogs', 'foot ball',
  'Harry Potter', 'Leters', 'Marvel', 'Traffic'
);

-- Drop default on products.category
ALTER TABLE products ALTER COLUMN category DROP DEFAULT;

-- Alter column to use new enum
ALTER TABLE products 
  ALTER COLUMN category TYPE product_category 
  USING (
    CASE 
      WHEN category::text = 'cats' THEN 'Cats'::product_category
      WHEN category::text = 'programming' THEN 'programing'::product_category
      WHEN category::text = 'islamic' THEN 'Islamic'::product_category
      WHEN category::text = 'harry_potter' THEN 'Harry Potter'::product_category
      ELSE 'Random'::product_category
    END
  );

-- Set new default
ALTER TABLE products ALTER COLUMN category SET DEFAULT 'Random';

-- Drop old enum
DROP TYPE old_product_category;


-- 2. UPDATE ORDER STATUSES
-- Rename old enum
ALTER TYPE order_status RENAME TO old_order_status;

-- Create new enum
CREATE TYPE order_status AS ENUM (
  'received', 'processing', 'prepared', 'delivering', 'delivered', 'cancelled', 'returned'
);

-- Drop defaults
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE order_status_logs ALTER COLUMN new_status DROP DEFAULT;

-- Alter columns in orders and logs
ALTER TABLE orders
  ALTER COLUMN status TYPE order_status
  USING (
    CASE status::text
      WHEN 'new' THEN 'received'::order_status
      WHEN 'processing' THEN 'processing'::order_status
      WHEN 'ready' THEN 'prepared'::order_status
      WHEN 'shipped' THEN 'delivering'::order_status
      WHEN 'delivered' THEN 'delivered'::order_status
      WHEN 'cancelled' THEN 'cancelled'::order_status
      ELSE 'received'::order_status
    END
  );

ALTER TABLE order_status_logs
  ALTER COLUMN previous_status TYPE order_status
  USING (
    CASE previous_status::text
      WHEN 'new' THEN 'received'::order_status
      WHEN 'processing' THEN 'processing'::order_status
      WHEN 'ready' THEN 'prepared'::order_status
      WHEN 'shipped' THEN 'delivering'::order_status
      WHEN 'delivered' THEN 'delivered'::order_status
      WHEN 'cancelled' THEN 'cancelled'::order_status
      ELSE NULL
    END
  ),
  ALTER COLUMN new_status TYPE order_status
  USING (
    CASE new_status::text
      WHEN 'new' THEN 'received'::order_status
      WHEN 'processing' THEN 'processing'::order_status
      WHEN 'ready' THEN 'prepared'::order_status
      WHEN 'shipped' THEN 'delivering'::order_status
      WHEN 'delivered' THEN 'delivered'::order_status
      WHEN 'cancelled' THEN 'cancelled'::order_status
      ELSE 'received'::order_status
    END
  );

-- Set defaults
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'received';
ALTER TABLE order_status_logs ALTER COLUMN new_status SET DEFAULT 'received';

-- Drop old enum
DROP TYPE old_order_status;


-- 3. UPDATE PAYMENT METHODS AND REMOVE PAYMENT STATUS
-- Rename old payment method enum
ALTER TYPE payment_method RENAME TO old_payment_method;

-- Create new enum
CREATE TYPE payment_method AS ENUM ('wallet_instapay', 'cod');

-- Drop index and column payment_status
DROP INDEX IF EXISTS idx_orders_payment;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
DROP TYPE IF EXISTS payment_status;

-- Alter orders.payment_method
ALTER TABLE orders
  ALTER COLUMN payment_method TYPE payment_method
  USING (
    CASE 
      WHEN payment_method::text IN ('vodafone_cash', 'instapay') THEN 'wallet_instapay'::payment_method
      ELSE 'cod'::payment_method
    END
  );

-- Set not null and default
ALTER TABLE orders ALTER COLUMN payment_method SET NOT NULL;
ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'cod';

-- Drop old enum
DROP TYPE old_payment_method;
