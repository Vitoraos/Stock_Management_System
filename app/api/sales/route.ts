import { NextRequest, NextResponse } from "next/server";
import { createSale } from "@/actions/sales";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, paymentMethod, items } = body;

  const result = await createSale(
    customerName,
    paymentMethod,
    items
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ sale: result.sale }, { status: 201 });
}
