const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile(process.argv[2], { cellDates: true });
  const data = {};
  
  for (const sheetName of workbook.SheetNames) {
    const json_data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, dateNF: 'yyyy-mm-dd', blankrows: false });
    
    // Filter out completely empty objects and trim spaces in keys
    const clean_data = json_data.map(row => {
        const newRow = {};
        for(const key in row) {
            if(row[key] && String(row[key]).trim() !== '') {
                newRow[key.trim()] = String(row[key]).trim();
            }
        }
        return newRow;
    }).filter(row => Object.keys(row).length > 2); // At least 2 keys with data
    
    if (clean_data.length > 0) {
        data[sheetName] = clean_data;
    }
  }
  
  fs.writeFileSync(process.argv[3], JSON.stringify(data), 'utf-8');
} catch (e) {
  fs.writeFileSync(process.argv[3], JSON.stringify({error: e.message}), 'utf-8');
}
