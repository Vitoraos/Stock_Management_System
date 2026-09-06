-- Diamond Residence Stock Management System
-- Supabase PostgreSQL Schema
-- Run this after creating your Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'frontdesk' CHECK (role IN ('owner', 'manager', 'frontdesk')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and owners can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'owner')
    )
  );

CREATE POLICY "Only owners can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier TEXT,
  cost_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) NOT NULL,
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 5,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (quantity > 0 OR auth.jwt() ->> 'role' IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'owner')
    )
  );

CREATE POLICY "Managers and owners can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'owner')
    )
  );

CREATE POLICY "Only owners can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================
-- STOCK MOVEMENTS (audit trail for stock in/out)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_changed INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT DEFAULT 'stock_in',
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and owners can insert stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'owner')
    )
  );

-- ============================================
-- SALES
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- ============================================
-- SALE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and owners can view audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'owner')
    )
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'frontdesk')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Decrement stock on sale
CREATE OR REPLACE FUNCTION decrement_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER decrement_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_sale();

-- ============================================
-- SEED DATA: Default Categories
-- ============================================
INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Clothing'),
  ('Food & Beverages'),
  ('Home & Garden'),
  ('Health & Beauty'),
  ('Sports & Outdoors'),
  ('Books & Stationery'),
  ('Toys & Games'),
  ('Automotive'),
  ('Office Supplies')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS (if needed for future uploads)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);
