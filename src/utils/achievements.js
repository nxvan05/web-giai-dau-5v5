const prisma = require('./prisma');
const log = require('./logger');

const ACHIEVEMENTS = {
    FIRST_BLOOD: { id: 'first_blood', name: 'First Blood', icon: 'fa-solid fa-droplet', color: 'text-red-500', desc: 'Thắng trận đấu đầu tiên' },
    ACE_MACHINE: { id: 'ace_machine', name: 'Ace Machine', icon: 'fa-solid fa-crosshairs', color: 'text-yellow-400', desc: 'Đạt MVP 3 trận' },
    UNBREAKABLE: { id: 'unbreakable', name: 'Unbreakable', icon: 'fa-solid fa-shield-halved', color: 'text-blue-400', desc: 'Thắng 5 trận tổng cộng' },
    CHAMPION: { id: 'champion', name: 'Champion', icon: 'fa-solid fa-crown', color: 'text-yellow-500', desc: 'Vô địch giải đấu' }
};

/**
 * Parses the achievements JSON string into an array
 * @param {string} str 
 * @returns {Array}
 */
function parseAchievements(str) {
    try {
        return JSON.parse(str || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * Checks and awards achievements to a player based on their stats
 * @param {string} discordId 
 */
async function checkAndAwardAchievements(discordId) {
    try {
        const player = await prisma.player.findFirst({ where: { discordId } });
        if (!player) return;

        const current = parseAchievements(player.achievements);
        let updated = false;

        if (player.wins >= 1 && !current.includes('first_blood')) {
            current.push('first_blood');
            updated = true;
        }

        if (player.wins >= 5 && !current.includes('unbreakable')) {
            current.push('unbreakable');
            updated = true;
        }

        if (player.mvps >= 3 && !current.includes('ace_machine')) {
            current.push('ace_machine');
            updated = true;
        }

        if (updated) {
            await prisma.player.update({
                where: { id: player.id },
                data: { achievements: JSON.stringify(current) }
            });
            log.info(`Awarded achievements to ${player.displayName}`, { newAchievements: current });
        }
    } catch (e) {
        log.error('Error awarding achievements', { error: e.message, discordId });
    }
}

module.exports = { ACHIEVEMENTS, parseAchievements, checkAndAwardAchievements };
