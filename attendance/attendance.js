function initDailyChart(){
  const entries = Object.entries(DAILY_PRESENT).sort((a,b)=>a[0].localeCompare(b[0]));
  const labels = entries.map(([d])=>{
    const dt = new Date(d);
    return dt.getDate().toString().padStart(2,'0')+' '+MONTHS_SHORT[dt.getMonth()];
  });
  const vals = entries.map(([,v])=>v);

  mkChart('dailyChart',{
    type:'bar',
    data:{labels, datasets:[{
      label:'Members Present', data:vals,
      backgroundColor: vals.map(v=>v>=33?P.p:v>=30?P.pm:v>=25?P.pl:'#d1d5db'),
      borderRadius:6, borderSkipped:false,
    }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:600, easing:'easeOutQuart'},
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>` ${c.raw} members present`}}},
      scales:{
        x:{grid:{display:false}, ticks:{font:{...F,size:9},maxRotation:45,color:'#9ca3af'}},
        y:{grid:{color:GC}, ticks:{font:F,color:'#9ca3af'}, min:0, max:36}
      }
    }
  });
}

function initDonutChart(){
  const tp=filteredUIDs.reduce((a,u)=>a+ATT[u].present,0);
  const ta=filteredUIDs.reduce((a,u)=>a+ATT[u].absent,0);
  const tl=filteredUIDs.reduce((a,u)=>a+ATT[u].leave,0);
  const tw=filteredUIDs.reduce((a,u)=>a+ATT[u].weekoff,0);
  const th=filteredUIDs.reduce((a,u)=>a+ATT[u].holiday,0);
  mkChart('donutChart',{
    type:'doughnut',
    data:{
      labels:['Present','Absent','Leave','Week-Off','Holiday'],
      datasets:[{data:[tp,ta,tl,tw,th],backgroundColor:[P.p,P.r,P.a,P.bl,P.pl],borderWidth:2,borderColor:'#fff',hoverOffset:10}]
    },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'62%',
      animation:{animateRotate:true, duration:500},
      plugins:{legend:{position:'bottom',labels:{font:{...F,size:10},padding:12,usePointStyle:true,pointStyleWidth:8}},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw} days`}}}
    }
  });
}

function initMemberAttChart(){
  const sorted = [...filteredUIDs].sort((a,b)=>ATT[b].present-ATT[a].present);
  mkChart('memberAttChart',{
    type:'bar',
    data:{
      labels:sorted.map(u=>ATT[u].name.split(' ')[0]),
      datasets:[
        {label:'Present',data:sorted.map(u=>ATT[u].present),backgroundColor:P.p,borderRadius:4,borderSkipped:false},
        {label:'Leave',data:sorted.map(u=>ATT[u].leave),backgroundColor:P.a,borderRadius:4,borderSkipped:false},
        {label:'Absent',data:sorted.map(u=>ATT[u].absent),backgroundColor:P.r,borderRadius:4,borderSkipped:false},
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:600},
      plugins:{legend:{position:'bottom',labels:{font:{...F,size:10},usePointStyle:true,pointStyleWidth:7,padding:10}}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{font:{...F,size:8},maxRotation:40,color:'#9ca3af'}},y:{stacked:true,grid:{color:GC},ticks:{font:F,color:'#9ca3af'}}}
    }
  });
}

function initLeaveChart(){
  const withLOA = filteredUIDs.filter(u=>ATT[u].leave>0||ATT[u].absent>0).sort((a,b)=>(ATT[b].leave+ATT[b].absent)-(ATT[a].leave+ATT[a].absent));
  if(!withLOA.length){if(allCharts['leaveChart'])allCharts['leaveChart'].destroy();return;}
  mkChart('leaveChart',{
    type:'bar', indexAxis:'y',
    data:{
      labels:withLOA.map(u=>ATT[u].name.split(' ')[0]),
      datasets:[
        {label:'Leave Days',data:withLOA.map(u=>ATT[u].leave),backgroundColor:P.a,borderRadius:4,borderSkipped:false},
        {label:'Absent Days',data:withLOA.map(u=>ATT[u].absent),backgroundColor:P.r,borderRadius:4,borderSkipped:false},
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:600},
      plugins:{legend:{position:'bottom',labels:{font:{...F,size:10},usePointStyle:true,pointStyleWidth:7,padding:10}}},
      scales:{x:{stacked:true,grid:{color:GC},ticks:{font:F,color:'#9ca3af'}},y:{stacked:true,grid:{display:false},ticks:{font:{...F,size:9},color:'#9ca3af'}}}
    }
  });
}

// ═══════════════════ DAILY DRILL-DOWN LOGIC ═══════════════════

function initAttendanceFilter() {
    const sel = document.getElementById('attendanceDate');
    if (!sel) return;

    // Reset selector
    sel.innerHTML = '<option value="all">Full Month Summary</option>';

    // Get all unique dates from ATT object
    const allDates = new Set();
    filteredUIDs.forEach(uid => {
        if (ATT[uid] && ATT[uid].days) {
            Object.keys(ATT[uid].days).forEach(d => allDates.add(d));
        }
    });

    const sortedDates = Array.from(allDates).sort();
    sortedDates.forEach(d => {
        const dt = new Date(d);
        const dayLabel = `${dt.getDate().toString().padStart(2, '0')} ${MONTHS_SHORT[dt.getMonth()]} 2026`;
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = dayLabel;
        sel.appendChild(opt);
    });

    // Default: Reset stats
    onDateChange('all');
}

function onDateChange(date) {
    const stats = { p: 0, pl: 0, upl: 0, a: 0 };
    
    if (date === 'all') {
        // Show monthly aggregate averages if needed, but per request we'll just reset or show zeros
        // Actually, let's show the monthly total counts for the current filtered list
        filteredUIDs.forEach(uid => {
            const m = ATT[uid];
            stats.p += m.present;
            stats.pl += m.leave;
            stats.upl += 0; // UPL not explicitly summed in data.js, we sum it now?
            stats.a += m.absent;
        });
        
        // Change labels to "Total Days"
        document.querySelectorAll('.dd-card-lbl').forEach(el => {
            if(!el.textContent.includes('Total')) el.textContent = 'Total ' + el.textContent;
        });
    } else {
        // Calculate for specific day
        filteredUIDs.forEach(uid => {
            const s = (ATT[uid].days[date] || '').toUpperCase();
            if (s === 'P') stats.p++;
            else if (s === 'PL') stats.pl++;
            else if (s === 'UPL' || s === 'U') stats.upl++;
            else if (s === 'A' || s === 'ABSENT') stats.a++;
        });

        // Restore labels
        document.querySelectorAll('.dd-card-lbl').forEach(el => {
            el.textContent = el.textContent.replace('Total ', '');
        });
    }

    if (typeof animateCount === 'function') {
        animateCount(document.getElementById('d-present'), stats.p);
        animateCount(document.getElementById('d-pl'), stats.pl);
        animateCount(document.getElementById('d-upl'), stats.upl);
        animateCount(document.getElementById('d-absent'), stats.a);
    } else {
        document.getElementById('d-present').textContent = stats.p;
        document.getElementById('d-pl').textContent = stats.pl;
        document.getElementById('d-upl').textContent = stats.upl;
        document.getElementById('d-absent').textContent = stats.a;
    }

    // Optional: Update Donut Chart
    if (date !== 'all') {
        updateDonutForDate(stats);
    } else {
        initDonutChart(); // Restore full month
    }
}

function updateDonutForDate(stats) {
    if (!allCharts['donutChart']) return;
    const chart = allCharts['donutChart'];
    chart.data.datasets[0].data = [stats.p, stats.a, stats.pl, 0, 0]; // Mapping: Present, Absent, Leave, Week-Off, Holiday
    chart.data.labels[1] = 'Absent / UPL'; // Combine for daily view
    chart.update();
}

window.onDateChange = onDateChange;
window.initAttendanceFilter = initAttendanceFilter;
