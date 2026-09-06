"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listSales } from "@/actions/sales";
import { listLowStock } from "@/actions/products";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Package, AlertTriangle, Receipt } from "lucide-react";

interface SaleRow {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  sale_items?: { product_id: string; qty: number; line_total: number }[];
}

interface LowStockProduct {
  id: string;
  name: string;
  quantity: number;
  low_stock_threshold: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [salesRes, lowStockRes] = await Promise.all([
        listSales({ pageSize: 500 }),
        listLowStock(),
      ]);
      if ("sales" in salesRes) setSales(salesRes.sales as SaleRow[]);
      if ("products" in lowStockRes) setLowStock(lowStockRes.products as LowStockProduct[]);
      setLoading(false);
    }
    load();
  }, []);

  const stats = computeStats(sales);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Sales, inventory, and trend overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          sub={`${stats.salesCount} sales`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Today's Sales"
          value={formatCurrency(stats.todayRevenue)}
          sub={`${stats.todayCount} transactions`}
          icon={<Receipt className="w-4 h-4" />}
        />
        <StatCard
          label="This Month"
          value={formatCurrency(stats.monthRevenue)}
          sub={`${stats.monthCount} transactions`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Low Stock"
          value={String(lowStock.length)}
          sub="items below threshold"
          icon={<AlertTriangle className="w-4 h-4" />}
          warning={lowStock.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["cash", "card", "transfer"] as const).map((method) => {
                const total = stats.byMethod[method] ?? 0;
                const pct = stats.totalRevenue > 0 ? (total / stats.totalRevenue) * 100 : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{method}</span>
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All products are above threshold.
              </p>
            ) : (
              <div className="divide-y">
                {lowStock.slice(0, 8).map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-amber-600 font-mono">
                      {p.quantity} / {p.low_stock_threshold}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sales data yet.
            </p>
          ) : (
            <div className="divide-y">
              {stats.topProducts.map((p, i) => (
                <div key={p.productId} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6">#{i + 1}</span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(p.revenue)}</div>
                    <div className="text-xs text-muted-foreground">{p.qty} sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  warning = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <span className={warning ? "text-amber-500" : "text-muted-foreground"}>{icon}</span>
        </div>
        <p className={`text-2xl font-bold ${warning ? "text-amber-600" : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function computeStats(sales: SaleRow[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalRevenue = 0;
  let todayRevenue = 0;
  let todayCount = 0;
  let monthRevenue = 0;
  let monthCount = 0;
  const byMethod: Record<string, number> = { cash: 0, card: 0, transfer: 0 };
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();

  for (const sale of sales) {
    const created = new Date(sale.created_at);
    totalRevenue += sale.total_amount;
    byMethod[sale.payment_method] = (byMethod[sale.payment_method] ?? 0) + sale.total_amount;

    if (created >= today) {
      todayRevenue += sale.total_amount;
      todayCount += 1;
    }
    if (created >= monthStart) {
      monthRevenue += sale.total_amount;
      monthCount += 1;
    }
  }

  const topProducts = Array.from(productMap.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    totalRevenue,
    salesCount: sales.length,
    todayRevenue,
    todayCount,
    monthRevenue,
    monthCount,
    byMethod,
    topProducts,
  };
}
