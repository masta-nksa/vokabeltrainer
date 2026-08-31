// Zentraler Anwendungszustand. Ein Ort, an dem steht, was gerade läuft.

/**
 * @typedef {Object} Session
 * @property {import('./storage/index.js').Deck} deck
 * @property {import('./storage/index.js').Item[]} items   Fragen dieser Runde
 * @property {import('./storage/index.js').Item[]} pool    Auswahlgrundlage für Ablenker
 * @property {string} mode
 * @property {number} index
 * @property {number} correct
 * @property {number} wrong
 * @property {number} tries      Fehlversuche bei der aktuellen Frage
 * @property {string[]} missed   Einträge, die falsch beantwortet wurden
 */

export const state = {
    /** @type {string} */
    learnerName: '',
    /** @type {string} */
    hero: '',
    /** @type {import('./storage/index.js').Deck | null} */
    deck: null,
    /** @type {string[]} */
    selectedUnits: [],
    /** @type {Session | null} */
    session: null
};

/**
 * Startet eine neue Runde.
 * @param {{deck: import('./storage/index.js').Deck, items: import('./storage/index.js').Item[], pool: import('./storage/index.js').Item[], mode: string}} config
 * @returns {Session}
 */
export function startSession({ deck, items, pool, mode }) {
    state.session = {
        deck, items, pool, mode,
        index: 0, correct: 0, wrong: 0, tries: 0, missed: []
    };
    return state.session;
}

export function endSession() {
    state.session = null;
}
