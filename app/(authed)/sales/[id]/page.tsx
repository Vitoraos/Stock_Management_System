"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ArrowLeft, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Sale, SaleItem } from "@/types";

interface SaleItemWithProduct extends SaleItem {
  product?: { name: string; brand: string | null; description: string | null; unit: string | null } | null;
}

interface SaleWithRelations extends Sale {
  sale_items: SaleItemWithProduct[];
  seller_name?: string;
}

export default function SalesReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const [sale, setSale] = useState<SaleWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPrinting, setIsPrinting] = useState(false);

  const fetchSale = useCallback(async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sales/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load sale");
        setSale(json.sale);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }, [params.id]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

  async function handleDownloadPDF() {
    if (!sale) return;
    setIsPrinting(true);
    try {
      const { generateReceiptPDF } = await import("@/lib/pdf/receipt");
      await generateReceiptPDF({
        sale,
        items: sale.sale_items,
        sellerName: sale.seller_name,
        hotelName: "Diamond Residence",
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF. Make sure jspdf is installed.");
    } finally {
      setIsPrinting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (isPending && !sale) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sale) return null;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} disabled={isPrinting}>
            <Download className="w-4 h-4 mr-2" />
            {isPrinting ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-bold">Diamond Residence</CardTitle>
          <p className="text-sm text-muted-foreground">Sales Receipt</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Receipt #</span>
            <span className="font-mono text-right">{sale.id.slice(0, 8).toUpperCase()}</span>

            <span className="text-muted-foreground">Date</span>
            <span className="text-right">{formatDate(sale.created_at)}</span>

            <span className="text-muted-foreground">Customer</span>
            <span className="text-right">{sale.customer_name ?? "Walk-in"}</span>

            <span className="text-muted-foreground">Cashier</span>
            <span className="text-right">{sale.seller_name ?? "—"}</span>

            <span className="text-muted-foreground">Payment</span>
            <span className="text-right uppercase">{sale.payment_method}</span>
          </div>

          <Separator />

          <div>
            <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-2">
              <span>Item</span>
              <span>Total</span>
            </div>
            <div className="space-y-3">
              {sale.sale_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-medium">
                      {item.product?.name ?? "Item"}
                    </span>
                    {item.product?.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.product.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.qty} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-medium">{formatCurrency(item.line_total)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(sale.total_amount)}</span>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Thank you for your patronage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
