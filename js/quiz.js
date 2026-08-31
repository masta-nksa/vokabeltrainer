// Ablauf einer Lernrunde. Mode-unabhängig: welche Frage gestellt wird,
// entscheiden die Module unter js/modes.

import { state, startSession, endSession } from './state.js';
import { getMode } from './modes/index.js';
import * as storage from './storage/index.js';
import * as tts from './speech/tts.js';
import * as reward from './ui/reward.js';
import * as scoreboard from './ui/scoreboard.js';
import * as screens from './ui/screens.js';
import { shuffle } from './util.js';

const MAX_TRIES = 2;

/** @type {ReturnType<typeof getMode> | null} */
let mode = null;
/** @type {object | null} */
let question = null;
/** @type {(() => void) | null} */
let onLeave = null;

/** @param {{onLeave: () => void}} config */
export function init(config) {
    onLeave = config.onLeave;

    const field = document.getElementById('answer-input');

    document.getElementById('answer-form').addEventListener('submit', event => {
        event.preventDefault();
        submitTyped();
    });

    // Die Enter-Taste ist in diesem Modus der Hauptweg. Das preventDefault
    // unterdrückt das implizite Absenden des Formulars, damit die Antwort
    // nicht zweimal geprüft wird.
    field.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        submitTyped();
    });

    document.getElementById('quiz-speak')
        .addEventListener('click', () => speakPrompt());

    document.getElementById('quiz-home')
        .addEventListener('click', () => leave());

    document.getElementById('result-again')
        .addEventListener('click', () => restart(state.session?.items ?? []));

    document.getElementById('result-missed')
        .addEventListener('click', () => restart(missedItems()));

    document.getElementById('result-home')
        .addEventListener('click', () => leave());
}

/**
 * Startet eine Runde.
 * @param {string} modeId
 * @param {import('./storage/index.js').Deck} deck
 * @param {import('./storage/index.js').Item[]} items
 */
export function start(modeId, deck, items) {
    mode = getMode(modeId);
    startSession({ deck, items: shuffle(items), pool: items, mode: modeId });

    document.getElementById('quiz-title').textContent = mode.label;
    document.getElementById('quiz-subtitle').textContent = mode.description;

    reward.reset();
    screens.show('screen-quiz');
    nextQuestion();
}

function restart(items) {
    const session = state.session;
    if (!session || items.length === 0) return;
    start(session.mode, session.deck, items);
}

function missedItems() {
    const session = state.session;
    if (!session) return [];
    const ids = new Set(session.missed);
    return session.items.filter(item => ids.has(item.id));
}

function leave() {
    tts.stop();
    endSession();
    scoreboard.clear();
    onLeave?.();
}

// ------------------------------------------------------------------ Ablauf

function nextQuestion() {
    const session = state.session;
    if (!session) return;

    if (session.index >= session.items.length) {
        finish();
        return;
    }

    session.tries = 0;
    const item = session.items[session.index];
    question = mode.buildQuestion(item, session.pool);

    renderQuestion();
    scoreboard.render(session);
}

/** @param {string} side source oder target */
function langFor(side) {
    const deck = state.session?.deck;
    if (!deck) return 'en';
    return side === 'target' ? deck.targetLang : deck.sourceLang;
}

function renderQuestion() {
    const prompt = document.getElementById('quiz-prompt');
    prompt.textContent = question.prompt;
    prompt.lang = langFor(question.promptSide);

    document.getElementById('quiz-note').textContent = '';
    document.getElementById('quiz-speak').hidden = !question.speakPrompt;

    const optionsBox = document.getElementById('quiz-options');
    const form = document.getElementById('answer-form');
    const field = document.getElementById('answer-input');

    optionsBox.replaceChildren();

    if (mode.inputKind === 'choice') {
        form.hidden = true;
        optionsBox.hidden = false;

        for (const option of question.options) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'option';
            button.textContent = option;
            button.lang = langFor(question.answerSide);
            button.addEventListener('click', () => answer(option, button));
            optionsBox.append(button);
        }
    } else {
        optionsBox.hidden = true;
        form.hidden = false;
        field.value = '';
        field.lang = langFor(question.answerSide);
        field.classList.remove('wrong');
        field.focus();
    }

    if (question.speakPrompt) speakPrompt();
}

function speakPrompt() {
    if (question) tts.speak(question.prompt, langFor(question.promptSide));
}

/** Prüft, was im Eingabefeld steht. */
function submitTyped() {
    const field = document.getElementById('answer-input');
    if (field.value.trim() !== '') answer(field.value);
}

/**
 * Verarbeitet eine Antwort.
 * @param {string} given
 * @param {HTMLButtonElement} [button] Der angeklickte Knopf, falls vorhanden
 */
function answer(given, button) {
    const session = state.session;
    if (!session || !question) return;

    const result = mode.check(question, given);
    const note = document.getElementById('quiz-note');

    if (result.correct) {
        session.correct++;
        reward.better();
        button?.classList.add('right');
        tts.speak(question.answer, langFor(question.answerSide));
        resolveItem();
        scoreboard.render(session);
        window.setTimeout(nextQuestion, button ? 550 : 300);
        return;
    }

    session.wrong++;
    session.tries++;
    reward.worse();
    note.textContent = result.note ?? '';
    scoreboard.render(session);

    if (button) {
        // Falsch geklickt: Knopf sperren, die Frage bleibt stehen.
        button.classList.add('wrong');
        button.disabled = true;
        return;
    }

    const field = document.getElementById('answer-input');
    field.classList.add('wrong');
    window.setTimeout(() => field.classList.remove('wrong'), 400);

    if (session.tries >= MAX_TRIES) {
        field.value = question.answer;
        note.textContent = `Richtig wäre: ${question.answer}`;
        tts.speak(question.answer, langFor(question.answerSide));
        resolveItem();
        window.setTimeout(nextQuestion, 2500);
    }
}

/**
 * Schliesst den aktuellen Eintrag ab: protokollieren und weiterzählen.
 *
 * Protokolliert wird ein Datensatz pro Wort, nicht pro Tastendruck. `correct`
 * heisst hier: auf Anhieb gewusst.
 */
function resolveItem() {
    const session = state.session;
    if (!session) return;

    const item = session.items[session.index];
    const clean = session.tries === 0;

    if (!clean && !session.missed.includes(item.id)) session.missed.push(item.id);

    storage.logAttempt({
        deckId: session.deck.id,
        itemId: item.id,
        mode: session.mode,
        correct: clean,
        tries: session.tries
    }).catch(error => console.warn('Versuch konnte nicht gespeichert werden:', error));

    session.index++;
}

// --------------------------------------------------------------- Abschluss

function finish() {
    const session = state.session;
    if (!session) return;

    tts.stop();
    scoreboard.clear();

    const total = session.items.length;
    const solved = total - session.missed.length;

    document.getElementById('result-score').textContent =
        `${solved} von ${total} auf Anhieb richtig`;

    const list = document.getElementById('result-list');
    list.replaceChildren();

    const missed = missedItems();
    for (const item of missed) {
        const row = document.createElement('li');

        const target = document.createElement('strong');
        target.textContent = item.target;
        target.lang = session.deck.targetLang;

        const source = document.createElement('span');
        source.textContent = ` – ${item.source}`;
        source.lang = session.deck.sourceLang;

        row.append(target, source);
        list.append(row);
    }

    const hasMissed = missed.length > 0;
    document.getElementById('result-missed-box').hidden = !hasMissed;
    document.getElementById('result-missed').hidden = !hasMissed;

    if (!hasMissed) reward.reveal();

    screens.show('screen-result');
}
