import pandas as pd
import json
import os
import re
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load env variables if running locally
load_dotenv()

EXCEL_URL = os.getenv('EXCEL_URL', 'https://innodata-my.sharepoint.com/:x:/p/in2725/IQBWGt0zGH3_T4Judv8QK_8IAbx8oCHC7zkQNM_Ls6fAoBs?download=1')
TEMP_FILE = 'temp_tracker.xlsx'
DATA_FILE = 'shared/data.js'
VERSION_FILE = 'shared/version.json'

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

def download_excel(url, output_path):
    print(f"Downloading from SharePoint...")
    try:
        if 'download=1' not in url:
            separator = '&' if '?' in url else '?'
            url = f"{url}{separator}download=1"
            
        header = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        r = requests.get(url, headers=header, allow_redirects=True)
        r.raise_for_status()
        with open(output_path, 'wb') as f:
            f.write(r.content)
        print(f"  Download complete: {len(r.content)} bytes")
        return True
    except Exception as e:
        print(f"  Error downloading: {e}")
        return False


def find_sheet(xl, patterns):
    """Find a sheet name matching any of the given patterns (case-insensitive)."""
    for pattern in patterns:
        for sheet in xl.sheet_names:
            if pattern.lower() == sheet.lower():
                return sheet
    return None


