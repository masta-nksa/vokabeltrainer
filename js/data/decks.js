// Deck-Verwaltung: mitgelieferte Wortschätze laden, Einträge auswählen.

import * as storage from '../storage/index.js';
import { splitArticle } from '../util.js';
import { languageProfile } from '../learning/languages.js';
import { LEVELS } from '../learning/levels.js';

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

    await retireReplaced(index.decks ?? []);
}

/**
 * Räumt mitgelieferte Decks weg, die in einem anderen aufgegangen sind
 * (`replaces` im Index, z.B. "fr-unite-1" → "fr-disdonc"). Der Lernstand
 * bleibt: das neue Deck führt die alten Kennungen als `aliases`.
 */
async function retireReplaced(entries) {
    for (const entry of entries) {
        for (const oldId of entry.replaces ?? []) {
            // Erst aufräumen, wenn der Nachfolger wirklich da ist.
            if (!await storage.getDeck(entry.id)) continue;

            const old = await storage.getDeck(oldId);
            if (old?.builtin) await storage.deleteDeck(oldId);

            if (await storage.getSetting('lastDeckId', null) === oldId) {
                await storage.setSetting('lastDeckId', entry.id);
            }
        }
    }
}

/**
 * Ergänzt, was sich aus dem Eintrag selbst ablesen lässt: Lemma (ohne
 * Artikel), Genus und Zahl aus dem Artikel, das Niveau. Im Deck muss nur
 * stehen, was sich nicht ableiten lässt – das Genus von "l'acteur" etwa.
 * Selbst importierte Wortschätze bekommen dieselben Felder, ohne dass die
 * CSV sie kennen müsste.
 * @param {import('../storage/index.js').Item} item
 * @param {string} lang Zielsprache des Decks
 * @returns {import('../storage/index.js').Item}
 */
export function enrichItem(item, lang) {
    const split = splitArticle(item.target, lang);
    const article = split ? languageProfile(lang).articles[split.article.toLowerCase()] : null;
    const sentence = /[.!?]$/.test(item.target.trim());

    return {
        ...item,
        lemma: item.lemma ?? (split ? split.rest : item.target),
        pos: item.pos ?? (split ? 'noun' : sentence ? 'phrase' : undefined),
        gender: item.gender ?? article?.gender,
        number: item.number ?? article?.number ?? (split ? 'sg' : undefined),
        level: LEVELS.includes(item.level) ? item.level : 'basis'
    };
}

/**
 * Macht ein gespeichertes Deck bereit für die App: Einträge angereichert.
 * Das gespeicherte Deck bleibt, wie es ist.
 * @param {import('../storage/index.js').Deck} deck
 * @returns {import('../storage/index.js').Deck}
 */
export function prepareDeck(deck) {
    return {
        ...deck,
        units: deck.units.map(unit => ({
            ...unit,
            items: unit.items.map(item => enrichItem(item, deck.targetLang))
        }))
    };
}

/** Gehört ein Eintrag zum gewählten Niveau? Jedes Niveau schliesst die tieferen ein. */
export function inLevel(item, level) {
    return LEVELS.indexOf(item.level ?? 'basis') <= LEVELS.indexOf(level);
}

/**
 * Alle Schreibweisen der Zielsprache: die Hauptform und weitere, die als
 * richtig gelten ("la géo" und "la géographie").
 * @param {import('../storage/index.js').Item} item
 * @returns {string[]}
 */
export function targetForms(item) {
    return [item.target, ...(item.accept ?? [])];
}

/**
 * Zu welcher Unit eine Lektion gehört. Neue Decks sagen es mit `group`; bei
 * älteren steckt es in der Kennung ("3_2-t1" gehört zu "3_2").
 * @param {import('../storage/index.js').Unit} unit
 */
export function groupOf(unit) {
    return unit.group ?? unit.id.replace(/-t\d+$/, '');
}

/**
 * Alle Einträge eines Decks aus den gewählten Lektionen, soweit sie zum
 * Niveau gehören. Ohne Niveau: alle.
 * @param {import('../storage/index.js').Deck} deck
 * @param {string[]} unitIds
 * @param {import('../learning/levels.js').Level} [level]
 * @returns {import('../storage/index.js').Item[]}
 */
export function itemsFrom(deck, unitIds, level) {
    const wanted = new Set(unitIds);
    return deck.units
        .filter(unit => wanted.has(unit.id))
        .flatMap(unit => unit.items)
        .filter(item => !level || inLevel(item, level));
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
