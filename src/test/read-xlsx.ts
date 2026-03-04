import * as XLSX from "xlsx";
import * as fs from "fs";

const data = fs.readFileSync("public/LISTA_MIX_-_PRODUTOS.xlsx");
const workbook = XLSX.read(data, { type: "buffer" });

for (const name of workbook.SheetNames) {
  console.log(`\n=== Sheet: ${name} ===`);
  const sheet = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  // Print first 10 rows
  rows.slice(0, 10).forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
  });
  console.log(`Total rows: ${rows.length}`);
}
