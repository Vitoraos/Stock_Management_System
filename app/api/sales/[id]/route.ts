import { NextRequest, NextResponse } from "next/server";
import { getSaleById } from "@/actions/sales";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await getSaleById(params.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
