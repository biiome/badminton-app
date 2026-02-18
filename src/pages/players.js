// ===== Players Page =====
import { getPlayers, addPlayer, updatePlayer, deletePlayer, colorFromString } from '../data/store.js';
import { getWinLoss, getCurrentStreak } from '../data/stats.js';

let modalOverlay = null;

export function renderPlayers(container) {
    render(container);
}

function render(container) {
    const players = getPlayers();

    container.innerHTML = `
    <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between;">
      <div>
        <h2>Players</h2>
        <p>Manage your badminton squad</p>
      </div>
      <button class="btn btn-primary" id="btnAddPlayer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Player
      </button>
    </div>

    ${players.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No players yet</h3>
        <p>Add your first player to get started with scoring and rankings.</p>
        <button class="btn btn-primary btn-lg" id="btnAddPlayerEmpty">Add First Player</button>
      </div>
    ` : `
      <div class="grid-3" id="playerGrid">
        ${players.map(p => renderPlayerCard(p)).join('')}
      </div>
    `}

    <!-- Modal -->
    <div class="modal-overlay" id="playerModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title" id="modalTitle">Add Player</h3>
          <button class="modal-close" id="modalClose">✕</button>
        </div>
        <form id="playerForm">
          <input type="hidden" id="editPlayerId" />
          <div class="form-group">
            <label class="form-label" for="playerName">Name</label>
            <input type="text" class="form-input" id="playerName" placeholder="Enter player name" required autocomplete="off" />
          </div>
          <div class="form-group">
            <label class="form-label">Handedness</label>
            <div class="pill-group">
              <label class="pill-option">
                <input type="radio" name="handedness" value="right" checked />
                <span class="pill-label">🫱 Right</span>
              </label>
              <label class="pill-option">
                <input type="radio" name="handedness" value="left" />
                <span class="pill-label">🫲 Left</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Skill Level</label>
            <div class="pill-group">
              <label class="pill-option">
                <input type="radio" name="skillTag" value="beginner" />
                <span class="pill-label">🌱 Beginner</span>
              </label>
              <label class="pill-option">
                <input type="radio" name="skillTag" value="intermediate" checked />
                <span class="pill-label">⚡ Intermediate</span>
              </label>
              <label class="pill-option">
                <input type="radio" name="skillTag" value="advanced" />
                <span class="pill-label">🔥 Advanced</span>
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="modalCancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="modalSubmit">Add Player</button>
          </div>
        </form>
      </div>
    </div>
  `;

    // Bind events
    const addBtn = container.querySelector('#btnAddPlayer');
    const addBtnEmpty = container.querySelector('#btnAddPlayerEmpty');
    modalOverlay = container.querySelector('#playerModal');

    const openModal = (player = null) => {
        const title = container.querySelector('#modalTitle');
        const submit = container.querySelector('#modalSubmit');
        const form = container.querySelector('#playerForm');
        form.reset();

        if (player) {
            title.textContent = 'Edit Player';
            submit.textContent = 'Save Changes';
            container.querySelector('#editPlayerId').value = player.id;
            container.querySelector('#playerName').value = player.name;
            container.querySelector(`input[name="handedness"][value="${player.handedness}"]`).checked = true;
            container.querySelector(`input[name="skillTag"][value="${player.skillTag}"]`).checked = true;
        } else {
            title.textContent = 'Add Player';
            submit.textContent = 'Add Player';
            container.querySelector('#editPlayerId').value = '';
        }
        modalOverlay.classList.add('active');
        setTimeout(() => container.querySelector('#playerName').focus(), 100);
    };

    const closeModal = () => {
        modalOverlay.classList.remove('active');
    };

    addBtn?.addEventListener('click', () => openModal());
    addBtnEmpty?.addEventListener('click', () => openModal());
    container.querySelector('#modalClose').addEventListener('click', closeModal);
    container.querySelector('#modalCancel').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // Form submit
    container.querySelector('#playerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = container.querySelector('#playerName').value.trim();
        const handedness = container.querySelector('input[name="handedness"]:checked').value;
        const skillTag = container.querySelector('input[name="skillTag"]:checked').value;
        const editId = container.querySelector('#editPlayerId').value;

        if (!name) return;

        if (editId) {
            updatePlayer(editId, { name, handedness, skillTag });
            window.showToast?.('Player updated!', 'success');
        } else {
            addPlayer({ name, handedness, skillTag });
            window.showToast?.('Player added!', 'success');
        }

        closeModal();
        render(container);
    });

    // Edit / Delete buttons
    container.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const player = getPlayers().find(p => p.id === btn.dataset.edit);
            if (player) openModal(player);
        });
    });

    container.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this player? This cannot be undone.')) {
                deletePlayer(btn.dataset.delete);
                window.showToast?.('Player deleted', 'info');
                render(container);
            }
        });
    });
}

function renderPlayerCard(player) {
    const record = getWinLoss(player.id);
    const streak = getCurrentStreak(player.id);
    const handIcon = player.handedness === 'left' ? '🫲' : '🫱';
    const skillEmoji = { beginner: '🌱', intermediate: '⚡', advanced: '🔥' }[player.skillTag] || '⚡';

    return `
    <div class="card" style="position: relative; overflow: hidden;">
      <div style="display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4);">
        <div class="avatar" style="background: ${colorFromString(player.name)}; width: 48px; height: 48px; font-size: var(--font-lg);">
          ${player.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; font-size: var(--font-md);">${player.name}</div>
          <div style="font-size: var(--font-xs); color: var(--text-muted);">${handIcon} ${player.handedness} · ${skillEmoji} ${player.skillTag}</div>
        </div>
        <div style="display: flex; gap: var(--space-1);">
          <button class="btn btn-ghost btn-icon" data-edit="${player.id}" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-ghost btn-icon" data-delete="${player.id}" title="Delete" style="color: var(--danger);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); text-align: center;">
        <div>
          <div style="font-size: var(--font-xl); font-weight: 800; color: var(--primary-light);">${player.singlesElo}</div>
          <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Singles</div>
        </div>
        <div>
          <div style="font-size: var(--font-xl); font-weight: 800; color: var(--accent-light);">${player.doublesElo}</div>
          <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Doubles</div>
        </div>
        <div>
          <div style="font-size: var(--font-xl); font-weight: 800;">${record.winRate}%</div>
          <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${record.wins}W ${record.losses}L</div>
        </div>
      </div>
      ${streak.count > 1 ? `
        <div style="margin-top: var(--space-3); text-align: center;">
          <span class="badge ${streak.type === 'W' ? 'badge-success' : 'badge-danger'}">${streak.count} ${streak.type === 'W' ? 'Win' : 'Loss'} Streak</span>
        </div>
      ` : ''}
    </div>
  `;
}

export function destroyPlayers() {
    modalOverlay = null;
}
