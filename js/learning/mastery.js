// Lernstand und Schwächenprofil, berechnet aus den protokollierten Antworten.
//
// Nichts hier wird gespeichert: Der Stand ist eine Projektion und lässt sich
// jederzeit aus den Antworten neu bilden. Ändert sich eine Regel, gilt sie
// rückwirkend, und ein späterer Abgleich zwischen Geräten muss nur Antworten
// zusammenführen, keine Stände.
//
// Reine Funktionen ohne Speicher und DOM – geprüft in tools/test-learning.mjs.

import { shuffle } from '../util.js';

const DAY = 24 * 60 * 60 * 1000;

// Lernkartei nach Leitner: Fach → Tage bis zur nächsten Wiederholung.
export const BOX_DAYS = [0, 1, 2, 4, 8, 16];
export const MAX_BOX = BOX_DAYS.length - 1;

// Ohne selbst geschrieben zu haben, kommt ein Wort nicht über dieses Fach.
const BOX_WITHOUT_WRITING = 3;

// Antworten aus der Zeit vor dem Fehlerprotokoll kennen ihre Fertigkeit nicht.
const SKILL_OF_MODE = { terms: 'recognize', spelling: 'spell', writing: 'produce' };

/**
 * @typedef {Object} Mastery
 * @property {string} itemId
 * @property {number} box        0 = noch nie richtig, 5 = sitzt
 * @property {number} due        Zeitpunkt der nächsten Wiederholung
 * @property {number} seen       Wie oft gefragt
 * @property {number} clean      Wie oft auf Anhieb richtig
 * @property {number} wrong
 * @property {number} lastTs
 * @property {number | null} promotedOn  Tag des letzten Aufstiegs
 */

/**
 * Der Stand jedes geübten Worts.
 *
 * Regeln: Ein Fehler wirft das Wort ins Fach 1 und macht es sofort fällig.
 * Auf Anhieb richtig lässt es ein Fach steigen – aber nur einmal pro Tag (wer
 * dreimal hintereinander übt, hat nicht dreimal gelernt), nur ab Niveau
 * Erweitert (Basis heisst «erkannt», nicht «sicher») und über Fach 3 hinaus
 * nur, wenn das Wort selbst geschrieben wurde.
 *
 * @param {import('../storage/index.js').Attempt[]} attempts
 * @returns {Map<string, Mastery>}
 */
export function projectMastery(attempts) {
    /** @type {Map<string, Mastery>} */
    const byItem = new Map();

    for (const attempt of [...attempts].sort((a, b) => a.ts - b.ts)) {
        // Übungsaufgaben und der Genus-Sortierer üben eine Regel, nicht das
        // Wort – sie bewegen keine Karte.
        if (attempt.mode === 'exercise' || attempt.skill === 'apply') continue;

        let entry = byItem.get(attempt.itemId);
        if (!entry) {
            entry = { itemId: attempt.itemId, box: 0, due: attempt.ts, seen: 0, clean: 0, wrong: 0, lastTs: 0, promotedOn: null };
            byItem.set(attempt.itemId, entry);
        }

        entry.seen++;
        entry.lastTs = attempt.ts;

        if (!attempt.correct) {
            entry.wrong++;
            entry.box = 1;
            entry.due = attempt.ts;
            continue;
        }

        entry.clean++;
        const level = attempt.level ?? 'erweitert';
        const skill = attempt.skill ?? SKILL_OF_MODE[attempt.mode] ?? 'recognize';
        const day = Math.floor(attempt.ts / DAY);

        if (level === 'basis') {
            entry.box = Math.max(entry.box, 1);
        } else if (entry.promotedOn !== day) {
            const limit = skill === 'produce' ? MAX_BOX : BOX_WITHOUT_WRITING;
            if (entry.box < limit) {
                entry.box++;
                entry.promotedOn = day;
            }
        }

        entry.due = attempt.ts + BOX_DAYS[entry.box] * DAY;
    }

    return byItem;
}

/**
 * @param {Mastery | undefined} entry
 * @returns {'new' | 'weak' | 'learning' | 'safe'}
 */
export function statusOf(entry) {
    if (!entry) return 'new';
    if (entry.box <= 1) return 'weak';
    if (entry.box <= BOX_WITHOUT_WRITING) return 'learning';
    return 'safe';
}

/** Ist das Wort zur Wiederholung dran? Unsichere Wörter sind es immer. */
export function isDue(entry, now) {
    return Boolean(entry) && (entry.box <= 1 || entry.due <= now);
}

/**
 * In welchem Modus ein Wort in der «Für dich»-Runde kommt: erst erkennen,
 * dann die Schreibweise, dann selbst schreiben.
 * @param {Mastery | undefined} entry
 */
export function stageMode(entry) {
    if (!entry || entry.box <= 1) return 'terms';
    if (entry.box === 2) return 'spelling';
    return 'writing';
}

/**
 * Wie viele Wörter einer Auswahl in welchem Zustand sind.
 * @param {import('../storage/index.js').Item[]} items
 * @param {Map<string, Mastery>} mastery
 * @param {number} now
 */
export function summarize(items, mastery, now) {
    const summary = { total: items.length, new: 0, weak: 0, learning: 0, safe: 0, due: 0, boxes: Array(MAX_BOX + 1).fill(0) };
    for (const item of items) {
        const entry = mastery.get(item.id);
        summary[statusOf(entry)]++;
        if (isDue(entry, now)) summary.due++;
        if (entry) summary.boxes[entry.box]++;
    }
    return summary;
}

