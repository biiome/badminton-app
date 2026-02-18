// ===== History Page =====
import { getGames, getPlayer, deleteGame, colorFromString } from '../data/store.js';

export function renderHistory(container) {
    render(container);
}

function render(container) {
    const games = [...getGames()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    container.innerHTML = `
    <div class="page-header">
      <h2>Game History</h2>
      <p>${games.length} game${games.length === 1 ? '' : 's'} played</p>
    </div>

    ${games.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">🕐</div>
        <h3>No games yet</h3>
        <p>Play your first game to see history here.</p>
        <a href="#/scoring" class="btn btn-primary btn-lg">Start a Game</a>
      </div>
    ` : `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Format</th>
                <th>Team A</th>
                <th>Score</th>
                <th>Team B</th>
                <th>Result</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${games.map(g => renderGameRow(g)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;

    // Delete buttons
    container.querySelectorAll('[data-delete-game]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this game record?')) {
                deleteGame(btn.dataset.deleteGame);
                window.showToast?.('Game deleted', 'info');
                render(container);
            }
        });
    });
}

function renderGameRow(game) {
    const date = new Date(game.timestamp);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const teamANames = game.teams[0].map(id => getPlayer(id)?.name || '?').join(' & ');
    const teamBNames = game.teams[1].map(id => getPlayer(id)?.name || '?').join(' & ');
    const formatBadge = game.format === 'singles' ? 'badge-primary' : game.format === 'mixed_doubles' ? 'badge-accent' : 'badge-warning';
    const winnerLabel = game.winner === 0 ? teamANames : teamBNames;

    return `
    <tr>
      <td>
        <div style="font-weight: 500;">${dateStr}</div>
        <div style="font-size: var(--font-xs); color: var(--text-muted);">${timeStr}</div>
      </td>
      <td><span class="badge ${formatBadge}">${game.format.replace('_', ' ')}</span></td>
      <td style="${game.winner === 0 ? 'font-weight: 700; color: var(--success);' : ''}">${teamANames}</td>
      <td style="font-weight: 800; font-size: var(--font-md); letter-spacing: 1px;">${game.scores[0]} – ${game.scores[1]}</td>
      <td style="${game.winner === 1 ? 'font-weight: 700; color: var(--success);' : ''}">${teamBNames}</td>
      <td><span class="badge badge-success" style="font-size: 10px;">🏆 ${winnerLabel}</span></td>
      <td>
        <button class="btn btn-ghost btn-icon" data-delete-game="${game.id}" title="Delete" style="color: var(--text-muted);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `;
}

export function destroyHistory() { }
