const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const P = {p:'#534AB7',pm:'#7F77DD',pl:'#AFA9EC',pp:'#EEEDFE',b:'#185FA5',bm:'#378ADD',bl:'#B5D4F4',bp:'#E6F1FB',g:'#22c55e',r:'#ef4444',a:'#f59e0b'};
const F = {family:"'Inter', sans-serif"};
const GC = '#e2e5f0';

// ═══ STATE ═══
// Assume ATT is globally available now
let filteredUIDs = Object.keys(ATT);
let sortKey = 'present', sortAsc = false;
let currentWeek = 'ww10';
let allCharts = {};
let modalExportData = [];
let currentMemberUID = null;

// ═══ UTILS ═══
function attRate(m){const w=m.present+m.absent+m.leave;return w?Math.round(m.present/w*100):100}

function marchAH(uid){const p=MARCH_PROD[uid];return p?+(p.ww10+p.ww11+p.ww12).toFixed(1):0}

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
