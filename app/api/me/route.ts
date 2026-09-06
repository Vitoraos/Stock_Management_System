import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";

export async function GET() {
  const { user, error } = await getCurrentUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
