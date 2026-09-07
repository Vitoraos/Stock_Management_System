import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Profile } from "@/types";

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const cookieStore = cookies();

  return createSupabaseServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components may have read-only cookies.
          // Middleware handles session cookie refreshes.
        }
      },
    },
  });
}

export async function getCurrentUser(): Promise<{
  user: Profile | null;
  error: string | null;
}> {
  const supabase = createServerClient();

  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return {
      user: null,
      error: error.message,
    };
  }

  if (!data.user) {
    return {
      user: null,
      error: "Not authenticated",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    return {
      user: null,
      error: profileError.message,
    };
  }

  return {
    user: profile,
    error: null,
  };
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => undefined,
    },

    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
