import pandas as pd
import json
import os
import re
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

EXCEL_URL = os.getenv('EXCEL_URL', 'https://innodata-my.sharepoint.com/:x:/p/in2725/IQBWGt0zGH3_T4Judv8QK_8IAbx8oCHC7zkQNM_Ls6fAoBs?download=1')
TEMP_FILE = 'temp_tracker.xlsx'
DATA_FILE = 'shared/data.js'
VERSION_FILE = 'shared/version.json'

MONTHS = ["January", "February", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

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
    for pattern in patterns:
        for sheet in xl.sheet_names:
            if pattern.lower() == sheet.lower():
                return sheet
    return None

def safe_int(row, col_name):
    try:
        val = row.get(col_name)
        return int(val) if pd.notna(val) else 0
    except:
        return 0

def format_time(val):
    if pd.isna(val) or not str(val).strip():
        return None
    s = str(val).strip().replace('.', ':').upper()
    match = re.search(r'(\d{1,2}:\d{2})\s*([AP]M)?', s)
    if match:
        time_str = match.group(1)
        ampm = match.group(2)
        if ampm:
            return f"{time_str} {ampm}"
        return time_str
    return s

def get_month_data(xl, month_name, df_daily_log):
    att_sheet = find_sheet(xl, [f"{month_name} Attendance", f"{month_name} Att"])
    prod_sheet = find_sheet(xl, [f"{month_name} Productivity", f"{month_name} Prod"])
    gams_sheet = find_sheet(xl, [f"GAMS ({month_name})", f"GAMS ({month_name} Only)", f"GAMS"])
    ah_sheet = find_sheet(xl, [f"{month_name} AH", f"{month_name} Additional Hours"])
    
    if not att_sheet and not prod_sheet:
        return None
        
    print(f"  Extracting data for {month_name}...")
    
    year = 2026
    month_idx = MONTHS.index(month_name) + 1
    
    # ─── 1. ATTENDANCE & DAILY LOG ──────────────────────────────────────
    att_data = {}
    daily_present = {}
    
    if att_sheet:
        df_att = pd.read_excel(xl, att_sheet)
        date_cols = [c for c in df_att.columns if isinstance(c, datetime) or (isinstance(c, pd.Timestamp))]
        
        uid_col = next((c for c in df_att.columns if str(c).strip().lower() in ['user id', 'uid']), None)
        name_col = next((c for c in df_att.columns if str(c).strip().lower() in ['name', 'fte details']), None)
        
        if uid_col is None: uid_col = df_att.columns[1] if len(df_att.columns) > 1 else df_att.columns[0]
        if name_col is None: name_col = df_att.columns[0]
        
        for _, row in df_att.iterrows():
            uid = str(row.get(uid_col, '')).strip()
            if not uid or uid == 'nan' or uid.lower() in ['user id', 'uid', 'name']: continue
            name = str(row.get(name_col, '')).strip()
            
            days = {}
            daily_log = {}
            for col in date_cols:
                date_str = col.strftime('%Y-%m-%d')
                val = str(row.get(col, '')).strip()
                days[date_str] = val
                if 'present' in val.lower():
                    daily_present[date_str] = daily_present.get(date_str, 0) + 1
                    
            att_data[uid] = {
                "name": name,
                "uid": uid,
                "days": days,
                "daily_log": {}, # Will merge from df_daily_log
                "present": safe_int(row, 'PRESENT'),
                "absent": safe_int(row, 'ABSENT'),
                "leave": safe_int(row, 'LEAVE'),
                "weekoff": safe_int(row, 'WEEK-OFF'),
                "holiday": safe_int(row, 'HOLIDAY'),
            }

    # Merge Daily Log if applies to this month
    if df_daily_log is not None:
        # Expected structure: UID, DATE, [Datetime col] (Login), Unnamed (Logout), [Datetime col] (Login) ...
        # Ensure we only process if the df is populated
        uid_col_d = df_daily_log.columns[0] # Unnamed: 0
        for _, row in df_daily_log.iterrows():
            uid = str(row.get(uid_col_d, '')).strip()
            if uid in att_data:
                # Find all datetime columns that match this month
                log_cols = [c for c in df_daily_log.columns if isinstance(c, datetime)]
                for i, col in enumerate(df_daily_log.columns):
                    if isinstance(col, datetime) and col.month == month_idx:
                        date_str = col.strftime('%Y-%m-%d')
                        log_in = format_time(row[col])
                        # Next column is log out
                        log_out = None
                        if i + 1 < len(df_daily_log.columns):
                            log_out = format_time(df_daily_log.iloc[_, i+1])
                        if log_in or log_out:
                            att_data[uid]["daily_log"][date_str] = {"in": log_in, "out": log_out}

    # ─── 2. PRODUCTIVITY & ADDITIONAL HOURS ──────────────────────────────
    prod_data = {}
    if prod_sheet:
        df_raw = pd.read_excel(xl, prod_sheet, header=None)
        
        header_idx = 0
        label_idx = None
        for i, row in df_raw.iterrows():
            row_str = [str(cell).strip().upper() for cell in row if pd.notna(cell)]
            if any('NAME' in s for s in row_str) and any('USER ID' in s or 'UID' in s for s in row_str):
                header_idx = i
                label_idx = i - 1 if i > 0 else None
                break
                
        ww_col_indices = {}
        if label_idx is not None and label_idx >= 0:
            label_row = df_raw.iloc[label_idx]
            for col_idx, val in enumerate(label_row):
                if pd.notna(val):
                    match = re.search(r'(?:WW|Week)\s*(\d+)', str(val).strip(), re.IGNORECASE)
                    if match: ww_col_indices[col_idx] = f"ww{match.group(1)}"
        
        df_prod = pd.read_excel(xl, prod_sheet, header=header_idx)
        p_uid_col = next((c for c in df_prod.columns if str(c).strip().lower() in ['user id', 'uid']), None)
        if p_uid_col is None: p_uid_col = df_prod.columns[1] if len(df_prod.columns) > 1 else df_prod.columns[0]
        p_name_col = df_prod.columns[0]
        
        prod_date_cols = [c for c in df_prod.columns if isinstance(c, datetime)]
        
        for _, row in df_prod.iterrows():
            uid = str(row.get(p_uid_col, '')).strip()
            name = str(row.get(p_name_col, '')).strip()
            if not uid or uid == 'nan' or uid.lower() in ['uid', 'user id', 'name']: continue
            
            daily_ah = {}
            for col in prod_date_cols:
                date_str = col.strftime('%Y-%m-%d')
                val = row.get(col)
                if pd.notna(val):
                    num_match = re.match(r'^([\d.]+)', str(val).strip())
                    daily_ah[date_str] = round(float(num_match.group(1)), 2) if num_match else 0
                else: daily_ah[date_str] = 0
                    
            member_prod = {"name": name, "daily": daily_ah, "ah": {}}
            
            for col_idx, ww_key in ww_col_indices.items():
                raw_row_idx = _ + header_idx + 1
                if raw_row_idx < len(df_raw):
                    val = df_raw.iloc[raw_row_idx, col_idx]
                    try: member_prod[ww_key] = round(float(val), 2) if pd.notna(val) else 0
                    except: member_prod[ww_key] = 0
                else: member_prod[ww_key] = 0
            
            prod_data[uid] = member_prod

    # Add AH Data
    if ah_sheet:
        df_ah = pd.read_excel(xl, ah_sheet)
        ah_uid_col = df_ah.columns[1]
        ah_date_cols = [c for c in df_ah.columns if isinstance(c, datetime) or isinstance(c, pd.Timestamp)]
        for _, row in df_ah.iterrows():
            uid = str(row.get(ah_uid_col, '')).strip()
            if uid in prod_data:
                for col in ah_date_cols:
                    val = row.get(col)
                    date_str = col.strftime('%Y-%m-%d')
                    prod_data[uid]["ah"][date_str] = float(val) if pd.notna(val) else 0

    # ─── 3. GAMS ─────────────────────────────────────────────────────────
    gams_data = {}
    if gams_sheet:
        try:
            df_gams = pd.read_excel(xl, gams_sheet)
            g_uid_col = next((c for c in df_gams.columns if str(c).strip().lower() in ['uid', 'user id']), None)
            g_status_col = next((c for c in df_gams.columns if 'STATUS' in str(c).upper()), None)
            g_app_col = next((c for c in df_gams.columns if 'APPROVER' in str(c).upper()), None)
            
            if g_uid_col and g_status_col:
                for _, row in df_gams.iterrows():
                    uid = str(row.get(g_uid_col, '')).strip()
                    if uid and uid != 'nan':
                        gams_data[uid] = {
                            "status": str(row.get(g_status_col, 'Applied')),
                            "approver": str(row.get(g_app_col, 'Unknown')) if g_app_col else 'Unknown'
                        }
        except Exception as e:
            print(f"    GAMS warning: {e}")

    # ─── 4. LEADERBOARD ──────────────────────────────────────────────────
    sorted_players = []
    for uid, d in prod_data.items():
        ww_score = sum(v for k, v in d.items() if k.startswith('ww'))
        if ww_score == 0 and 'daily' in d: ww_score = sum(d['daily'].values())
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


def process_tracker(input_file, output_js, version_file):
    print(f"Processing {input_file}...")
    xl = pd.ExcelFile(input_file)
    
    # ─── GLOBAL DATA EXTRACTION ──────────────────────────────────────────
    fte_data = {}
    if 'FTE Details' in xl.sheet_names:
        df_fte = pd.read_excel(xl, 'FTE Details')
        for _, row in df_fte.iterrows():
            uid = str(row.get('User ID', row.get('UID', ''))).strip()
            if uid and uid != 'nan':
                fte_data[uid] = {
                    "name": str(row.get('Name', '')),
                    "batch": str(row.get('FTE Batch', 'N/A')),
                    "shift": str(row.get('Shift', 'N/A')),
                    "zoho_id": str(row.get('ZOHO ID', 'N/A')),
                    "gams_access": str(row.get('GAMS Access', 'Pending')),
                    "ia_access": str(row.get('IA Access', 'Pending')),
                    "zoho_access": str(row.get('ZOHO Access', 'Pending'))
                }

    # Queue Allocations
    queue_data = {}
    queue_sheet = find_sheet(xl, ['Running Queue Allocation'])
    if queue_sheet:
        df_q = pd.read_excel(xl, queue_sheet)
        for _, row in df_q.iterrows():
            if row.iloc[0] == 'NAME' or pd.isna(row.iloc[0]): continue
            name = str(row.iloc[0]).strip()
            # Find uid by name matching
            uid = next((k for k, v in fte_data.items() if v['name'].lower() == name.lower()), name)
            queue_data[uid] = {
                "name": name,
                "p0": str(row.iloc[2]), "p0_status": str(row.iloc[3]),
                "p1": str(row.iloc[4]), "p1_status": str(row.iloc[5]),
                "p2": str(row.iloc[6]), "p2_status": str(row.iloc[7])
            }

    # Assessments
    assessment_data = {}
    ass_sheet = find_sheet(xl, ['Assessment Results'])
    if ass_sheet:
        df_a = pd.read_excel(xl, ass_sheet)
        # Note: Depending on structure this might be Name | Status ... 
        # For simplicity, treating as direct dump in JS
        assessment_data = df_a.to_dict(orient='records')

    # Daily Log global frame
    df_daily_log = None
    if 'Daily Log' in xl.sheet_names:
        df_daily_log = pd.read_excel(xl, 'Daily Log')

    # ─── PER MONTH EXTRACTION ──────────────────────────────────────────
    all_monthly_data = {}
    for month in MONTHS:
        try:
            data = get_month_data(xl, month, df_daily_log)
            if data and (data['ATT'] or data['PROD']):
                # Inject globals into month payload
                data['QUEUE'] = queue_data
                data['ASSESSMENTS'] = assessment_data
                all_monthly_data[month] = data
                print(f"  + {month}: {len(data['ATT'])} attendance, {len(data['PROD'])} productivity records")
        except Exception as e:
            print(f"  x Skipping {month}: {e}")
            import traceback
            traceback.print_exc()

    xl.close()

    # Write JS
    os.makedirs(os.path.dirname(output_js), exist_ok=True)
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(f"// Generated on {datetime.now().isoformat()}\n")
        f.write(f"window.FTE_DETAILS = {json.dumps(fte_data, indent=2)};\n\n")
        f.write(f"window.PROJECT_DATA = {json.dumps(all_monthly_data, indent=2)};\n\n")
        
        latest_month = list(all_monthly_data.keys())[-1] if all_monthly_data else None
        if latest_month:
            f.write(f"window.ATT = window.PROJECT_DATA['{latest_month}'].ATT;\n")
            f.write(f"window.PROD = window.PROJECT_DATA['{latest_month}'].PROD;\n")
            f.write(f"window.GAMS = window.PROJECT_DATA['{latest_month}'].GAMS;\n")
            f.write(f"window.DAILY_PRESENT = window.PROJECT_DATA['{latest_month}'].DAILY_PRESENT;\n")
            f.write(f"window.LEADERBOARD = window.PROJECT_DATA['{latest_month}'].LEADERBOARD;\n")
            f.write(f"window.QUEUE = window.PROJECT_DATA['{latest_month}'].QUEUE;\n")
            f.write(f"window.ASSESSMENTS = window.PROJECT_DATA['{latest_month}'].ASSESSMENTS;\n")

    version = {
        "timestamp": datetime.now().isoformat(), 
        "available_months": list(all_monthly_data.keys()),
        "source": "Attendance Tracker Pipeline v2"
    }
    with open(version_file, 'w', encoding='utf-8') as f:
        json.dump(version, f, indent=2)
    
    print("  Success! Multi-month data generated.")

if __name__ == "__main__":
    local_file = 'f:\\Bhino_Bhaiya\\Team Abhinav Attendance Tracker - Copy.xlsx'
    if os.path.exists(local_file):
        process_tracker(local_file, DATA_FILE, VERSION_FILE)
    else:
        if download_excel(EXCEL_URL, TEMP_FILE):
            process_tracker(TEMP_FILE, DATA_FILE, VERSION_FILE)
            if os.path.exists(TEMP_FILE):
                os.remove(TEMP_FILE)
