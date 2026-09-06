"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    brand: "",
    description: "",
    unit: "",
    costPrice: "",
    sellingPrice: "",
    quantity: "0",
    lowStockThreshold: "5",
    categoryId: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((json) => {
        setCategories(json.categories ?? []);
        if (json.categories?.length) setForm((f) => ({ ...f, categoryId: json.categories[0].id }));
      });
  }, []);

  async function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const json = await res.json();
    if (res.ok) {
      setCategories((prev) =>
        [...prev, json.category].sort((a, b) => a.name.localeCompare(b.name))
      );
      setForm((f) => ({ ...f, categoryId: json.category.id }));
      setNewCategory("");
    } else {
      setError(json.error ?? "Failed to create category");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Product name is required");
    if (!form.categoryId) return setError("Please choose a category");
    const cost = Number(form.costPrice);
    const sell = Number(form.sellingPrice);
    if (Number.isNaN(cost) || cost < 0) return setError("Invalid cost price");
    if (Number.isNaN(sell) || sell < 0) return setError("Invalid selling price");
    const qty = Number(form.quantity);
    const threshold = Number(form.lowStockThreshold);
    if (Number.isNaN(qty) || qty < 0) return setError("Invalid quantity");
    if (Number.isNaN(threshold) || threshold < 0) return setError("Invalid threshold");

    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: form.categoryId,
          supplierId: null,
          name: form.name,
          brand: form.brand || null,
          description: form.description || null,
          unit: form.unit || null,
          costPrice: cost,
          sellingPrice: sell,
          quantity: qty,
          lowStockThreshold: threshold,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create product");
      router.push("/products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setSubmitting(false);
    }
  }

  const labelClass = "block text-sm font-medium text-foreground mb-1";
  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Product</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-500 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Coca-Cola 50cl, Digestive Biscuit"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Brand</label>
                <Input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Coca-Cola, McVitie's…"
                />
              </div>

              <div>
                <label className={labelClass}>Unit</label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="bottle, pack, sachet…"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Variations, size, contents — e.g. '50cl glass bottle, 12-pack box'"
                  className={inputClass + " min-h-[80px]"}
                  maxLength={500}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Category *</label>
                <div className="flex gap-2">
                  <select
                    className={inputClass}
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select a category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Or add a new category…"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addCategory} disabled={!newCategory.trim()}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No categories yet. Add one above (e.g. Drinks, Food, Amenities).
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Cost Price (₦) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Selling Price (₦) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Initial Quantity</label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Low Stock Alert At</label>
                <Input
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Triggers a low-stock alert when stock ≤ this number.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Create Product"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
