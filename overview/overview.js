function updateKPIs(){
  const n = filteredUIDs.length;
  const totalPresent = filteredUIDs.reduce((a,u)=>a+ATT[u].present,0);
  const totalAbsent = filteredUIDs.reduce((a,u)=>a+ATT[u].absent,0);
  const totalLeave = filteredUIDs.reduce((a,u)=>a+ATT[u].leave,0);
  const totalWorking = filteredUIDs.reduce((a,u)=>a+(ATT[u].present+ATT[u].absent+ATT[u].leave),0);
  const rate = totalWorking?Math.round(totalPresent/totalWorking*100):0;
  
  // Calculate Missing Access
  let missingAccessCount = 0;
  filteredUIDs.forEach(uid => {
      const fte = FTE_DETAILS[uid];
      if (fte) {
          if (fte.gams_access?.toLowerCase() !== 'done' || 
              fte.ia_access?.toLowerCase() !== 'done' || 
              fte.zoho_access?.toLowerCase() !== 'done') {
              missingAccessCount++;
          }
      }
  });

  // Calculate Missing Attendance
  // using utility function
  const missingAttCount = typeof getMissingAttendanceCount === 'function' ? getMissingAttendanceCount() : 0;
  
  if (typeof animateCount === 'function') {
    animateCount(document.getElementById('k-members'),n);
    animateCount(document.getElementById('k-access'),missingAccessCount);
    animateCount(document.getElementById('k-missing-att'),missingAttCount);
    animateCount(document.getElementById('k-rate'),rate,0,'%');
    animateCount(document.getElementById('k-leave'),totalLeave);
  } else {
    document.getElementById('k-members').textContent = n;
    document.getElementById('k-access').textContent = missingAccessCount;
    document.getElementById('k-missing-att').textContent = missingAttCount;
    document.getElementById('k-rate').textContent = rate + '%';
    document.getElementById('k-leave').textContent = totalLeave;
  }

  // Render Leaderboards
  renderLeaderboards();
}

function renderLeaderboards() {
  const topList = document.getElementById('top-performers-list');
  const bottomList = document.getElementById('bottom-performers-list');
  
  if (!topList || !bottomList || typeof LEADERBOARD === 'undefined') return;

  const renderItems = (items, container, isTop) => {
    container.innerHTML = items.map((item, index) => `
      <div class="leader-item animate-fade-in" style="animation-delay: ${index * 0.1}s">
        <div class="leader-info">
          <span class="leader-rank">${isTop ? '#' + (index + 1) : '⚠️'}</span>
          <span class="leader-name">${item.name}</span>
        </div>
        <div class="leader-score">${item.score.toFixed(1)} AH</div>
      </div>
    `).join('');
  };

  renderItems(LEADERBOARD.top, topList, true);
  renderItems(LEADERBOARD.bottom, bottomList, false);
}
