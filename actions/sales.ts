"use server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { Role } from "@/types";

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  line_total: number;
  product?: {
    name: string;
    brand: string | null;
    description: string | null;
    unit: string | null;
  };
}

export interface Sale {
  id: string;
  sold_by: string;
  customer_name: string | null;
  total_amount: number;
  payment_method: "cash" | "card" | "transfer";
  status: string;
  created_at: string;
  sale_items?: SaleItem[];
  seller_name?: string;
}

export async function getSaleById(saleId: string) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };

  const supabase = await createServerClient();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .single();
  if (saleError) return { error: saleError.message };

  const { data: items, error: itemsError } = await supabase
    .from("sale_items")
    .select("*, product:products(name, brand, description, unit)")
    .eq("sale_id", saleId);
  if (itemsError) return { error: itemsError.message };

  const { data: seller } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", sale.sold_by)
    .single();

  return {
    success: true,
    sale: { ...sale, sale_items: items, seller_name: seller?.full_name },
  };
}

export async function listSales(filters?: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  let query = supabase
    .from("sales")
    .select("*, sale_items(*), seller:profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message };

  return { success: true, sales: data ?? [], total: count ?? 0 };
}

export async function createSale(
  customerName: string | null,
  paymentMethod: "cash" | "card" | "transfer",
  items: { productId: string; qty: number; unitPrice: number }[]
) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (!["owner", "manager", "frontdesk"].includes(currentUser.role)) {
    return { error: "Unauthorized" };
  }
  if (!items.length) return { error: "Sale must have at least one item" };

  const supabase = await createServerClient();

  let totalAmount = 0;
  const validatedItems: { productId: string; qty: number; unitPrice: number; lineTotal: number }[] = [];

  for (const item of items) {
    const lineTotal = item.qty * item.unitPrice;
    totalAmount += lineTotal;
    validatedItems.push({ ...item, lineTotal });

    const { data: product } = await supabase
      .from("products")
      .select("id, quantity")
      .eq("id", item.productId)
      .single();
    if (!product) return { error: `Product ${item.productId} not found` };
    if (product.quantity < item.qty) {
      return { error: `Insufficient stock for ${product.id}` };
    }
    const newQty = product.quantity - item.qty;
    await supabase
      .from("products")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", item.productId);
  }

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      sold_by: currentUser.id,
      customer_name: customerName,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: "completed",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (saleError) return { error: saleError.message };

  for (const item of validatedItems) {
    await supabase.from("sale_items").insert({
      sale_id: sale.id,
      product_id: item.productId,
      qty: item.qty,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
    });
  }

  await supabase.from("audit_log").insert({
    user_id: currentUser.id,
    action: "sale.create",
    entity_type: "sale",
    entity_id: sale.id,
    details: { customer_name: customerName, payment_method: paymentMethod, total_amount: totalAmount, items },
  });

  return { success: true, sale };
}
