// Holt die Antworten zu einem Deck aus dem Speicher und macht daraus den
// Lernstand und das Schwächenprofil. Die Rechnung selbst steht in mastery.js.

import * as storage from '../storage/index.js';
import { projectMastery, buildProfile, confusionPartners } from './mastery.js';

/**
 * @typedef {Object} Insight
 * @property {string} deckId
 * @property {number} now
 * @property {Map<string, import('./mastery.js').Mastery>} mastery
 * @property {import('./mastery.js').Profile} profile
 * @property {Map<string, string[]>} confusions  Eintrag → Verwechslungspartner
 */

/**
 * Frühere Kennungen auf die heutigen abbilden. Ein Wort, das einmal
 * "lernziel-s-002" hiess und jetzt "u1-regle", behält so seine Geschichte.
 * @param {import('../storage/index.js').Deck} deck
 * @returns {Map<string, string>}
 */
export function aliasMap(deck) {
    const map = new Map();
    for (const unit of deck.units) {
        for (const item of unit.items) {
            for (const alias of item.aliases ?? []) map.set(alias, item.id);
        }
    }
    return map;
}

/**
 * Schreibt alte Kennungen in Antworten auf die heutigen um (auf Kopien).
 * @param {import('../storage/index.js').Attempt[]} attempts
 * @param {Map<string, string>} aliases
 */
export function canonicalize(attempts, aliases) {
    if (aliases.size === 0) return attempts;
    const current = id => aliases.get(id) ?? id;
    return attempts.map(attempt => ({
        ...attempt,
        itemId: current(attempt.itemId),
        errors: attempt.errors?.map(error =>
            (error.confusedWith ? { ...error, confusedWith: current(error.confusedWith) } : error))
    }));
}

/**
 * @param {import('../storage/index.js').Deck} deck
 * @returns {Promise<Insight>}
 */
export async function loadInsight(deck) {
    const user = storage.currentUserId();
    const deckIds = [deck.id, ...(deck.aliases ?? [])];
    const lists = await Promise.all(deckIds.map(id => storage.attemptsForDeck(id)));
    const attempts = canonicalize(lists.flat().filter(attempt => attempt.userId === user), aliasMap(deck));

    const now = Date.now();
    const profile = buildProfile(attempts, now);

    return {
        deckId: deck.id,
        now,
        mastery: projectMastery(attempts),
        profile,
        confusions: confusionPartners(profile)
    };
}
