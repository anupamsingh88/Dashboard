import pandas as pd
import re
from datetime import datetime
import json

file_path = r'f:\Bhino_Bhaiya\Team Abhinav Attendance Tracker - Copy.xlsx'
xl = pd.ExcelFile(file_path)

def parse_time(val):
    if pd.isna(val) or not str(val).strip():
        return None
    s = str(val).strip()
    s = s.replace('.', ':')
    num_match = re.search(r'(\d+:\d+)\s*([AP]M)?', s, re.IGNORECASE)
    if num_match:
        time_str = num_match.group(1)
        ampm = num_match.group(2)
        if ampm:
            return f"{time_str} {ampm.upper()}"
        return time_str
    return s

# 1. Test Daily Log
print("--- Daily Log ---")
df_log = pd.read_excel(xl, 'Daily Log')
# Row 0 has column names, row 1 starts data. UID in column 'Unnamed: 0', NAME 'DATE'.
for _, row in df_log.head(5).iterrows():
    uid = str(row.get('Unnamed: 0', '')).strip()
    if not uid or uid == 'UID' or uid == 'nan': continue
    print(f"UID: {uid}")
    break # Just peek

# 2. Test April AH
print("--- April AH ---")
df_ah = pd.read_excel(xl, 'April AH')
uid_col = df_ah.columns[1] # 'Unnamed: 1'
for _, row in df_ah.head(5).iterrows():
    uid = str(row.get(uid_col, '')).strip()
    if not uid or uid == 'User ID' or uid == 'nan': continue
    print(f"AH UID: {uid}, AH col3: {row.iloc[2]}")
    break

# 3. Queue Allocations
print("--- Queue Allocations ---")
df_q = pd.read_excel(xl, 'Running Queue Allocation')
q_uid_col = df_q.columns[0] # assuming NAME is first? Wait, previous look said Name, Alias Email, P0, P0 Working Status...
for _, row in df_q.head(5).iterrows():
    if row.iloc[0] == 'NAME': continue
    print(f"Queue Name: {row.iloc[0]}, P0: {row.iloc[2]}")
    break

# 4. Assessments
print("--- Assessments ---")
df_a = pd.read_excel(xl, 'Assessment Results')
for c in df_a.columns:
    print(f"Ass Col: {c}")
for _, row in df_a.head(5).iterrows():
    print(row.iloc[0], row.iloc[1])
    break
