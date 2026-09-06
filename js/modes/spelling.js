// Modus "spelling": Das Wort in der Ausgangssprache erscheint, aus vier
// Schreibweisen des Zielworts ist die korrekte zu wählen.

import { shuffle, normalize, misspellings } from '../util.js';

export const id = 'spelling';
export const label = 'spelling';
export const description = 'Aus vier Schreibweisen die richtige erkennen';
export const inputKind = 'choice';

// Bild hilft, das Wort zu erkennen; die richtige Schreibweise muss trotzdem
// erkannt werden.
export const showsImage = true;

// Hier lohnt es sich: man hoert, wie sich die richtige Schreibweise anhoert.
export const speakAnswerOnCorrect = true;

// Wie viele Fehler pro Variante kombiniert werden und aus welchem
// Operationsumfang sie stammen. "medium" nutzt bereits alle Fehlerarten,
// "hard" kombiniert zwei davon – dadurch bietet jede Stufe mehr Variation
// als die vorherige.
const DIFFICULTY = {
    easy: { edits: 1, simpleOnly: true },
    medium: { edits: 1, simpleOnly: false },
    hard: { edits: 2, simpleOnly: false }
};

/**
 * @param {import('../storage/index.js').Item} item
 * @param {import('../storage/index.js').Item[]} pool
 * @param {string} [difficulty]
 */
export function buildQuestion(item, pool, difficulty = 'medium') {
    const settings = DIFFICULTY[difficulty] ?? DIFFICULTY.medium;

    // Jede Option muss sich von der richtigen Schreibweise und von jeder
    // anderen Option unterscheiden – sonst stehen zwei Buttons mit
    // identischem (und beide Male korrektem) Text zur Auswahl. Der Vergleich
    // läuft über normalize(), damit auch Gross-/Kleinschreibung und
    // Leerraum keine Dubletten durchlassen.
    const seen = new Set([normalize(item.target)]);
    const variants = [];

    for (const candidate of misspellings(item.target, 6, settings)) {
        const key = normalize(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        variants.push(candidate);
        if (variants.length === 3) break;
    }

    // Bei sehr kurzen Wörtern lassen sich kaum Varianten bilden. Dann treten
    // andere Wörter aus der Lektion als Ablenker an.
    if (variants.length < 3) {
        for (const text of shuffle(pool.map(entry => entry.target))) {
            const key = normalize(text);
            if (seen.has(key)) continue;
            seen.add(key);
            variants.push(text);
            if (variants.length === 3) break;
        }
    }

    return {
        prompt: item.source,
        promptSide: 'source',
        speakPrompt: false,
        options: shuffle([item.target, ...variants]),
        answer: item.target,
        answerSide: 'target'
    };
}

export function check(question, given) {
    // Hier zählt die exakte Schreibweise, Akzente eingeschlossen.
    return { correct: given === question.answer };
}
