"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package, CreditCard, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";

interface LowStockProduct {
  id: string;
  name: string;
  quantity: number;
  low_stock_threshold: number;
}

interface RecentSale {
  id: string;
  total_amount: number;
  payment_method: string;
  customer_name: string | null;
  created_at: string;
}

interface DashboardStats {
  lowStockCount: number;
  todayRevenue: number;
  todayCount: number;
  totalProducts: number;
  recentSales: RecentSale[];
  lowStockProducts: LowStockProduct[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, productsRes, salesRes, lowStockRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/products?pageSize=100"),
          fetch("/api/sales?pageSize=5"),
          fetch("/api/products/low-stock"),
        ]);

        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        const meJson = await meRes.json();
        setUser(meJson.user);

        const products = productsRes.ok ? (await productsRes.json()).products ?? [] : [];
        const sales: RecentSale[] = salesRes.ok ? (await salesRes.json()).sales ?? [] : [];
        const lowStock: LowStockProduct[] = lowStockRes.ok ? (await lowStockRes.json()).products ?? [] : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySales = sales.filter((s) => new Date(s.created_at) >= today);

        setStats({
          lowStockCount: lowStock.length,
          todayRevenue: todaySales.reduce((a, s) => a + s.total_amount, 0),
          todayCount: todaySales.length,
          totalProducts: products.length,
          recentSales: sales.slice(0, 5),
          lowStockProducts: lowStock.slice(0, 6),
        });
      } catch {
        console.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at Diamond Residence today.
          </p>
        </div>
        <Button onClick={() => router.push("/sales/new")}>
          New Sale
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Today's Revenue"
          value={formatCurrency(stats?.todayRevenue ?? 0)}
          sub={`${stats?.todayCount ?? 0} transactions`}
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5" />}
          label="Recent Sales"
          value={String(stats?.recentSales.length ?? 0)}
          sub="last 5 transactions"
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Total Products"
          value={String(stats?.totalProducts ?? 0)}
          sub="in inventory"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Low Stock"
          value={String(stats?.lowStockCount ?? 0)}
          sub="items below threshold"
          warning={(stats?.lowStockCount ?? 0) > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/sales")}>
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No sales recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {stats?.recentSales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 border-border"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {s.customer_name ?? "Walk-in"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(s.created_at)} · {s.payment_method}
                      </p>
                    </div>
                    <span className="font-semibold text-sm">
                      {formatCurrency(s.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {stats?.lowStockCount !== undefined && stats.lowStockCount > 0 && (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              Low Stock Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/products")}>
              View products <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                All products are well stocked.
              </p>
            ) : (
              <div className="space-y-3">
                {stats?.lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 border-border"
                  >
                    <p className="text-sm font-medium">{p.name}</p>
                    <span className="text-xs font-mono text-amber-600">
                      {p.quantity} / {p.low_stock_threshold}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className={warning ? "text-amber-500" : "text-muted-foreground"}>
            {icon}
          </span>
        </div>
        <p className={`text-2xl font-bold ${warning ? "text-amber-600" : ""}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
