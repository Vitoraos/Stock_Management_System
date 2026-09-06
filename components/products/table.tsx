"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, PackagePlus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductTableSkeleton } from "@/components/products/product-table-skeleton";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit: string | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category: { name: string } | null;
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setProducts(json.products ?? []);
    } catch {
      console.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    async function init() {
      try {
        const userRes = await fetch("/api/me");
        if (userRes.ok) {
          const json = await userRes.json();
          setUser(json.user);
        }
      } catch {
        // ignore
      }
      await loadProducts();
    }
    init();
  }, [loadProducts]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to deactivate this product?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "Failed to deactivate product");
      } else {
        await loadProducts();
      }
    } finally {
      setBusyId(null);
    }
  }

  const canManage = user?.role === "owner" || user?.role === "manager";

  if (loading && products.length === 0) {
    return <ProductTableSkeleton />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-2xl font-semibold">Products</CardTitle>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push("/categories")}
                >
                  Manage Categories
                </Button>
                <Button onClick={() => router.push("/products/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="pt-3 flex gap-2">
          <Input
            placeholder="Search by name, brand, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadProducts();
            }}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-card-highlight">
                <th className="p-4 text-left w-16">ID</th>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left w-32">Category</th>
                <th className="p-4 text-left w-24">Stock</th>
                <th className="p-4 text-right w-32">Cost</th>
                <th className="p-4 text-right w-32">Sell</th>
                <th className="p-4 text-left w-32">Status</th>
                {canManage && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isLow = p.quantity <= p.low_stock_threshold;
                return (
                  <tr
                    key={p.id}
                    className={`border-b last:border-none bg-card-highlight transition-colors hover:bg-muted/40 ${
                      isLow ? "ring-1 ring-amber-500/30" : ""
                    }`}
                  >
                    <td className="p-4 font-mono text-sm text-muted-foreground">
                      {p.id.slice(0, 8)}…
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      <span>{p.name}</span>
                      {p.description && (
                        <span className="block text-xs text-muted-foreground font-normal">
                          {p.description}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {p.category?.name || "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">{p.quantity}</span>
                        <span className="text-xs opacity-60">
                          /{p.low_stock_threshold}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-sm text-muted-foreground">
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      }).format(p.cost_price)}
                    </td>
                    <td className="p-4 text-right text-sm text-foreground font-medium">
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      }).format(p.selling_price)}
                    </td>
                    <td
                      className={`p-4 text-sm ${
                        isLow
                          ? "text-amber-600 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isLow ? "Low stock" : "OK"}
                    </td>
                    {canManage && (
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => router.push(`/products/${p.id}/edit`)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Stock in ${p.name}`}
                            onClick={() => router.push(`/products/${p.id}/stock-in`)}
                          >
                            <PackagePlus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === p.id}
                            onClick={() => handleDelete(p.id)}
                          >
                            {busyId === p.id ? "…" : "Delete"}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {products.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={canManage ? 9 : 8}
                    className="p-12 text-center text-muted-foreground"
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center justify-between text-sm text-muted-foreground w-full">
          <span>
            {products.length > 0
              ? `Showing ${products.length} item${products.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
