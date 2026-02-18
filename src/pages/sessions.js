// ===== Sessions Page =====
import { getPlayers, getPlayer, getSessions, addSession, updateSession, deleteSession, addGame, updatePlayer, addEloSnapshot, colorFromString } from '../data/store.js';
import { generateSchedule } from '../data/scheduler.js';
import { processGameElo } from '../data/elo.js';

export function renderSessions(container) {
    render(container);
}

function render(container) {
    const sessions = [...getSessions()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const players = getPlayers();

    container.innerHTML = `
    <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between;">
      <div>
        <h2>Match Sessions</h2>
        <p>Group games into a session and auto-generate schedules</p>
      </div>
      <button class="btn btn-primary" id="btnNewSession" ${players.length < 4 ? 'disabled title="Need at least 4 players"' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Session
      </button>
    </div>

    ${players.length < 4 ? `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>Need more players</h3>
        <p>Add at least 4 players to create match sessions with auto-generated schedules.</p>
        <a href="#/players" class="btn btn-primary btn-lg">Add Players</a>
      </div>
    ` : sessions.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No sessions yet</h3>
        <p>Create a session to organize a night of games with balanced matchups.</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: var(--space-4);" id="sessionsList">
        ${sessions.map(s => renderSessionCard(s)).join('')}
      </div>
    `}

    <!-- New Session Modal -->
    <div class="modal-overlay" id="sessionModal">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">New Session</h3>
          <button class="modal-close" id="sessionModalClose">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Session Name</label>
          <input type="text" class="form-input" id="sessionName" placeholder="e.g. Tuesday Night Games" />
        </div>
        <div class="form-group">
          <label class="form-label">Select Players (min 4)</label>
          <div class="player-select-grid" id="sessionPlayerSelect">
            ${players.map(p => `
              <button class="player-select-chip" data-id="${p.id}">
                ${p.name} <span style="font-size: 11px; color: var(--text-muted);">(${p.doublesElo})</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Number of Rounds</label>
          <select class="form-select" id="sessionRounds">
            <option value="0">Auto</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="7">7</option>
            <option value="10">10</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="sessionModalCancel">Cancel</button>
          <button class="btn btn-primary" id="sessionModalCreate" disabled>Create & Generate Schedule</button>
        </div>
      </div>
    </div>
  `;

    // Modal logic
    const modal = container.querySelector('#sessionModal');
    let selectedPlayers = [];

    container.querySelector('#btnNewSession')?.addEventListener('click', () => {
        selectedPlayers = [];
        container.querySelector('#sessionName').value = '';
        updateSessionChips();
        modal.classList.add('active');
    });

    container.querySelector('#sessionModalClose').addEventListener('click', () => modal.classList.remove('active'));
    container.querySelector('#sessionModalCancel').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    const sessionPlayerSelect = container.querySelector('#sessionPlayerSelect');
    sessionPlayerSelect.addEventListener('click', (e) => {
        const chip = e.target.closest('.player-select-chip');
        if (!chip) return;
        const id = chip.dataset.id;
        if (selectedPlayers.includes(id)) {
            selectedPlayers = selectedPlayers.filter(p => p !== id);
        } else {
            selectedPlayers.push(id);
        }
        updateSessionChips();
    });

    function updateSessionChips() {
        sessionPlayerSelect.querySelectorAll('.player-select-chip').forEach(chip => {
            chip.classList.toggle('selected', selectedPlayers.includes(chip.dataset.id));
        });
        container.querySelector('#sessionModalCreate').disabled = selectedPlayers.length < 4;
    }

    container.querySelector('#sessionModalCreate').addEventListener('click', () => {
        const name = container.querySelector('#sessionName').value.trim() || `Session ${new Date().toLocaleDateString()}`;
        const rounds = parseInt(container.querySelector('#sessionRounds').value);

        const sessionPlayers = selectedPlayers.map(id => getPlayer(id)).filter(Boolean);
        const schedule = generateSchedule(sessionPlayers, rounds || null);

        addSession({
            name,
            date: new Date().toISOString(),
            playerIds: selectedPlayers.slice(),
            gameIds: [],
            schedule,
            completedGames: []
        });

        modal.classList.remove('active');
        window.showToast?.('Session created with schedule!', 'success');
        render(container);
    });

    // Session card interactions
    container.querySelectorAll('[data-delete-session]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this session?')) {
                deleteSession(btn.dataset.deleteSession);
                window.showToast?.('Session deleted', 'info');
                render(container);
            }
        });
    });

    // Play game from schedule
    container.querySelectorAll('[data-play-round]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sessionId = btn.dataset.sessionId;
            const roundIdx = parseInt(btn.dataset.playRound);
            const session = getSessions().find(s => s.id === sessionId);
            if (!session) return;

            // Navigate to scoring with pre-filled teams
            const round = session.schedule[roundIdx];
            window.location.hash = '#/scoring';

            // Store pre-fill data
            window.__sessionScoring = {
                sessionId,
                roundIndex: roundIdx,
                teams: round.teams
            };
        });
    });

    // Mark round complete
    container.querySelectorAll('[data-complete-round]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sessionId = btn.dataset.sessionId;
            const roundIdx = parseInt(btn.dataset.completeRound);
            const session = getSessions().find(s => s.id === sessionId);
            if (!session) return;

            const completed = session.completedGames || [];
            if (!completed.includes(roundIdx)) {
                completed.push(roundIdx);
                updateSession(sessionId, { completedGames: completed });
                render(container);
            }
        });
    });
}

