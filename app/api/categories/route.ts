import { NextRequest, NextResponse } from "next/server";
import { listCategories, createCategory } from "@/actions/categories";

export async function GET() {
  const result = await listCategories();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ categories: result.categories });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const result = await createCategory(name);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ category: result.category }, { status: 201 });
}
