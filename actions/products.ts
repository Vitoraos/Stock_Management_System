"use server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { Product, Role } from "@/types";

export async function listProducts(filters?: {
  categoryId?: string;
  search?: string;
  onlyActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };

  // Role check: frontdesk can only see active products
  if (
    currentUser.role === "frontdesk" &&
    (filters?.onlyActive === false || filters?.onlyActive === undefined)
  ) {
    filters = { ...filters, onlyActive: true };
  }

  const supabase = await createServerClient();
  let query = supabase
    .from("products")
    .select("*, category:categories(name)", { count: "exact" });

  if (filters?.onlyActive !== false) query = query.eq("is_active", true);
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  query = query
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message };
  return { success: true, products: data ?? [], total: count ?? 0 };
}

export async function getProductById(id: string) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return { error: error.message };
  // If product is inactive and requester is not owner/manager
  if (
  !data?.is_active &&
  currentUser.role !== "owner" &&
  currentUser.role !== "manager"
) {
  return { error: "Product not found" };
}
  return { success: true, product: data };
}

export async function createProduct(
  categoryId: string,
  supplierId: string | null,
  name: string,
  brand: string | null,
  description: string | null,
  unit: string | null,
  costPrice: number,
  sellingPrice: number,
  quantity: number,
  lowStockThreshold: number,
  isActive: boolean = true
) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner" && currentUser.role !== "manager") {
    return { error: "Only owner or manager can create products" };
  }

  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Product name is required" };
  if (trimmedName.length > 100) return { error: "Name is too long" };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      category_id: categoryId,
      supplier_id: supplierId,
      name: trimmedName,
      brand: brand?.trim() || null,
      description: description?.trim() || null,
      unit: unit?.trim() || null,
      cost_price: costPrice,
      selling_price: sellingPrice,
      quantity,
      low_stock_threshold: lowStockThreshold,
      is_active: isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, product: data };
}

export async function updateProduct(
  productId: string,
  updates: Partial<Omit<Product, "id" | "created_at" | "quantity">>
) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner" && currentUser.role !== "manager") {
    return { error: "Only owner or manager can update products" };
  }

  // Manager cannot edit quantity via updateProduct — they must use stockIn
  // (the Updates type excludes quantity; extra check in case)
  if ("quantity" in updates && currentUser.role === "manager") {
    return { error: "Manager cannot change quantity directly" };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select()
    .single();
  if (error) return { error: error.message };
  return { success: true, product: data };
}

export async function deleteProduct(id: string) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner" && currentUser.role !== "manager") {
    return { error: "Only owner or manager can delete products" };
  }

  const supabase = await createServerClient();
  // Soft delete: set is_active = false
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { success: true, product: data };
}

export async function listLowStock() {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (!["owner", "manager"].includes(currentUser.role)) {
    return { error: "Only owner or manager can view low stock" };
  }

  const supabase = await createServerClient();
   const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };
  const low = (data ?? []).filter(
    (p) => p.quantity <= (p.low_stock_threshold ?? 0)
  );
  return { success: true, products: low };
}
