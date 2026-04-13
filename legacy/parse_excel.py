import sys
import json
from datetime import datetime

def parse_excel(file_path, out_file):
    try:
        import openpyxl
        wb = openpyxl.load_workbook(file_path, data_only=True)
        data = {}
        
        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows = list(sheet.rows)
            if not rows:
                data[sheet_name] = []
                continue
                
            headers = []
            for cell in rows[0]:
                val = cell.value if cell.value is not None else ""
                headers.append(str(val).strip())
                
            sheet_data = []
            for row in rows[1:]:
                row_dict = {}
                is_empty = True
                for idx, cell in enumerate(row):
                    if idx < len(headers):
                        val = cell.value
                        if isinstance(val, datetime):
                            val = val.strftime('%Y-%m-%d')
                        elif val is None:
                            val = ""
                        else:
                            is_empty = False
                        row_dict[headers[idx]] = val
                if not is_empty:
                    sheet_data.append(row_dict)
                    
            data[sheet_name] = sheet_data
            
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
    except Exception as e:
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump({"error": str(e)}, f, indent=2)

if __name__ == "__main__":
    parse_excel(sys.argv[1], sys.argv[2])
