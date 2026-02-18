// ===== ELO Computation Module =====

/**
 * K-factor based on skill tag.
 * Higher K = faster rating change for beginners.
 */
export function getKFactor(skillTag) {
    const factors = { beginner: 40, intermediate: 24, advanced: 16 };
    return factors[skillTag] || 24;
}

/**
 * Expected win probability for player A vs player B.
 * @returns {number} 0-1 probability that A wins
 */
export function expectedWinProbability(eloA, eloB) {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calculate new ELO ratings after a match.
 * @param {number} winnerElo - Winner's current ELO
 * @param {number} loserElo - Loser's current ELO
 * @param {number} kWinner - K-factor for winner
 * @param {number} kLoser - K-factor for loser
 * @returns {{ newWinnerElo: number, newLoserElo: number, change: number }}
 */
export function calculateEloChange(winnerElo, loserElo, kWinner = 24, kLoser = 24) {
    const expectedWin = expectedWinProbability(winnerElo, loserElo);
    const expectedLose = 1 - expectedWin;

    const winnerChange = Math.round(kWinner * (1 - expectedWin));
    const loserChange = Math.round(kLoser * (0 - expectedLose));

    return {
        newWinnerElo: winnerElo + winnerChange,
        newLoserElo: Math.max(100, loserElo + loserChange), // floor at 100
        winnerChange,
        loserChange
    };
}

/**
 * Calculate team ELO for doubles.
 * We use a weighted average that slightly favors the weaker player
 * (pair strength ≠ sum of individuals).
 * Formula: teamElo = 0.6 * max(eloA, eloB) + 0.4 * min(eloA, eloB)
 * This ensures a strong+weak pair < two strong players.
 */
export function teamElo(elo1, elo2) {
    const hi = Math.max(elo1, elo2);
    const lo = Math.min(elo1, elo2);
    return Math.round(0.6 * hi + 0.4 * lo);
}

/**
 * Process a completed game and return ELO updates for all players.
 * Works for both singles and doubles.
 * @param {Object} game - { format, teams: [[id,...],[id,...]], winner: 0|1 }
 * @param {Object} playerMap - Map of playerId -> player object
 * @returns {Array<{ playerId, oldElo, newElo, change }>}
 */
export function processGameElo(game, playerMap) {
    const isSingles = game.format === 'singles';
    const eloKey = isSingles ? 'singlesElo' : 'doublesElo';
    const updates = [];

    const winTeam = game.teams[game.winner];
    const loseTeam = game.teams[1 - game.winner];

    if (isSingles) {
        const winner = playerMap[winTeam[0]];
        const loser = playerMap[loseTeam[0]];
        const kW = getKFactor(winner.skillTag);
        const kL = getKFactor(loser.skillTag);
        const result = calculateEloChange(winner[eloKey], loser[eloKey], kW, kL);

        updates.push(
            { playerId: winner.id, oldElo: winner[eloKey], newElo: result.newWinnerElo, change: result.winnerChange },
            { playerId: loser.id, oldElo: loser[eloKey], newElo: result.newLoserElo, change: result.loserChange }
        );
    } else {
        // Doubles: compute team ELO, then distribute change proportionally
        const winPlayers = winTeam.map(id => playerMap[id]);
        const losePlayers = loseTeam.map(id => playerMap[id]);

        const winTeamElo = teamElo(winPlayers[0][eloKey], winPlayers[1][eloKey]);
        const loseTeamElo = teamElo(losePlayers[0][eloKey], losePlayers[1][eloKey]);

        const avgKWin = (getKFactor(winPlayers[0].skillTag) + getKFactor(winPlayers[1].skillTag)) / 2;
        const avgKLose = (getKFactor(losePlayers[0].skillTag) + getKFactor(losePlayers[1].skillTag)) / 2;

        const result = calculateEloChange(winTeamElo, loseTeamElo, avgKWin, avgKLose);

        // Each player on winning team gets the full change
        for (const p of winPlayers) {
            updates.push({
                playerId: p.id,
                oldElo: p[eloKey],
                newElo: p[eloKey] + result.winnerChange,
                change: result.winnerChange
            });
        }
        for (const p of losePlayers) {
            updates.push({
                playerId: p.id,
                oldElo: p[eloKey],
                newElo: Math.max(100, p[eloKey] + result.loserChange),
                change: result.loserChange
            });
        }
    }

    return updates;
}
