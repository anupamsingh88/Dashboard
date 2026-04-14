let ahChartInstance = null;

function renderAH() {
    if (!window.PROD) return;

    let totalAH = 0;
    let membersWithAH = 0;
    const exportData = [["Name", "User ID", "Total AH"]];

    const weeklyAHAgg = {};
    
    filteredUIDs.forEach(uid => {
        const prod = window.PROD[uid];
        if (!prod || !prod.ah) return;

        let memberAH = 0;
        Object.keys(prod.ah).forEach(dateStr => {
            const val = parseFloat(prod.ah[dateStr]) || 0;
            if (val > 0) {
                totalAH += val;
                memberAH += val;
                
                // Aggregate by week loosely (using standard utils or just by week number)
                // For simplicity, we'll try to bucket by month's weeks if possible.
                // Or we bucket by date directly:
                if (!weeklyAHAgg[dateStr]) weeklyAHAgg[dateStr] = 0;
                weeklyAHAgg[dateStr] += val;
            }
        });

        if (memberAH > 0) membersWithAH++;
        exportData.push([window.ATT[uid]?.name || uid, uid, memberAH]);
    });

    document.getElementById('ah-total').textContent = totalAH.toFixed(1);
    document.getElementById('ah-members-count').textContent = membersWithAH;
    
    window._ahExportData = exportData;

    // Build Chart
    const dates = Object.keys(weeklyAHAgg).sort();
    const dataVals = dates.map(d => weeklyAHAgg[d]);

    const ctx = document.getElementById('ahWeekChart');
    if (!ctx) return;
    
    mkChart('ahWeekChart', {
        type: 'bar',
        data: {
            labels: dates.map(d => d.slice(-5)), // just MM-DD
            datasets: [{
                label: 'AH Clocked',
                data: dataVals,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {legend: {display: false}},
            scales: {
                y: {beginAtZero: true, grid:{color:'var(--border)'}},
                x: {grid:{display:false}}
            }
        }
    });

}

function exportAH() {
    if (window._ahExportData) {
        exportToCSV(window._ahExportData, `Additional_Hours_${activeMonth}.csv`);
    }
}
