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
