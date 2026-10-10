// Anwendungsübungen zu einem Deck. Anders als Wortschätze werden sie nicht
// gespeichert – es gibt sie nur mitgeliefert, und die App holt sie bei Bedarf.
// Ein Deck ohne Datei hat einfach keine Übungen.

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {'gap' | 'mc'} type
 * @property {string} text          Aufgabenstellung; bei "gap" mit ___ als Lücke
 * @property {string | string[]} answer   akzeptierte Lösung(en)
 * @property {string[]} [options]   nur bei "mc"
 * @property {string} [note]        Hinweis, erscheint nach einem Fehlversuch
 *
 * @typedef {Object} ExerciseSet
 * @property {string} id
 * @property {string} unitId        an welche Unit die Übung hängt (z.B. "3_2")
 * @property {string} title
 * @property {string} [intro]
 * @property {Task[]} tasks
 */

import { groupOf } from './decks.js';

/** @type {Map<string, ExerciseSet[]>} */
const byDeck = new Map();

/**
 * Holt die Übungssets eines Decks (einmal pro Sitzung, dann aus dem Speicher).
 * @param {string} deckId
 * @returns {Promise<ExerciseSet[]>}
 */
export async function exercisesFor(deckId) {
    if (byDeck.has(deckId)) return byDeck.get(deckId);

    let sets = [];
    try {
        const response = await fetch(`data/exercises/${deckId}.json`, { cache: 'no-cache' });
        if (response.ok) sets = (await response.json()).sets ?? [];
    } catch {
        // kein Netz oder keine Datei – dann eben keine Übungen
    }

    // Aufgaben tragen ihre Kennung im JSON. Der Rückfall auf die Position ist
    // nur für Dateien ohne Kennungen da – wer dort eine Aufgabe einfügt,
    // verschiebt den Lernstand aller folgenden.
    for (const set of sets) {
        (set.tasks ?? []).forEach((task, index) => {
            task.id ??= `${set.id}-${String(index + 1).padStart(2, '0')}`;
        });
    }

    byDeck.set(deckId, sets);
    return sets;
}

/**
 * Die Sets, die zu mindestens einer der gewählten Lektionen passen: ein Set
 * hängt an einer Unit des Lehrmittels, die Lektion nennt ihre Unit (groupOf).
 * @param {ExerciseSet[]} sets
 * @param {import('../storage/index.js').Deck} deck
 * @param {string[]} unitIds
 */
export function setsForUnits(sets, deck, unitIds) {
    const wanted = new Set(unitIds);
    const groups = new Set(deck.units.filter(unit => wanted.has(unit.id)).map(groupOf));
    return sets.filter(set => groups.has(set.unitId));
}
