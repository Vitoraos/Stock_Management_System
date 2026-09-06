import { NextResponse } from "next/server";
import { listLowStock } from "@/actions/products";

export async function GET() {
  const result = await listLowStock();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ products: result.products });
}
