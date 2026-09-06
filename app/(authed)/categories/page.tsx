"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Tag } from "lucide-react";

interface Category {
  id: string;
  name: string;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    startTransition(() => {
      load();
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setCreating(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create category");
    } else {
      setNewName("");
      setCategories((prev) => [...prev, json.category].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products using it must be reassigned first.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Failed to delete");
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Organize products into categories (e.g. Drinks, Food, Amenities, Biscuits).
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="e.g. Drinks, Snacks, Toiletries…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
              className="max-w-xs"
              disabled={creating}
            />
            <Button type="submit" disabled={creating || !newName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              {creating ? "Adding…" : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No categories yet. Add one above.</p>
            </div>
          ) : (
            <div className="divide-y">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-3"
                >
                  <span className="font-medium">{cat.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(cat.id)}
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
