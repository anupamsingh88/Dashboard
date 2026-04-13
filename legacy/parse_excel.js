const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile(process.argv[2], { cellDates: true });
  const data = {};
  
  for (const sheetName of workbook.SheetNames) {
    const json_data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, dateNF: 'yyyy-mm-dd' });
    data[sheetName] = json_data;
  }
  
  fs.writeFileSync(process.argv[3], JSON.stringify(data, null, 2), 'utf-8');
} catch (e) {
  fs.writeFileSync(process.argv[3], JSON.stringify({error: e.message}), 'utf-8');
}