function renderSessionCard(session) {
    const date = new Date(session.date);
    const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    const playerNames = session.playerIds.map(id => getPlayer(id)?.name || '?');
    const completedGames = session.completedGames || [];
    const totalRounds = session.schedule?.length || 0;
    const completedCount = completedGames.length;
    const progress = totalRounds > 0 ? Math.round(completedCount / totalRounds * 100) : 0;

    return `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${session.name}</h3>
          <div style="font-size: var(--font-xs); color: var(--text-muted);">${dateStr} · ${playerNames.length} players · ${totalRounds} rounds</div>
        </div>
        <div style="display: flex; gap: var(--space-2); align-items: center;">
          <span class="badge ${progress === 100 ? 'badge-success' : 'badge-primary'}">${progress}% complete</span>
          <button class="btn btn-ghost btn-icon" data-delete-session="${session.id}" title="Delete" style="color: var(--text-muted);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>

      <!-- Players -->
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4);">
        ${playerNames.map(name => `
          <div class="chip">
            <span class="avatar" style="background: ${colorFromString(name)}; width: 20px; height: 20px; font-size: 10px;">${name.charAt(0).toUpperCase()}</span>
            ${name}
          </div>
        `).join('')}
      </div>

      <!-- Progress bar -->
      <div class="prob-bar" style="margin-bottom: var(--space-4);">
        <div style="width: ${progress}%; background: var(--gradient-primary); border-radius: var(--radius-full); height: 100%; transition: width 0.3s ease;"></div>
      </div>

      <!-- Schedule -->
      ${session.schedule && session.schedule.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          ${session.schedule.map((round, idx) => {
        const isComplete = completedGames.includes(idx);
        const teamA = round.teams[0].map(id => getPlayer(id)?.name || '?').join(' & ');
        const teamB = round.teams[1].map(id => getPlayer(id)?.name || '?').join(' & ');
        const sittingOut = round.sitOut?.map(id => getPlayer(id)?.name || '?').join(', ');

        return `
              <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-md); background: ${isComplete ? 'hsla(145,65%,48%,0.05)' : 'var(--bg-input)'}; ${isComplete ? 'opacity: 0.6;' : ''}">
                <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); background: ${isComplete ? 'hsla(145,65%,48%,0.15)' : 'hsla(var(--primary-h),50%,50%,0.1)'}; font-weight: 700; font-size: var(--font-xs); color: ${isComplete ? 'var(--success)' : 'var(--primary-light)'}; flex-shrink: 0;">
                  ${isComplete ? '✓' : `R${round.round}`}
                </div>
                <div style="flex: 1; font-size: var(--font-sm);">
                  <span style="font-weight: 600;">${teamA}</span>
                  <span style="color: var(--text-muted); margin: 0 var(--space-2);">vs</span>
                  <span style="font-weight: 600;">${teamB}</span>
                  ${sittingOut ? `<span style="font-size: var(--font-xs); color: var(--text-muted); margin-left: var(--space-2);">· Sit out: ${sittingOut}</span>` : ''}
                </div>
                ${!isComplete ? `
                  <button class="btn btn-ghost btn-sm" data-complete-round="${idx}" data-session-id="${session.id}">Done</button>
                ` : ''}
              </div>
            `;
    }).join('')}
        </div>
      ` : '<div style="color: var(--text-muted); font-size: var(--font-sm);">No schedule generated</div>'}
    </div>
  `;
}

export function destroySessions() { }
