// Die drei Niveaus. Sie gelten für alle Modi; was ein Niveau in einem Modus
// konkret bedeutet, steht als kleine Tabelle im jeweiligen Modus.

/** @typedef {'basis' | 'erweitert' | 'expert'} Level */

/** @type {Level[]} */
export const LEVELS = ['basis', 'erweitert', 'expert'];

export const DEFAULT_LEVEL = 'erweitert';

// Bis Oktober 2026 hiessen die Stufen einfach/mittel/schwer und wurden unter
// dem Schlüssel "difficulty" gespeichert. Wer die App schon benutzt hat,
// behält seine Wahl.
const LEGACY = { easy: 'basis', medium: 'erweitert', hard: 'expert' };

/**
 * Macht aus einem gespeicherten Wert ein gültiges Niveau.
 * @param {unknown} value
 * @returns {Level}
 */
export function toLevel(value) {
    if (LEVELS.includes(/** @type {Level} */ (value))) return /** @type {Level} */ (value);
    return LEGACY[/** @type {string} */ (value)] ?? DEFAULT_LEVEL;
}
