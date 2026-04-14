/* ═══════════════════════════════════════════════════
   SIDEBAR — Init, Filters & Mobile Toggle
   ═══════════════════════════════════════════════════ */

function initSidebar() {
  const mSel = document.getElementById('filterMember');
  if (!mSel) return;
  
  // Clear existing except first
  mSel.innerHTML = '<option value="all">All Members</option>';
  
  const currentATT = window.ATT || {};
  Object.keys(currentATT).sort((a,b)=>currentATT[a].name.localeCompare(currentATT[b].name)).forEach(uid=>{
    const o = document.createElement('option'); 
    o.value=uid; 
    o.textContent=currentATT[uid].name; 
    mSel.appendChild(o);
  });

  const bSel = document.getElementById('filterBatch');
  if (bSel) {
    bSel.innerHTML = '<option value="all">All Batches</option>';
    const currentFTE = window.FTE_DETAILS || {};
    const batches = [...new Set(Object.values(currentFTE).map(f=>f.batch))].filter(b => b && b !== 'nan').sort();
    batches.forEach(b=>{ 
      const o=document.createElement('option');
      o.value=b;
      o.textContent=b;
      bSel.appendChild(o); 
    });
  }
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
    window.currentMemberUID = mf;
    if (typeof showMemberProfile === 'function') {
      showMemberProfile(mf);
    }
    return;
  }
  window.currentMemberUID = null;
  const viewAll = document.getElementById('view-all');
  const memberProfile = document.getElementById('member-profile');
  if (viewAll) viewAll.style.display = '';
  if (memberProfile) memberProfile.style.display = 'none';
  
  const hdrTitle = document.getElementById('hdr-title');
  if (hdrTitle) hdrTitle.textContent = 'Team Abhinav — Attendance & Productivity';
  
  const activeATT = window.ATT || {};
  const activeFTEs = Object.keys(activeATT).length;
  const hdrSub = document.getElementById('hdr-sub');
  if (hdrSub) hdrSub.textContent = `${activeMonth} 2026 · ${activeFTEs} Active FTEs · All Shifts 8AM–4PM`;

  window.filteredUIDs = Object.keys(activeATT).filter(uid=>{
    const m = activeATT[uid];
    if(sf==='perfect' && (m.absent>0||m.leave>0)) return false;
    if(sf==='absent' && m.absent===0) return false;
    if(sf==='leave' && m.leave===0) return false;
    if(bf!=='all' && (window.FTE_DETAILS[uid]?.batch||'N/A')!==bf) return false;
    return true;
  });
  
  updateKPIs(); 
  if (typeof updateCharts === 'function') updateCharts(); 
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderQueue === 'function') renderQueue();
  if (typeof renderAssessments === 'function') renderAssessments();
}

function resetFilters(){
  const mf = document.getElementById('filterMember');
  const sf = document.getElementById('filterStatus');
  const bf = document.getElementById('filterBatch');
  if (mf) mf.value='all';
  if (sf) sf.value='all';
  if (bf) bf.value='all';
  
  window.filteredUIDs = Object.keys(window.ATT || {});
  window.currentMemberUID = null;
  
  const viewAll = document.getElementById('view-all');
  const memberProfile = document.getElementById('member-profile');
  if (viewAll) viewAll.style.display='';
  if (memberProfile) memberProfile.style.display='none';
  
  const hdrTitle = document.getElementById('hdr-title');
  if (hdrTitle) hdrTitle.textContent='Team Abhinav — Attendance & Productivity';
  
  const activeFTEs = Object.keys(window.ATT || {}).length;
  const hdrSub = document.getElementById('hdr-sub');
  if (hdrSub) hdrSub.textContent = `${activeMonth} 2026 · ${activeFTEs} Active FTEs · All Shifts 8AM–4PM`;
  
  updateKPIs(); 
  if (typeof updateCharts === 'function') updateCharts(); 
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderQueue === 'function') renderQueue();
  if (typeof renderAssessments === 'function') renderAssessments();

  // Auto-close sidebar on mobile after reset
  if (window.innerWidth <= 768) closeSidebar();
}

/**
 * Sync sidebar active state with scroll position
 */
function initScrollspy() {
  const sections = [
    { id: 'overview-container', nav: 'overview' },
    { id: 'attendance-container', nav: 'attendance' },
    { id: 'productivity-container', nav: 'productivity' },
    { id: 'gams-container', nav: 'gams' },
    { id: 'queue-container', nav: 'queue' },
    { id: 'assessments-container', nav: 'assessments' }
  ];

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    // If tracking member profile, don't update scrollspy
    if (window.currentMemberUID) return;
    
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      let activeNav = 'overview'; // Default to first
      
      // Find the lowest section that has scrolled past the upper 40% of the viewport
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.4) {
            activeNav = s.nav;
          }
        }
      }
      updateActiveNavItem(activeNav);
    }, 50); // Small debounce for performance
  });
}

function updateActiveNavItem(navName) {
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    const isMatch = item.getAttribute('data-section') === navName;
    item.classList.toggle('active', isMatch);
  });
}
