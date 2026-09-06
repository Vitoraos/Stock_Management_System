import { NextRequest, NextResponse } from "next/server";
import { deleteCategory } from "@/actions/categories";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await deleteCategory(params.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
