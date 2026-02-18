// ===== App Shell — Hash Router =====
import { exportAllData, importAllData } from './data/store.js';

// Page modules
import { renderDashboard, destroyDashboard } from './pages/dashboard.js';
import { renderPlayers, destroyPlayers } from './pages/players.js';
import { renderScoring, destroyScoring } from './pages/scoring.js';
import { renderHistory, destroyHistory } from './pages/history.js';
import { renderRankings, destroyRankings } from './pages/rankings.js';
import { renderStats, destroyStats } from './pages/stats.js';
import { renderSessions, destroySessions } from './pages/sessions.js';

const routes = {
    '/': { render: renderDashboard, destroy: destroyDashboard, page: 'dashboard' },
    '/players': { render: renderPlayers, destroy: destroyPlayers, page: 'players' },
    '/scoring': { render: renderScoring, destroy: destroyScoring, page: 'scoring' },
    '/history': { render: renderHistory, destroy: destroyHistory, page: 'history' },
    '/rankings': { render: renderRankings, destroy: destroyRankings, page: 'rankings' },
    '/stats': { render: renderStats, destroy: destroyStats, page: 'stats' },
    '/sessions': { render: renderSessions, destroy: destroySessions, page: 'sessions' }
};

let currentRoute = null;

function getPath() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
}

function navigate() {
    const path = getPath();
    const route = routes[path] || routes['/'];

    // Destroy current page
    if (currentRoute && currentRoute.destroy) {
        currentRoute.destroy();
    }

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === route.page);
    });

    // Render new page
    const main = document.getElementById('mainContent');
    main.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'page-enter';
    main.appendChild(container);
    route.render(container);
    currentRoute = route;
}

// Toast notifications
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export/Import
document.getElementById('btnExportData').addEventListener('click', () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shuttle-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
});

document.getElementById('btnImportData').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            importAllData(reader.result);
            showToast('Data imported successfully!', 'success');
            navigate(); // re-render current page
        } catch (err) {
            showToast('Import failed: invalid file', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// Expose toast globally
window.showToast = showToast;

// Init
window.addEventListener('hashchange', navigate);
navigate();
