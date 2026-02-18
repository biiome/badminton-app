// ===== Scoring Page — Live Game =====
import { getPlayers, getPlayer, addGame, updatePlayer, addEloSnapshot, colorFromString } from '../data/store.js';
import { expectedWinProbability, processGameElo, teamElo } from '../data/elo.js';

let gameState = null;

export function renderScoring(container) {
    if (gameState && gameState.inProgress) {
        renderLiveGame(container);
    } else {
        renderSetup(container);
    }
}

function renderSetup(container) {
    const players = getPlayers();

    container.innerHTML = `
    <div class="page-header">
      <h2>New Game</h2>
      <p>Set up and score a badminton match</p>
    </div>

    ${players.length < 2 ? `
      <div class="empty-state">
        <div class="empty-icon">🏸</div>
        <h3>Not enough players</h3>
        <p>You need at least 2 players for singles or 4 for doubles.</p>
        <a href="#/players" class="btn btn-primary btn-lg">Add Players</a>
      </div>
    ` : `
      <div class="card" style="max-width: 700px;">
        <h3 class="card-title" style="margin-bottom: var(--space-6);">Game Setup</h3>

        <div class="form-group">
          <label class="form-label">Format</label>
          <div class="pill-group" id="formatPills">
            <label class="pill-option"><input type="radio" name="format" value="singles" /><span class="pill-label">Singles</span></label>
            <label class="pill-option"><input type="radio" name="format" value="doubles" checked /><span class="pill-label">Doubles</span></label>
            <label class="pill-option"><input type="radio" name="format" value="mixed_doubles" /><span class="pill-label">Mixed Doubles</span></label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Points to Win</label>
            <select class="form-select" id="targetPoints">
              <option value="15">15 points</option>
              <option value="21" selected>21 points</option>
              <option value="30">30 points</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Win By</label>
            <select class="form-select" id="winBy">
              <option value="1">Win by 1</option>
              <option value="2" selected>Win by 2</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Deuce Cap</label>
            <select class="form-select" id="deuceCap">
              <option value="0">No cap</option>
              <option value="25">25</option>
              <option value="30" selected>30</option>
              <option value="40">40</option>
            </select>
          </div>
        </div>

        <!-- Team Selection -->
        <div id="teamSelection">
          <div class="form-group">
            <label class="form-label">Team A</label>
            <div class="player-select-grid" id="teamASelect"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Team B</label>
            <div class="player-select-grid" id="teamBSelect"></div>
          </div>
        </div>

        <!-- Pre-game odds -->
        <div id="preGameOdds" style="display: none; margin-top: var(--space-4);">
          <div class="card" style="background: var(--bg-input); padding: var(--space-4);">
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2); font-size: var(--font-sm);">
              <span id="oddsTeamA" style="font-weight: 600;"></span>
              <span id="oddsTeamB" style="font-weight: 600;"></span>
            </div>
            <div class="prob-bar">
              <div class="prob-fill-a" id="probFillA" style="width: 50%;"></div>
              <div class="prob-fill-b" id="probFillB" style="width: 50%;"></div>
            </div>
          </div>
        </div>

        <div style="margin-top: var(--space-6);">
          <button class="btn btn-primary btn-lg" id="btnStartGame" disabled style="width: 100%;">Start Game</button>
        </div>
      </div>
    `}
  `;

    if (players.length < 2) return;

    const teamASelect = container.querySelector('#teamASelect');
    const teamBSelect = container.querySelector('#teamBSelect');
    let selectedA = [];
    let selectedB = [];

    function getFormat() {
        return container.querySelector('input[name="format"]:checked')?.value || 'doubles';
    }

    function getPlayersPerTeam() {
        return getFormat() === 'singles' ? 1 : 2;
    }

    function renderPlayerChips() {
        const perTeam = getPlayersPerTeam();
        teamASelect.innerHTML = players.map(p => {
            const inB = selectedB.includes(p.id);
            const inA = selectedA.includes(p.id);
            return `<button class="player-select-chip ${inA ? 'selected' : ''}" data-team="A" data-id="${p.id}" ${inB ? 'disabled style="opacity:0.3"' : ''}>
        <span class="handedness">${p.handedness === 'left' ? '🫲' : '🫱'}</span> ${p.name}
      </button>`;
        }).join('');

        teamBSelect.innerHTML = players.map(p => {
            const inA = selectedA.includes(p.id);
            const inB = selectedB.includes(p.id);
            return `<button class="player-select-chip ${inB ? 'selected' : ''}" data-team="B" data-id="${p.id}" ${inA ? 'disabled style="opacity:0.3"' : ''}>
        <span class="handedness">${p.handedness === 'left' ? '🫲' : '🫱'}</span> ${p.name}
      </button>`;
        }).join('');

        // Update start button
        const startBtn = container.querySelector('#btnStartGame');
        const valid = selectedA.length === perTeam && selectedB.length === perTeam;
        startBtn.disabled = !valid;

        // Show odds
        updateOdds();
    }

    function updateOdds() {
        const oddsDiv = container.querySelector('#preGameOdds');
        const perTeam = getPlayersPerTeam();
        if (selectedA.length === perTeam && selectedB.length === perTeam) {
            const format = getFormat();
            const isSingles = format === 'singles';
            const eloKey = isSingles ? 'singlesElo' : 'doublesElo';

            let eloA, eloB;
            if (isSingles) {
                eloA = getPlayer(selectedA[0])?.[eloKey] || 1200;
                eloB = getPlayer(selectedB[0])?.[eloKey] || 1200;
            } else {
                const pA = selectedA.map(id => getPlayer(id));
                const pB = selectedB.map(id => getPlayer(id));
                eloA = teamElo(pA[0]?.[eloKey] || 1200, pA[1]?.[eloKey] || 1200);
                eloB = teamElo(pB[0]?.[eloKey] || 1200, pB[1]?.[eloKey] || 1200);
            }

            const probA = expectedWinProbability(eloA, eloB);
            const probB = 1 - probA;
            const pctA = Math.round(probA * 100);
            const pctB = Math.round(probB * 100);

            container.querySelector('#oddsTeamA').textContent = `Team A — ${pctA}%`;
            container.querySelector('#oddsTeamB').textContent = `${pctB}% — Team B`;
            container.querySelector('#probFillA').style.width = `${pctA}%`;
            container.querySelector('#probFillB').style.width = `${pctB}%`;
            oddsDiv.style.display = 'block';
        } else {
            oddsDiv.style.display = 'none';
        }
    }

    function handleChipClick(e) {
        const chip = e.target.closest('.player-select-chip');
        if (!chip || chip.disabled) return;
        const team = chip.dataset.team;
        const id = chip.dataset.id;
        const perTeam = getPlayersPerTeam();
        const arr = team === 'A' ? selectedA : selectedB;

        if (arr.includes(id)) {
            arr.splice(arr.indexOf(id), 1);
        } else if (arr.length < perTeam) {
            arr.push(id);
        }
        renderPlayerChips();
    }

    teamASelect.addEventListener('click', handleChipClick);
    teamBSelect.addEventListener('click', handleChipClick);

    // Format change
    container.querySelector('#formatPills').addEventListener('change', () => {
        selectedA = [];
        selectedB = [];
        renderPlayerChips();
    });

    renderPlayerChips();

    // Start game
    container.querySelector('#btnStartGame').addEventListener('click', () => {
        const format = getFormat();
        const target = parseInt(container.querySelector('#targetPoints').value);
        const winBy = parseInt(container.querySelector('#winBy').value);
        const deuceCap = parseInt(container.querySelector('#deuceCap').value);

        gameState = {
            inProgress: true,
            format,
            teams: [selectedA.slice(), selectedB.slice()],
            scores: [0, 0],
            scoringRule: { target, winBy, deuceCap },
            history: [] // for undo
        };

        renderLiveGame(container);
    });
}

