// ===== Dashboard Page =====
import { getPlayers, getGames, getPlayer, colorFromString } from '../data/store.js';
import { getWinLoss, getCurrentStreak } from '../data/stats.js';

export function renderDashboard(container) {
    const players = getPlayers();
    const games = getGames();
    const recentGames = [...games].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    // Leaderboard: sort by doubles ELO
    const topPlayers = [...players].sort((a, b) => b.doublesElo - a.doublesElo).slice(0, 5);

    container.innerHTML = `
    <div class="page-header">
      <h2>Dashboard</h2>
      <p>Overview of your badminton community</p>
    </div>

    <div class="grid-4" style="margin-bottom: var(--space-8);">
      <div class="card stat-card">
        <div class="stat-label">Total Players</div>
        <div class="stat-value">${players.length}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Games Played</div>
        <div class="stat-value">${games.length}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Avg ELO</div>
        <div class="stat-value">${players.length ? Math.round(players.reduce((s, p) => s + p.doublesElo, 0) / players.length) : '—'}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">This Week</div>
        <div class="stat-value">${countThisWeek(games)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏆 ELO Leaderboard</h3>
          <a href="#/rankings" class="btn btn-ghost btn-sm">View All →</a>
        </div>
        <div id="dashLeaderboard">
          ${topPlayers.length === 0 ? renderEmptyMini('No players yet') : topPlayers.map((p, i) => renderLeaderboardRow(p, i)).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🕐 Recent Games</h3>
          <a href="#/history" class="btn btn-ghost btn-sm">View All →</a>
        </div>
        <div id="dashRecent">
          ${recentGames.length === 0 ? renderEmptyMini('No games played yet') : recentGames.map(g => renderRecentGame(g)).join('')}
        </div>
      </div>
    </div>

    ${players.length === 0 ? `
    <div class="card" style="margin-top: var(--space-8); text-align: center; padding: var(--space-10);">
      <div style="font-size: 3rem; margin-bottom: var(--space-4);">🏸</div>
      <h3 style="font-size: var(--font-xl); margin-bottom: var(--space-2);">Welcome to Shuttle!</h3>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-6);">Start by adding some players, then fire up a game!</p>
      <a href="#/players" class="btn btn-primary btn-lg">Add Players</a>
    </div>
    ` : ''}
  `;
}

function countThisWeek(games) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return games.filter(g => new Date(g.timestamp) >= weekAgo).length;
}

function renderLeaderboardRow(player, index) {
    const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
    const record = getWinLoss(player.id);
    const streak = getCurrentStreak(player.id);

    return `
    <div class="leaderboard-row">
      <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
      <div class="avatar" style="background: ${colorFromString(player.name)}">${player.name.charAt(0).toUpperCase()}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${player.name}</div>
        <div class="leaderboard-meta">${record.wins}W ${record.losses}L ${streak.count > 0 ? `· ${streak.count}${streak.type}` : ''}</div>
      </div>
      <div class="leaderboard-elo">${player.doublesElo}</div>
    </div>
  `;
}

function renderRecentGame(game) {
    const teamANames = game.teams[0].map(id => { const p = getPlayer(id); return p ? p.name : '?'; }).join(' & ');
    const teamBNames = game.teams[1].map(id => { const p = getPlayer(id); return p ? p.name : '?'; }).join(' & ');
    const date = new Date(game.timestamp);
    const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const formatBadge = game.format === 'singles' ? 'badge-primary' : game.format === 'mixed_doubles' ? 'badge-accent' : 'badge-warning';

    return `
    <div class="leaderboard-row" style="cursor: default;">
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
          <span class="badge ${formatBadge}" style="font-size: 10px;">${game.format.replace('_', ' ')}</span>
          <span style="font-size: var(--font-xs); color: var(--text-muted);">${timeStr}</span>
        </div>
        <div style="font-size: var(--font-sm);">
          <span style="${game.winner === 0 ? 'font-weight:700; color: var(--success);' : ''}">${teamANames}</span>
          <span style="color: var(--text-muted); margin: 0 var(--space-2);">${game.scores[0]} – ${game.scores[1]}</span>
          <span style="${game.winner === 1 ? 'font-weight:700; color: var(--success);' : ''}">${teamBNames}</span>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyMini(msg) {
    return `<div style="text-align: center; padding: var(--space-6); color: var(--text-muted); font-size: var(--font-sm);">${msg}</div>`;
}

export function destroyDashboard() { }
