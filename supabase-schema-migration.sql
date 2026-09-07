-- ============================================================
-- HOTEL STOCK MANAGEMENT SYSTEM
-- SAFE IN-PLACE DATABASE MIGRATION
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'frontdesk',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'frontdesk';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Fill missing emails from Supabase Auth
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

-- Any profile without a role becomes frontdesk
UPDATE public.profiles
SET role = 'frontdesk'
WHERE role IS NULL;

-- Never trust role metadata from Auth
UPDATE public.profiles
SET role = 'frontdesk'
WHERE role NOT IN ('owner', 'manager', 'frontdesk');

-- ============================================================
-- 2. CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 3. SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 4. PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category_id UUID,
  supplier_id UUID,
  unit TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id UUID;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 5. MIGRATE OLD supplier TEXT -> suppliers table
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'supplier'
  ) THEN

    INSERT INTO public.suppliers (name)
    SELECT DISTINCT TRIM(supplier)
    FROM public.products
    WHERE supplier IS NOT NULL
      AND TRIM(supplier) <> ''
    ON CONFLICT (name) DO NOTHING;

    UPDATE public.products p
    SET supplier_id = s.id
    FROM public.suppliers s
    WHERE p.supplier_id IS NULL
      AND TRIM(p.supplier) = s.name;

  END IF;
END $$;

-- ============================================================
-- 6. STOCK MOVEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  added_by UUID,
  qty_change NUMERIC NOT NULL,
  previous_qty NUMERIC,
  new_qty NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS added_by UUID;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS qty_change NUMERIC;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS previous_qty NUMERIC;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS new_qty NUMERIC;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate old column names
DO $$
BEGIN

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_movements'
      AND column_name='performed_by'
  ) THEN
    EXECUTE '
      UPDATE public.stock_movements
      SET added_by = performed_by
      WHERE added_by IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_movements'
      AND column_name='quantity_changed'
  ) THEN
    EXECUTE '
      UPDATE public.stock_movements
      SET qty_change = quantity_changed
      WHERE qty_change IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_movements'
      AND column_name='quantity_before'
  ) THEN
    EXECUTE '
      UPDATE public.stock_movements
      SET previous_qty = quantity_before
      WHERE previous_qty IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_movements'
      AND column_name='quantity_after'
  ) THEN
    EXECUTE '
      UPDATE public.stock_movements
      SET new_qty = quantity_after
      WHERE new_qty IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='stock_movements'
      AND column_name='reason'
  ) THEN
    EXECUTE '
      UPDATE public.stock_movements
      SET note = reason
      WHERE note IS NULL
    ';
  END IF;

END $$;

-- ============================================================
-- 7. SALES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sold_by UUID,
  customer_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sold_by UUID;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate created_by -> sold_by
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='sales'
      AND column_name='created_by'
  ) THEN
    EXECUTE '
      UPDATE public.sales
      SET sold_by = created_by
      WHERE sold_by IS NULL
    ';
  END IF;
END $$;

-- ============================================================
-- 8. SALE ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  product_id UUID NOT NULL,
  qty NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  line_total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS qty NUMERIC;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS line_total NUMERIC;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate quantity -> qty
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='sale_items'
      AND column_name='quantity'
  ) THEN
    EXECUTE '
      UPDATE public.sale_items
      SET qty = quantity
      WHERE qty IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='sale_items'
      AND column_name='total_price'
  ) THEN
    EXECUTE '
      UPDATE public.sale_items
      SET line_total = total_price
      WHERE line_total IS NULL
    ';
  END IF;
END $$;

-- ============================================================
-- 9. AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS action TEXT;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS entity_type TEXT;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS entity_id UUID;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS details JSONB;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS ip TEXT;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 10. FOREIGN KEYS
-- ============================================================

