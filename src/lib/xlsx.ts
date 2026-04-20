"use client";

import * as XLSX from "xlsx";

export function downloadXLSX(
  filename: string,
  sheets: Array<{ name: string; rows: Array<Record<string, unknown>> }>
) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      s.name.substring(0, 31) // Excel sheet name limit
    );
  }
  const out = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, out);
}