def get_month_data(xl, month_name, fte_data):
    """Extracts attendance and productivity for a specific month with flexible column detection."""
    
    # Try various sheet naming conventions
    att_patterns = [f"{month_name} Attendance", f"{month_name} Att", f"{month_name}Attendance"]
    prod_patterns = [f"{month_name} Productivity", f"{month_name} Prod", f"{month_name}Productivity"]
    gams_patterns = [f"GAMS ({month_name})", f"GAMS ({month_name} Only)", f"GAMS"]
    
    att_sheet = find_sheet(xl, att_patterns)
    prod_sheet = find_sheet(xl, prod_patterns)
    gams_sheet = find_sheet(xl, gams_patterns)
    
    if not att_sheet and not prod_sheet:
        return None
    
    print(f"  Extracting data for {month_name}...")
    if att_sheet: print(f"    Attendance sheet: '{att_sheet}'")
    if prod_sheet: print(f"    Productivity sheet: '{prod_sheet}'")
    
    year = 2026
    month_idx = MONTHS.index(month_name) + 1
    
    # ──────────────────────────────────────
    # 1. ATTENDANCE
    # ──────────────────────────────────────
    att_data = {}
    daily_present = {}
    
    if att_sheet:
        df_att = pd.read_excel(xl, att_sheet)
        
        # Find date columns (datetime objects or strings with dates)
        date_cols = []
        for col in df_att.columns:
            if isinstance(col, datetime):
                date_cols.append(col)
            elif isinstance(col, str):
                # Try to parse date strings
                try:
                    dt = pd.to_datetime(col)
                    if dt.month == month_idx and dt.year == year:
                        date_cols.append(col)
                except:
                    pass
        
        # Flexible column search for name/uid
        uid_col = next((c for c in df_att.columns if str(c).strip().lower() in ['user id', 'uid']), None)
        name_col = next((c for c in df_att.columns if str(c).strip().lower() in ['name', 'fte details']), None)
        
        # Fallback: try column positions if names don't match
        if uid_col is None:
            for i, c in enumerate(df_att.columns):
                if i == 1 and 'unnamed' in str(c).lower():
                    uid_col = c
                    break
            if uid_col is None:
                uid_col = df_att.columns[1] if len(df_att.columns) > 1 else df_att.columns[0]
        if name_col is None:
            name_col = df_att.columns[0]
        
        print(f"    Attendance: {len(date_cols)} date columns, uid_col='{uid_col}', name_col='{name_col}'")
        
        for _, row in df_att.iterrows():
            uid = str(row.get(uid_col, '')).strip()
            if not uid or uid == 'nan' or uid.lower() in ['user id', 'uid', 'name']: 
                continue
            
            name = str(row.get(name_col, '')).strip()
            if not name or name == 'nan':
                continue
                
            days = {}
            present_count = 0
            absent_count = 0
            leave_count = 0
            weekoff_count = 0
            holiday_count = 0

            for col in date_cols:
                if isinstance(col, datetime):
                    date_str = col.strftime('%Y-%m-%d')
                else:
                    date_str = str(col)
                    
                val = str(row.get(col, '')).strip()
                days[date_str] = val
                
                sl = val.lower()
                if 'present' in sl:
                    present_count += 1
                    daily_present[date_str] = daily_present.get(date_str, 0) + 1
                elif 'absent' in sl:
                    absent_count += 1
                elif 'pl' in sl or 'leave' in sl or 'upl' in sl:
                    leave_count += 1
                elif 'weekoff' in sl or 'week-off' in sl or 'week off' in sl:
                    weekoff_count += 1
                elif 'holiday' in sl:
                    holiday_count += 1
            
            # Use calculated counts, fall back to summary columns if counts are all zero
            att_data[uid] = {
                "name": name,
                "uid": uid,
                "days": days,
                "present": present_count if present_count > 0 else safe_int(row, 'PRESENT'),
                "absent": absent_count if absent_count > 0 else safe_int(row, 'ABSENT'),
                "leave": leave_count if leave_count > 0 else safe_int(row, 'LEAVE'),
                "weekoff": weekoff_count if weekoff_count > 0 else safe_int(row, 'WEEK-OFF'),
                "holiday": holiday_count if holiday_count > 0 else safe_int(row, 'HOLIDAY')
            }

    # ──────────────────────────────────────
    # 2. PRODUCTIVITY (two-row header)
    # ──────────────────────────────────────
    prod_data = {}
    
    if prod_sheet:
        df_raw = pd.read_excel(xl, prod_sheet, header=None)
        
        # Find the actual data header row (contains "Name" / "User ID" and dates)
        header_idx = 0
        label_idx = None  # Row above header that has WW labels
        
        for i, row in df_raw.iterrows():
            row_str = [str(cell).strip().upper() for cell in row if pd.notna(cell)]
            # Look for the row that has "NAME" and "USER ID" — this is the data header
            if any('NAME' in s for s in row_str) and any('USER ID' in s or 'UID' in s for s in row_str):
                header_idx = i
                label_idx = i - 1 if i > 0 else None
                break
        
        print(f"    Productivity: header at row {header_idx}, label row at {label_idx}")
        
        # Extract WW column info from the label row (row above the header)
        ww_col_indices = {}  # {column_index: "ww10", "ww11", etc.}
        if label_idx is not None and label_idx >= 0:
            label_row = df_raw.iloc[label_idx]
            for col_idx, val in enumerate(label_row):
                if pd.notna(val):
                    val_str = str(val).strip()
                    # Match patterns like "WW10 (28/02-06/03)", "Week 14", "WW 14", etc.
                    match = re.search(r'(?:WW|Week)\s*(\d+)', val_str, re.IGNORECASE)
                    if match:
                        ww_key = f"ww{match.group(1)}"
                        ww_col_indices[col_idx] = ww_key
                        print(f"      Found WW column: col {col_idx} -> {ww_key} ('{val_str}')")
        
        # Parse with the detected header row
        df_prod = pd.read_excel(xl, prod_sheet, header=header_idx)
        
        # Find name and uid columns
        p_uid_col = next((c for c in df_prod.columns if str(c).strip().lower() in ['user id', 'uid']), None)
        p_name_col = next((c for c in df_prod.columns if str(c).strip().lower() in ['name', 'fte details', 'fte name']), None)
        
        if p_uid_col is None:
            p_uid_col = df_prod.columns[1] if len(df_prod.columns) > 1 else df_prod.columns[0]
        if p_name_col is None:
            p_name_col = df_prod.columns[0]
        
        # Find date columns in productivity
        prod_date_cols = []
        for col in df_prod.columns:
            if isinstance(col, datetime):
                prod_date_cols.append(col)
        
        for _, row in df_prod.iterrows():
            uid = str(row.get(p_uid_col, '')).strip()
            name = str(row.get(p_name_col, '')).strip()
            if not uid or uid == 'nan' or uid.lower() in ['uid', 'user id', 'name']:
                continue
            if not name or name == 'nan' or 'TOTAL' in name.upper():
                continue
            
            # Daily AH data
            daily_ah = {}
            for col in prod_date_cols:
                date_str = col.strftime('%Y-%m-%d')
                val = row.get(col)
                try:
                    # Handle values like "16 (capped)" by extracting the number
                    if pd.notna(val):
                        val_str = str(val).strip()
                        num_match = re.match(r'^([\d.]+)', val_str)
                        daily_ah[date_str] = round(float(num_match.group(1)), 2) if num_match else 0
                    else:
                        daily_ah[date_str] = 0
                except (ValueError, TypeError):
                    daily_ah[date_str] = 0
            
            member_prod = {"name": name, "daily": daily_ah}
            
            # WW summary values — use column indices from the label row  
            # The WW columns in the data rows are at the same column positions as in the label row
            for col_idx, ww_key in ww_col_indices.items():
                if col_idx < len(df_raw.columns):
                    # Get the value from the raw dataframe since the header mangling may have changed column names
                    # We need to find the corresponding row index in the raw dataframe
                    raw_row_idx = _ + header_idx + 1  # offset by header
                    if raw_row_idx < len(df_raw):
                        val = df_raw.iloc[raw_row_idx, col_idx]
                        try:
                            member_prod[ww_key] = round(float(val), 2) if pd.notna(val) else 0
                        except (ValueError, TypeError):
                            member_prod[ww_key] = 0
                    else:
                        member_prod[ww_key] = 0
            
            prod_data[uid] = member_prod
        
        print(f"    Productivity: {len(prod_data)} members, WW keys: {list(ww_col_indices.values())}")

    # ──────────────────────────────────────
    # 3. GAMS
    # ──────────────────────────────────────
    gams_data = {}
    if gams_sheet and gams_sheet in xl.sheet_names:
        try:
            df_gams = pd.read_excel(xl, gams_sheet)
            g_uid_col = next((c for c in df_gams.columns if str(c).strip().lower() in ['uid', 'user id']), None)
            g_status_col = next((c for c in df_gams.columns if 'STATUS' in str(c).upper()), None)
            if g_uid_col and g_status_col:
                for _, row in df_gams.iterrows():
                    uid = str(row.get(g_uid_col, '')).strip()
                    if uid and uid != 'nan':
                        gams_data[uid] = str(row.get(g_status_col, 'Applied'))
        except Exception as e:
            print(f"    GAMS extraction warning: {e}")

    # ──────────────────────────────────────
    # 4. LEADERBOARD (based on WW totals or daily totals)
    # ──────────────────────────────────────
    sorted_players = []
    for uid, d in prod_data.items():
        # Sum all ww keys
        ww_score = sum(v for k, v in d.items() if k.startswith('ww'))
        # If no ww keys, sum daily values
        if ww_score == 0 and 'daily' in d:
            ww_score = sum(d['daily'].values())
        if ww_score > 0:
            sorted_players.append({"uid": uid, "name": d['name'], "score": round(ww_score, 2)})
            
    sorted_players.sort(key=lambda x: x['score'], reverse=True)
    leaderboard = { 
        'top': sorted_players[:5], 
        'bottom': sorted_players[-5:][::-1] if len(sorted_players) >= 5 else sorted_players[::-1]
    }

    return {
        "ATT": att_data,
        "PROD": prod_data,
        "GAMS": gams_data,
        "DAILY_PRESENT": daily_present,
        "LEADERBOARD": leaderboard
    }


