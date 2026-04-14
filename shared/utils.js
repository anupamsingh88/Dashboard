const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const P = {p:'#534AB7',pm:'#7F77DD',pl:'#AFA9EC',pp:'#EEEDFE',b:'#185FA5',bm:'#378ADD',bl:'#B5D4F4',bp:'#E6F1FB',g:'#22c55e',r:'#ef4444',a:'#f59e0b'};
const F = {family:"'Inter', sans-serif"};
const GC = '#e2e5f0';

// ═══ STATE ═══
// Assume ATT is globally available now
let filteredUIDs = Object.keys(ATT);
let sortKey = 'present', sortAsc = false;
let currentWeek = null; // Will be set dynamically
let allCharts = {};
let modalExportData = [];
let currentMemberUID = null;
let currentDateFilter = null; // null means all dates in month
let activeMonth = Object.keys(PROJECT_DATA).slice(-1)[0] || 'April'; // Default to newest month

// ═══ UTILS ═══
function attRate(m){const w=m.present+m.absent+m.leave;return w?Math.round(m.present/w*100):100}

/**
 * Get all available work-week keys for the current month's PROD data.
 * Returns sorted array like ['ww10', 'ww11', 'ww12']
 */
function getAvailableWeeks() {
  const weeks = new Set();
  if (window.PROD) {
    Object.values(window.PROD).forEach(member => {
      Object.keys(member).forEach(k => {
        if (k.startsWith('ww')) weeks.add(k);
      });
    });
  }
  return [...weeks].sort((a, b) => {
    return parseInt(a.replace('ww', '')) - parseInt(b.replace('ww', ''));
  });
}

/**
 * Calculate total AH (Additional Hours) for a member in the active month.
 * Sums all ww keys, or falls back to summing daily values.
 */
function totalAH(uid) {
  const p = window.PROD?.[uid];
  if (!p) return 0;
  // Sum all ww keys
  let total = 0;
  let hasWW = false;
  for (const [k, v] of Object.entries(p)) {
    if (k.startsWith('ww')) {
      total += v;
      hasWW = true;
    }
  }
  // Fallback: sum daily values if no ww keys
  if (!hasWW && p.daily) {
    total = Object.values(p.daily).reduce((a, b) => a + b, 0);
  }
  return +total.toFixed(1);
}

function animateCount(el, target, decimals=0, suffix=''){
  if (!el) return;
  const start = Date.now(), dur = 700, from = 0;
  const tick = ()=>{
    const p = Math.min((Date.now()-start)/dur, 1);
    const ease = 1-Math.pow(1-p,3);
    const val = from+(target-from)*ease;
    el.textContent = decimals>0 ? val.toFixed(decimals)+suffix : Math.round(val)+suffix;
    if(p<1) requestAnimationFrame(tick);
  };
  tick();
}

function mkChart(id, cfg){
  const el = document.getElementById(id);
  if(!el) return;
  const ctx=el.getContext('2d');
  if(!ctx) return;
  if(allCharts[id]) allCharts[id].destroy();
  allCharts[id] = new Chart(ctx, cfg);
  return allCharts[id];
}

/**
 * Universal CSV Export
 */
function exportToCSV(dataRows, filename) {
  if (!dataRows || !dataRows.length) return;
  const chars = dataRows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([chars], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Identify count of users who have missing attendance before 'Today'.
 */
function getMissingAttendanceCount() {
    if (!window.ATT) return 0;
    
    let missingCount = 0;
    const today = new Date();
    // Offset local timezone for ISO string
    const offset = today.getTimezoneOffset() * 60000;
    const localToday = new Date(today.getTime() - offset);
    const todayStr = localToday.toISOString().split('T')[0];
    
    for(const uid in window.ATT) {
        let memberMissing = false;
        const days = window.ATT[uid].days;
        if (!days) continue;
        
        // Corrected for...of instead of for...in
        for (const dateStr of Object.keys(days).sort()) {
            if (dateStr > todayStr) break; 
            
            const status = days[dateStr];
            if (!status || status.trim() === '' || status.trim().toLowerCase() === 'nan') {
                memberMissing = true;
                break;
            }
        }
        if (memberMissing) missingCount++;
    }
    return missingCount;
}

/**
 * Get GAMS status from the complex GAMS object.
 * Returns the highest priority task status or 'N/A'.
 */
function getGAMSStatus(uid) {
    if (!window.GAMS || !window.GAMS[uid]) return 'N/A';
    const g = window.GAMS[uid];
    if (typeof g === 'string') return g;
    
    // Priority order: status > p0_status > p1_status > p2_status
    let status = g.status || g.gams_status || g.p0_status || g.p1_status || g.p2_status;
    if (status === undefined || status === null || String(status).toLowerCase() === 'nan') {
        return 'N/A';
    }
    
    return String(status);
}
