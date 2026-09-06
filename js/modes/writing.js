// Modus "writing": Das Wort in der Ausgangssprache erscheint, die Übersetzung
// wird eingetippt.

import { normalize, stripDiacritics } from '../util.js';

export const id = 'writing';
export const label = 'writing';
export const description = 'Übersetzung selbst schreiben';
export const inputKind = 'text';

// Bild als Merkhilfe zum Wort; die Übersetzung wird trotzdem selbst getippt.
export const showsImage = true;

// Bestaetigt die getippte Form akustisch.
export const speakAnswerOnCorrect = true;

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
 * Gross- und Kleinschreibung sowie Satzzeichen am Ende werden immer verziehen.
 * Fehlende Akzente zählen ab "medium" als Fehler (mit gezieltem Hinweis statt
 * wortloser Ablehnung); im leichten Modus werden sie noch als richtig
 * gewertet, damit die Einstiegsstufe wirklich leicht bleibt.
 */
export function check(question, given, difficulty = 'medium') {
    const expected = normalize(question.answer);
    const actual = normalize(given);

    if (actual === expected) return { correct: true };

    if (stripDiacritics(actual) === stripDiacritics(expected)) {
        if (difficulty === 'easy') {
            return { correct: true, note: 'Richtig! Achte beim nächsten Mal auch auf die Akzente.' };
        }
        return { correct: false, note: 'Fast! Achte auf die Akzente.' };
    }

    return { correct: false };
}
