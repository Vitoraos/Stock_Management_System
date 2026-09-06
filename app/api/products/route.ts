import { NextRequest, NextResponse } from "next/server";
import { listProducts, createProduct } from "@/actions/products";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const result = await listProducts({
    onlyActive: true,
    search,
    categoryId,
    pageSize: 500,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ products: result.products, total: result.total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    categoryId,
    supplierId,
    name,
    brand,
    description,
    unit,
    costPrice,
    sellingPrice,
    quantity,
    lowStockThreshold,
  } = body;

  if (!categoryId || !name) {
    return NextResponse.json(
      { error: "categoryId and name are required" },
      { status: 400 }
    );
  }

  const result = await createProduct(
    categoryId,
    supplierId ?? null,
    name,
    brand ?? null,
    description ?? null,
    unit ?? null,
    Number(costPrice),
    Number(sellingPrice),
    Number(quantity ?? 0),
    Number(lowStockThreshold ?? 0)
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ product: result.product }, { status: 201 });
}

