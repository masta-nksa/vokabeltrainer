// Modus "exercise": Anwendungsübungen zu einer Unit. Die Aufgabe kommt aus
// einem Übungsset (data/exercises), nicht aus dem Wortschatz. Zwei Formen:
// "gap" – Lücke ausfüllen (tippen), "mc" – aus Antworten wählen.
//
// Anders als die drei Wortschatz-Modi entscheidet hier jede Aufgabe selbst,
// ob getippt oder geklickt wird; quiz.js liest dafür question.inputKind.

import { shuffle, normalize } from '../util.js';

export const id = 'exercise';
export const label = 'Anwenden';
export const description = '';
export const inputKind = 'text'; // Rückfall, falls eine Aufgabe nichts sagt
export const showsImage = false;
export const speakAnswerOnCorrect = false;

/** @param {import('../data/exercises.js').Task} task */
export function buildQuestion(task) {
    const accept = Array.isArray(task.answer) ? task.answer : [task.answer];

    const question = {
        prompt: task.text,
        promptSide: 'target',
        speakPrompt: false,
        answer: accept[0],
        accept,
        answerSide: 'target',
        inputKind: Array.isArray(task.options) ? 'choice' : 'text',
        note: task.note ?? null
    };

    if (Array.isArray(task.options)) question.options = shuffle([...task.options]);
    return question;
}

export function check(question, given) {
    const hit = question.accept.some(candidate => normalize(candidate) === normalize(given));
    if (hit) return { correct: true };
    return { correct: false, note: question.note ?? undefined };
}
