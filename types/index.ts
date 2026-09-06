export type Role = "owner" | "manager" | "frontdesk";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string;
  supplier_id: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  unit: string | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithRelations = Product & {
  category: Category | null;
  supplier: Supplier | null;
};

export type StockMovement = {
  id: string;
  product_id: string;
  added_by: string;
  qty_change: number;
  previous_qty: number;
  new_qty: number;
  note: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  sold_by: string;
  customer_name: string | null;
  total_amount: number;
  payment_method: "cash" | "card" | "transfer";
  status: "completed" | "void";
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type SaleWithItems = Sale & {
  items: (SaleItem & { product: Product | null })[];
  seller: Profile | null;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};
