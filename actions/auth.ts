"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { Profile, Role } from "@/types";

// Bootstrap — only works when NO owner exists. Self-disables.
export async function bootstrapOwner(
  email: string,
  password: string,
  fullName: string
) {
  const admin = createAdminClient();

  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "owner");

  if ((count ?? 0) > 0) {
    return { error: "An owner already exists — use /login" };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { error: error.message };

  const userId = data.user?.id;
  if (!userId) return { error: "Failed to create owner" };

  await admin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    role: "owner",
    created_at: new Date().toISOString(),
  });

  await admin.from("audit_log").insert({
    user_id: userId,
    action: "user.create",
    entity_type: "profiles",
    entity_id: userId,
    details: { email, full_name: fullName, role: "owner", bootstrap: true },
  });

  return { success: true };
}

// Owner-only: create manager / frontdesk users
export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: Role
) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner") {
    return { error: "Only the owner can create users" };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { error: error.message };

  const userId = data.user?.id;
  if (!userId) return { error: "Failed to create user" };

  await admin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    role,
    created_at: new Date().toISOString(),
  });

  await admin.from("audit_log").insert({
    user_id: currentUser.id,
    action: "user.create",
    entity_type: "profiles",
    entity_id: userId,
    details: { email, full_name: fullName, role, created_by: currentUser.id },
  });

  return { success: true };
}

export async function deleteUser(userId: string) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner") return { error: "Only the owner can delete users" };
  if (userId === currentUser.id) return { error: "Cannot delete your own account" };

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);

  await admin.from("audit_log").insert({
    user_id: currentUser.id,
    action: "user.delete",
    entity_type: "profiles",
    entity_id: userId,
    details: { deleted_by: currentUser.id },
  });

  return { success: true };
}

export async function listUsers() {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner") return { error: "Only the owner can view users" };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };
  return { success: true, users: data ?? [] };
}

export async function updateProfileRole(
  userId: string,
  newRole: Role
) {
  const { user: currentUser, error: authError } = await getCurrentUser();
  if (authError) return { error: authError };
  if (!currentUser) return { error: "Unauthorized" };
  if (currentUser.role !== "owner") {
    return { error: "Only the owner can change roles" };
  }
  if (userId === currentUser.id) {
    return { error: "Cannot change your own role" };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)
    .select()
    .single();
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    user_id: currentUser.id,
    action: "user.role_change",
    entity_type: "profiles",
    entity_id: userId,
    details: { new_role: newRole, changed_by: currentUser.id },
  });

  return { success: true, profile: data };
}

export async function logout() {
  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = createServerClient();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/login");
}