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
        loadHTML('additional_hours/ah.html', 'additional-hours-container'),
        loadHTML('queue/queue.html', 'queue-container'),
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
    // Determine the default month (April)
    const availableMonths = Object.keys(PROJECT_DATA);
    const defaultMonth = availableMonths[availableMonths.length - 1] || 'April';
    
    switchMonth(defaultMonth);
    
    // Perform internal sidebar setup
    if (typeof initSidebar === 'function') initSidebar();
    
    renderDashboard();
    
    // Initialize Scrollspy
    if (typeof initScrollspy === 'function') {
      initScrollspy();
    }
}

function updateDynamicTexts(month) {
    const titles = document.querySelectorAll('.cc-title, .sec-lbl');
    titles.forEach(el => {
        let txt = el.textContent;
        // Use word boundaries \b so we don't accidentally replace "Mar" inside "Summary" -> "SumAprily"
        const monthPattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Feb|Mar|Apr|Jan)\b/gi;
        el.textContent = txt.replace(monthPattern, month);
    });

    const dataFlowSub = document.querySelector('.df-sub');
    if (dataFlowSub) {
        dataFlowSub.textContent = `Live processing pipeline for ${month} 2026 operations`;
    }
}

function switchMonth(month) {
    if (!PROJECT_DATA[month]) return;
    activeMonth = month;
    const data = PROJECT_DATA[month];

    window.ATT = data.ATT || {};
    window.PROD = data.PROD || {};
    window.GAMS = data.GAMS || {};
    window.QUEUE = data.QUEUE || {};
    window.ASSESSMENTS = data.ASSESSMENTS || [];
    window.LEADERBOARD = data.LEADERBOARD || { top: [], bottom: [] };
    
    window.filteredUIDs = Object.keys(window.ATT);
    
    updateKPIs();
    updateDynamicTexts(month);
    
    // UI Components
    if (typeof renderTable === 'function') try { renderTable(); } catch(e) {}
    if (typeof renderGAMS === 'function') try { renderGAMS(); } catch(e) {}
    if (typeof renderQueue === 'function') try { renderQueue(); } catch(e) {}
    if (typeof renderAH === 'function') try { renderAH(); } catch(e) {}
    if (typeof renderAssessments === 'function') try { renderAssessments(); } catch(e) {}
    if (typeof buildWeekTabs === 'function') try { buildWeekTabs(); } catch(e) {}
    if (typeof initAttendanceFilter === 'function') try { initAttendanceFilter(); } catch(e) {}

    // Charts
    if (typeof initDailyChart === 'function') initDailyChart();
    if (typeof initDonutChart === 'function') initDonutChart();
    if (typeof initMemberAttChart === 'function') initMemberAttChart();
    if (typeof initLeaveChart === 'function') initLeaveChart();
    if (typeof initWeekGroupChart === 'function') initWeekGroupChart();

    const weeks = getAvailableWeeks();
    currentWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
    if (typeof initWeeklyProdChart === 'function') initWeeklyProdChart(currentWeek);

    const hdrSub = document.getElementById('hdr-sub');
    if (hdrSub) hdrSub.textContent = `${month} 2026 · ${Object.keys(window.ATT).length} Active FTEs · Digital & Voice Operations`;

    const footer = document.querySelector('footer');
    if (footer) {
        footer.innerHTML = `Team Abhinav Analytics Dashboard v2 &nbsp;·&nbsp; Source: Attendance Tracker &nbsp;·&nbsp; ${month} 2026 &nbsp;·&nbsp; Shift: 8AM–4PM`;
    }
}

window.switchMonth = switchMonth;

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
