// Deck-Verwaltung: mitgelieferte Wortschätze laden, Einträge auswählen.

import * as storage from '../storage/index.js';

const BUILTIN_INDEX = 'data/decks/index.json';

/**
 * Lädt die mitgelieferten Decks in die Datenbank, sofern noch nicht vorhanden.
 * Läuft bei jedem Start; bestehende Decks werden nicht überschrieben, damit
 * eigene Änderungen erhalten bleiben.
 */
export async function ensureBuiltinDecks() {
    let index;
    try {
        const response = await fetch(BUILTIN_INDEX);
        if (!response.ok) throw new Error(String(response.status));
        index = await response.json();
    } catch (error) {
        console.warn('Mitgelieferte Wortschätze nicht erreichbar:', error);
        return;
    }

    for (const entry of index.decks ?? []) {
        if (await storage.getDeck(entry.id)) continue;
        try {
            const response = await fetch(entry.file);
            if (!response.ok) throw new Error(String(response.status));
            const deck = await response.json();
            await storage.saveDeck({ ...deck, builtin: true });
        } catch (error) {
            console.warn(`Wortschatz ${entry.id} konnte nicht geladen werden:`, error);
        }
    }
}

/**
 * Alle Einträge eines Decks aus den gewählten Lektionen.
 * @param {import('../storage/index.js').Deck} deck
 * @param {string[]} unitIds
 * @returns {import('../storage/index.js').Item[]}
 */
export function itemsFrom(deck, unitIds) {
    const wanted = new Set(unitIds);
    return deck.units
        .filter(unit => wanted.has(unit.id))
        .flatMap(unit => unit.items);
}

/** @param {import('../storage/index.js').Deck} deck */
export function countItems(deck) {
    return deck.units.reduce((sum, unit) => sum + unit.items.length, 0);
}

/**
 * Sprachbezeichnung für die Anzeige.
 * @param {string} code BCP-47
 */
export function languageName(code) {
    try {
        return new Intl.DisplayNames(['de'], { type: 'language' }).of(code) ?? code;
    } catch {
        return code;
    }
}
