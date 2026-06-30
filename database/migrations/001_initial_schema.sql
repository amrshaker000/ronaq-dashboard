-- ============================================
-- Ronaq Dashboard — Database Migration
-- Version: 001_initial_schema
-- Date: 2026-06-26
-- ============================================
-- Run this migration against your Supabase PostgreSQL database.
-- Order: Enums → Tables → Indexes → Functions → Triggers → RLS Policies

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE product_size AS ENUM ('small', 'medium', 'large');

CREATE TYPE product_category AS ENUM (
  'Random', 'Islamic', 'Palestine', 'programing',
  'Graphic Design', 'Marketing', 'QUOTES', 'Spshial',
  'movie', 'AI', 'Carton', 'smiski',
  'Doctor', 'Cats', 'dogs', 'foot ball',
  'Harry Potter', 'Leters', 'Marvel', 'Traffic'
);

CREATE TYPE order_status AS ENUM (
  'received', 'processing', 'prepared', 'delivering', 'delivered', 'cancelled', 'returned'
);

CREATE TYPE payment_method AS ENUM ('wallet_instapay', 'cod');

CREATE TYPE movement_type AS ENUM ('stock_in', 'stock_out', 'adjustment');

CREATE TYPE movement_reason AS ENUM (
  'new_shipment', 'order_fulfilled', 'damage',
  'correction', 'order_cancelled', 'initial_stock'
);

CREATE TYPE user_role AS ENUM ('admin', 'employee');

CREATE TYPE expense_category AS ENUM (
  'printing', 'packaging', 'shipping', 'marketing', 'other'
);

CREATE TYPE notification_type AS ENUM (
  'low_stock', 'order_update', 'system', 'stock_received'
);

CREATE TYPE activity_action AS ENUM (
  'create', 'update', 'delete', 'status_change',
  'stock_adjustment', 'login', 'export'
);

-- ============================================
-- 2. TABLES
-- ============================================

-- ---------------------
-- 2.1 Profiles (linked to auth.users)
-- ---------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'employee',
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;

-- ---------------------
-- 2.2 Suppliers
-- ---------------------
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_active ON suppliers(is_active) WHERE is_active = true;

-- ---------------------
-- 2.3 Products
-- ---------------------
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  serial_number VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category product_category NOT NULL DEFAULT 'Random',
  size product_size NOT NULL DEFAULT 'medium',
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level INTEGER NOT NULL DEFAULT 2,
  image_path VARCHAR(500),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_serial ON products(serial_number);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_low_stock ON products(stock_quantity) WHERE stock_quantity <= 2 AND is_active = true;
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('simple', name));

-- ---------------------
-- 2.4 Product Cost History
-- ---------------------
CREATE TABLE product_cost_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cost_price DECIMAL(10, 2) NOT NULL CHECK (cost_price >= 0),
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_history_product ON product_cost_history(product_id);
CREATE INDEX idx_cost_history_date ON product_cost_history(effective_date);

-- ---------------------
-- 2.5 Orders
-- ---------------------

-- Sequence for order numbers
CREATE SEQUENCE order_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_governorate VARCHAR(100) NOT NULL,
  customer_address TEXT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'received',
  payment_method payment_method NOT NULL DEFAULT 'cod',
  shipping_company VARCHAR(100),
  tracking_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_name);
CREATE INDEX idx_orders_governorate ON orders(customer_governorate);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ---------------------
-- 2.6 Order Items (normalized)
-- ---------------------
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ---------------------
-- 2.7 Order Status Logs
-- ---------------------
CREATE TABLE order_status_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status order_status,
  new_status order_status NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_logs_order ON order_status_logs(order_id);
CREATE INDEX idx_status_logs_created ON order_status_logs(created_at DESC);

-- ---------------------
-- 2.8 Stock Movements
-- ---------------------
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  before_quantity INTEGER NOT NULL,
  after_quantity INTEGER NOT NULL,
  reason movement_reason NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_movements_order ON stock_movements(order_id);
CREATE INDEX idx_movements_created ON stock_movements(created_at DESC);

-- ---------------------
-- 2.9 Expenses
-- ---------------------
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  category expense_category NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description VARCHAR(500),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_path VARCHAR(500),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);

