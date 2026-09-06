"use client";

import { ToastProvider } from "@/components/ui/use-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
