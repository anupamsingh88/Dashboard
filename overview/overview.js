function updateKPIs(){
  const n = filteredUIDs.length;
  const totalPresent = filteredUIDs.reduce((a,u)=>a+ATT[u].present,0);
  const totalAbsent = filteredUIDs.reduce((a,u)=>a+ATT[u].absent,0);
  const totalLeave = filteredUIDs.reduce((a,u)=>a+ATT[u].leave,0);
  const totalWorking = filteredUIDs.reduce((a,u)=>a+(ATT[u].present+ATT[u].absent+ATT[u].leave),0);
  const rate = totalWorking?Math.round(totalPresent/totalWorking*100):0;
  const avgP = n?(totalPresent/n):0;
  
  if (typeof animateCount === 'function') {
    animateCount(document.getElementById('k-members'),n);
    animateCount(document.getElementById('k-avgp'),avgP,1);
    animateCount(document.getElementById('k-rate'),rate,0,'%');
    animateCount(document.getElementById('k-leave'),totalLeave);
    animateCount(document.getElementById('k-absent'),totalAbsent);
  } else {
    document.getElementById('k-members').textContent = n;
    document.getElementById('k-avgp').textContent = avgP.toFixed(1);
    document.getElementById('k-rate').textContent = rate + '%';
    document.getElementById('k-leave').textContent = totalLeave;
    document.getElementById('k-absent').textContent = totalAbsent;
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
