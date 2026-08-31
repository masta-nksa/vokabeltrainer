// Die einzige Schnittstelle, über die der Rest der App an Daten kommt.
//
// Heute liegt dahinter IndexedDB im Browser. Wenn später ein Server dazukommt,
// wird genau dieses Modul ausgetauscht oder um eine Synchronisation ergänzt –
// die aufrufenden Module bleiben unverändert. Deshalb geht nichts an db.js
// vorbei.

import * as db from './db.js';

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} source   Wort in der Ausgangssprache
 * @property {string} target   Wort in der Zielsprache
 * @property {string} [hint]
 *
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} title
 * @property {Item[]} items
 *
 * @typedef {Object} Deck
 * @property {string} id
 * @property {string} title
 * @property {string} sourceLang  BCP-47, z.B. "de"
 * @property {string} targetLang  BCP-47, z.B. "fr"
 * @property {boolean} [builtin]
 * @property {Unit[]} units
 *
 * @typedef {Object} Attempt
 * @property {string} id
 * @property {string} userId    Vorerst immer "local"
 * @property {string} deckId
 * @property {string} itemId
 * @property {string} mode      terms | spelling | writing
 * @property {boolean} correct  Auf Anhieb gewusst
 * @property {number} tries     Fehlversuche vor der Lösung
 * @property {number} ts        Zeitstempel in ms
 */

/**
 * Kennung der lernenden Person. Solange es keinen Login gibt, ist das ein
 * fester Wert – das Feld existiert aber bereits in jedem Datensatz, damit
 * später nichts migriert werden muss.
 * @returns {string}
 */
export function currentUserId() {
    return 'local';
}

// ---------------------------------------------------------------- Decks

/** @returns {Promise<Deck[]>} */
export function listDecks() {
    return db.getAll('decks');
}

/** @returns {Promise<Deck | undefined>} */
export function getDeck(id) {
    return db.get('decks', id);
}

/** @param {Deck} deck */
export function saveDeck(deck) {
    return db.put('decks', deck);
}

export function deleteDeck(id) {
    return db.remove('decks', id);
}

export function countDecks() {
    return db.count('decks');
}

// -------------------------------------------------------------- Versuche

/**
 * Protokolliert eine einzelne Antwort.
 * @param {Omit<Attempt, 'id' | 'userId' | 'ts'>} attempt
 */
export function logAttempt(attempt) {
    return db.put('attempts', {
        ...attempt,
        id: crypto.randomUUID(),
        userId: currentUserId(),
        ts: Date.now()
    });
}

/** @returns {Promise<Attempt[]>} */
export function attemptsForDeck(deckId) {
    return db.getAllByIndex('attempts', 'byDeck', deckId);
}

/** @returns {Promise<Attempt[]>} */
export function attemptsForItem(itemId) {
    return db.getAllByIndex('attempts', 'byItem', itemId);
}

/** @returns {Promise<Attempt[]>} */
export function allAttempts() {
    return db.getAll('attempts');
}

// --------------------------------------------------------- Einstellungen

/**
 * @param {string} key
 * @param {*} [fallback]
 */
export async function getSetting(key, fallback = null) {
    const row = await db.get('settings', key);
    return row === undefined ? fallback : row.value;
}

export function setSetting(key, value) {
    return db.put('settings', { key, value });
}
