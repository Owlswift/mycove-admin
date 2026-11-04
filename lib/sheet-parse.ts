import { parseCsv } from './csv-parse';

/** True for the handful of bytes that start every .xlsx (and .xls) file, regardless of what extension it was saved/renamed with. */
function looksLikeSpreadsheetBinary(bytes: Uint8Array): boolean {
  // .xlsx (and .xlsm/.xlsb) is a zip: "PK\x03\x04". Legacy .xls is an OLE compound file.
  return (
    (bytes[0] === 0x50 && bytes[1] === 0x4b) ||
    (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0)
  );
}

/**
 * Reads an uploaded file into a table of rows/cells, whether it's a real
 * CSV or an Excel workbook (.xlsx/.xls) — including one saved with a
 * `.csv` extension by mistake, which we detect from the file's actual
 * bytes rather than trusting the name.
 */
export async function parseSpreadsheet(file: File): Promise<string[][]> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const isExcelExtension = /\.xlsx?$/i.test(file.name);

  if (isExcelExtension || looksLikeSpreadsheetBinary(buffer)) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, defval: '' }).map((row) =>
      row.map((cell) => String(cell ?? '').trim()),
    );
  }

  const text = new TextDecoder('utf-8').decode(buffer);
  return parseCsv(text);
}
