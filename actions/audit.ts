"use server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function writeAuditLog({
  action,
  entityType,
  entityId,
  details,
}: {
  action: string;
  entityType: string;
  entityId: string | null;
  details?: Record<string, unknown>;
}) {
  const { user: currentUser, error: authError } = await getCurrentUser();

  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };

  const supabase = await createServerClient();

  const { error } = await supabase.from("audit_log").insert({
    user_id: currentUser.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  return { success: true };
}

export async function listAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  action?: string;
}) {
  const { user: currentUser, error: authError } = await getCurrentUser();

  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };

  if (currentUser.role !== "owner") {
    return { error: "Only the owner can view the audit log" };
  }

  const supabase = await createServerClient();

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params?.action) {
    query = query.eq("action", params.action);
  }

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;

  query = query.range(
    (page - 1) * pageSize,
    page * pageSize - 1
  );

  const { data, error, count } = await query;

  if (error) return { error: error.message };

  return {
    success: true,
    logs: data ?? [],
    total: count ?? 0,
  };
}
