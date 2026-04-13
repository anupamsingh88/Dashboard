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
    initMonthSelector();
    
    // Default to current month if available, else latest
    const now = new Date();
    const currentMonthName = now.toLocaleString('default', { month: 'long' });
    const availableMonths = Object.keys(PROJECT_DATA);
    
    let defaultMonth = availableMonths[availableMonths.length - 1]; // Latest as fallback
    if (availableMonths.includes(currentMonthName)) {
        defaultMonth = currentMonthName;
    }

    switchMonth(defaultMonth);
    
    initSidebar(); // from sidebar.js
}

function initMonthSelector() {
    const selector = document.getElementById('monthSelect');
    if (!selector) return;

    const months = Object.keys(PROJECT_DATA);
    selector.innerHTML = months.map(m => `<option value="${m}">${m} 2026</option>`).join('');
}

function updateDynamicTexts(monthName) {
    // 1. Update Chart Titles
    const titles = document.querySelectorAll('.cc-title, .sec-lbl');
    titles.forEach(el => {
        // Replace common month names with the active one
        let txt = el.textContent;
        const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Feb|Mar|Apr)/gi;
        el.textContent = txt.replace(monthPattern, monthName);
    });

    // 2. Update Data Flow section if it exists
    const dataFlowSub = document.querySelector('.df-sub');
    if (dataFlowSub) {
        dataFlowSub.textContent = `Live processing pipeline for ${monthName} 2026 operations`;
    }
}

function switchMonth(monthName) {
    if (!PROJECT_DATA[monthName]) return;

    const data = PROJECT_DATA[monthName];
    
    // Update Global References for components
    window.ATT = data.ATT;
    window.PROD = data.PROD;
    window.GAMS = data.GAMS;
    window.DAILY_PRESENT = data.DAILY_PRESENT;
    window.LEADERBOARD = data.LEADERBOARD;

    // Update dynamic text across the dashboard
    updateDynamicTexts(monthName);

    // Update Header sub-text
    const activeFTEs = Object.keys(window.ATT).length;
    const hdrSub = document.getElementById('hdr-sub');
    if (hdrSub) hdrSub.textContent = `${monthName} 2026 · ${activeFTEs} Active FTEs · Digital & Voice Operations`;

    // Update Date Display
    const dElem = document.getElementById('curDate');
    if(dElem) dElem.textContent = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

    // Update UI components
    updateKPIs(); // from overview.js
    
    // Re-init charts
    if (typeof initDailyChart === 'function') initDailyChart();
    if (typeof initDonutChart === 'function') initDonutChart();
    if (typeof initMemberAttChart === 'function') initMemberAttChart();
    if (typeof initLeaveChart === 'function') initLeaveChart();
    
    // Handle Productivity charts - find the latest WW in the data
    let allWeeks = [];
    Object.values(window.PROD).forEach(member => {
        Object.keys(member).forEach(k => {
            if (k.startsWith('ww')) allWeeks.push(k);
        });
    });
    allWeeks = [...new Set(allWeeks)].sort((a,b) => {
        const numA = parseInt(a.replace('ww',''));
        const numB = parseInt(b.replace('ww',''));
        return numB - numA; // Sort descending
    });

    const latestWW = allWeeks[0] || 'ww10';
    if (typeof initWeeklyProdChart === 'function') initWeeklyProdChart(latestWW);
    
    if (typeof initWeekGroupChart === 'function') initWeekGroupChart();
    if (typeof renderTable === 'function') renderTable(); // from members.js

    // Update selector value if changed programmatically
    const selector = document.getElementById('monthSelect');
    if (selector) selector.value = monthName;
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
