import { NextRequest, NextResponse } from "next/server";
import { deleteProduct } from "@/actions/products";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await deleteProduct(params.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
