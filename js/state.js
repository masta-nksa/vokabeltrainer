// Zentraler Anwendungszustand. Ein Ort, an dem steht, was gerade läuft.

/**
 * @typedef {Object} Session
 * @property {import('./storage/index.js').Deck} deck
 * @property {import('./storage/index.js').Item[]} items   Fragen dieser Runde
 * @property {import('./storage/index.js').Item[]} pool    Auswahlgrundlage für Ablenker
 * @property {string} mode
 * @property {import('./learning/levels.js').Level} level
 * @property {{title: string, subtitle: string, exerciseId?: string, grammarId?: string,
 *   source?: string, itemModes?: Record<string, string>, pool?: import('./storage/index.js').Item[]} | null} context
 *   Kopfzeile und Herkunft einer Runde, wenn sie nicht vom Modus selbst kommt
 *   (Anwendungsübungen). Sonst null.
 * @property {number} index
 * @property {number} correct
 * @property {number} wrong
 * @property {number} tries      Fehlversuche bei der aktuellen Frage
 * @property {import('./learning/errors.js').ErrorEntry[]} errors
 *   Fehler bei der aktuellen Frage, mit Eingabe und Fehlerklasse
 * @property {number} shownAt    Zeitpunkt, an dem die aktuelle Frage erschien
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
    /** @type {import('./learning/levels.js').Level} */
    level: 'erweitert',
    /** @type {import('./learning/insight.js').Insight | null} Lernstand zum gewählten Deck */
    insight: null,
    /** @type {Session | null} */
    session: null
};

/**
 * Startet eine neue Runde.
 * @param {{deck: import('./storage/index.js').Deck, items: import('./storage/index.js').Item[], pool: import('./storage/index.js').Item[], mode: string, level: import('./learning/levels.js').Level, context?: Session['context']}} config
 * @returns {Session}
 */
export function startSession({ deck, items, pool, mode, level, context = null }) {
    state.session = {
        deck, items, pool, mode, level, context,
        index: 0, correct: 0, wrong: 0, tries: 0, errors: [], shownAt: 0, missed: []
    };
    return state.session;
}

export function endSession() {
    state.session = null;
}
