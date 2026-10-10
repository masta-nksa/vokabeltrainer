// Baut aus einer Wortliste ein Kreuzworträtsel-Gitter. Reine Rechnung ohne
// DOM: dieselben Wörter und derselbe Zufallsgenerator ergeben dasselbe Gitter.
//
// Verfahren: Wörter nacheinander so anlegen, dass sie ein schon liegendes
// kreuzen; von mehreren Versuchen mit verschiedener Reihenfolge gewinnt der,
// der die meisten Wörter unterbringt und am kompaktesten ist.

import { seededShuffle } from './rng.js';

/**
 * @typedef {Object} Entry
 * @property {string} id       Kennung des Worts
 * @property {string[]} letters  Buchstaben in Kleinschreibung, mit Akzenten
 * @property {number} row
 * @property {number} col
 * @property {'across' | 'down'} dir
 * @property {number} number   Nummer im Gitter
 *
 * @typedef {Object} Grid
 * @property {number} width
 * @property {number} height
 * @property {Entry[]} entries
 */

const ATTEMPTS = 40;
const key = (row, col) => `${row},${col}`;

/** Wo die Zellen eines Worts liegen. */
export function cellsOf(entry) {
    return entry.letters.map((letter, index) => ({
        letter,
        row: entry.row + (entry.dir === 'down' ? index : 0),
        col: entry.col + (entry.dir === 'across' ? index : 0)
    }));
}

/**
 * Darf das Wort hier liegen? Ja, wenn es mindestens ein Wort kreuzt, jede
 * belegte Zelle denselben Buchstaben trägt und es kein anderes Wort berührt,
 * ohne es zu kreuzen.
 * @returns {number} Zahl der Kreuzungen, 0 = geht nicht
 */
function fits(cells, letters, row, col, dir) {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;

    // Davor und dahinter muss frei sein, sonst entstünde ein längeres Wort.
    if (cells.has(key(row - dr, col - dc))) return 0;
    if (cells.has(key(row + dr * letters.length, col + dc * letters.length))) return 0;

    let crossings = 0;
    for (let i = 0; i < letters.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        const cell = cells.get(key(r, c));

        if (cell) {
            // Kreuzen ja, übereinanderlegen in derselben Richtung nein.
            if (cell.letter !== letters[i] || cell[dir]) return 0;
            crossings++;
        } else if (cells.has(key(r + dc, c + dr)) || cells.has(key(r - dc, c - dr))) {
            // Eine freie Zelle darf seitlich nichts berühren.
            return 0;
        }
    }
    return crossings;
}

function put(cells, entry) {
    for (const { letter, row, col } of cellsOf(entry)) {
        const cell = cells.get(key(row, col)) ?? { letter };
        cell[entry.dir] = true;
        cells.set(key(row, col), cell);
    }
}

function bounds(entries) {
    const all = entries.flatMap(cellsOf);
    const rows = all.map(cell => cell.row);
    const cols = all.map(cell => cell.col);
    return {
        top: Math.min(...rows), left: Math.min(...cols),
        height: Math.max(...rows) - Math.min(...rows) + 1,
        width: Math.max(...cols) - Math.min(...cols) + 1
    };
}

/** Ein Versuch: Wörter in der gegebenen Reihenfolge anlegen. */
function layout(words, rng, maxSide) {
    const cells = new Map();
    const entries = [];
    let waiting = [...words];

    const first = waiting.shift();
    entries.push({ id: first.id, letters: first.letters, row: 0, col: 0, dir: 'across' });
    put(cells, entries[0]);

    // Was beim ersten Durchgang keinen Anschluss findet, bekommt eine zweite
    // Chance, sobald mehr Wörter liegen.
    for (let pass = 0; pass < 2 && waiting.length > 0; pass++) {
        const left = [];

        for (const word of waiting) {
            let best = null;

            for (const [position, cell] of cells) {
                const [r, c] = position.split(',').map(Number);
                for (let i = 0; i < word.letters.length; i++) {
                    if (word.letters[i] !== cell.letter) continue;

                    for (const dir of ['across', 'down']) {
                        const row = dir === 'down' ? r - i : r;
                        const col = dir === 'across' ? c - i : c;
                        const crossings = fits(cells, word.letters, row, col, dir);
                        if (crossings === 0) continue;

                        const candidate = { id: word.id, letters: word.letters, row, col, dir };
                        const box = bounds([...entries, candidate]);
                        if (box.width > maxSide || box.height > maxSide) continue;

                        // Mehr Kreuzungen sind besser, dann die kleinere Fläche;
                        // der Zufall entscheidet bei Gleichstand.
                        const score = crossings * 1000 - box.width * box.height + rng();
                        if (!best || score > best.score) best = { candidate, score };
                    }
                }
            }

            if (best) {
                entries.push(best.candidate);
                put(cells, best.candidate);
            } else {
                left.push(word);
            }
        }

        waiting = left;
    }

    return entries;
}

/**
 * @param {{id: string, word: string}[]} words  Wörter ohne Leerzeichen
 * @param {import('./rng.js').Rng} rng
 * @param {{maxSide?: number}} [options]  Grösste Kantenlänge des Gitters
 * @returns {Grid}
 */
export function buildGrid(words, rng, { maxSide = 14 } = {}) {
    const prepared = words
        .map(entry => ({ id: entry.id, letters: [...entry.word.toLowerCase()] }))
        .filter(entry => entry.letters.length >= 2 && entry.letters.length <= maxSide);
    if (prepared.length === 0) return { width: 0, height: 0, entries: [] };

    let best = null;

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        // Lange Wörter zuerst geben das Gerüst; der Zufall variiert innerhalb.
        const order = seededShuffle(prepared, rng)
            .sort((a, b) => (attempt % 2 === 0 ? b.letters.length - a.letters.length : 0));
        const entries = layout(order, rng, maxSide);
        const box = bounds(entries);
        const quality = entries.length * 10000 - box.width * box.height;
        if (!best || quality > best.quality) best = { entries, box, quality };
    }

    // Auf den Ursprung schieben und nummerieren: von oben nach unten, von
    // links nach rechts; ein waagrechtes und ein senkrechtes Wort, die in
    // derselben Zelle beginnen, teilen sich die Nummer.
    const entries = best.entries
        .map(entry => ({ ...entry, row: entry.row - best.box.top, col: entry.col - best.box.left }))
        .sort((a, b) => a.row - b.row || a.col - b.col || (a.dir === 'across' ? -1 : 1));

    let number = 0;
    let last = null;
    for (const entry of entries) {
        const start = key(entry.row, entry.col);
        if (start !== last) number++;
        entry.number = number;
        last = start;
    }

    return { width: best.box.width, height: best.box.height, entries };
}