def safe_int(row, col_name):
    """Safely extract an integer from a row, returning 0 on failure."""
    try:
        val = row.get(col_name)
        return int(val) if pd.notna(val) else 0
    except:
        return 0


def process_tracker(input_file, output_js, version_file):
    print(f"Processing {input_file} for all months...")
    if not os.path.exists(input_file):
        print(f"  Error: {input_file} not found.")
        return
        
    xl = pd.ExcelFile(input_file)
    print(f"  Available sheets: {xl.sheet_names}")
    
    # FTE Details (Global)
    fte_data = {}
    if 'FTE Details' in xl.sheet_names:
        df_fte = pd.read_excel(xl, 'FTE Details')
        for _, row in df_fte.iterrows():
            uid = str(row.get('User ID', row.get('UID', ''))).strip()
            if uid and uid != 'nan':
                fte_data[uid] = {
                    "batch": str(row.get('Batch', 'N/A')),
                    "shift": str(row.get('Shift', 'N/A'))
                }

    all_monthly_data = {}
    for month in MONTHS:
        try:
            data = get_month_data(xl, month, fte_data)
            if data and (data['ATT'] or data['PROD']):
                all_monthly_data[month] = data
                print(f"  + {month}: {len(data['ATT'])} attendance, {len(data['PROD'])} productivity records")
        except Exception as e:
            print(f"  x Skipping {month}: {e}")
            import traceback
            traceback.print_exc()

    xl.close()

    if not all_monthly_data:
        print("  Error: No monthly data could be extracted!")
        return

    # Write combined JS
    os.makedirs(os.path.dirname(output_js), exist_ok=True)
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(f"// Generated on {datetime.now().isoformat()}\n")
        f.write(f"const FTE_DETAILS = {json.dumps(fte_data, indent=2)};\n\n")
        f.write(f"const PROJECT_DATA = {json.dumps(all_monthly_data, indent=2)};\n\n")
        
        # Set the latest month as default globals
        latest_month = list(all_monthly_data.keys())[-1]
        f.write(f"// Defaulting to {latest_month} for backward compatibility\n")
        f.write(f"let ATT = PROJECT_DATA['{latest_month}'].ATT;\n")
        f.write(f"let PROD = PROJECT_DATA['{latest_month}'].PROD;\n")
        f.write(f"let GAMS = PROJECT_DATA['{latest_month}'].GAMS;\n")
        f.write(f"let DAILY_PRESENT = PROJECT_DATA['{latest_month}'].DAILY_PRESENT;\n")
        f.write(f"let LEADERBOARD = PROJECT_DATA['{latest_month}'].LEADERBOARD;\n")

    # Update Version
    version = {
        "timestamp": datetime.now().isoformat(), 
        "available_months": list(all_monthly_data.keys()),
        "source": "SharePoint Online Multi-Month"
    }
    os.makedirs(os.path.dirname(version_file), exist_ok=True)
    with open(version_file, 'w', encoding='utf-8') as f:
        json.dump(version, f, indent=2)
    
    print(f"  Success! Multi-month data generated for: {', '.join(all_monthly_data.keys())}")

if __name__ == "__main__":
    if download_excel(EXCEL_URL, TEMP_FILE):
        process_tracker(TEMP_FILE, DATA_FILE, VERSION_FILE)
        if os.path.exists(TEMP_FILE):
            os.remove(TEMP_FILE)
