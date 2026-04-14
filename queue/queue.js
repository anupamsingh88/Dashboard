function renderQueue() {
    if (!window.QUEUE) return;

    let p0Count = 0, p1Count = 0, p2Count = 0, missingCount = 0;
    const tbody = document.getElementById('queueTblBody');
    if (!tbody) return;

    let rowsHtml = '';
    const exportData = [["Name", "P0 Status", "P1 Status", "P2 Status"]];

    // FilteredUIDs usually apply, but queue might use name mapping. We map through filteredUIDs to keep context sync.
    (window.filteredUIDs || Object.keys(window.QUEUE)).forEach(uid => {
        const q = window.QUEUE[uid];
        if (!q) return;

        let missing = false;
        if (q.p0_status?.toLowerCase().includes('not visible') || 
            q.p1_status?.toLowerCase().includes('not visible') || 
            q.p2_status?.toLowerCase().includes('not visible')) {
            missing = true;
            missingCount++;
        }

        if (q.p0_status?.toLowerCase().includes('assigned') || q.p0_status?.toLowerCase().includes('working')) p0Count++;
        if (q.p1_status?.toLowerCase().includes('assigned') || q.p1_status?.toLowerCase().includes('working')) p1Count++;
        if (q.p2_status?.toLowerCase().includes('assigned') || q.p2_status?.toLowerCase().includes('working')) p2Count++;

        const getPill = (status) => {
            if (!status || status === 'nan') return '<span class="pill" style="opacity:0.3">-</span>';
            const s = status.toLowerCase();
            if (s.includes('not visible')) return `<span class="pill" style="background:#fef2f2;color:#ef4444;border:1px solid #fca5a5">${status}</span>`;
            if (s.includes('assigned') || s.includes('working')) return `<span class="pill pa">${status}</span>`;
            return `<span class="pill" style="background:#f1f5f9;color:#64748b">${status}</span>`;
        };

        rowsHtml += `<tr>
            <td><strong>${q.name}</strong></td>
            <td>${getPill(q.p0_status)}</td>
            <td>${getPill(q.p1_status)}</td>
            <td>${getPill(q.p2_status)}</td>
        </tr>`;

        exportData.push([q.name, q.p0_status||'-', q.p1_status||'-', q.p2_status||'-']);
    });

    tbody.innerHTML = rowsHtml;
    
    // Update KPI cards
    document.getElementById('q-p0').textContent = p0Count;
    document.getElementById('q-p1').textContent = p1Count;
    document.getElementById('q-p2').textContent = p2Count;
    document.getElementById('q-missing').textContent = missingCount;

    // Attach export data to global window object so button can reach it
    window._queueExportData = exportData;
}

function exportQueue() {
    if (window._queueExportData) {
        exportToCSV(window._queueExportData, `Queue_Allocation_${activeMonth}.csv`);
    }
}
