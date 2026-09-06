import { createClient } from "@supabase/supabase-js";
import type { Profile } from "@/types";

// Server client — authenticated via cookies (session)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, anon);
}

// Get the current caller's session + profile (trust the session, not client claims)
export async function getCurrentUser(): Promise<{ user: Profile | null; error: string | null }> {
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.getSession();
  if (error) return { user: null, error: error.message };
  if (!data.session?.user) return { user: null, error: "Not authenticated" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.session.user.id)
    .single();

  if (profileError) return { user: null, error: profileError.message };
  return { user: profile, error: null };
}

// Admin client — server actions only (service_role, NEVER exposed to browser)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}