// Colors mirror the app's own Tailwind palette so the exported file reads
// like an extension of the dashboards (blue-900 header, green/yellow/gray
// status badges, green/red deltas).
const HEADER_FILL = 'FF1E3A8A';
const HEADER_FONT = 'FFFFFFFF';
const BAND_FILL = 'FFF8FAFC';
const BORDER_COLOR = 'FFE2E8F0';

const STATUS_STYLES = {
  complete: { fill: 'FFBBF7D0', font: 'FF166534', label: 'Complete' },
  partial: { fill: 'FFFEF08A', font: 'FF854D0E', label: 'Partial' },
  pending: { fill: 'FFE5E7EB', font: 'FF1F2937', label: 'Pending' },
};

const THIN_BORDER = { style: 'thin', color: { argb: BORDER_COLOR } };

// sheets: [{ name, rows, columnTypes? }]
// columnTypes: { [headerKey]: 'percent' | 'status' | 'delta' | 'submitted' }
//   percent   - numeric 0-100, rendered as a real Excel percentage
//   status    - 'complete' | 'partial' | 'pending', shaded to match the app's badges
//   delta     - signed numeric point change, colored green (up) / red (down)
//   submitted - 'Submitted' | 'Not Submitted', shaded green / gray
export async function exportWorkbook(sheets, fileName) {
  // Loaded on demand so the ~1MB exceljs bundle isn't shipped to every user.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, rows, columnTypes = {} }) => {
    const worksheet = workbook.addWorksheet(name.slice(0, 31));
    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    worksheet.columns = headers.map((key) => {
      let width = Math.min(Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 4, 40);
      // ExcelJS silently drops a column's width from the file when it's
      // exactly the integer 9 (reproduced in isolation) - nudge clear of it.
      if (width === 9) width = 9.5;
      return { header: key, key, width };
    });
    worksheet.addRows(rows);

    // Header row: bold white-on-blue, frozen, with filter dropdowns.
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: HEADER_FONT } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.alignment = { vertical: 'middle' };
      cell.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
    });
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

    // Data rows: borders, banding, and per-column conditional formatting.
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const isBanded = r % 2 === 0;

      headers.forEach((key, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
        if (isBanded) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND_FILL } };
        }

        const type = columnTypes[key];
        if (type === 'percent' && typeof cell.value === 'number') {
          cell.value = cell.value / 100;
          cell.numFmt = '0%';
          cell.alignment = { horizontal: 'right' };
        } else if (type === 'delta' && typeof cell.value === 'number') {
          cell.numFmt = '+0" pts";-0" pts";0" pts"';
          cell.font = { bold: true, color: { argb: cell.value >= 0 ? 'FF15803D' : 'FFB91C1C' } };
          cell.alignment = { horizontal: 'right' };
        } else if (type === 'status') {
          const style = STATUS_STYLES[cell.value] || STATUS_STYLES.pending;
          cell.value = style.label;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
          cell.font = { bold: true, color: { argb: style.font } };
          cell.alignment = { horizontal: 'center' };
        } else if (type === 'submitted') {
          const isSubmitted = cell.value === 'Submitted';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isSubmitted ? 'FFBBF7D0' : 'FFE5E7EB' },
          };
          cell.font = { bold: true, color: { argb: isSubmitted ? 'FF166534' : 'FF6B7280' } };
          cell.alignment = { horizontal: 'center' };
        }
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
