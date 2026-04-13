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
let activeMonth = Object.keys(PROJECT_DATA).slice(-1)[0] || 'March'; // Default to latest month

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
