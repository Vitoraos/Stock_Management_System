"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  createServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { Role } from "@/types";

// ============================================================
// BOOTSTRAP OWNER
// ============================================================
// Only works when there is no owner.
// This is intended to be used once during initial hotel setup.
export async function bootstrapOwner(
  email: string,
  password: string,
  fullName: string
) {
  const admin = createAdminClient();

  // Check whether an owner already exists.
  const { count, error: ownerCheckError } = await admin
    .from("profiles")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("role", "owner");

  if (ownerCheckError) {
    return {
      error: `Unable to check owner status: ${ownerCheckError.message}`,
    };
  }

  if ((count ?? 0) > 0) {
    return {
      error: "An owner already exists — use /login",
    };
  }

  // Create the Supabase Auth user.
  const {
    data,
    error,
  } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  const userId = data.user?.id;

  if (!userId) {
    return {
      error: "Failed to create owner",
    };
  }

  // The database trigger creates a profile automatically.
  // Promote that existing profile to owner.
  const {
    error: profileError,
  } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role: "owner",
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    // Clean up the auth user if profile creation fails.
    await admin.auth.admin.deleteUser(userId);

    return {
      error: `Failed to create owner profile: ${profileError.message}`,
    };
  }

  // Audit trail.
  const {
    error: auditError,
  } = await admin
    .from("audit_log")
    .insert({
      user_id: userId,
      action: "user.create",
      entity_type: "profiles",
      entity_id: userId,
      details: {
        email,
        full_name: fullName,
        role: "owner",
        bootstrap: true,
      },
    });

  if (auditError) {
    return {
      error: `Owner created, but audit logging failed: ${auditError.message}`,
    };
  }

  return {
    success: true,
  };
}

// ============================================================
// CREATE USER
// ============================================================
// Owner only.
// Can create manager or frontdesk accounts.
export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: Role
) {
  const {
    user: currentUser,
    error: authError,
  } = await getCurrentUser();

  if (authError) {
    return {
      error: authError,
    };
  }

  if (!currentUser) {
    return {
      error: "Unauthorized",
    };
  }

  if (currentUser.role !== "owner") {
    return {
      error: "Only the owner can create users",
    };
  }

  if (role === "owner") {
    return {
      error: "Only one owner is allowed",
    };
  }

  const admin = createAdminClient();

  const {
    data,
    error,
  } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  const userId = data.user?.id;

  if (!userId) {
    return {
      error: "Failed to create user",
    };
  }

  // The auth trigger automatically creates the profile.
  // Upsert instead of inserting a second row.
  const {
    error: profileError,
  } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role,
      },
      {
        onConflict: "id",
      }
    );

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);

    return {
      error: `Failed to create user profile: ${profileError.message}`,
    };
  }

  await admin
    .from("audit_log")
    .insert({
      user_id: currentUser.id,
      action: "user.create",
      entity_type: "profiles",
      entity_id: userId,
      details: {
        email,
        full_name: fullName,
        role,
        created_by: currentUser.id,
      },
    });

  return {
    success: true,
  };
}

// ============================================================
// DELETE USER
// ============================================================
export async function deleteUser(userId: string) {
  const {
    user: currentUser,
    error: authError,
  } = await getCurrentUser();

  if (authError) {
    return {
      error: authError,
    };
  }

  if (!currentUser) {
    return {
      error: "Unauthorized",
    };
  }

  if (currentUser.role !== "owner") {
    return {
      error: "Only the owner can delete users",
    };
  }

  if (userId === currentUser.id) {
    return {
      error: "Cannot delete your own account",
    };
  }

  const admin = createAdminClient();

  const {
    error,
  } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    return {
      error: error.message,
    };
  }

  await admin
    .from("audit_log")
    .insert({
      user_id: currentUser.id,
      action: "user.delete",
      entity_type: "profiles",
      entity_id: userId,
      details: {
        deleted_by: currentUser.id,
      },
    });

  return {
    success: true,
  };
}

// ============================================================
// LIST USERS
// ============================================================
export async function listUsers() {
  const {
    user: currentUser,
    error: authError,
  } = await getCurrentUser();

  if (authError) {
    return {
      error: authError,
    };
  }

  if (!currentUser) {
    return {
      error: "Unauthorized",
    };
  }

  if (currentUser.role !== "owner") {
    return {
      error: "Only the owner can view users",
    };
  }

  const supabase = createServerClient();

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: true,
    users: data ?? [],
  };
}

// ============================================================
// UPDATE PROFILE ROLE
// ============================================================
export async function updateProfileRole(
  userId: string,
  newRole: Role
) {
  const {
    user: currentUser,
    error: authError,
  } = await getCurrentUser();

  if (authError) {
    return {
      error: authError,
    };
  }

  if (!currentUser) {
    return {
      error: "Unauthorized",
    };
  }

  if (currentUser.role !== "owner") {
    return {
      error: "Only the owner can change roles",
    };
  }

  if (userId === currentUser.id) {
    return {
      error: "Cannot change your own role",
    };
  }

  if (newRole === "owner") {
    return {
      error: "Owner role cannot be assigned to another user",
    };
  }

  const supabase = createServerClient();

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .update({
      role: newRole,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return {
      error: error.message,
    };
  }

  await supabase
    .from("audit_log")
    .insert({
      user_id: currentUser.id,
      action: "user.role_change",
      entity_type: "profiles",
      entity_id: userId,
      details: {
        new_role: newRole,
        changed_by: currentUser.id,
      },
    });

  return {
    success: true,
    profile: data,
  };
}

// ============================================================
// LOGOUT
// ============================================================
export async function logout() {
  const supabase = createServerClient();

  await supabase.auth.signOut();

  const { redirect } = await import("next/navigation");

  redirect("/login");
}
