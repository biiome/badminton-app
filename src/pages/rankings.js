// ===== Rankings Page =====
import { getPlayers, getPlayer, getEloHistory, colorFromString } from '../data/store.js';
import { expectedWinProbability, teamElo } from '../data/elo.js';
import { getWinLoss, getCurrentStreak } from '../data/stats.js';

let chartInstance = null;

export function renderRankings(container) {
    const players = getPlayers();

    container.innerHTML = `
    <div class="page-header">
      <h2>Rankings</h2>
      <p>ELO leaderboards and rating history</p>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="singles">Singles ELO</button>
      <button class="tab" data-tab="doubles">Doubles ELO</button>
      <button class="tab" data-tab="history">Rating History</button>
      <button class="tab" data-tab="calculator">Win Calculator</button>
    </div>

    <div id="tabContent"></div>
  `;

    const tabs = container.querySelectorAll('.tab');
    let activeTab = 'singles';

    function setTab(tab) {
        activeTab = tab;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        renderTab(container.querySelector('#tabContent'), tab, players);
    }

    tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
    setTab('singles');
}

function renderTab(el, tab, players) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    if (tab === 'singles') renderLeaderboard(el, players, 'singlesElo', 'Singles');
    else if (tab === 'doubles') renderLeaderboard(el, players, 'doublesElo', 'Doubles');
    else if (tab === 'history') renderHistoryChart(el, players);
    else if (tab === 'calculator') renderCalculator(el, players);
}

function renderLeaderboard(el, players, eloKey, label) {
    const sorted = [...players].sort((a, b) => b[eloKey] - a[eloKey]);

    el.innerHTML = sorted.length === 0 ? `
    <div class="empty-state">
      <div class="empty-icon">🏆</div>
      <h3>No players yet</h3>
      <p>Add players to see rankings.</p>
    </div>
  ` : `
    <div class="card" style="padding: var(--space-2);">
      ${sorted.map((p, i) => {
        const record = getWinLoss(p.id);
        const streak = getCurrentStreak(p.id);
        const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

        return `
          <div class="leaderboard-row">
            <div class="leaderboard-rank ${rankClass}">${i + 1}</div>
            <div class="avatar" style="background: ${colorFromString(p.name)}">${p.name.charAt(0).toUpperCase()}</div>
            <div class="leaderboard-info">
              <div class="leaderboard-name">${p.name}</div>
              <div class="leaderboard-meta">
                ${record.wins}W ${record.losses}L
                ${streak.count > 1 ? ` · ${streak.count}${streak.type}` : ''}
                · ${p.skillTag}
              </div>
            </div>
            <div class="leaderboard-elo">${p[eloKey]}</div>
          </div>
        `;
    }).join('')}
    </div>
  `;
}

async function renderHistoryChart(el, players) {
    if (players.length === 0) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">📈</div><h3>No data yet</h3><p>Play some games to see rating trends.</p></div>';
        return;
    }

    el.innerHTML = `
    <div class="card">
      <div class="form-group" style="max-width: 300px;">
        <label class="form-label">Select Player</label>
        <select class="form-select" id="historyPlayerSelect">
          ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div style="position: relative; height: 350px;">
        <canvas id="eloChart"></canvas>
      </div>
    </div>
  `;

    // Dynamically import Chart.js
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    function drawChart(playerId) {
        if (chartInstance) chartInstance.destroy();

        const history = getEloHistory().filter(h => h.playerId === playerId);
        const player = getPlayer(playerId);

        // Build data points
        const singlesData = history.map((h, i) => ({ x: i + 1, y: h.singlesElo }));
        const doublesData = history.map((h, i) => ({ x: i + 1, y: h.doublesElo }));

        // Add initial point
        if (singlesData.length === 0) {
            singlesData.push({ x: 0, y: player?.singlesElo || 1200 });
            doublesData.push({ x: 0, y: player?.doublesElo || 1200 });
        }

        const ctx = el.querySelector('#eloChart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Singles ELO',
                        data: singlesData,
                        borderColor: 'hsl(258, 90%, 62%)',
                        backgroundColor: 'hsla(258, 90%, 62%, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Doubles ELO',
                        data: doublesData,
                        borderColor: 'hsl(168, 80%, 50%)',
                        backgroundColor: 'hsla(168, 80%, 50%, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: 'hsl(220, 15%, 65%)', font: { family: 'Inter' } }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Game #', color: 'hsl(220, 10%, 45%)' },
                        grid: { color: 'hsla(230, 15%, 30%, 0.2)' },
                        ticks: { color: 'hsl(220, 10%, 45%)' }
                    },
                    y: {
                        title: { display: true, text: 'ELO Rating', color: 'hsl(220, 10%, 45%)' },
                        grid: { color: 'hsla(230, 15%, 30%, 0.2)' },
                        ticks: { color: 'hsl(220, 10%, 45%)' }
                    }
                }
            }
        });
    }

    el.querySelector('#historyPlayerSelect').addEventListener('change', (e) => {
        drawChart(e.target.value);
    });

    drawChart(players[0].id);
}

function renderCalculator(el, players) {
    el.innerHTML = `
    <div class="card" style="max-width: 600px;">
      <h3 class="card-title" style="margin-bottom: var(--space-6);">Expected Win Probability</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Player / Team A</label>
          <select class="form-select" id="calcPlayerA">
            <option value="">Select...</option>
            ${players.map(p => `<option value="${p.id}">${p.name} (${p.doublesElo})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Player / Team B</label>
          <select class="form-select" id="calcPlayerB">
            <option value="">Select...</option>
            ${players.map(p => `<option value="${p.id}">${p.name} (${p.doublesElo})</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="calcResult" style="margin-top: var(--space-4);"></div>
    </div>
  `;

    function calculate() {
        const aId = el.querySelector('#calcPlayerA').value;
        const bId = el.querySelector('#calcPlayerB').value;
        const resultDiv = el.querySelector('#calcResult');
        if (!aId || !bId || aId === bId) {
            resultDiv.innerHTML = '';
            return;
        }
        const a = getPlayer(aId);
        const b = getPlayer(bId);
        const prob = expectedWinProbability(a.doublesElo, b.doublesElo);
        const pctA = Math.round(prob * 100);
        const pctB = 100 - pctA;

        resultDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--font-sm);">
        <span>${a.name} — ${pctA}%</span>
        <span>${pctB}% — ${b.name}</span>
      </div>
      <div class="prob-bar">
        <div class="prob-fill-a" style="width: ${pctA}%;"></div>
        <div class="prob-fill-b" style="width: ${pctB}%;"></div>
      </div>
      <div style="text-align: center; margin-top: var(--space-4); color: var(--text-secondary); font-size: var(--font-sm);">
        ELO gap: ${Math.abs(a.doublesElo - b.doublesElo)} points
      </div>
    `;
    }

    el.querySelector('#calcPlayerA').addEventListener('change', calculate);
    el.querySelector('#calcPlayerB').addEventListener('change', calculate);
}

export function destroyRankings() {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}
