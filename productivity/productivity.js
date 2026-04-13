/**
 * Builds the week selector tabs dynamically based on available WW keys.
 */
function buildWeekTabs() {
  const container = document.getElementById('weekTabsContainer');
  if (!container) return;
  
  const weeks = getAvailableWeeks();
  if (weeks.length === 0) {
    container.innerHTML = '<span class="wtab active" style="opacity:0.5">No week data</span>';
    return;
  }
  
  container.innerHTML = weeks.map((wk, i) => {
    const num = wk.replace('ww', '');
    const isActive = (currentWeek === wk) || (!currentWeek && i === weeks.length - 1);
    return `<span class="wtab${isActive ? ' active' : ''}" onclick="selectWeek('${wk}',this)">WW${num}</span>`;
  }).join('');
  
  // Set currentWeek to latest if not set
  if (!currentWeek || !weeks.includes(currentWeek)) {
    currentWeek = weeks[weeks.length - 1];
  }
}

function initWeeklyProdChart(week) {
  currentWeek = week || currentWeek;
  const weeks = getAvailableWeeks();
  if (!currentWeek && weeks.length > 0) currentWeek = weeks[weeks.length - 1];
  if (!currentWeek) return;
  
  const sorted = [...filteredUIDs]
    .filter(u => PROD[u] && PROD[u][currentWeek] !== undefined)
    .sort((a, b) => (PROD[b][currentWeek] || 0) - (PROD[a][currentWeek] || 0));
  
  if (sorted.length === 0) return;
  
  mkChart('weeklyProdChart', {
    type: 'bar',
    data: {
      labels: sorted.map(u => PROD[u].name.split(' ')[0]),
      datasets: [{
        label: `AH Hours (${currentWeek.toUpperCase()})`,
        data: sorted.map(u => PROD[u][currentWeek] || 0),
        backgroundColor: sorted.map((u, i) => i < 3 ? P.p : i < 7 ? P.pm : P.pl),
        borderRadius: 6, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: {duration: 600, easing: 'easeOutQuart'},
      plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => ` ${c.raw.toFixed(1)} hrs`}}},
      scales: {
        x: {grid: {display: false}, ticks: {font: {...F, size: 8.5}, maxRotation: 40, color: '#9ca3af'}},
        y: {grid: {color: GC}, ticks: {font: F, color: '#9ca3af'}, title: {display: true, text: 'AH Hours', font: {...F, size: 10}, color: '#9ca3af'}}
      }
    }
  });
}

function selectWeek(week, el) {
  document.querySelectorAll('.wtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  initWeeklyProdChart(week);
}

function initWeekGroupChart() {
  const weeks = getAvailableWeeks();
  if (weeks.length === 0) return;
  
  // Calculate total across all weeks for sorting
  const top10 = [...filteredUIDs]
    .filter(u => PROD[u])
    .sort((a, b) => {
      const sumB = weeks.reduce((acc, wk) => acc + (PROD[b][wk] || 0), 0);
      const sumA = weeks.reduce((acc, wk) => acc + (PROD[a][wk] || 0), 0);
      return sumB - sumA;
    })
    .slice(0, 10);
  
  if (top10.length === 0) return;
  
  // Color palette for datasets
  const colors = [P.pl, P.pm, P.p, P.bm, P.bl, P.b];
  
  const datasets = weeks.map((wk, i) => ({
    label: wk.toUpperCase(),
    data: top10.map(u => PROD[u]?.[wk] || 0),
    backgroundColor: colors[i % colors.length],
    borderRadius: 3, borderSkipped: false
  }));
  
  // Update title
  const title = document.getElementById('weekGroupTitle');
  if (title) title.textContent = `${activeMonth} Weekly Totals (Top 10)`;
  
  mkChart('weekGroupChart', {
    type: 'bar',
    data: {
      labels: top10.map(u => PROD[u].name.split(' ')[0]),
      datasets
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: {duration: 600},
      plugins: {legend: {position: 'bottom', labels: {font: {...F, size: 9}, usePointStyle: true, pointStyleWidth: 7, padding: 8}}},
      scales: {x: {grid: {display: false}, ticks: {font: {...F, size: 8.5}, maxRotation: 35, color: '#9ca3af'}}, y: {grid: {color: GC}, ticks: {font: F, color: '#9ca3af'}}}
    }
  });
}

function updateCharts() {
  if (typeof initDonutChart === 'function') {
    initDonutChart();
    initMemberAttChart();
    initLeaveChart();
  }
  buildWeekTabs();
  initWeeklyProdChart();
  initWeekGroupChart();
}
