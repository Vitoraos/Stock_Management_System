import { redirect } from "next/navigation";
import { bootstrapOwner } from "@/actions/auth";
import { BootstrapForm } from "./BootstrapForm";

export default async function BootstrapPage() {
  const { user } = await (await import("@/lib/supabase/server")).getCurrentUser();
  if (user?.role === "owner") redirect("/");

  async function handleSubmit(values: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<string | null> {
    "use server";
    const { error } = await bootstrapOwner(
      values.email,
      values.password,
      values.fullName
    );
    if (error) return error;
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <BootstrapForm onSubmit={handleSubmit} />
    </div>
  );
}
