"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit: string | null;
  selling_price: number;
  quantity: number;
}

interface CartItem {
  product: Product;
  qty: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setLoadingProducts(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/products?pageSize=500"),
          fetch("/api/categories"),
        ]);
        if (prodRes.ok) {
          const json = await prodRes.json();
          setProducts(json.products ?? []);
        }
        if (catRes.ok) {
          const json = await catRes.json();
          setCategories(json.categories ?? []);
        }
      } catch {
        setError("Failed to load products");
      }
      setLoadingProducts(false);
    });
  }, []);

  // Client-side filter for instant feedback
  const visible = products.filter((p) => {
    if (selectedCategory && p.id && !categories.some((c) => c.id === selectedCategory)) {
      // category may not be on product shape — fall back to fetching by category id
    }
    if (search) {
      const q = search.toLowerCase();
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesBrand = p.brand?.toLowerCase().includes(q) ?? false;
      const matchesDesc = p.description?.toLowerCase().includes(q) ?? false;
      if (!matchesName && !matchesBrand && !matchesDesc) return false;
    }
    if (selectedCategory) {
      // @ts-expect-error — category may be joined in product response
      const cat = p.category;
      if (cat?.id !== selectedCategory && p.id && !cat) return false;
    }
    return true;
  });

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.qty + 1 > product.quantity) return prev;
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId
            ? { ...c, qty: Math.max(0, c.qty + delta) }
            : c
        )
        .filter((c) => c.qty > 0)
    );
  }

  const total = cart.reduce(
    (sum, c) => sum + c.qty * c.product.selling_price,
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.length) {
      setError("Add at least one item to the sale.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName || null,
          paymentMethod,
          items: cart.map((c) => ({
            productId: c.product.id,
            qty: c.qty,
            unitPrice: c.product.selling_price,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sale failed");
      router.push(`/sales/${json.sale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsSubmitting(false);
    }
  }

  const cardClass =
    "border border-border rounded-lg bg-card p-4 shadow-sm";
  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50";
  const labelClass = "block text-sm font-medium text-foreground mb-1";
  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors";
  const btnOutline =
    "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Sale</h1>
        <p className="text-sm text-muted-foreground">Record a new transaction</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className={cardClass}>
            <h3 className="text-sm font-semibold mb-3">Customer Info</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Customer Name (optional)</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Method</label>
                <select
                  className={inputClass}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-sm font-semibold mb-3">Products</h3>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Search by name, brand, or description…"
                className={inputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {categories.length > 0 && (
                <select
                  className={inputClass}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            {loadingProducts ? (
              <p className="text-sm text-muted-foreground">Loading products…</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {visible.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.brand && <span>{p.brand}</span>}
                        {p.brand && <span>•</span>}
                        <span>
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          }).format(p.selling_price)}
                        </span>
                        <span>•</span>
                        <span className={p.quantity <= 3 ? "text-amber-500" : ""}>
                          {p.quantity} in stock
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={p.quantity === 0}
                      className={btnOutline + " px-3 py-1 text-xs shrink-0"}
                    >
                      + Add
                    </button>
                  </div>
                ))}
                {visible.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No products match your search.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className={cardClass}>
            <h3 className="text-sm font-semibold mb-3">Cart</h3>
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Cart is empty — add products from the left.
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((c) => (
                  <div key={c.product.id} className="flex items-center justify-between">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium truncate">{c.product.name}</p>
                      {c.product.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {c.product.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {c.qty} ×{" "}
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(c.product.selling_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQty(c.product.id, -1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center text-sm hover:bg-muted transition-colors"
                      >
                        −
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{c.qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(c.product.id, 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center text-sm hover:bg-muted transition-colors"
                      >
                        +
                      </button>
                      <span className="text-sm font-medium w-20 text-right">
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(c.qty * c.product.selling_price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(c.product.id)}
                        className="text-xs text-red-500 hover:text-red-400 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={cardClass + " border-primary/30 bg-primary/5"}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Total ({cart.length} item{cart.length !== 1 ? "s" : ""})
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {paymentMethod}
              </span>
            </div>
            <p className="text-3xl font-bold">
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(total)}
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || cart.length === 0}
            className={btnPrimary + " w-full h-11 text-base"}
          >
            {isSubmitting ? "Processing…" : `Complete Sale — ${new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
            }).format(total)}`}
          </button>
        </div>
      </div>
    </form>
  );
}
