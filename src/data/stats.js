// ===== Stats Computation Module =====
import { getGames, getPlayers, getPlayer } from './store.js';

/**
 * Get all games a player has been involved in.
 */
export function getPlayerGames(playerId) {
    return getGames().filter(g =>
        g.teams.some(team => team.includes(playerId))
    );
}

/**
 * Win/loss record for a player.
 */
export function getWinLoss(playerId) {
    const games = getPlayerGames(playerId);
    let wins = 0, losses = 0;
    for (const g of games) {
        const teamIdx = g.teams.findIndex(t => t.includes(playerId));
        if (teamIdx === g.winner) wins++;
        else losses++;
    }
    return { wins, losses, total: games.length, winRate: games.length ? (wins / games.length * 100).toFixed(1) : '0.0' };
}

/**
 * Best partner: player with highest win rate when paired together.
 * Minimum 2 games together.
 */
export function getBestPartner(playerId) {
    const games = getPlayerGames(playerId).filter(g => g.format !== 'singles');
    const partnerMap = {}; // partnerId -> { wins, total }

    for (const g of games) {
        const teamIdx = g.teams.findIndex(t => t.includes(playerId));
        const team = g.teams[teamIdx];
        const partners = team.filter(id => id !== playerId);
        const won = teamIdx === g.winner;

        for (const pid of partners) {
            if (!partnerMap[pid]) partnerMap[pid] = { wins: 0, total: 0 };
            partnerMap[pid].total++;
            if (won) partnerMap[pid].wins++;
        }
    }

    let best = null;
    let bestRate = -1;
    for (const [pid, record] of Object.entries(partnerMap)) {
        if (record.total >= 2) {
            const rate = record.wins / record.total;
            if (rate > bestRate) {
                bestRate = rate;
                best = { playerId: pid, ...record, winRate: (rate * 100).toFixed(1) };
            }
        }
    }
    return best;
}

/**
 * Nemesis: opponent with worst win rate against.
 * Minimum 2 games against.
 */
export function getNemesis(playerId) {
    const games = getPlayerGames(playerId);
    const opponentMap = {}; // opponentId -> { wins, losses }

    for (const g of games) {
        const myTeam = g.teams.findIndex(t => t.includes(playerId));
        const won = myTeam === g.winner;
        const opponentTeam = g.teams[1 - myTeam];
        for (const oid of opponentTeam) {
            if (!opponentMap[oid]) opponentMap[oid] = { wins: 0, losses: 0, total: 0 };
            opponentMap[oid].total++;
            if (won) opponentMap[oid].wins++;
            else opponentMap[oid].losses++;
        }
    }

    let nemesis = null;
    let worstRate = Infinity;
    for (const [oid, record] of Object.entries(opponentMap)) {
        if (record.total >= 2) {
            const rate = record.wins / record.total;
            if (rate < worstRate) {
                worstRate = rate;
                nemesis = { playerId: oid, ...record, winRate: (rate * 100).toFixed(1) };
            }
        }
    }
    return nemesis;
}

/**
 * Most played against opponent.
 */
export function getMostPlayedAgainst(playerId) {
    const games = getPlayerGames(playerId);
    const counts = {};
    for (const g of games) {
        const myTeam = g.teams.findIndex(t => t.includes(playerId));
        const opponentTeam = g.teams[1 - myTeam];
        for (const oid of opponentTeam) {
            counts[oid] = (counts[oid] || 0) + 1;
        }
    }

    let maxId = null, maxCount = 0;
    for (const [oid, count] of Object.entries(counts)) {
        if (count > maxCount) { maxCount = count; maxId = oid; }
    }
    return maxId ? { playerId: maxId, count: maxCount } : null;
}

/**
 * Head-to-head record between two players.
 */
export function getHeadToHead(playerA, playerB) {
    const games = getGames().filter(g => {
        const hasA = g.teams.some(t => t.includes(playerA));
        const hasB = g.teams.some(t => t.includes(playerB));
        if (!hasA || !hasB) return false;
        // They must be on different teams
        const aTeam = g.teams.findIndex(t => t.includes(playerA));
        const bTeam = g.teams.findIndex(t => t.includes(playerB));
        return aTeam !== bTeam;
    });

    let aWins = 0, bWins = 0;
    for (const g of games) {
        const aTeam = g.teams.findIndex(t => t.includes(playerA));
        if (aTeam === g.winner) aWins++;
        else bWins++;
    }
    return { games: games.length, aWins, bWins };
}

/**
 * Longest win streak for a player.
 */
export function getLongestWinStreak(playerId) {
    const games = getPlayerGames(playerId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let maxStreak = 0, currentStreak = 0;
    for (const g of games) {
        const teamIdx = g.teams.findIndex(t => t.includes(playerId));
        if (teamIdx === g.winner) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }
    return maxStreak;
}

/**
 * Current streak (win or loss).
 */
export function getCurrentStreak(playerId) {
    const games = getPlayerGames(playerId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (games.length === 0) return { type: 'none', count: 0 };

    let streak = 0;
    const lastGame = games[games.length - 1];
    const lastTeam = lastGame.teams.findIndex(t => t.includes(playerId));
    const isWinning = lastTeam === lastGame.winner;

    for (let i = games.length - 1; i >= 0; i--) {
        const g = games[i];
        const teamIdx = g.teams.findIndex(t => t.includes(playerId));
        const won = teamIdx === g.winner;
        if (won === isWinning) streak++;
        else break;
    }

    return { type: isWinning ? 'W' : 'L', count: streak };
}

/**
 * Rivalries: opponents played against most, with H2H records.
 */
export function getRivalries(playerId) {
    const games = getPlayerGames(playerId);
    const opponents = {};

    for (const g of games) {
        const myTeam = g.teams.findIndex(t => t.includes(playerId));
        const won = myTeam === g.winner;
        const opponentTeam = g.teams[1 - myTeam];
        for (const oid of opponentTeam) {
            if (!opponents[oid]) opponents[oid] = { wins: 0, losses: 0, total: 0 };
            opponents[oid].total++;
            if (won) opponents[oid].wins++;
            else opponents[oid].losses++;
        }
    }

    return Object.entries(opponents)
        .map(([id, rec]) => ({ playerId: id, ...rec, winRate: (rec.wins / rec.total * 100).toFixed(1) }))
        .sort((a, b) => b.total - a.total);
}

/**
 * Get format breakdown: how many games in each format.
 */
export function getFormatBreakdown(playerId) {
    const games = getPlayerGames(playerId);
    const formats = {};
    for (const g of games) {
        formats[g.format] = (formats[g.format] || 0) + 1;
    }
    return formats;
}
