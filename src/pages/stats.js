// ===== Stats Page =====
import { getPlayers, getPlayer, colorFromString } from '../data/store.js';
import {
    getWinLoss, getBestPartner, getNemesis,
    getMostPlayedAgainst, getLongestWinStreak,
    getCurrentStreak, getRivalries, getFormatBreakdown,
    getPlayerGames
} from '../data/stats.js';

export function renderStats(container) {
    const players = getPlayers();

    container.innerHTML = `
    <div class="page-header">
      <h2>Player Stats</h2>
      <p>Deep dive into individual performance</p>
    </div>

    ${players.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No players yet</h3>
        <p>Add players and play some games to see stats.</p>
      </div>
    ` : `
      <div class="form-group" style="max-width: 300px; margin-bottom: var(--space-8);">
        <label class="form-label">Select Player</label>
        <select class="form-select" id="statsPlayerSelect">
          ${players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div id="statsContent"></div>
    `}
  `;

    if (players.length === 0) return;

    function renderPlayerStats(playerId) {
        const player = getPlayer(playerId);
        if (!player) return;

        const record = getWinLoss(playerId);
        const bestPart = getBestPartner(playerId);
        const nemesis = getNemesis(playerId);
        const mostPlayed = getMostPlayedAgainst(playerId);
        const longestStreak = getLongestWinStreak(playerId);
        const currentStreak = getCurrentStreak(playerId);
        const rivalries = getRivalries(playerId).slice(0, 5);
        const formatBreak = getFormatBreakdown(playerId);
        const totalGames = getPlayerGames(playerId).length;

        const content = container.querySelector('#statsContent');

        content.innerHTML = `
      <!-- Overview Cards -->
      <div class="grid-4" style="margin-bottom: var(--space-6);">
        <div class="card stat-card">
          <div class="stat-label">Win Rate</div>
          <div class="stat-value" style="color: var(--success);">${record.winRate}%</div>
          <div style="font-size: var(--font-xs); color: var(--text-muted); margin-top: var(--space-1);">${record.wins}W · ${record.losses}L</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Games Played</div>
          <div class="stat-value">${totalGames}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Longest Win Streak</div>
          <div class="stat-value" style="color: var(--warning);">${longestStreak}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Current Streak</div>
          <div class="stat-value">
            ${currentStreak.count > 0 ? `
              <span class="${currentStreak.type === 'W' ? '' : 'badge-danger'}" style="color: ${currentStreak.type === 'W' ? 'var(--success)' : 'var(--danger)'};">${currentStreak.count}${currentStreak.type}</span>
            ` : '—'}
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: var(--space-6);">
        <!-- Best Partner -->
        <div class="card">
          <div class="card-subtitle">Best Partner</div>
          ${bestPart ? (() => {
                const partner = getPlayer(bestPart.playerId);
                return `
              <div style="display: flex; align-items: center; gap: var(--space-3); margin-top: var(--space-3);">
                <div class="avatar" style="background: ${colorFromString(partner?.name || '?')}; width: 42px; height: 42px;">${(partner?.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight: 700; font-size: var(--font-md);">${partner?.name || '?'}</div>
                  <div style="font-size: var(--font-xs); color: var(--text-muted);">${bestPart.winRate}% win rate · ${bestPart.wins}W/${bestPart.total}G</div>
                </div>
              </div>
            `;
            })() : '<div style="color: var(--text-muted); margin-top: var(--space-3); font-size: var(--font-sm);">Play more doubles to find your best partner (min 2 games)</div>'}
        </div>

        <!-- Nemesis -->
        <div class="card">
          <div class="card-subtitle">Nemesis 😈</div>
          ${nemesis ? (() => {
                const nem = getPlayer(nemesis.playerId);
                return `
              <div style="display: flex; align-items: center; gap: var(--space-3); margin-top: var(--space-3);">
                <div class="avatar" style="background: ${colorFromString(nem?.name || '?')}; width: 42px; height: 42px;">${(nem?.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight: 700; font-size: var(--font-md);">${nem?.name || '?'}</div>
                  <div style="font-size: var(--font-xs); color: var(--text-muted);">Only ${nemesis.winRate}% win rate vs · ${nemesis.wins}W/${nemesis.total}G</div>
                </div>
              </div>
            `;
            })() : '<div style="color: var(--text-muted); margin-top: var(--space-3); font-size: var(--font-sm);">Play more games to discover your nemesis (min 2 games)</div>'}
        </div>
      </div>

      <div class="grid-2">
        <!-- Rivalries -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Rivalries</h3>
          </div>
          ${rivalries.length === 0 ? '<div style="color: var(--text-muted); font-size: var(--font-sm);">No rivalries yet</div>' : `
            ${rivalries.map(r => {
                const opp = getPlayer(r.playerId);
                return `
                <div class="leaderboard-row">
                  <div class="avatar" style="background: ${colorFromString(opp?.name || '?')}; width: 32px; height: 32px; font-size: var(--font-xs);">${(opp?.name || '?').charAt(0).toUpperCase()}</div>
                  <div class="leaderboard-info">
                    <div class="leaderboard-name" style="font-size: var(--font-sm);">${opp?.name || '?'}</div>
                    <div class="leaderboard-meta">${r.total} games · ${r.winRate}% win rate</div>
                  </div>
                  <div style="font-weight: 700; font-size: var(--font-sm); color: var(--text-secondary);">${r.wins}W ${r.losses}L</div>
                </div>
              `;
            }).join('')}
          `}
        </div>

        <!-- Format Breakdown -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Format Breakdown</h3>
          </div>
          ${totalGames === 0 ? '<div style="color: var(--text-muted); font-size: var(--font-sm);">No games played yet</div>' : `
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              ${Object.entries(formatBreak).map(([fmt, count]) => {
                const pct = Math.round(count / totalGames * 100);
                const colors = { singles: 'var(--primary)', doubles: 'var(--warning)', mixed_doubles: 'var(--accent)' };
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1); font-size: var(--font-sm);">
                      <span style="text-transform: capitalize;">${fmt.replace('_', ' ')}</span>
                      <span style="color: var(--text-muted);">${count} (${pct}%)</span>
                    </div>
                    <div class="prob-bar">
                      <div style="width: ${pct}%; background: ${colors[fmt] || 'var(--primary)'}; border-radius: var(--radius-full); height: 100%;"></div>
                    </div>
                  </div>
                `;
            }).join('')}
            </div>
          `}

          ${mostPlayed ? (() => {
                const mp = getPlayer(mostPlayed.playerId);
                return `
              <div style="margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--border-light);">
                <div class="card-subtitle" style="margin-bottom: var(--space-2);">Most Played Against</div>
                <div style="display: flex; align-items: center; gap: var(--space-2);">
                  <div class="avatar" style="background: ${colorFromString(mp?.name || '?')}; width: 28px; height: 28px; font-size: 11px;">${(mp?.name || '?').charAt(0).toUpperCase()}</div>
                  <span style="font-weight: 600; font-size: var(--font-sm);">${mp?.name || '?'}</span>
                  <span style="color: var(--text-muted); font-size: var(--font-xs);">${mostPlayed.count} games</span>
                </div>
              </div>
            `;
            })() : ''}
        </div>
      </div>
    `;
    }

    container.querySelector('#statsPlayerSelect')?.addEventListener('change', (e) => {
        renderPlayerStats(e.target.value);
    });

    renderPlayerStats(players[0].id);
}

export function destroyStats() { }
