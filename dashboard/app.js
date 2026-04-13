document.addEventListener("DOMContentLoaded", async () => {
    // Basic fetch function to inject components
    const loadHTML = async (url, containerId) => {
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
            const html = await resp.text();
            document.getElementById(containerId).innerHTML = html;
        } catch(e) {
            console.error("Failed loading " + url, e);
        }
    };

    // Load templates parallelly
    await Promise.all([
        loadHTML('sidebar/sidebar.html', 'sidebar-container'),
        loadHTML('header/header.html', 'header-container'),
        loadHTML('overview/overview.html', 'overview-container'),
        loadHTML('shared/data_flow.html', 'data-flow-container'),
        loadHTML('attendance/attendance.html', 'attendance-container'),
        loadHTML('productivity/productivity.html', 'productivity-container'),
        loadHTML('members/members.html', 'members-container'),
        loadHTML('assessments/assessments.html', 'assessments-container'),
        loadHTML('profile/profile.html', 'profile-container'),
        loadHTML('modal/modal.html', 'modal-container')
    ]);

    // Perform initialization after partials are injected
    initApp();

    // Auto-reload polling
    let lastVersion = null;
    setInterval(async () => {
        try {
            const resp = await fetch('shared/version.json');
            if (resp.ok) {
                const data = await resp.json();
                if (lastVersion && data.timestamp !== lastVersion) {
                    console.log("Data updated! Reloading...");
                    window.location.reload();
                }
                lastVersion = data.timestamp;
            }
        } catch(e) { /* ignore polling errors */ }
    }, 10000); // Check every 10 seconds
});

function initApp() {
    // ═══ INIT LOGIC ═══
    const dElem = document.getElementById('curDate');
    if(dElem) dElem.textContent = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

    initSidebar(); // from sidebar.js
    updateKPIs(); // from overview.js
    
    // charts from attendance.js and productivity.js
    if (typeof initDailyChart === 'function') initDailyChart();
    if (typeof initDonutChart === 'function') initDonutChart();
    if (typeof initMemberAttChart === 'function') initMemberAttChart();
    if (typeof initLeaveChart === 'function') initLeaveChart();
    if (typeof initWeeklyProdChart === 'function') initWeeklyProdChart('ww10');
    if (typeof initFebProdChart === 'function') initFebProdChart();
    if (typeof initWeekGroupChart === 'function') initWeekGroupChart();

    if (typeof renderTable === 'function') renderTable(); // from members.js
}

/**
 * TRIGGER MANUAL SYNC
 * Since we are deploying to GitHub Pages (static), we cannot run Python directly.
 * This button redirects the user to the GitHub Actions page to trigger the sync manually.
 */
function triggerManualSync() {
    const btn = document.getElementById('syncBtn');
    if (!btn) return;

    // Visual feedback
    btn.classList.add('syncing');
    btn.querySelector('span').textContent = 'Redirecting...';

    // Construct the GitHub Actions URL
    const repoUrl = "https://github.com/anupamsingh88/Dashboard/actions/workflows/data_sync.yml";
    
    setTimeout(() => {
        window.open(repoUrl, '_blank');
        btn.classList.remove('syncing');
        btn.querySelector('span').textContent = 'Sync Data';
    }, 1000);
}

// Export to window for HTML onclick handlers
window.triggerManualSync = triggerManualSync;
window.toggleSidebar = () => {
    const sb = document.getElementById('sidebar-container');
    const b = document.getElementById('sidebarBackdrop');
    if (sb) sb.classList.toggle('open');
    if (b) b.classList.toggle('visible');
};
