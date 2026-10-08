// Modus "spelling": Das Wort in der Ausgangssprache erscheint, aus mehreren
// Schreibweisen des Zielworts ist die korrekte zu wählen.

import { shuffle, normalize, misspellings, optionCount } from '../util.js';
import { fromOperations } from '../learning/errors.js';

export const id = 'spelling';
export const label = 'spelling';
export const description = 'Aus mehreren Schreibweisen die richtige erkennen';
export const inputKind = 'choice';
export const skill = 'spell';

// Bild hilft, das Wort zu erkennen; die richtige Schreibweise muss trotzdem
// erkannt werden.
export const showsImage = true;

// Hier lohnt es sich: man hoert, wie sich die richtige Schreibweise anhoert.
export const speakAnswerOnCorrect = true;

// Wie viele Fehler pro Variante kombiniert werden und aus welchem
// Operationsumfang sie stammen. "erweitert" nutzt bereits alle Fehlerarten,
// "expert" kombiniert zwei davon – dadurch bietet jedes Niveau mehr Variation
// als das vorherige.
const LEVELS = {
    basis: { edits: 1, simpleOnly: true },
    erweitert: { edits: 1, simpleOnly: false },
    expert: { edits: 2, simpleOnly: false }
};

/**
 * @param {import('../storage/index.js').Item} item
 * @param {import('../storage/index.js').Item[]} pool
 * @param {import('../learning/levels.js').Level} [level]
 */
export function buildQuestion(item, pool, level = 'erweitert') {
    const settings = LEVELS[level] ?? LEVELS.erweitert;

    // Mehr Optionen bei höherem Niveau (Basis 4, Erweitert 6, Expert 8).
    const wanted = optionCount(level) - 1;

    // Jede Option muss sich von der richtigen Schreibweise und von jeder
    // anderen Option unterscheiden – sonst stehen zwei Buttons mit
    // identischem (und beide Male korrektem) Text zur Auswahl. Der Vergleich
    // läuft über normalize(), damit auch Gross-/Kleinschreibung und
    // Leerraum keine Dubletten durchlassen.
    const seen = new Set([normalize(item.target)]);
    const variants = [];

    // Zu jeder falschen Option ist bekannt, welcher Fehler in ihr steckt.
    // Wird sie gewählt, landet genau dieser Fehler im Protokoll.
    /** @type {Record<string, Omit<import('../learning/errors.js').ErrorEntry, 'given'>>} */
    const optionErrors = {};

    for (const candidate of misspellings(item.target, wanted + 4, settings)) {
        const key = normalize(candidate.text);
        if (seen.has(key)) continue;
        seen.add(key);
        variants.push(candidate.text);
        optionErrors[candidate.text] = fromOperations(candidate.ops);
        if (variants.length === wanted) break;
    }

    // Bei sehr kurzen Wörtern lassen sich kaum Varianten bilden. Dann treten
    // andere Wörter aus der Lektion als Ablenker an.
    if (variants.length < wanted) {
        for (const entry of shuffle(pool)) {
            const key = normalize(entry.target);
            if (seen.has(key)) continue;
            seen.add(key);
            variants.push(entry.target);
            optionErrors[entry.target] = { type: 'confusion', confusedWith: entry.id };
            if (variants.length === wanted) break;
        }
    }

    return {
        prompt: item.source,
        promptSide: 'source',
        speakPrompt: false,
        options: shuffle([item.target, ...variants]),
        optionErrors,
        answer: item.target,
        answerSide: 'target'
    };
}

export function check(question, given) {
    // Hier zählt die exakte Schreibweise, Akzente eingeschlossen.
    return { correct: given === question.answer };
}
