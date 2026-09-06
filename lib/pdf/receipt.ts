// PDF receipt generator using jspdf. Browser-only — must be called from a client component.
// Install with: npm install jspdf
//
// The receipt is laid out in 80mm thermal-printer style (matches typical POS receipts)
// but exported as a standard A4/Letter PDF that the user can print or save.

import type { Sale, SaleItem } from "@/types";

export interface ReceiptData {
  sale: Sale;
  items: (SaleItem & {
    product?: { name: string; brand: string | null; description: string | null; unit: string | null } | null;
  })[];
  sellerName?: string;
  hotelName?: string;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("generateReceiptPDF must be called in the browser");
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    unit: "mm",
    format: [80, 200], // 80mm thermal-style, height auto-extends
  });

  const pageWidth = 80;
  const margin = 4;
  let y = 6;

  // Hotel name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.hotelName ?? "Diamond Residence", pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Sales Receipt", pageWidth / 2, y, { align: "center" });
  y += 4;

  // Divider
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Meta
  doc.setFontSize(7);
  const meta: [string, string][] = [
    ["Receipt #", data.sale.id.slice(0, 8).toUpperCase()],
    ["Date", new Date(data.sale.created_at).toLocaleString()],
    ["Customer", data.sale.customer_name ?? "Walk-in"],
    ["Cashier", data.sellerName ?? "—"],
    ["Payment", data.sale.payment_method.toUpperCase()],
  ];

  for (const [k, v] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(k, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, pageWidth - margin, y, { align: "right" });
    y += 3.2;
  }

  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Item", margin, y);
  doc.text("Total", pageWidth - margin, y, { align: "right" });
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items
  doc.setFont("helvetica", "normal");
  for (const item of data.items) {
    const name = item.product?.name ?? "Item";
    const desc = item.product?.description ?? "";
    const line1 = desc ? `${name} — ${desc}` : name;
    const line2 = `${item.qty} x ${formatMoney(item.unit_price)}`;

    doc.setFont("helvetica", "bold");
    doc.text(line1.slice(0, 32), margin, y);
    doc.text(formatMoney(item.line_total), pageWidth - margin, y, { align: "right" });
    y += 3;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(line2, margin, y);
    doc.setTextColor(0);
    y += 4;
  }

  y += 1;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL", margin, y);
  doc.text(formatMoney(data.sale.total_amount), pageWidth - margin, y, { align: "right" });
  y += 6;

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text("Thank you for your patronage.", pageWidth / 2, y, { align: "center" });
  y += 3;
  doc.text("Diamond Residence — Stock Management", pageWidth / 2, y, { align: "center" });

  // Save
  const filename = `receipt-${data.sale.id.slice(0, 8)}-${new Date(data.sale.created_at)
    .toISOString()
    .slice(0, 10)}.pdf`;
  doc.save(filename);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
