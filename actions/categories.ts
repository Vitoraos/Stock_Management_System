"use server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { Category } from "@/types";

// List categories — all roles can read (frontdesk needs to pick from them)
export async function listCategories(): Promise<{
  success?: true;
  categories: Category[];
  error?: string;
}> {
  const { user, error: authError } = await getCurrentUser();
  if (authError) return { error: authError, categories: [] };
  if (!user) return { error: "Unauthorized", categories: [] };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) return { error: error.message, categories: [] };
  return { success: true, categories: data ?? [] };
}

// Create category — owner/manager only
export async function createCategory(
  name: string
): Promise<{ success?: true; category?: Category; error?: string }> {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner" && currentUser.role !== "manager") {
    return { error: "Only owner or manager can create categories" };
  }

  const trimmed = name.trim();
  if (!trimmed) return { error: "Category name is required" };
  if (trimmed.length > 50) return { error: "Category name is too long" };

  const supabase = await createServerClient();

  // Prevent duplicate (case-insensitive)
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return { error: "Category already exists" };

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: trimmed, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    user_id: currentUser.id,
    action: "category.create",
    entity_type: "category",
    entity_id: data.id,
    details: { name: trimmed, created_by: currentUser.id },
  });

  return { success: true, category: data };
}

// Delete category — owner only (manager can create but not destroy data)
export async function deleteCategory(
  id: string
): Promise<{ success?: true; error?: string }> {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner") {
    return { error: "Only the owner can delete categories" };
  }

  const supabase = await createServerClient();

  // Check if any products use this category
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot delete — ${count} product(s) still use this category`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    user_id: currentUser.id,
    action: "category.delete",
    entity_type: "category",
    entity_id: id,
    details: { deleted_by: currentUser.id },
  });

  return { success: true };
}
