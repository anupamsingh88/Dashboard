function renderTable(){
  const tbody = document.getElementById('tblBody');
  if(!tbody) return;
  
  // Update column header to reflect active month
  const ahHeader = document.getElementById('ahColHeader');
  if (ahHeader) ahHeader.textContent = `${activeMonth} AH`;
  
  let data = [...filteredUIDs];
  const fn = {
    name:u=>ATT[u].name.toLowerCase(), uid:u=>u,
    batch:u=>FTE_DETAILS[u]?.batch||'', present:u=>ATT[u].present,
    absent:u=>ATT[u].absent, leave:u=>ATT[u].leave, weekoff:u=>ATT[u].weekoff,
    attRate:u=>attRate(ATT[u]), totalAH:u=>totalAH(u), gams:u=>GAMS[u]||''
  };
  const sortFn = fn[sortKey]||fn.present;
  data.sort((a,b)=>{
    const av=sortFn(a),bv=sortFn(b);
    if(typeof av==='string') return sortAsc?av.localeCompare(bv):bv.localeCompare(av);
    return sortAsc?av-bv:bv-av;
  });
  
  document.getElementById('tbl-count').textContent=data.length+' members';
  document.querySelectorAll('thead th').forEach(th=>{th.className='';});
  const keyMap={name:0,uid:1,batch:2,present:3,absent:4,leave:5,weekoff:6,attRate:7,totalAH:8,gams:9};
  const ths=document.querySelectorAll('thead th');
  if(keyMap[sortKey]!==undefined && ths[keyMap[sortKey]]) ths[keyMap[sortKey]].className=sortAsc?'sa':'sd';

  tbody.innerHTML = data.map(uid=>{
    const m=ATT[uid], rate=attRate(m), ah=totalAH(uid);
    const gams=GAMS[uid]||'N/A';
    const rateClr=rate===100?'#22c55e':rate>=90?P.p:'#f59e0b';
    const gpill=gams==='Applied'?'pa':gams==='Endorsed'?'pb':'pp';
    const statusNote=Object.values(m.days).some(d=>d.toLowerCase().includes('resign'))?'<span class="pill pr" style="margin-left:4px;font-size:11px">Resigned</span>':'';
    return `<tr onclick="quickProfileRow('${uid}')" style="cursor:pointer">
      <td><strong style="font-size:12px">${m.name}</strong>${statusNote}</td>
      <td><span class="pill pp" style="font-family:'JetBrains Mono',monospace;font-size:12px">${uid}</span></td>
      <td><span style="font-size:13px;color:var(--txt2)">${FTE_DETAILS[uid]?.batch||'N/A'}</span></td>
      <td><strong style="color:${P.p}">${m.present}</strong></td>
      <td><strong style="color:${m.absent>0?P.r:'var(--txt3)'}">${m.absent}</strong></td>
      <td><strong style="color:${m.leave>0?P.a:'var(--txt3)'}">${m.leave}</strong></td>
      <td style="color:var(--txt3)">${m.weekoff}</td>
      <td><span style="font-weight:700;color:${rateClr}">${rate}%</span><span class="pbar"><span class="pbar-fill" style="width:${rate}%;background:${rateClr}"></span></span></td>
      <td><strong style="color:${P.b}">${ah}</strong> hrs</td>
      <td><span class="pill ${gpill}">${gams}</span></td>
    </tr>`;
  }).join('');
}

function sortTbl(key){
  if(sortKey===key) sortAsc=!sortAsc; else{sortKey=key;sortAsc=false;}
  renderTable();
}

function quickProfileRow(uid){
  document.getElementById('filterMember').value=uid;
  applyFilters();
  window.scrollTo({top:0,behavior:'smooth'});
}
