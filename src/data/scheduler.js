// ===== Session Scheduler =====
// Generates balanced doubles pairings that are fair but challenging.

/**
 * Generate a playing schedule for a session.
 * @param {Array<{id, name, doublesElo}>} players - Players in the session
 * @param {number} numRounds - Number of rounds to generate (default: auto)
 * @returns {Array<{round, teams: [[id,id],[id,id]], sitOut: [id]}>}
 */
export function generateSchedule(players, numRounds = null) {
    const n = players.length;
    if (n < 4) return [];

    // Default rounds: enough for everyone to play ~3 games each
    if (!numRounds) {
        numRounds = Math.max(3, Math.ceil((n * 3) / 4));
    }

    // Sort by ELO
    const sorted = [...players].sort((a, b) => b.doublesElo - a.doublesElo);
    const schedule = [];
    const pairCounts = {}; // "id1-id2" -> count of times paired together
    const opponentCounts = {}; // "id1-id2" -> count of times played against
    const gamesPlayed = {}; // id -> count of games

    for (const p of players) {
        gamesPlayed[p.id] = 0;
    }

    function pairKey(a, b) {
        return [a, b].sort().join('-');
    }

    function getPairCount(a, b) {
        return pairCounts[pairKey(a, b)] || 0;
    }

    function getOpponentCount(a, b) {
        return opponentCounts[pairKey(a, b)] || 0;
    }

    for (let round = 0; round < numRounds; round++) {
        // Select 4 players for this round
        // Prioritize players with fewer games, then add variety
        const available = [...players].sort((a, b) => {
            const gDiff = gamesPlayed[a.id] - gamesPlayed[b.id];
            if (gDiff !== 0) return gDiff; // fewer games first
            return Math.random() - 0.5; // random tiebreak
        });

        const selected = available.slice(0, 4);
        const sitOut = available.slice(4).map(p => p.id);

        // Find the best pairing that balances teams by ELO
        const pairings = getAllPairings(selected);
        let bestPairing = null;
        let bestScore = Infinity;

        for (const [teamA, teamB] of pairings) {
            const eloA = teamA.reduce((sum, p) => sum + p.doublesElo, 0);
            const eloB = teamB.reduce((sum, p) => sum + p.doublesElo, 0);
            const eloDiff = Math.abs(eloA - eloB);

            // Penalize repeated pairings
            const pairPenalty = getPairCount(teamA[0].id, teamA[1].id) * 100
                + getPairCount(teamB[0].id, teamB[1].id) * 100;

            // Penalize repeated opponents
            const opPenalty = getOpponentCount(teamA[0].id, teamB[0].id) * 50
                + getOpponentCount(teamA[0].id, teamB[1].id) * 50
                + getOpponentCount(teamA[1].id, teamB[0].id) * 50
                + getOpponentCount(teamA[1].id, teamB[1].id) * 50;

            const score = eloDiff + pairPenalty + opPenalty;
            if (score < bestScore) {
                bestScore = score;
                bestPairing = [teamA, teamB];
            }
        }

        if (bestPairing) {
            const [teamA, teamB] = bestPairing;
            const teams = [
                [teamA[0].id, teamA[1].id],
                [teamB[0].id, teamB[1].id]
            ];

            // Update counts
            pairCounts[pairKey(teams[0][0], teams[0][1])] = (pairCounts[pairKey(teams[0][0], teams[0][1])] || 0) + 1;
            pairCounts[pairKey(teams[1][0], teams[1][1])] = (pairCounts[pairKey(teams[1][0], teams[1][1])] || 0) + 1;

            for (const a of teams[0]) {
                for (const b of teams[1]) {
                    opponentCounts[pairKey(a, b)] = (opponentCounts[pairKey(a, b)] || 0) + 1;
                }
                gamesPlayed[a]++;
            }
            for (const b of teams[1]) {
                gamesPlayed[b]++;
            }

            schedule.push({
                round: round + 1,
                teams,
                sitOut
            });
        }
    }

    return schedule;
}

/**
 * Get all possible pairings of 4 players into 2 teams of 2.
 * Returns array of [[teamA], [teamB]]
 */
function getAllPairings(players) {
    if (players.length !== 4) return [];
    const [a, b, c, d] = players;
    return [
        [[a, b], [c, d]],
        [[a, c], [b, d]],
        [[a, d], [b, c]]
    ];
}
