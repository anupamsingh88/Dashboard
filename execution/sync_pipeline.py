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
DATA_FILE = 'dashboard/shared/data.js'
VERSION_FILE = 'dashboard/shared/version.json'

def download_excel(url, output_path):
    print(f"Downloading from SharePoint...")
    try:
        # Use a download=1 flag to force direct download if not already present
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

def process_tracker(input_file, output_js, version_file):
    """Process the Team Abhinav Attendance Tracker Excel file and generate data.js."""
    print(f"Processing {input_file}...")
    if not os.path.exists(input_file):
        print(f"  Error: {input_file} not found.")
        return
        
    xl = pd.ExcelFile(input_file)
    
    # 1. Load FTE Details
    df_fte = pd.read_excel(xl, 'FTE Details')
    fte_data = {}
    for _, row in df_fte.iterrows():
        uid = str(row.get('User ID', row.get('UID', ''))).strip()
        if uid and uid != 'nan':
            fte_data[uid] = {
                "batch": str(row.get('Batch', 'N/A')),
                "shift": str(row.get('Shift', 'N/A'))
            }

    # 2. Load Attendance
    df_att = pd.read_excel(xl, 'March Attendance')
    att_data = {}
    daily_present = {}
    date_cols = [col for col in df_att.columns if isinstance(col, datetime) or (isinstance(col, str) and col.startswith('2026-03'))]
    
    for _, row in df_att.iterrows():
        uid = str(row.get('User ID', '')).strip()
        if not uid or uid == 'nan': continue
        days = {}
        for col in date_cols:
            date_str = col.strftime('%Y-%m-%d') if isinstance(col, datetime) else col
            val = str(row.get(col, '')).strip()
            days[date_str] = val
            if val.lower() == 'present':
                daily_present[date_str] = daily_present.get(date_str, 0) + 1
        
        att_data[uid] = {
            "name": str(row.get('Name', '')),
            "uid": uid,
            "days": days,
            "present": int(row.get('PRESENT', 0)) if pd.notna(row.get('PRESENT')) else 0,
            "absent": int(row.get('ABSENT', 0)) if pd.notna(row.get('ABSENT')) else 0,
            "leave": int(row.get('LEAVE', 0)) if pd.notna(row.get('LEAVE')) else 0,
            "weekoff": int(row.get('WEEK-OFF', 0)) if pd.notna(row.get('WEEK-OFF')) else 0,
            "holiday": int(row.get('HOLIDAY', 0)) if pd.notna(row.get('HOLIDAY')) else 0
        }

    # 3. Load March Productivity
    df_prod = pd.read_excel(xl, 'March Productivity', header=1)
    df_prod_data = df_prod.iloc[1:].copy()
    ww10_col = next((c for c in df_prod.columns if 'WW10' in str(c)), None)
    ww11_col = next((c for c in df_prod.columns if 'WW11' in str(c)), None)
    ww12_col = next((c for c in df_prod.columns if 'WW12' in str(c)), None)
    
    prod_data = {}
    for _, row in df_prod_data.iterrows():
        uid = str(row.get('Unnamed: 1', '')).strip()
        name = str(row.get('FTE Details', '')).strip()
        if not uid or uid == 'nan' or not name or name == 'nan': continue
        daily_ah = {}
        for col in df_prod.columns:
            if isinstance(col, datetime):
                date_str = col.strftime('%Y-%m-%d')
                val = row.get(col)
                daily_ah[date_str] = float(val) if pd.notna(val) else 0
        
        ww10_val = float(row.get(ww10_col, 0)) if ww10_col and pd.notna(row.get(ww10_col)) else 0
        ww11_val = float(row.get(ww11_col, 0)) if ww11_col and pd.notna(row.get(ww11_col)) else 0
        ww12_val = float(row.get(ww12_col, 0)) if ww12_col and pd.notna(row.get(ww12_col)) else 0
        prod_data[uid] = {"name": name, "ww10": round(ww10_val, 2), "ww11": round(ww11_val, 2), "ww12": round(ww12_val, 2), "daily": daily_ah}

    # 4. Load GAMS & Leadboard... (truncated logic for brevity but kept functional)
    df_gams = pd.read_excel(xl, 'GAMS')
    gams_data = {str(row.get('UID', '')).strip(): str(row.get('TIMESHEET STATUS', 'Applied')) for _, row in df_gams.iterrows() if pd.notna(row.get('UID'))}

    # Leaderboard
    sorted_players = [{"uid": uid, "name": d['name'], "score": round(d['ww10'] + d['ww11'] + d['ww12'], 2)} for uid, d in prod_data.items() if (d['ww10'] + d['ww11'] + d['ww12']) > 0]
    sorted_players.sort(key=lambda x: x['score'], reverse=True)
    leaderboard = { 'top': sorted_players[:5], 'bottom': sorted_players[-5:] if len(sorted_players) >= 5 else sorted_players }

    # Write JS
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(f"const ATT = {json.dumps(att_data, indent=2)};\n\n")
        f.write(f"const MARCH_PROD = {json.dumps(prod_data, indent=2)};\n\n")
        f.write(f"const GAMS = {json.dumps(gams_data, indent=2)};\n\n")
        f.write(f"const FTE_DETAILS = {json.dumps(fte_data, indent=2)};\n\n")
        f.write(f"const DAILY_PRESENT = {json.dumps(daily_present, indent=2)};\n\n")
        f.write(f"const LEADERBOARD = {json.dumps(leaderboard, indent=2)};\n")

    # Update Version
    version = {"timestamp": datetime.now().isoformat(), "source": "SharePoint Online"}
    with open(version_file, 'w', encoding='utf-8') as f:
        json.dump(version, f, indent=2)
    print(f"  Success! Dashboard updated.")

if __name__ == "__main__":
    if download_excel(EXCEL_URL, TEMP_FILE):
        process_tracker(TEMP_FILE, DATA_FILE, VERSION_FILE)
        if os.path.exists(TEMP_FILE):
            os.remove(TEMP_FILE)
