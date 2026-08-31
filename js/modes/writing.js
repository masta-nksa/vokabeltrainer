// Modus "writing": Das Wort in der Ausgangssprache erscheint, die Übersetzung
// wird eingetippt.

import { normalize, stripDiacritics } from '../util.js';

export const id = 'writing';
export const label = 'writing';
export const description = 'Übersetzung selbst schreiben';
export const inputKind = 'text';

/** @param {import('../storage/index.js').Item} item */
export function buildQuestion(item) {
    return {
        prompt: item.source,
        promptSide: 'source',
        speakPrompt: false,
        answer: item.target,
        answerSide: 'target'
    };
}

/**
 * Gross- und Kleinschreibung sowie Satzzeichen am Ende werden verziehen,
 * Akzente nicht. Fehlt nur ein Akzent, gibt es dafür einen gezielten Hinweis
 * statt einer wortlosen Ablehnung.
 */
export function check(question, given) {
    const expected = normalize(question.answer);
    const actual = normalize(given);

    if (actual === expected) return { correct: true };

    if (stripDiacritics(actual) === stripDiacritics(expected)) {
        return { correct: false, note: 'Fast! Achte auf die Akzente.' };
    }

    return { correct: false };
}
