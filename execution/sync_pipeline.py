import pandas as pd
import json
import os
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

def get_month_data(xl, month_name, fte_data):
    """Extracts attendance and productivity for a specific month with flexible column detection."""
    att_sheet = f"{month_name} Attendance"
    prod_sheet = f"{month_name} Productivity"
    gams_sheet = f"GAMS ({month_name})"
    
    # Check if sheets exist
    if att_sheet not in xl.sheet_names or prod_sheet not in xl.sheet_names:
        # Try alternate GAMS naming
        if month_name == "March" and "GAMS (March Only)" in xl.sheet_names:
            gams_sheet = "GAMS (March Only)"
        else:
            return None

    print(f"  Extracting data for {month_name}...")
    
    # 1. Attendance
    df_att = pd.read_excel(xl, att_sheet)
    att_data = {}
    daily_present = {}
    year = 2026
    month_idx = MONTHS.index(month_name) + 1
    month_prefix = f"{year}-{month_idx:02d}"
    
    date_cols = [col for col in df_att.columns if isinstance(col, datetime) or (isinstance(col, str) and col.startswith(month_prefix))]
    
    # Flexible column search for Attendance
    uid_col = next((c for c in df_att.columns if str(c).lower() in ['user id', 'uid', 'unnamed: 1']), 'User ID')
    name_col = next((c for c in df_att.columns if str(c).lower() in ['name', 'fte details', 'unnamed: 0']), 'Name')

    for _, row in df_att.iterrows():
        uid = str(row.get(uid_col, '')).strip()
        if not uid or uid == 'nan' or uid == 'User ID': continue
        days = {}
        for col in date_cols:
            date_str = col.strftime('%Y-%m-%d') if isinstance(col, datetime) else str(col)
            val = str(row.get(col, '')).strip()
            days[date_str] = val
            if val.lower() == 'present':
                daily_present[date_str] = daily_present.get(date_str, 0) + 1
        
        att_data[uid] = {
            "name": str(row.get(name_col, '')),
            "uid": uid,
            "days": days,
            "present": int(row.get('PRESENT', 0)) if pd.notna(row.get('PRESENT')) else 0,
            "absent": int(row.get('ABSENT', 0)) if pd.notna(row.get('ABSENT')) else 0,
            "leave": int(row.get('LEAVE', 0)) if pd.notna(row.get('LEAVE')) else 0,
            "weekoff": int(row.get('WEEK-OFF', 0)) if pd.notna(row.get('WEEK-OFF')) else 0,
            "holiday": int(row.get('HOLIDAY', 0)) if pd.notna(row.get('HOLIDAY')) else 0
        }

    # 2. Productivity
    # Note: Header is usually at row 1 or 2
    df_prod_raw = pd.read_excel(xl, prod_sheet, header=None)
    header_idx = 0
    for i, row in df_prod_raw.head(5).iterrows():
        if any('WW' in str(cell).upper() for cell in row):
            header_idx = i
            break
            
    df_prod = pd.read_excel(xl, prod_sheet, header=header_idx)
    
    # Flexible column search for Productivity
    p_uid_col = next((c for c in df_prod.columns if str(c).lower() in ['user id', 'uid', 'unnamed: 1']), df_prod.columns[1])
    p_name_col = next((c for c in df_prod.columns if str(c).lower() in ['name', 'fte details', 'fte name']), df_prod.columns[0])
    
    # Find WW columns dynamically (case insensitive)
    ww_cols = [c for c in df_prod.columns if 'WW' in str(c).upper()]
    
    prod_data = {}
    for _, row in df_prod.iterrows():
        uid = str(row.get(p_uid_col, '')).strip()
        name = str(row.get(p_name_col, '')).strip()
        if not uid or uid == 'nan' or uid.lower() in ['uid', 'user id'] or not name or name == 'nan': continue
        
        daily_ah = {}
        for col in df_prod.columns:
            if isinstance(col, datetime):
                date_str = col.strftime('%Y-%m-%d')
                val = row.get(col)
                daily_ah[date_str] = float(val) if pd.notna(val) else 0
        
        member_prod = {"name": name, "daily": daily_ah}
        for ww in ww_cols:
            val = float(row.get(ww, 0)) if pd.notna(row.get(ww)) else 0
            member_prod[str(ww).lower().replace(' ', '')] = round(val, 2)
            
        prod_data[uid] = member_prod

    # 3. GAMS
    gams_data = {}
    if gams_sheet in xl.sheet_names:
        df_gams = pd.read_excel(xl, gams_sheet)
        g_uid_col = next((c for c in df_gams.columns if str(c).lower() in ['uid', 'user id']), 'UID')
        g_status_col = next((c for c in df_gams.columns if 'STATUS' in str(c).upper()), 'TIMESHEET STATUS')
        gams_data = {str(row.get(g_uid_col, '')).strip(): str(row.get(g_status_col, 'Applied')) for _, row in df_gams.iterrows() if pd.notna(row.get(g_uid_col))}

    # 4. Leaderboard
    sorted_players = []
    for uid, d in prod_data.items():
        # Sum all score-like keys
        score = sum(v for k, v in d.items() if k.startswith('ww'))
        if score > 0:
            sorted_players.append({"uid": uid, "name": d['name'], "score": round(score, 2)})
            
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

    return {
        "ATT": att_data,
        "PROD": prod_data,
        "GAMS": gams_data,
        "DAILY_PRESENT": daily_present,
        "LEADERBOARD": leaderboard
    }

def process_tracker(input_file, output_js, version_file):
    print(f"Processing {input_file} for all months...")
    if not os.path.exists(input_file):
        print(f"  Error: {input_file} not found.")
        return
        
    xl = pd.ExcelFile(input_file)
    
    # FTE Details (Global)
    df_fte = pd.read_excel(xl, 'FTE Details')
    fte_data = {}
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
            if data:
                all_monthly_data[month] = data
        except Exception as e:
            print(f"  Skipping {month}: {e}")

    if not all_monthly_data:
        print("  Error: No monthly data could be extracted!")
        return

    # Write combined JS
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(f"// Generated on {datetime.now().isoformat()}\n")
        f.write(f"const FTE_DETAILS = {json.dumps(fte_data, indent=2)};\n\n")
        f.write(f"const PROJECT_DATA = {json.dumps(all_monthly_data, indent=2)};\n\n")
        
        # Backward compatibility: set the latest month as default globals
        if all_monthly_data:
            latest_month = list(all_monthly_data.keys())[-1]
            latest = all_monthly_data[latest_month]
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
    with open(version_file, 'w', encoding='utf-8') as f:
        xl.close()
    print(f"  Success! Multi-month data generated for: {', '.join(all_monthly_data.keys())}")

if __name__ == "__main__":
    if download_excel(EXCEL_URL, TEMP_FILE):
        process_tracker(TEMP_FILE, DATA_FILE, VERSION_FILE)
        if os.path.exists(TEMP_FILE):
            os.remove(TEMP_FILE)
