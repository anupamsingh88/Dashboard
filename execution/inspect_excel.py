import pandas as pd
import sys

file_path = r'f:\Bhino_Bhaiya\Team Abhinav Attendance Tracker - Copy.xlsx'
out_path = r'f:\Bhino_Bhaiya\execution\excel_output2.txt'

try:
    xl = pd.ExcelFile(file_path)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"File: {file_path}\n")
        f.write(f"Sheet Names: {xl.sheet_names}\n\n")

        for sheet in xl.sheet_names:
            f.write(f"=== Sheet: {sheet} ===\n")
            df = pd.read_excel(xl, sheet_name=sheet, nrows=5)
            f.write(f"Shape (first 5 rows): {df.shape}\n")
            f.write("Columns:\n")
            f.write(str(df.columns.tolist()[:20]) + "\n")
            if len(df.columns) > 20:
                 f.write(f"... and {len(df.columns) - 20} more columns\n")
            
            f.write("\nFirst row sample:\n")
            if not df.empty:
                f.write(str(df.iloc[0].to_dict()) + "\n")
            else:
                f.write("Empty sheet\n")
            f.write("\n" + "="*40 + "\n\n")
except Exception as e:
    print(f"Error: {e}")