function renderLiveGame(container) {
    const { format, teams, scores, scoringRule } = gameState;
    const teamANames = teams[0].map(id => getPlayer(id)?.name || '?').join(' & ');
    const teamBNames = teams[1].map(id => getPlayer(id)?.name || '?').join(' & ');

    container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto; text-align: center;">
      <div style="margin-bottom: var(--space-4);">
        <span class="badge badge-primary">${format.replace('_', ' ')}</span>
        <span class="badge badge-accent" style="margin-left: var(--space-2);">First to ${scoringRule.target}</span>
      </div>

      <div class="card" style="padding: var(--space-8); margin-bottom: var(--space-6);">
        <div class="score-display">
          <div class="score-team">
            <div class="score-team-name">${teamANames}</div>
            <div class="score-value" id="scoreA" style="color: var(--primary-light);">${scores[0]}</div>
          </div>
          <div class="score-separator">—</div>
          <div class="score-team">
            <div class="score-team-name">${teamBNames}</div>
            <div class="score-value" id="scoreB" style="color: var(--accent-light);">${scores[1]}</div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-6);">
        <button class="score-btn" id="btnScoreA" style="border-color: hsla(var(--primary-h),50%,50%,0.3);">
          +1 ${teamANames}
        </button>
        <button class="score-btn" id="btnScoreB" style="border-color: hsla(var(--accent-h),50%,50%,0.3);">
          +1 ${teamBNames}
        </button>
      </div>

      <div style="display: flex; gap: var(--space-3); justify-content: center;">
        <button class="btn btn-outline" id="btnUndo" ${gameState.history.length === 0 ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Undo
        </button>
        <button class="btn btn-danger" id="btnAbort">Abandon Game</button>
      </div>
    </div>
  `;

    const scoreA = container.querySelector('#scoreA');
    const scoreB = container.querySelector('#scoreB');

    function animateScore(el) {
        el.classList.remove('pulse');
        void el.offsetWidth; // reflow
        el.classList.add('pulse');
    }

    function checkWin() {
        const { target, winBy, deuceCap } = scoringRule;
        const [a, b] = gameState.scores;

        // Deuce cap: if cap hit, whoever reaches it wins
        if (deuceCap > 0 && (a >= deuceCap || b >= deuceCap)) {
            return a >= deuceCap ? 0 : 1;
        }

        if (a >= target && a - b >= winBy) return 0;
        if (b >= target && b - a >= winBy) return 1;
        return -1;
    }

    function addPoint(teamIdx) {
        gameState.history.push([...gameState.scores]);
        gameState.scores[teamIdx]++;

        scoreA.textContent = gameState.scores[0];
        scoreB.textContent = gameState.scores[1];
        animateScore(teamIdx === 0 ? scoreA : scoreB);

        container.querySelector('#btnUndo').disabled = false;

        const winner = checkWin();
        if (winner >= 0) {
            finishGame(container, winner);
        }
    }

    container.querySelector('#btnScoreA').addEventListener('click', () => addPoint(0));
    container.querySelector('#btnScoreB').addEventListener('click', () => addPoint(1));

    container.querySelector('#btnUndo').addEventListener('click', () => {
        if (gameState.history.length === 0) return;
        gameState.scores = gameState.history.pop();
        scoreA.textContent = gameState.scores[0];
        scoreB.textContent = gameState.scores[1];
        container.querySelector('#btnUndo').disabled = gameState.history.length === 0;
    });

    container.querySelector('#btnAbort').addEventListener('click', () => {
        if (confirm('Abandon this game? No data will be saved.')) {
            gameState = null;
            renderSetup(container);
        }
    });
}

function finishGame(container, winnerIdx) {
    const { format, teams, scores, scoringRule } = gameState;
    gameState.inProgress = false;

    // Save game
    const game = addGame({
        format,
        teams,
        scores: [...scores],
        scoringRule,
        winner: winnerIdx
    });

    // Process ELO
    const playerMap = {};
    for (const team of teams) {
        for (const id of team) {
            playerMap[id] = getPlayer(id);
        }
    }

    const eloUpdates = processGameElo(game, playerMap);
    const eloKey = format === 'singles' ? 'singlesElo' : 'doublesElo';

    for (const update of eloUpdates) {
        updatePlayer(update.playerId, { [eloKey]: update.newElo });
        const p = getPlayer(update.playerId);
        addEloSnapshot(update.playerId, p.singlesElo, p.doublesElo, game.id);
    }

    // Show results
    const winnerNames = teams[winnerIdx].map(id => getPlayer(id)?.name || '?').join(' & ');

    container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto; text-align: center;" class="page-enter">
      <div style="font-size: 4rem; margin-bottom: var(--space-4);">🏆</div>
      <h2 style="font-size: var(--font-2xl); margin-bottom: var(--space-2);">${winnerNames} Wins!</h2>
      <div style="font-size: var(--font-3xl); font-weight: 900; margin-bottom: var(--space-6); color: var(--text-secondary);">
        ${scores[0]} — ${scores[1]}
      </div>

      <div class="card" style="margin-bottom: var(--space-6);">
        <h3 class="card-title" style="margin-bottom: var(--space-4);">ELO Changes</h3>
        ${eloUpdates.map(u => {
        const p = getPlayer(u.playerId);
        const sign = u.change >= 0 ? '+' : '';
        const cls = u.change >= 0 ? 'badge-success' : 'badge-danger';
        return `
            <div class="leaderboard-row">
              <div class="avatar" style="background: ${colorFromString(p?.name || '?')}">${(p?.name || '?').charAt(0).toUpperCase()}</div>
              <div class="leaderboard-info">
                <div class="leaderboard-name">${p?.name || '?'}</div>
                <div class="leaderboard-meta">${u.oldElo} → ${u.newElo}</div>
              </div>
              <span class="badge ${cls}">${sign}${u.change}</span>
            </div>
          `;
    }).join('')}
      </div>

      <div style="display: flex; gap: var(--space-3); justify-content: center;">
        <button class="btn btn-primary btn-lg" id="btnNewGame">New Game</button>
        <a href="#/history" class="btn btn-outline btn-lg">View History</a>
      </div>
    </div>
  `;

    container.querySelector('#btnNewGame').addEventListener('click', () => {
        gameState = null;
        renderSetup(container);
    });

    window.showToast?.(`${winnerNames} wins! 🏆`, 'success');
}

export function destroyScoring() { }
