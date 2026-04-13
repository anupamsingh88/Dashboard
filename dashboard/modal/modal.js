function openModal(type){
  if(currentMemberUID) return; 
  const modal=document.getElementById('modal');
  const bg=document.getElementById('modalBg');
  const body=document.getElementById('modalBody');
  const title=document.getElementById('modalTitle');
  const sub=document.getElementById('modalSub');
  modalExportData=[];

  if(type==='present'){
    title.textContent='Attendance Detail — All Members';
    sub.textContent='Sorted by days present, highest to lowest';
    const sorted=[...filteredUIDs].sort((a,b)=>ATT[b].present-ATT[a].present);
    modalExportData=sorted.map(u=>({Name:ATT[u].name,UID:u,'Days Present':ATT[u].present,'Att. Rate':attRate(ATT[u])+'%'}));
    body.innerHTML=`<table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--bg)">
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em">Rank</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em">Member</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em">User ID</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em">Present</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em">Rate</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.08em">Batch</th>
      </tr></thead>
      <tbody>${sorted.map((u,i)=>{
        const m=ATT[u], rate=attRate(m);
        const rclr=rate===100?'#166534':rate>=90?P.p:'#92400e';
        const rbg=rate===100?'#dcfce7':rate>=90?P.pp:'#fef3c7';
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;font-size:13px;color:var(--txt3);font-weight:700">#${i+1}</td>
          <td style="padding:9px 12px;font-size:13px;font-weight:600">${m.name}</td>
          <td style="padding:9px 12px;font-size:12px;font-family:'JetBrains Mono',monospace;color:${P.p}">${u}</td>
          <td style="padding:9px 12px;text-align:center;font-size:14px;font-weight:800;color:${P.p}">${m.present}</td>
          <td style="padding:9px 12px;text-align:center"><span style="background:${rbg};color:${rclr};padding:3px 10px;border-radius:20px;font-size:13px;font-weight:700">${rate}%</span></td>
          <td style="padding:9px 12px;text-align:center;font-size:13px;color:var(--txt2)">${FTE_DETAILS[u]?.batch||'N/A'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } else if(type==='absent'){
    title.textContent='Absence Report — All Members';
    sub.textContent='Members with unplanned absences, highest first';
    const sorted=[...filteredUIDs].filter(u=>ATT[u].absent>0).sort((a,b)=>ATT[b].absent-ATT[a].absent);
    if(!sorted.length){body.innerHTML='<p style="padding:20px;text-align:center;color:var(--txt3)">🎉 No absences in current filter!</p>';bg.classList.add('open');return;}
    modalExportData=sorted.map(u=>({Name:ATT[u].name,UID:u,'Absent Days':ATT[u].absent}));
    body.innerHTML=`<table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--bg)">
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase">Member</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase">Absent Days</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase">Absent Dates</th>
      </tr></thead>
      <tbody>${sorted.map(u=>{
        const m=ATT[u];
        const absentDates=Object.entries(m.days).filter(([d,s])=>s.toLowerCase().includes('absent')).map(([d])=>{
          const dt=new Date(d); return dt.getDate().toString().padStart(2,'0')+' '+MONTHS_SHORT[dt.getMonth()];
        }).join(', ');
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;font-size:13px;font-weight:600">${m.name}</td>
          <td style="padding:9px 12px;text-align:center"><span style="background:#fee2e2;color:#991b1b;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:800">${m.absent}</span></td>
          <td style="padding:9px 12px;font-size:13px;color:#991b1b">${absentDates||'—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } else if(type==='leave'){
    title.textContent='Leave Summary — All Members';
    sub.textContent='Members with planned leave, highest first';
    const sorted=[...filteredUIDs].filter(u=>ATT[u].leave>0).sort((a,b)=>ATT[b].leave-ATT[a].leave);
    modalExportData=sorted.map(u=>({Name:ATT[u].name,UID:u,'Leave Days':ATT[u].leave}));
    body.innerHTML=`<table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--bg)">
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase">Member</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase">Leave Days</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--txt3);text-transform:uppercase">Leave Dates</th>
      </tr></thead>
      <tbody>${sorted.map(u=>{
        const m=ATT[u];
        const leaveDates=Object.entries(m.days).filter(([d,s])=>s.toLowerCase().includes('pl')||s.toLowerCase().includes('leave')).map(([d])=>{
          const dt=new Date(d); return dt.getDate().toString().padStart(2,'0')+' '+MONTHS_SHORT[dt.getMonth()];
        }).join(', ');
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;font-size:13px;font-weight:600">${m.name}</td>
          <td style="padding:9px 12px;text-align:center"><span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:800">${m.leave}</span></td>
          <td style="padding:9px 12px;font-size:13px;color:#92400e">${leaveDates||'—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } else if(type==='rate'){
    title.textContent='Attendance Rate — All Members';
    sub.textContent='Percentage of working days attended';
    const sorted=[...filteredUIDs].sort((a,b)=>attRate(ATT[b])-attRate(ATT[a]));
    modalExportData=sorted.map(u=>({Name:ATT[u].name,UID:u,'Att. Rate':attRate(ATT[u])+'%',Present:ATT[u].present}));
    body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:4px">
      ${sorted.map(u=>{
        const m=ATT[u],rate=attRate(m);
        const clr=rate===100?'#166534':rate>=90?P.p:'#92400e';
        const bg=rate===100?'#dcfce7':rate>=90?P.pp:'#fef3c7';
        return `<div style="background:var(--bg);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px">
          <div style="width:44px;height:44px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${clr};flex-shrink:0">${rate}%</div>
          <div><div style="font-size:13px;font-weight:600">${m.name}</div><div style="font-size:12px;color:var(--txt3);margin-top:2px">${m.present} days · ${FTE_DETAILS[u]?.batch||'N/A'}</div></div>
        </div>`;
      }).join('')}
    </div>`;
  }

  bg.classList.add('open');
}

function closeModal(e){ if(e.target===document.getElementById('modalBg')) closeModalBtn(); }
function closeModalBtn(){
  const bg = document.getElementById('modalBg');
  if(bg) bg.classList.remove('open');
}

function exportCSV(){
  if(!modalExportData || !modalExportData.length) return;
  const keys=Object.keys(modalExportData[0]);
  const csv=[keys.join(','),...modalExportData.map(r=>keys.map(k=>`"${r[k]}"`).join(','))].join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='team_abhinav_export.csv'; a.click();
}

function navTo(id){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const idx={overview:0,attendance:1,productivity:2,members:3,assessments:4};
  if(idx[id]!==undefined) document.querySelectorAll('.nav-item')[idx[id]].classList.add('active');
  const el=document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}