DO $$
BEGIN

  -- products -> categories
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES public.categories(id)
      ON DELETE SET NULL;
  END IF;

  -- products -> suppliers
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_supplier_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_supplier_id_fkey
      FOREIGN KEY (supplier_id)
      REFERENCES public.suppliers(id)
      ON DELETE SET NULL;
  END IF;

  -- stock movements -> products
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stock_movements_product_id_fkey'
  ) THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.products(id)
      ON DELETE CASCADE;
  END IF;

  -- stock movements -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stock_movements_added_by_fkey'
  ) THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_added_by_fkey
      FOREIGN KEY (added_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

  -- sales -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_sold_by_fkey'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_sold_by_fkey
      FOREIGN KEY (sold_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

  -- sale items -> sales
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sale_items_sale_id_fkey'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_sale_id_fkey
      FOREIGN KEY (sale_id)
      REFERENCES public.sales(id)
      ON DELETE CASCADE;
  END IF;

  -- sale items -> products
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sale_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.products(id)
      ON DELETE RESTRICT;
  END IF;

  -- audit -> profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_log_user_id_fkey'
  ) THEN
    ALTER TABLE public.audit_log
      ADD CONSTRAINT audit_log_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

END $$;

-- ============================================================
-- 11. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS products_category_idx
  ON public.products(category_id);

CREATE INDEX IF NOT EXISTS products_supplier_idx
  ON public.products(supplier_id);

CREATE INDEX IF NOT EXISTS products_active_idx
  ON public.products(is_active);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx
  ON public.stock_movements(product_id);

CREATE INDEX IF NOT EXISTS stock_movements_created_idx
  ON public.stock_movements(created_at);

CREATE INDEX IF NOT EXISTS sales_created_idx
  ON public.sales(created_at);

CREATE INDEX IF NOT EXISTS sales_sold_by_idx
  ON public.sales(sold_by);

CREATE INDEX IF NOT EXISTS sale_items_sale_idx
  ON public.sale_items(sale_id);

CREATE INDEX IF NOT EXISTS audit_log_created_idx
  ON public.audit_log(created_at);

-- ============================================================
-- 12. ONE OWNER ONLY
-- ============================================================

DO $$
BEGIN

  IF (
    SELECT COUNT(*)
    FROM public.profiles
    WHERE role = 'owner'
  ) <= 1 THEN

    CREATE UNIQUE INDEX IF NOT EXISTS one_owner_only
      ON public.profiles(role)
      WHERE role = 'owner';

  ELSE

    RAISE EXCEPTION
      'Multiple owner profiles already exist. Resolve duplicate owners before continuing.';

  END IF;

END $$;

-- ============================================================
-- 13. ROLE HELPER
-- Avoid RLS recursion when policies inspect profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role()
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_role()
TO authenticated;

-- ============================================================
-- 14. NEW AUTH USER TRIGGER
-- New users ALWAYS start as frontdesk.
-- Bootstrap explicitly promotes the first owner.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      ''
    ),
    'frontdesk'
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email;

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 15. IMPORTANT:
-- Remove the old stock decrement trigger.
--
-- The application's createSale() action already updates
-- products.quantity.
--
-- Keeping the old DB trigger would decrement stock TWICE.
-- ============================================================

DROP TRIGGER IF EXISTS sale_item_stock_decrement
ON public.sale_items;

DROP TRIGGER IF EXISTS decrement_stock
ON public.sale_items;

DROP FUNCTION IF EXISTS public.decrement_stock();

-- ============================================================
-- 16. ENABLE RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 17. DROP OLD POLICIES
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN

  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'categories',
        'suppliers',
        'products',
        'stock_movements',
        'sales',
        'sale_items',
        'audit_log'
      )
  LOOP

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      r.policyname,
      r.tablename
    );

  END LOOP;

END $$;

-- ============================================================
-- 18. PROFILES POLICIES
-- ============================================================

CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.current_user_role() = 'owner'
);

CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND id <> auth.uid()
)
WITH CHECK (
  public.current_user_role() = 'owner'
  AND id <> auth.uid()
);

-- ============================================================
-- 19. CATEGORY POLICIES
-- ============================================================

CREATE POLICY "categories_select"
ON public.categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "categories_insert"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('owner', 'manager')
);

CREATE POLICY "categories_update"
ON public.categories
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() IN ('owner', 'manager')
);

CREATE POLICY "categories_delete"
ON public.categories
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'owner'
);

-- ============================================================
-- 20. SUPPLIER POLICIES
-- ============================================================

CREATE POLICY "suppliers_select"
ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "suppliers_insert"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('owner', 'manager')
);

CREATE POLICY "suppliers_update"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() IN ('owner', 'manager')
);

CREATE POLICY "suppliers_delete"
ON public.suppliers
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'owner'
);

-- ============================================================
-- 21. PRODUCT POLICIES
-- ============================================================

CREATE POLICY "products_select"
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "products_insert"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('owner', 'manager')
);

CREATE POLICY "products_update"
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() IN ('owner', 'manager')
);

CREATE POLICY "products_delete"
ON public.products
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'owner'
);

-- ============================================================
-- 22. STOCK MOVEMENT POLICIES
-- ============================================================

CREATE POLICY "stock_movements_select"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "stock_movements_insert"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  added_by = auth.uid()
  AND public.current_user_role() IN ('owner', 'manager')
);

-- ============================================================
-- 23. SALES POLICIES
-- ============================================================

CREATE POLICY "sales_select"
ON public.sales
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "sales_insert"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  sold_by = auth.uid()
);

-- ============================================================
-- 24. SALE ITEMS POLICIES
-- ============================================================

CREATE POLICY "sale_items_select"
ON public.sale_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "sale_items_insert"
ON public.sale_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales s
    WHERE s.id = sale_id
      AND s.sold_by = auth.uid()
  )
);

-- ============================================================
-- 25. AUDIT LOG POLICIES
-- ============================================================

CREATE POLICY "audit_log_select"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'owner'
);

CREATE POLICY "audit_log_insert"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

COMMIT;
