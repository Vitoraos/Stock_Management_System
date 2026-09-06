import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { Providers } from "@/app/providers";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, error } = await getCurrentUser();
  if (error || !user) redirect("/login");

  return (
    <Providers>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col min-h-screen">
          <TopNav />
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}