-- ---------------------
-- 2.10 Business Settings (structured)
-- ---------------------
CREATE TABLE business_settings (
  id SERIAL PRIMARY KEY,
  brand_name VARCHAR(255) NOT NULL DEFAULT 'رونق',
  whatsapp_number VARCHAR(20) DEFAULT '',
  default_shipping_company VARCHAR(100) DEFAULT '',
  free_shipping_threshold DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
  order_number_prefix VARCHAR(10) NOT NULL DEFAULT 'RNQ',
  default_shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
  currency_symbol VARCHAR(10) NOT NULL DEFAULT 'ج.م',
  low_stock_threshold INTEGER NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ---------------------
-- 2.11 Notifications
-- ---------------------
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  target_user UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(target_user);
CREATE INDEX idx_notifications_unread ON notifications(target_user, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ---------------------
-- 2.12 Activity Logs
-- ---------------------
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action activity_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

-- ============================================
-- 3. FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate order number: RNQ-2026-0001
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  SELECT order_number_prefix INTO prefix FROM business_settings LIMIT 1;
  IF prefix IS NULL THEN
    prefix := 'RNQ';
  END IF;

  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num := nextval('order_number_seq');

  NEW.order_number := prefix || '-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_logs (order_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- updated_at triggers
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order number generation
CREATE TRIGGER tr_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- Order status change logging
CREATE TRIGGER tr_log_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Auto-create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check if user is active
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---- Profiles ----
CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_admin_all ON profiles
  FOR ALL TO authenticated
  USING (is_admin());

-- ---- Products ----
CREATE POLICY products_select ON products
  FOR SELECT TO authenticated
  USING (is_active_user() AND deleted_at IS NULL);

CREATE POLICY products_admin_insert ON products
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY products_admin_update ON products
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY products_admin_delete ON products
  FOR DELETE TO authenticated
  USING (is_admin());

-- ---- Suppliers ----
CREATE POLICY suppliers_select ON suppliers
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY suppliers_admin_all ON suppliers
  FOR ALL TO authenticated
  USING (is_admin());

-- ---- Product Cost History ----
CREATE POLICY cost_history_admin ON product_cost_history
  FOR ALL TO authenticated
  USING (is_admin());

-- ---- Orders ----
CREATE POLICY orders_select ON orders
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY orders_insert ON orders
  FOR INSERT TO authenticated
  WITH CHECK (is_active_user());

CREATE POLICY orders_update ON orders
  FOR UPDATE TO authenticated
  USING (is_active_user());

-- ---- Order Items ----
CREATE POLICY order_items_select ON order_items
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY order_items_insert ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (is_active_user());

-- ---- Order Status Logs ----
CREATE POLICY status_logs_select ON order_status_logs
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY status_logs_insert ON order_status_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_active_user());

-- ---- Stock Movements ----
CREATE POLICY movements_select ON stock_movements
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY movements_admin_insert ON stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- ---- Expenses ----
CREATE POLICY expenses_admin ON expenses
  FOR ALL TO authenticated
  USING (is_admin());

-- ---- Business Settings ----
CREATE POLICY settings_select ON business_settings
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY settings_admin_update ON business_settings
  FOR UPDATE TO authenticated
  USING (is_admin());

-- ---- Notifications ----
CREATE POLICY notifications_own ON notifications
  FOR SELECT TO authenticated
  USING (target_user = auth.uid() OR target_user IS NULL);

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE TO authenticated
  USING (target_user = auth.uid());

CREATE POLICY notifications_admin_insert ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_active_user());

-- ---- Activity Logs ----
CREATE POLICY activity_select ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY activity_insert ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_active_user());

-- ============================================
-- 6. SERVICE ROLE BYPASS
-- ============================================
-- The service role key bypasses RLS automatically in Supabase.
-- Backend API uses the service role key for all operations,
-- enforcing RBAC at the application middleware level.

-- ============================================
-- 7. INITIAL DATA
-- ============================================

-- Default business settings
INSERT INTO business_settings (
  brand_name, whatsapp_number, default_shipping_company,
  free_shipping_threshold, order_number_prefix, default_shipping_cost,
  currency, currency_symbol, low_stock_threshold
) VALUES (
  'رونق', '', '', 200.00, 'RNQ', 50.00, 'EGP', 'ج.م', 2
);

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) Policies for storage.objects on product-images bucket

CREATE POLICY "Allow public select from product-images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated inserts to product-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated updates to product-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated deletes from product-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

