function renderGAMS() {
    const container = document.getElementById('gams-container');
    if (!container) return;

    // Use filteredUIDs to respect batch/member filters
    const uids = filteredUIDs;
    
    let html = `
    <div id="gams" class="cc glass-card animate-fade-in">
        <div class="cc-hdr">
            <div>
                <div class="cc-title">🔒 GAMS / Timesheets & Access Compliance</div>
                <div class="cc-sub">Real-time status of system access across GAMS, IA, and Zoho</div>
            </div>
            <button class="btn-primary" onclick="exportGAMSTable()">Export CSV</button>
        </div>
        <div class="table-wrapper">
            <table class="ft">
                <thead>
                    <tr>
                        <th>Member Name</th>
                        <th>User ID</th>
                        <th>GAMS Status</th>
                        <th>IA Access</th>
                        <th>Zoho Access</th>
                        <th>Approver</th>
                    </tr>
                </thead>
                <tbody>
    `;

    uids.forEach(uid => {
        const fte = FTE_DETAILS[uid] || {};
        const gams = GAMS[uid] || { status: 'N/A', approver: 'N/A' };
        
        const gamsStatus = gams.status || 'Applied';
        const iaAccess = fte.ia_access || 'Pending';
        const zohoAccess = fte.zoho_access || 'Pending';

        const getStatusPill = (status) => {
            const s = status.toLowerCase();
            if (s === 'done' || s === 'active' || s === 'completed') return `<span class="pill pg">Done</span>`;
            if (s === 'applied' || s === 'pending') return `<span class="pill py">Pending</span>`;
            return `<span class="pill pr">${status}</span>`;
        };

        html += `
            <tr>
                <td><div class="f-lbl">${fte.name || 'Unknown'}</div></td>
                <td><code style="font-size:11px;color:var(--p)">${uid}</code></td>
                <td>${getStatusPill(gamsStatus)}</td>
                <td>${getStatusPill(iaAccess)}</td>
                <td>${getStatusPill(zohoAccess)}</td>
                <td><div style="font-size:12px;color:var(--txt3)">${gams.approver}</div></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

function exportGAMSTable() {
    const uids = filteredUIDs;
    const data = uids.map(uid => {
        const fte = FTE_DETAILS[uid] || {};
        const gams = GAMS[uid] || {};
        return {
            Name: fte.name,
            UID: uid,
            'GAMS Status': gams.status || 'Applied',
            'IA Access': fte.ia_access || 'Pending',
            'Zoho Access': fte.zoho_access || 'Pending',
            'Approver': gams.approver || 'Unknown'
        };
    });
    
    if (typeof exportToCSV === 'function') {
        exportToCSV(data, `GAMS_Compliance_${activeMonth}.csv`);
    }
}

window.renderGAMS = renderGAMS;
window.exportGAMSTable = exportGAMSTable;
