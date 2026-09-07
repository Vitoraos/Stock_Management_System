"use server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { Role } from "@/types";

export async function stockIn(
  productId: string,
  qty: number,
  note: string | null
) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (!["owner", "manager"].includes(currentUser.role)) {
    return { error: "Only owner or manager can add stock" };
  }
  if (qty <= 0) return { error: "Quantity must be positive" };

  const supabase = await createServerClient();

  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (!product) return { error: "Product not found" };

  const previousQty = product.quantity;
  const newQty = previousQty + qty;

  const { error: insertError } = await supabase.from("stock_movements").insert({
    product_id: productId,
    added_by: currentUser.id,
    qty_change: qty,
    previous_qty: previousQty,
    new_qty: newQty,
    note,
    created_at: new Date().toISOString(),
  });
  if (insertError) return { error: insertError.message };

  const { data, error: updateError } = await supabase
    .from("products")
    .update({ quantity: newQty, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select()
    .single();
  if (updateError) return { error: updateError.message };

  await supabase.from("audit_log").insert({
    user_id: currentUser.id,
    action: "stock.in",
    entity_type: "product",
    entity_id: productId,
    details: { qty_added: qty, previous_qty: previousQty, new_qty: newQty, note },
  });

  return { success: true, product: data };
}
