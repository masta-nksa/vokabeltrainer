// Deck-Verwaltung: mitgelieferte Wortschätze laden, Einträge auswählen.

import * as storage from '../storage/index.js';

const BUILTIN_INDEX = 'data/decks/index.json';

/**
 * Lädt die mitgelieferten Decks in die Datenbank und hält sie aktuell.
 *
 * Läuft bei jedem Start. Ob ein Wortschatz neu geholt wird, entscheidet die
 * `version` in der Index-Datei: steht dort eine höhere Zahl als im Browser,
 * wird die Fassung ersetzt. Wer also eine Lektion ergänzt, zählt die Nummer
 * hoch und pusht – ohne das bliebe bei allen, die die Seite schon einmal
 * offen hatten, für immer der alte Stand liegen.
 *
 * Selbst importierte Wortschätze bleiben unangetastet, auch wenn sie
 * zufällig dieselbe Kennung tragen. Der Lernfortschritt hängt nicht am Deck,
 * sondern liegt in einem eigenen Speicher, und überlebt das Ersetzen.
 */
export async function ensureBuiltinDecks() {
    let index;
    try {
        // Ohne no-cache liefert der Browser die Index-Datei aus dem Cache und
        // eine frisch veröffentlichte Version fällt gar nicht erst auf.
        const response = await fetch(BUILTIN_INDEX, { cache: 'no-cache' });
        if (!response.ok) throw new Error(String(response.status));
        index = await response.json();
    } catch (error) {
        console.warn('Mitgelieferte Wortschätze nicht erreichbar:', error);
        return;
    }

    for (const entry of index.decks ?? []) {
        const local = await storage.getDeck(entry.id);
        if (local && !local.builtin) continue;
        if (local && (local.version ?? 0) >= (entry.version ?? 0)) continue;

        try {
            const response = await fetch(entry.file, { cache: 'no-cache' });
            if (!response.ok) throw new Error(String(response.status));
            const deck = await response.json();
            await storage.saveDeck({
                ...deck,
                builtin: true,
                version: deck.version ?? entry.version ?? 0
            });
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
