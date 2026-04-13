import pandas as pd
import json
import os
from datetime import datetime

def process_tracker(input_file, output_js, version_file):
    """Process the Team Abhinav Attendance Tracker Excel file and generate data.js."""
    print(f"Loading {input_file}...")
    xl = pd.ExcelFile(input_file)
    
    # 1. Load FTE Details for mapping
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
    
    # Identify date columns (they are formatted as timestamps in pandas)
    date_cols = [col for col in df_att.columns if isinstance(col, datetime) or (isinstance(col, str) and col.startswith('2026-03'))]
    
    for _, row in df_att.iterrows():
        uid = str(row.get('User ID', '')).strip()
        if not uid or uid == 'nan': continue
        
        days = {}
        for col in date_cols:
            date_str = col.strftime('%Y-%m-%d') if isinstance(col, datetime) else col
            val = str(row.get(col, '')).strip()
            days[date_str] = val
            
            # Count daily presence
            if val.lower() == 'present':
                daily_present[date_str] = daily_present.get(date_str, 0) + 1
        
        att_data[uid] = {
            "name": str(row.get('Name', '')),
            "uid": uid,
            "days": days,
            "present": int(row.get('PRESENT', 0)),
            "absent": int(row.get('ABSENT', 0)),
            "leave": int(row.get('LEAVE', 0)),
            "weekoff": int(row.get('WEEK-OFF', 0)),
            "holiday": int(row.get('HOLIDAY', 0))
        }

    # 3. Load March Productivity
    # Sheet has double headers — row 0 is day names, row 1 is sub-header (Name/User ID/dates)
    df_prod = pd.read_excel(xl, 'March Productivity', header=1)
    
    # The actual column mapping:
    # 'FTE Details' => Name (row 0 is sub-header 'Name')
    # 'Unnamed: 1' => User ID
    # Date columns are datetime objects
    # Weekly totals: 'WW10 (28/02-06/03)', 'WW11 (07/03-13/03)', 'WW12 (14/03-20/03)'
    
    # Skip row 0 which is the sub-header row
    df_prod_data = df_prod.iloc[1:].copy()
    
    # Find the WW columns
    ww10_col = [c for c in df_prod.columns if 'WW10' in str(c)]
    ww11_col = [c for c in df_prod.columns if 'WW11' in str(c)]
    ww12_col = [c for c in df_prod.columns if 'WW12' in str(c)]
    
    ww10_col = ww10_col[0] if ww10_col else None
    ww11_col = ww11_col[0] if ww11_col else None
    ww12_col = ww12_col[0] if ww12_col else None
    
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
        
        prod_data[uid] = {
            "name": name,
            "ww10": round(ww10_val, 2),
            "ww11": round(ww11_val, 2),
            "ww12": round(ww12_val, 2),
            "daily": daily_ah
        }
    
    print(f"  Loaded {len(prod_data)} members from March Productivity")

    # 4. Load FEB Productivity 
    df_feb = pd.read_excel(xl, 'FEB Productivity Data', header=1)
    df_feb_data = df_feb.iloc[1:].copy()
    
    # Weekly total columns: 'Week 31/01-06/01', 'Week 07/02-13/02', 'Week 14/02-20/02', 'Week 21/02-27/02'
    week_cols = [c for c in df_feb.columns if isinstance(c, str) and c.startswith('Week')]
    
    feb_prod = {}
    for _, row in df_feb_data.iterrows():
        uid = str(row.get('Unnamed: 1', '')).strip()
        name = str(row.get('FTE Details', '')).strip()
        if not uid or uid == 'nan' or not name or name == 'nan': continue
        
        total = 0
        for wc in week_cols:
            val = row.get(wc)
            total += float(val) if pd.notna(val) else 0
        
        feb_prod[uid] = {
            "name": name,
            "total": round(total, 2)
        }
    
    print(f"  Loaded {len(feb_prod)} members from Feb Productivity")

    # 5. Load GAMS
    df_gams = pd.read_excel(xl, 'GAMS')
    gams_data = {}
    for _, row in df_gams.iterrows():
        uid = str(row.get('UID', '')).strip()
        if not uid or uid == 'nan': continue
        gams_data[uid] = str(row.get('TIMESHEET STATUS', 'Applied'))

    # 6. Calculate Leaderboards (Top 5 and Bottom 5 based on total March AH)
    sorted_players = []
    for uid, data in prod_data.items():
        total_ah = data['ww10'] + data['ww11'] + data['ww12']
        sorted_players.append({"uid": uid, "name": data['name'], "score": round(total_ah, 2)})
    
    sorted_players.sort(key=lambda x: x['score'], reverse=True)
    
    # Filter out zero-score and resigned members for a meaningful leaderboard
    active_players = [p for p in sorted_players if p['score'] > 0]
    
    top_5 = active_players[:5]
    bottom_5 = active_players[-5:] if len(active_players) >= 5 else active_players
    
    print(f"  Leaderboard: Top={[p['name'] for p in top_5]}")
    print(f"  Leaderboard: Bottom={[p['name'] for p in bottom_5]}")

    # 7. Write to JS Constants
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write(f"const ATT = {json.dumps(att_data, indent=2)};\n\n")
        f.write(f"const MARCH_PROD = {json.dumps(prod_data, indent=2)};\n\n")
        f.write(f"const FEB_PROD = {json.dumps(feb_prod, indent=2)};\n\n")
        f.write(f"const GAMS = {json.dumps(gams_data, indent=2)};\n\n")
        f.write(f"const FTE_DETAILS = {json.dumps(fte_data, indent=2)};\n\n")
        f.write(f"const DAILY_PRESENT = {json.dumps(daily_present, indent=2)};\n\n")
        f.write(f"const LEADERBOARD = {{ 'top': {json.dumps(top_5)}, 'bottom': {json.dumps(bottom_5)} }};\n")

    # 8. Update Version (Trigger for Dash Reload)
    version = {"timestamp": datetime.now().isoformat(), "file": input_file}
    with open(version_file, 'w', encoding='utf-8') as f:
        json.dump(version, f, indent=2)

    print(f"Successfully updated {output_js} and {version_file}")

if __name__ == "__main__":
    process_tracker(
        'Team Abhinav Attendance Tracker - Copy.xlsx', 
        'dashboard/shared/data.js', 
        'dashboard/shared/version.json'
    )
