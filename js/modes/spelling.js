// Modus "spelling": Das Wort in der Ausgangssprache erscheint, aus vier
// Schreibweisen des Zielworts ist die korrekte zu wählen.

import { shuffle, normalize, misspellings } from '../util.js';

export const id = 'spelling';
export const label = 'spelling';
export const description = 'Aus vier Schreibweisen die richtige erkennen';
export const inputKind = 'choice';

/**
 * @param {import('../storage/index.js').Item} item
 * @param {import('../storage/index.js').Item[]} pool
 */
export function buildQuestion(item, pool) {
    let variants = misspellings(item.target, 3);

    // Bei sehr kurzen Wörtern lassen sich kaum Varianten bilden. Dann treten
    // andere Wörter aus der Lektion als Ablenker an.
    if (variants.length < 3) {
        const others = pool
            .map(entry => entry.target)
            .filter(text => normalize(text) !== normalize(item.target) && !variants.includes(text));
        variants = [...variants, ...shuffle(others).slice(0, 3 - variants.length)];
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
