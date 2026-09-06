"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Receipt, ChevronRight } from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { listSales } from "@/actions/sales";

interface SaleRow {
  id: string;
  customer_name: string | null;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  seller?: { full_name: string } | null;
  sale_items?: { id: string }[];
}

export default function SalesListPage() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const res = await listSales({
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
    if ("sales" in res) setSales(res.sales as SaleRow[]);
    setLoading(false);
  }

  useEffect(() => {
    startTransition(() => {
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    load();
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setTimeout(load, 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sales</h1>
          <p className="text-sm text-muted-foreground">View and manage recorded sales</p>
        </div>
        <Button onClick={() => router.push("/sales/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Sale
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={applyFilters}>Apply</Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No sales recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {sales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/sales/${s.id}`)}
                  className="w-full text-left flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-md"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{s.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">
                        {s.customer_name ?? "Walk-in customer"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateShort(s.created_at)}</span>
                      <span>•</span>
                      <span className="uppercase">{s.payment_method}</span>
                      <span>•</span>
                      <span>{s.sale_items?.length ?? 0} item(s)</span>
                      {s.seller?.full_name && (
                        <>
                          <span>•</span>
                          <span>{s.seller.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(s.total_amount)}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
