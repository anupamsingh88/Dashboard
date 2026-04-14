function renderAssessments() {
    const rawData = window.ASSESSMENTS;
    const container = document.querySelector('#assessments .assess-grid');
    if (!container) return;
    
    if (!rawData || !rawData.length) {
        container.innerHTML = '<div style="color:var(--txt3); padding:20px; font-size:13px;">No assessment data found for this month.</div>';
        return;
    }

    container.innerHTML = '';
    const headerRow = rawData[0];
    const dataRows = rawData.slice(1);
    const keys = Object.keys(headerRow);
    const testGroups = {};

    // 1. Identify Test Names (every 2nd column is usually the Test Name, the next is 'Unnamed: X')
    keys.forEach((colKey, idx) => {
        if (colKey.startsWith('Unnamed')) return;
        testGroups[idx] = {
            name: colKey,
            pass: [],
            fail: []
        };
    });

    // 2. Populate Names
    dataRows.forEach(row => {
        Object.keys(testGroups).forEach(colIdx => {
            const idx = parseInt(colIdx);
            const passName = row[keys[idx]];
            const failName = row[keys[idx + 1]];

            // Only add if in filteredUIDs (if filtering active)
            const isVisible = (name) => {
                if (!window.filteredUIDs || window.filteredUIDs.length === 0) return true;
                return window.filteredUIDs.some(uid => window.ATT[uid]?.name === name);
            };

            if (passName && String(passName) !== 'NaN' && String(passName).trim() !== '' && isVisible(passName)) {
                testGroups[colIdx].pass.push(passName);
            }
            if (failName && String(failName) !== 'NaN' && String(failName).trim() !== '' && isVisible(failName)) {
                testGroups[colIdx].fail.push(failName);
            }
        });
    });

    // 3. Render
    let exportData = [["Assessment", "Status", "Name"]];
    Object.values(testGroups).forEach(group => {
        if (group.pass.length === 0 && group.fail.length === 0) return;

        const pCount = group.pass.length;
        const fCount = group.fail.length;
        const total = pCount + fCount;
        const pRate = total > 0 ? Math.round((pCount / total) * 100) : 0;

        let badgeStyle = `background:#dcfce7;color:#166534`;
        if (pRate < 50) badgeStyle = `background:#fee2e2;color:#dc2626`;
        else if (pRate < 80) badgeStyle = `background:#fef3c7;color:#b45309`;

        const card = document.createElement('div');
        card.className = 'assess-card fade-in';
        card.style.cssText = "background:rgba(255,255,255,0.7); border-radius:16px; padding:20px; border:1px solid rgba(255,255,255,0.3); backdrop-filter:blur(10px);";
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <div>
                    <h3 style="margin:0; font-size:16px; color:var(--txt1);">${group.name}</h3>
                    <div style="font-size:12px; color:var(--txt3); margin-top:4px;">${pCount} passed · ${fCount} failed</div>
                </div>
                <div style="font-size:11px; font-weight:600; padding:4px 8px; border-radius:20px; ${badgeStyle}">${pRate}% Pass Rate</div>
            </div>
            <div class="assess-body" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div>
                    <div style="font-size:11px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:4px;">
                        <span style="display:inline-block; width:6px; height:6px; background:#22c55e; border-radius:50%;"></span> Passed
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        ${group.pass.map(n => {
                            exportData.push([group.name, "Passed", n]);
                            return `<span style="font-size:11px; background:rgba(34,197,94,0.1); color:#166534; padding:2px 8px; border-radius:4px; border:1px solid rgba(34,197,94,0.2);">${n}</span>`;
                        }).join('') || '<span style="font-size:11px; color:var(--txt3);">None</span>'}
                    </div>
                </div>
                <div>
                    <div style="font-size:11px; font-weight:700; color:#991b1b; text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:4px;">
                        <span style="display:inline-block; width:6px; height:6px; background:#ef4444; border-radius:50%;"></span> Failed
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        ${group.fail.map(n => {
                            exportData.push([group.name, "Failed", n]);
                            return `<span style="font-size:11px; background:rgba(239,68,68,0.1); color:#991b1b; padding:2px 8px; border-radius:4px; border:1px solid rgba(239,68,68,0.2);">${n}</span>`;
                        }).join('') || '<span style="font-size:11px; color:var(--txt3);">None</span>'}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    window._assessExportData = exportData;
}

function exportAssessments() {
    if (window._assessExportData) {
        exportToCSV(window._assessExportData, `Assessments.csv`);
    }
}
