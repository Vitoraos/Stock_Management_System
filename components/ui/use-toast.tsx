"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md border p-4 shadow-lg ${
              t.variant === "destructive"
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border-border bg-card text-card-foreground"
            }`}
            onClick={() => dismiss(t.id)}
          >
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && <p className="text-sm opacity-90 mt-1">{t.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Fallback: console log so it doesn't crash pre-provider
    return {
      toasts: [],
      toast: (t: Omit<Toast, "id">) => console.log("[toast]", t),
      dismiss: () => {},
    };
  }
  return ctx;
}

// Convenience function-style API: toast({...})
export const toast = (t: Omit<Toast, "id">) => {
  if (typeof window !== "undefined") {
    const evt = new CustomEvent("app:toast", { detail: t });
    window.dispatchEvent(evt);
  }
};
