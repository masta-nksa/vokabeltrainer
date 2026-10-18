// Modus "writing": Das Wort in der Ausgangssprache erscheint, die Übersetzung
// wird eingetippt.

import { normalize, stripDiacritics, splitArticle } from '../util.js';
import { targetForms } from '../data/decks.js';

export const id = 'writing';
export const label = 'Schreiben';
export const description = 'Übersetzung selbst schreiben';
export const inputKind = 'text';
export const skill = 'produce';

// Bild als Merkhilfe zum Wort; die Übersetzung wird trotzdem selbst getippt.
export const showsImage = true;

// Bestaetigt die getippte Form akustisch.
export const speakAnswerOnCorrect = true;

// Basis gibt den Artikel vor und verzeiht fehlende Akzente. Erweitert und
// Expert verlangen beides; nur Erweitert sagt nach einem Akzentfehler, woran
// es lag.
const LEVELS = {
    basis: { articleGiven: true, accentsCount: false, accentHint: true },
    erweitert: { articleGiven: false, accentsCount: true, accentHint: true },
    expert: { articleGiven: false, accentsCount: true, accentHint: false }
};

/**
 * @param {import('../storage/index.js').Item} item
 * @param {import('../storage/index.js').Item[]} pool
 * @param {import('../learning/levels.js').Level} [level]
 * @param {import('../storage/index.js').Deck} [deck]
 */
export function buildQuestion(item, pool, level = 'erweitert', deck) {
    const question = {
        prompt: item.source,
        promptSide: 'source',
        speakPrompt: false,
        answer: item.target,
        // Alle Schreibweisen, die gelten: "la géo" und "la géographie".
        accept: targetForms(item),
        answerSide: 'target'
    };

    // Vorgegebener Artikel steht vor dem Eingabefeld: "la ___". Eingetippt
    // wird nur der Rest. Haben die Schreibweisen verschiedene Artikel
    // ("un enfant", "une enfant"), wird keiner vorgegeben.
    const splits = question.accept.map(form => splitArticle(form, deck?.targetLang));
    const sameArticle = splits.every(entry =>
        entry && normalize(entry.article) === normalize(splits[0].article));
    const split = (LEVELS[level] ?? LEVELS.erweitert).articleGiven && sameArticle ? splits[0] : null;
    if (split) {
        question.lang = deck.targetLang;
        question.prefix = split.article;
        question.joiner = split.joiner;
        question.fieldAnswer = split.rest;
    }

    return question;
}

/**
 * Ergänzt den vorgegebenen Artikel zur vollständigen Antwort. Wer selbst
 * einen Artikel mittippt, wird beim Wort genommen – der richtige ist dann
 * kein Fehler, ein falscher ein Genus- oder Zahlfehler.
 * @param {{prefix?: string, joiner?: string, lang?: string}} question
 * @param {string} given
 */
export function completeAnswer(question, given) {
    if (!question.prefix || splitArticle(given, question.lang)) return given;
    return question.prefix + question.joiner + given.trim();
}

/**
 * Gross- und Kleinschreibung sowie Satzzeichen am Ende werden immer verziehen.
 * Fehlende Akzente zählen ab Niveau Erweitert als Fehler; auf Basis gilt die
 * Antwort als richtig, der Fehler wird aber als `tolerated` notiert, damit er
 * im Schwächenprofil auftaucht.
 */
export function check(question, given, level = 'erweitert') {
    const settings = LEVELS[level] ?? LEVELS.erweitert;
    const expected = (question.accept ?? [question.answer]).map(normalize);
    const actual = normalize(completeAnswer(question, given));

    if (expected.includes(actual)) return { correct: true };

    if (expected.some(form => stripDiacritics(actual) === stripDiacritics(form))) {
        if (!settings.accentsCount) {
            return { correct: true, tolerated: 'accent', note: 'Richtig! Achte beim nächsten Mal auch auf die Akzente.' };
        }
        return settings.accentHint
            ? { correct: false, note: 'Fast! Achte auf die Akzente.' }
            : { correct: false };
    }

    return { correct: false };
}
