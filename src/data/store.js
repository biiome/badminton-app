// ===== Data Store — localStorage wrapper with event-based reactivity =====

const STORAGE_KEYS = {
    players: 'shuttle_players',
    games: 'shuttle_games',
    sessions: 'shuttle_sessions',
    eloHistory: 'shuttle_elo_history'
};

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('store-change', { detail: { key } }));
}

// ===== Players =====
export function getPlayers() {
    return load(STORAGE_KEYS.players) || [];
}

export function getPlayer(id) {
    return getPlayers().find(p => p.id === id) || null;
}

export function addPlayer({ name, handedness = 'right', skillTag = 'intermediate' }) {
    const players = getPlayers();
    const eloSeed = { beginner: 800, intermediate: 1200, advanced: 1600 };
    const player = {
        id: uid(),
        name: name.trim(),
        handedness,
        skillTag,
        singlesElo: eloSeed[skillTag] || 1200,
        doublesElo: eloSeed[skillTag] || 1200,
        createdAt: new Date().toISOString()
    };
    players.push(player);
    save(STORAGE_KEYS.players, players);
    return player;
}

export function updatePlayer(id, updates) {
    const players = getPlayers();
    const idx = players.findIndex(p => p.id === id);
    if (idx === -1) return null;
    players[idx] = { ...players[idx], ...updates };
    save(STORAGE_KEYS.players, players);
    return players[idx];
}

export function deletePlayer(id) {
    const players = getPlayers().filter(p => p.id !== id);
    save(STORAGE_KEYS.players, players);
}

// ===== Games =====
export function getGames() {
    return load(STORAGE_KEYS.games) || [];
}

export function getGame(id) {
    return getGames().find(g => g.id === id) || null;
}

export function addGame(gameData) {
    const games = getGames();
    const game = {
        id: uid(),
        ...gameData,
        timestamp: new Date().toISOString()
    };
    games.push(game);
    save(STORAGE_KEYS.games, games);
    return game;
}

export function deleteGame(id) {
    const games = getGames().filter(g => g.id !== id);
    save(STORAGE_KEYS.games, games);
}

// ===== Sessions =====
export function getSessions() {
    return load(STORAGE_KEYS.sessions) || [];
}

export function getSession(id) {
    return getSessions().find(s => s.id === id) || null;
}

export function addSession(sessionData) {
    const sessions = getSessions();
    const session = {
        id: uid(),
        ...sessionData,
        createdAt: new Date().toISOString()
    };
    sessions.push(session);
    save(STORAGE_KEYS.sessions, sessions);
    return session;
}

export function updateSession(id, updates) {
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return null;
    sessions[idx] = { ...sessions[idx], ...updates };
    save(STORAGE_KEYS.sessions, sessions);
    return sessions[idx];
}

export function deleteSession(id) {
    const sessions = getSessions().filter(s => s.id !== id);
    save(STORAGE_KEYS.sessions, sessions);
}

// ===== ELO History =====
export function getEloHistory() {
    return load(STORAGE_KEYS.eloHistory) || [];
}

export function addEloSnapshot(playerId, singlesElo, doublesElo, gameId) {
    const history = getEloHistory();
    history.push({
        playerId,
        singlesElo,
        doublesElo,
        gameId,
        timestamp: new Date().toISOString()
    });
    save(STORAGE_KEYS.eloHistory, history);
}

// ===== Export / Import =====
export function exportAllData() {
    return JSON.stringify({
        players: getPlayers(),
        games: getGames(),
        sessions: getSessions(),
        eloHistory: getEloHistory(),
        exportedAt: new Date().toISOString()
    }, null, 2);
}

export function importAllData(jsonString) {
    const data = JSON.parse(jsonString);
    if (data.players) save(STORAGE_KEYS.players, data.players);
    if (data.games) save(STORAGE_KEYS.games, data.games);
    if (data.sessions) save(STORAGE_KEYS.sessions, data.sessions);
    if (data.eloHistory) save(STORAGE_KEYS.eloHistory, data.eloHistory);
}

// ===== Event Subscription =====
export function onStoreChange(callback) {
    const handler = (e) => callback(e.detail.key);
    window.addEventListener('store-change', handler);
    return () => window.removeEventListener('store-change', handler);
}

// ===== Utility: Color from string (for avatars) =====
export function colorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
}
