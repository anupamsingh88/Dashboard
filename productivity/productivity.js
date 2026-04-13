function initWeeklyProdChart(week){
  currentWeek = week||currentWeek;
  const sorted = [...filteredUIDs].filter(u=>MARCH_PROD[u]).sort((a,b)=>MARCH_PROD[b][currentWeek]-MARCH_PROD[a][currentWeek]);
  mkChart('weeklyProdChart',{
    type:'bar',
    data:{
      labels:sorted.map(u=>MARCH_PROD[u].name.split(' ')[0]),
      datasets:[{
        label:`AH Hours (${currentWeek.toUpperCase()})`,
        data:sorted.map(u=>MARCH_PROD[u][currentWeek]),
        backgroundColor:sorted.map((u,i)=>i<3?P.p:i<7?P.pm:P.pl),
        borderRadius:6, borderSkipped:false,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:600,easing:'easeOutQuart'},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw.toFixed(1)} hrs`}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{...F,size:8.5},maxRotation:40,color:'#9ca3af'}},
        y:{grid:{color:GC},ticks:{font:F,color:'#9ca3af'},title:{display:true,text:'AH Hours',font:{...F,size:10},color:'#9ca3af'}}
      }
    }
  });
}

function selectWeek(week, el){
  document.querySelectorAll('.wtab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  initWeeklyProdChart(week);
}

function initFebProdChart(){
  const entries = Object.entries(FEB_PROD).sort((a,b)=>b[1].total-a[1].total);
  mkChart('febProdChart',{
    type:'bar',
    data:{
      labels:entries.map(([,v])=>v.name.split(' ')[0]),
      datasets:[{label:'Feb Total AH',data:entries.map(([,v])=>v.total),backgroundColor:entries.map((_,i)=>i<3?P.b:i<8?P.bm:P.bl),borderRadius:5,borderSkipped:false}]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:700},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw.toFixed(1)} hrs`}}},
      scales:{x:{grid:{display:false},ticks:{font:{...F,size:8},maxRotation:45,color:'#9ca3af'}},y:{grid:{color:GC},ticks:{font:F,color:'#9ca3af'}}}
    }
  });
}

function initWeekGroupChart(){
  const top10 = [...filteredUIDs].filter(u=>MARCH_PROD[u]).sort((a,b)=>(MARCH_PROD[b].ww10+MARCH_PROD[b].ww11+MARCH_PROD[b].ww12)-(MARCH_PROD[a].ww10+MARCH_PROD[a].ww11+MARCH_PROD[a].ww12)).slice(0,10);
  mkChart('weekGroupChart',{
    type:'bar',
    data:{
      labels:top10.map(u=>MARCH_PROD[u].name.split(' ')[0]),
      datasets:[
        {label:'WW10',data:top10.map(u=>MARCH_PROD[u].ww10),backgroundColor:P.pl,borderRadius:3,borderSkipped:false},
        {label:'WW11',data:top10.map(u=>MARCH_PROD[u].ww11),backgroundColor:P.pm,borderRadius:3,borderSkipped:false},
        {label:'WW12',data:top10.map(u=>MARCH_PROD[u].ww12),backgroundColor:P.p,borderRadius:3,borderSkipped:false},
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:600},
      plugins:{legend:{position:'bottom',labels:{font:{...F,size:9},usePointStyle:true,pointStyleWidth:7,padding:8}}},
      scales:{x:{grid:{display:false},ticks:{font:{...F,size:8.5},maxRotation:35,color:'#9ca3af'}},y:{grid:{color:GC},ticks:{font:F,color:'#9ca3af'}}}
    }
  });
}

function updateCharts(){
  if (typeof initDonutChart === 'function') {
      initDonutChart(); 
      initMemberAttChart(); 
      initLeaveChart(); 
  }
  initWeeklyProdChart(); 
  initWeekGroupChart();
}
