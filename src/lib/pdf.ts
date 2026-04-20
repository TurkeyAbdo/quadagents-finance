"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type {
  CompanySettings,
  Invoice,
  InvoiceItem,
  Client,
} from "./types";

interface GenerateInvoicePDFArgs {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client | null;
  company: CompanySettings | null;
}

export function generateInvoicePDF({
  invoice,
  items,
  client,
  company,
}: GenerateInvoicePDFArgs) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header band
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(company?.name || "QuadAgents Group", margin, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("INVOICE", pageWidth - margin, 42, { align: "right" });

  // Body start
  let y = 100;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(invoice.invoice_number, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Brand: ${invoice.brand}`, margin, y + 16);
  doc.text(
    `Status: ${invoice.status.toUpperCase()}`,
    margin,
    y + 32
  );

  // Company block (right)
  const rightX = pageWidth - margin;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(company?.name || "QuadAgents Group", rightX, y, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const companyLines: string[] = [];
  if (company?.address) companyLines.push(company.address);
  if (company?.tax_id) companyLines.push(`Tax ID: ${company.tax_id}`);
  companyLines.forEach((line, i) =>
    doc.text(line, rightX, y + 16 + i * 14, { align: "right" })
  );

  // Client + dates
  y += 80;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text("Bill To", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(client?.name || "—", margin, y + 16);
  doc.setTextColor(100, 116, 139);
  const clientBits: string[] = [];
  if (client?.email) clientBits.push(client.email);
  if (client?.phone) clientBits.push(client.phone);
  if (client?.address) clientBits.push(client.address);
  clientBits.forEach((line, i) =>
    doc.text(line, margin, y + 32 + i * 14)
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Issue Date", rightX - 120, y);
  doc.text("Due Date", rightX, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(
    format(new Date(invoice.issue_date), "MMM d, yyyy"),
    rightX - 120,
    y + 16
  );
  doc.text(
    format(new Date(invoice.due_date), "MMM d, yyyy"),
    rightX,
    y + 16,
    { align: "right" }
  );

  // Line items table
  const tableStartY = y + 90;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: items.map((it) => [
      it.description,
      String(it.quantity),
      Number(it.unit_price).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      }),
      Number(it.total).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      }),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      halign: "left",
    },
    styles: { fontSize: 10, cellPadding: 8 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 60 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 90 },
    },
    margin: { left: margin, right: margin },
  });

  // Totals block
  // @ts-expect-error jspdf-autotable extends doc with lastAutoTable
  const tableEndY = doc.lastAutoTable?.finalY ?? tableStartY + 100;
  const totalsX = pageWidth - margin - 180;
  const valuesX = pageWidth - margin;
  let ty = tableEndY + 24;

  const cur = invoice.currency;
  const fmt = (n: number) =>
    `${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${cur}`;

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", totalsX, ty);
  doc.setTextColor(15, 23, 42);
  doc.text(fmt(invoice.subtotal), valuesX, ty, { align: "right" });
  ty += 16;

  doc.setTextColor(100, 116, 139);
  doc.text(`Tax (${Number(invoice.tax_rate).toFixed(2)}%)`, totalsX, ty);
  doc.setTextColor(15, 23, 42);
  doc.text(fmt(invoice.tax_amount), valuesX, ty, { align: "right" });
  ty += 20;

  doc.setDrawColor(226, 232, 240);
  doc.line(totalsX, ty - 6, valuesX, ty - 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Total", totalsX, ty + 6);
  doc.text(fmt(invoice.total), valuesX, ty + 6, { align: "right" });

  if (cur !== "SDG") {
    ty += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `SDG equivalent: ${Number(invoice.sdg_total).toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })} SDG`,
      valuesX,
      ty + 6,
      { align: "right" }
    );
  }

  // Notes
  if (invoice.notes) {
    const nY = ty + 50;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Notes", margin, nY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const split = doc.splitTextToSize(invoice.notes, pageWidth - margin * 2);
    doc.text(split, margin, nY + 16);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated ${format(new Date(), "MMM d, yyyy")}`,
    margin,
    doc.internal.pageSize.getHeight() - 20
  );

  doc.save(`${invoice.invoice_number}.pdf`);
}
