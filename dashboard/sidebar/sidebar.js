/* ═══════════════════════════════════════════════════
   SIDEBAR — Init, Filters & Mobile Toggle
   ═══════════════════════════════════════════════════ */

function initSidebar() {
  const mSel = document.getElementById('filterMember');
  Object.keys(ATT).sort((a,b)=>ATT[a].name.localeCompare(ATT[b].name)).forEach(uid=>{
    const o = document.createElement('option'); 
    o.value=uid; 
    o.textContent=ATT[uid].name; 
    mSel.appendChild(o);
  });
  const bSel = document.getElementById('filterBatch');
  const batches = [...new Set(Object.values(FTE_DETAILS).map(f=>f.batch))].sort();
  batches.forEach(b=>{ 
    const o=document.createElement('option');
    o.value=b;
    o.textContent=b;
    bSel.appendChild(o); 
  });
}

/* ─── Mobile sidebar toggle ─── */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const btn = document.getElementById('hamburgerBtn');
  if (!sb) return;

  const isOpen = sb.classList.toggle('open');
  if (btn) btn.classList.toggle('open', isOpen);
  if (backdrop) {
    if (isOpen) {
      backdrop.style.display = 'block';
      requestAnimationFrame(() => backdrop.classList.add('visible'));
    } else {
      backdrop.classList.remove('visible');
      setTimeout(() => { backdrop.style.display = 'none'; }, 350);
    }
  }
  // Prevent body scroll when sidebar is open on mobile
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const btn = document.getElementById('hamburgerBtn');
  if (!sb) return;

  sb.classList.remove('open');
  if (btn) btn.classList.remove('open');
  if (backdrop) {
    backdrop.classList.remove('visible');
    setTimeout(() => { backdrop.style.display = 'none'; }, 350);
  }
  document.body.style.overflow = '';
}

/* ─── Filters ─── */
function applyFilters(){
  const mf = document.getElementById('filterMember').value;
  const sf = document.getElementById('filterStatus').value;
  const bf = document.getElementById('filterBatch').value;

  // Auto-close sidebar on mobile after filter selection
  if (window.innerWidth <= 768) closeSidebar();

  if(mf !== 'all'){
    currentMemberUID = mf;
    if (typeof showMemberProfile === 'function') {
      showMemberProfile(mf);
    }
    return;
  }
  currentMemberUID = null;
  document.getElementById('view-all').style.display = '';
  document.getElementById('member-profile').style.display = 'none';
  document.getElementById('hdr-title').textContent = 'Team Abhinav — Attendance & Productivity';
  document.getElementById('hdr-sub').textContent = 'March 2026 · 35 Active FTEs · All Shifts 8AM–4PM';

  filteredUIDs = Object.keys(ATT).filter(uid=>{
    const m = ATT[uid];
    if(sf==='perfect' && (m.absent>0||m.leave>0)) return false;
    if(sf==='absent' && m.absent===0) return false;
    if(sf==='leave' && m.leave===0) return false;
    if(bf!=='all' && (FTE_DETAILS[uid]?.batch||'N/A')!==bf) return false;
    return true;
  });
  updateKPIs(); updateCharts(); renderTable();
}

function resetFilters(){
  document.getElementById('filterMember').value='all';
  document.getElementById('filterStatus').value='all';
  document.getElementById('filterBatch').value='all';
  filteredUIDs = Object.keys(ATT);
  currentMemberUID = null;
  document.getElementById('view-all').style.display='';
  document.getElementById('member-profile').style.display='none';
  document.getElementById('hdr-title').textContent='Team Abhinav — Attendance & Productivity';
  document.getElementById('hdr-sub').textContent='March 2026 · 35 Active FTEs · All Shifts 8AM–4PM';
  updateKPIs(); updateCharts(); renderTable();

  // Auto-close sidebar on mobile after reset
  if (window.innerWidth <= 768) closeSidebar();
}
