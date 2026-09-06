import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const { user, error } = await getCurrentUser();
  if (error || !user) {
    redirect("/login");
  }
  if (user.role === "owner") redirect("/dashboard");
  if (user.role === "manager") redirect("/products");
  redirect("/sales/new");
}