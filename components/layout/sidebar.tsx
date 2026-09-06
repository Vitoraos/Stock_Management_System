"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, CreditCard, Users, FileText, LogOut, Menu, Building2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: Array<"owner" | "manager" | "frontdesk">;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, roles: ["owner"] },
  { href: "/products", label: "Products", icon: <Package size={18} />, roles: ["owner", "manager"] },
  { href: "/categories", label: "Categories", icon: <Tag size={18} />, roles: ["owner", "manager"] },
  { href: "/sales", label: "Sales History", icon: <CreditCard size={18} /> },
  { href: "/sales/new", label: "New Sale", icon: <CreditCard size={18} />, roles: ["owner", "manager", "frontdesk"] },
  { href: "/reports", label: "Reports", icon: <FileText size={18} />, roles: ["owner"] },
  { href: "/audit", label: "Audit Log", icon: <FileText size={18} />, roles: ["owner"] },
  { href: "/users", label: "Users", icon: <Users size={18} />, roles: ["owner"] },
];

export function Sidebar({ user }: { user: { id: string; full_name: string; role: "owner" | "manager" | "frontdesk" } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-primary" />
          <span className="font-semibold text-foreground">Diamond Residence</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-2 rounded-md hover:bg-card-highlight"
          aria-label="Toggle menu"
        >
          <Menu size={20} className="text-foreground" />
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-0 z-40 md:static md:inset-auto md:translate-x-0",
          "w-64 bg-card border-r border-border flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="hidden md:flex items-center gap-2 px-4 py-4 border-b border-border">
          <Building2 size={20} className="text-primary" />
          <span className="font-semibold text-foreground">Diamond Residence</span>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {visible.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary text-white font-medium"
                    : "text-foreground hover:bg-card-highlight"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 text-xs text-muted-foreground mb-1">
            Signed in as
          </div>
          <div className="px-3 py-2 text-sm text-foreground font-medium">
            {user.full_name}
          </div>
          <div className="px-3 pb-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                user.role === "owner"
                  ? "bg-primary text-white"
                  : user.role === "manager"
                  ? "bg-secondary text-foreground"
                  : "bg-card-highlight text-foreground"
              )}
            >
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>
          <form action={logout} className="mt-1">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}