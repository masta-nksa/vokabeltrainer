// Kleine Helfer ohne eigene Zuständigkeit.

import { languageProfile } from './learning/languages.js';

/**
 * Mischt eine Kopie des Arrays (Fisher-Yates, gleichverteilt).
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Zieht bis zu `count` verschiedene Werte.
 * @template T
 * @param {T[]} pool
 * @param {number} count
 */
export function sample(pool, count) {
    return shuffle(pool).slice(0, count);
}

/** Entfernt Akzente: aus eleve mit Akzenten wird eleve ohne. */
export function stripDiacritics(text) {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Wie viele Antwortmöglichkeiten ein Auswahl-Modus anbietet. Mehr Optionen
 * heisst mehr zu lesen und weniger Ratewahrscheinlichkeit – darum steigt die
 * Zahl mit dem Niveau. Fehlt es an Kandidaten, zeigen die Modi entsprechend
 * weniger an.
 * @param {import('./learning/levels.js').Level} level
 */
export function optionCount(level) {
    return { basis: 4, erweitert: 6, expert: 8 }[level] ?? 4;
}

/**
 * Trennt einen führenden Artikel ab: "la grand-mère" → la + grand-mère,
 * "l'acteur" → l' + acteur. Ganze Sätze, lange Wendungen und Einträge mit
 * mehreren Formen ("les maths, les mathématiques (f pl)", "un/une enfant")
 * bleiben unberührt – dort ist das erste Wort nicht einfach der Artikel eines
 * Nomens. Welche Wörter Artikel sind, sagt das Sprachprofil.
 * @param {string} text
 * @param {string} lang BCP-47, nur der Sprachteil zählt
 * @returns {{article: string, rest: string, joiner: string} | null}
 */
export function splitArticle(text, lang) {
    const trimmed = text.trim();
    if (/[.!?]$/.test(trimmed) || /[,()/;]/.test(trimmed) || trimmed.split(/\s+/).length > 4) return null;

    const profile = languageProfile(lang);

    const elided = profile.elided ? trimmed.match(profile.elided) : null;
    if (elided) return { article: elided[1], rest: elided[2], joiner: '' };

    const match = trimmed.match(/^(\S+)\s+(.+)$/);
    if (!match || !profile.articles[match[1].toLowerCase()]) return null;
    return { article: match[1], rest: match[2], joiner: ' ' };
}

/**
 * Vereinheitlicht eine Antwort für den Vergleich: Kleinschreibung,
 * zusammengefasste Leerzeichen, kein Satzzeichen am Ende, ein einziges
 * Apostroph-Zeichen.
 *
 * iPads und Macs ersetzen das getippte ' standardmässig durch ’ – ohne die
 * Vereinheitlichung wäre "c’est" gegen "c'est" falsch.
 */
export function normalize(text) {
    return text
        .trim()
        .toLowerCase()
        .replace(/[’‘ʼ´`]/g, "'")
        .replace(/\s+/g, ' ')
        .replace(/[.!?;:]+$/, '');
}

function letterPositions(text) {
    return [...text]
        .map((char, index) => (/\p{L}/u.test(char) ? index : -1))
        .filter(index => index >= 0);
}

const pick = list => list[Math.floor(Math.random() * list.length)];

// Jede Operation arbeitet auf dem aktuellen Zwischenstand, nicht auf dem
// Original – so lassen sich mehrere Fehler nacheinander anwenden (Niveau
// Expert). `apply` liefert null, wenn die Operation auf diesem Text nicht
// greift. Der Name landet im Fehlerprotokoll: wer eine Variante wählt, hat
// genau diesen Fehler übersehen (siehe js/learning/errors.js).
const OPERATIONS = [
    {
        name: 'swap', // zwei benachbarte Buchstaben vertauschen
        apply(text) {
            const letters = [...text];
            const positions = letterPositions(text);
            const candidates = positions.filter((p, i) =>
                i < positions.length - 1 &&
                positions[i + 1] === p + 1 &&
                letters[p] !== letters[p + 1]);
            if (candidates.length === 0) return null;
            const p = pick(candidates);
            const copy = [...letters];
            [copy[p], copy[p + 1]] = [copy[p + 1], copy[p]];
            return copy.join('');
        }
    },
    {
        name: 'missing', // einen Buchstaben weglassen
        apply(text) {
            const positions = letterPositions(text);
            if (positions.length === 0) return null;
            const p = pick(positions);
            return text.slice(0, p) + text.slice(p + 1);
        }
    },
    {
        name: 'double', // einen Buchstaben verdoppeln
        apply(text) {
            const positions = letterPositions(text);
            if (positions.length === 0) return null;
            const p = pick(positions);
            return text.slice(0, p) + text[p] + text.slice(p);
        }
    },
    {
        name: 'accent', // Akzente verschlucken, der klassische Fehler im Französischen
        apply(text) {
            const plain = stripDiacritics(text);
            return plain === text ? null : plain;
        }
    },
    {
        name: 'replace', // einen Buchstaben durch einen anderen ersetzen
        apply(text) {
            const positions = letterPositions(text);
            if (positions.length === 0) return null;
            const p = pick(positions);
            const letters = [...text];
            const alphabet = 'abcdefghijklmnopqrstuvwxyz'.replace(letters[p].toLowerCase(), '');
            return text.slice(0, p) + pick([...alphabet]) + text.slice(p + 1);
        }
    }
];

// Auf Niveau Basis nur die offensichtlichen Fehler: fehlender oder
// doppelter Buchstabe. Vertauschung, Akzent- und Ersetzungsfehler sind
// subtiler und bleiben den höheren Niveaus vorbehalten.
const SIMPLE_OPERATIONS = OPERATIONS.filter(op => op.name === 'missing' || op.name === 'double');

/**
 * Erzeugt falsche Schreibweisen eines Wortes für den Modus "spelling".
 *
 * Der Aufrufer prüft die Ergebnisse zusätzlich gegen das Original und gegen
 * bereits vergebene Optionen (z.B. andere Wörter der Lektion) – hier wird
 * nur dafür gesorgt, dass innerhalb einer Charge keine Wiederholungen
 * entstehen.
 *
 * @param {string} word
 * @param {number} count
 * @param {{edits?: number, simpleOnly?: boolean}} [settings]
 *   `edits`: wie viele Fehler pro Variante kombiniert werden (Expert
 *   kombiniert mehrere). `simpleOnly`: nur offensichtliche Fehlerarten
 *   verwenden (Basis).
 * @returns {{text: string, ops: string[]}[]} Variante und die Namen der
 *   Operationen, die sie erzeugt haben
 */
export function misspellings(word, count = 3, { edits = 1, simpleOnly = false } = {}) {
    if (letterPositions(word).length < 2) return [];

    const operations = simpleOnly ? SIMPLE_OPERATIONS : OPERATIONS;
    /** @type {Map<string, string[]>} */
    const found = new Map();

    // Grosszügig oft versuchen: manche Operationen greifen bei kurzen Wörtern nicht.
    const maxAttempts = Math.max(60, count * 12);
    for (let attempt = 0; attempt < maxAttempts && found.size < count; attempt++) {
        let variant = word;
        const ops = [];
        for (let step = 0; step < edits; step++) {
            const op = pick(operations);
            const next = op.apply(variant);
            if (next && next.length > 0) {
                variant = next;
                ops.push(op.name);
            }
        }
        if (variant !== word && !found.has(variant)) found.set(variant, ops);
    }

    return [...found].slice(0, count).map(([text, ops]) => ({ text, ops }));
}
