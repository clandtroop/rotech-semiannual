// sheets: [{ name: string, rows: array of plain objects (same keys per sheet) }]
export async function exportWorkbook(sheets, fileName) {
  // Loaded on demand so the ~1MB exceljs bundle isn't shipped to every user.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, rows }) => {
    const worksheet = workbook.addWorksheet(name.slice(0, 31));
    if (rows.length === 0) return;

    worksheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 24 }));
    worksheet.addRows(rows);
    worksheet.getRow(1).font = { bold: true };
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