/**
 * Stellt die «Für dich»-Runde zusammen: vor allem, was fällig oder unsicher
 * ist, dazu Neues und ein wenig Sicheres zur Bestätigung. Reicht eine Gruppe
 * nicht, füllen die anderen auf.
 *
 * @param {import('../storage/index.js').Item[]} items
 * @param {Map<string, Mastery>} mastery
 * @param {number} now
 * @param {number} [size]
 * @returns {{item: import('../storage/index.js').Item, mode: string}[]}
 */
export function pickForYou(items, mastery, now, size = 15) {
    const due = [];
    const fresh = [];
    const safe = [];

    for (const item of items) {
        const entry = mastery.get(item.id);
        if (!entry) fresh.push(item);
        else if (isDue(entry, now)) due.push(item);
        else safe.push(item);
    }

    // Das Dringendste zuerst: tiefes Fach, dann am längsten überfällig.
    const urgency = (a, b) => {
        const x = mastery.get(a.id);
        const y = mastery.get(b.id);
        return x.box - y.box || x.due - y.due;
    };
    due.sort(urgency);
    safe.sort((a, b) => mastery.get(a.id).due - mastery.get(b.id).due);
    // Neues in der Reihenfolge des Lehrmittels.

    const want = { due: Math.round(size * 0.6), fresh: Math.round(size * 0.3) };
    want.safe = size - want.due - want.fresh;

    const picked = [
        ...due.splice(0, want.due),
        ...fresh.splice(0, want.fresh),
        ...safe.splice(0, want.safe)
    ];
    for (const rest of [due, fresh, safe]) {
        while (picked.length < size && rest.length > 0) picked.push(rest.shift());
    }

    return shuffle(picked).map(item => ({ item, mode: stageMode(mastery.get(item.id)) }));
}

// ------------------------------------------------------------ Schwächen

/**
 * @typedef {Object} Profile
 * @property {{type: string, count: number, itemIds: string[], examples: {itemId: string, given: string}[]}[]} errorTypes
 *   Häufigste Fehlerarten, häufigste zuerst
 * @property {{a: string, b: string, count: number}[]} confusions  Verwechselte Paare
 * @property {{grammarId: string, exerciseId: string, total: number, clean: number}[]} grammar
 *   Grammatikpunkte, schwächster zuerst
 */

/**
 * Wo es hakt: Fehlerarten, Verwechslungen, Grammatikpunkte. Zählt nur die
 * letzten Wochen – ein Fehler vom Sommer soll im Herbst nicht mehr drücken.
 *
 * @param {import('../storage/index.js').Attempt[]} attempts
 * @param {number} now
 * @param {number} [days]
 * @returns {Profile}
 */
export function buildProfile(attempts, now, days = 30) {
    const since = now - days * DAY;
    const types = new Map();
    const pairs = new Map();
    const grammar = new Map();

    for (const attempt of attempts) {
        if (attempt.ts < since) continue;

        if (attempt.grammarId) {
            const entry = grammar.get(attempt.grammarId)
                ?? { grammarId: attempt.grammarId, exerciseId: attempt.exerciseId, total: 0, clean: 0 };
            entry.total++;
            if (attempt.correct) entry.clean++;
            grammar.set(attempt.grammarId, entry);
        }

        for (const error of attempt.errors ?? []) {
            if (error.type === 'unknown') continue;

            const entry = types.get(error.type) ?? { type: error.type, count: 0, itemIds: [], examples: [] };
            entry.count++;
            if (attempt.mode !== 'exercise' && !entry.itemIds.includes(attempt.itemId)) entry.itemIds.push(attempt.itemId);
            if (attempt.mode !== 'exercise' && entry.examples.length < 3
                && !entry.examples.some(example => example.itemId === attempt.itemId)) {
                entry.examples.push({ itemId: attempt.itemId, given: error.given });
            }
            types.set(error.type, entry);

            if (error.type === 'confusion' && error.confusedWith) {
                const [a, b] = [attempt.itemId, error.confusedWith].sort();
                const key = `${a}|${b}`;
                const pair = pairs.get(key) ?? { a, b, count: 0 };
                pair.count++;
                pairs.set(key, pair);
            }
        }
    }

    return {
        errorTypes: [...types.values()].sort((a, b) => b.count - a.count),
        confusions: [...pairs.values()].sort((a, b) => b.count - a.count),
        grammar: [...grammar.values()].sort((a, b) => a.clean / a.total - b.clean / b.total)
    };
}

/**
 * Wer wird mit wem verwechselt: Eintrag → seine Verwechslungspartner.
 * @param {Profile} profile
 * @returns {Map<string, string[]>}
 */
export function confusionPartners(profile) {
    const partners = new Map();
    for (const { a, b } of profile.confusions) {
        partners.set(a, [...(partners.get(a) ?? []), b]);
        partners.set(b, [...(partners.get(b) ?? []), a]);
    }
    return partners;
}

/**
 * Ist das nächste Niveau angebracht? Ja, wenn die letzten drei Runden auf
 * diesem Niveau fast fehlerfrei waren. Die App schlägt nur vor.
 * @param {{level: string, total: number, clean: number}[]} rounds  neueste zuletzt
 * @param {string} level
 */
export function readyForNextLevel(rounds, level) {
    const recent = rounds.filter(round => round.level === level && round.total >= 8).slice(-3);
    return recent.length === 3 && recent.every(round => round.clean / round.total >= 0.9);
}
