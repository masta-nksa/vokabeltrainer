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
import { classify, editDistance, hintFor } from './learning/errors.js';
import { readyForNextLevel } from './learning/mastery.js';
import { LEVELS } from './learning/levels.js';
import { tasksFor } from './data/exercises.js';

const MAX_TRIES = 2;

/** @type {ReturnType<typeof getMode> | null} */
let mode = null;
/** @type {object | null} */
let question = null;
/** @type {(() => void) | null} */
let onLeave = null;
/** @type {((level: string) => void) | null} */
let onLevelUp = null;
/** Die Antwort ist ausgewertet, die Runde wartet auf «Weiter» oder die Pause. */
let waiting = false;
/** @type {number | null} */
let advanceTimer = null;

/** @param {{onLeave: () => void, onLevelUp: (level: string) => void}} config */
export function init(config) {
    onLeave = config.onLeave;
    onLevelUp = config.onLevelUp;

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
        if (waiting) advance();
        else submitTyped();
    });

    document.getElementById('quiz-next')
        .addEventListener('click', () => advance());

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

    document.getElementById('result-level-up').addEventListener('click', event => {
        const next = event.currentTarget.dataset.level;
        if (next) onLevelUp?.(next);
        document.getElementById('result-level').hidden = true;
    });
}

/**
 * Startet eine Runde.
 * @param {string} modeId
 * @param {import('./storage/index.js').Deck} deck
 * @param {import('./storage/index.js').Item[]} items
 * @param {import('./state.js').Session['context']} [context]
 *   Kopfzeile und Herkunft, wenn sie nicht vom Modus kommen (Übungssets,
 *   «Für dich»). `itemModes` gibt einzelnen Einträgen einen eigenen Modus,
 *   `pool` eine grössere Auswahl für die Ablenker als die Runde selbst.
 */
export function start(modeId, deck, items, context = null) {
    mode = getMode(modeId);
    startSession({
        deck, items: shuffle(items), pool: context?.pool ?? items,
        mode: modeId, level: state.level, context
    });

    document.getElementById('quiz-title').textContent = context?.title ?? mode.label;
    document.getElementById('quiz-subtitle').textContent = context?.subtitle ?? mode.description;
    document.getElementById('quiz-level').textContent =
        state.level.charAt(0).toUpperCase() + state.level.slice(1);

    reward.reset();
    screens.show('screen-quiz');
    nextQuestion();
}

/**
 * Startet eine Anwendungsübung.
 * @param {import('./storage/index.js').Deck} deck
 * @param {import('./data/exercises.js').ExerciseSet} set
 */
export function startExercise(deck, set) {
    const tasks = tasksFor(set, deck, state.level).map(task => ({ ...task }));
    if (tasks.length === 0) return;
    start('exercise', deck, tasks, {
        title: set.title,
        subtitle: set.intro ?? '',
        exerciseId: set.id,
        grammarId: set.grammarId
    });
}

function restart(items) {
    const session = state.session;
    if (!session || items.length === 0) return;
    start(session.mode, session.deck, items, session.context);
}

function missedItems() {
    const session = state.session;
    if (!session) return [];
    const ids = new Set(session.missed);
    return session.items.filter(item => ids.has(item.id));
}

function leave() {
    stopWaiting();
    hideFeedback();
    tts.stop();
    endSession();
    scoreboard.clear();
    onLeave?.();
}

// ------------------------------------------------------------------ Ablauf

function nextQuestion() {
    const session = state.session;
    if (!session) return;

    stopWaiting();
    hideFeedback();

    if (session.index >= session.items.length) {
        finish();
        return;
    }

    session.tries = 0;
    session.errors = [];
    session.shownAt = Date.now();
    const item = session.items[session.index];

    // In einer gemischten Runde bringt jedes Wort seinen Modus mit.
    const itemModes = session.context?.itemModes;
    if (itemModes) {
        mode = getMode(itemModes[item.id] ?? session.mode);
        document.getElementById('quiz-subtitle').textContent = mode.description;
    }

    question = mode.buildQuestion(item, session.pool, session.level, session.deck,
        { confusions: state.insight?.confusions });

    // Ein Bild wird nur in Modi gezeigt, die es nicht zu leicht machen – bei
    // "terms" stünde die Antwort sonst als Bild neben den vier Wörtern. Nur
    // Wortschatz-Einträge haben eins, Übungsaufgaben nicht.
    question.image = (mode.showsImage && item.image !== undefined)
        ? storage.resolveImage(session.deck, item)
        : null;

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

    renderFigure(question.image);

    document.getElementById('quiz-speak').hidden = !question.speakPrompt;

    const optionsBox = document.getElementById('quiz-options');
    const form = document.getElementById('answer-form');
    const field = document.getElementById('answer-input');
    const prefix = document.getElementById('answer-prefix');

    optionsBox.replaceChildren();

    // Bei Übungen entscheidet die einzelne Aufgabe, ob geklickt oder getippt
    // wird; die Wortschatz-Modi haben eine feste Eingabeart.
    const inputKind = question.inputKind ?? mode.inputKind;

    if (inputKind === 'choice') {
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

        // Auf Niveau Basis steht der Artikel schon da: "la ___".
        prefix.textContent = question.prefix ?? '';
        prefix.lang = field.lang;
        prefix.hidden = !question.prefix;

        field.placeholder = mode.id === 'exercise' ? 'Antwort eintippen' : 'Übersetzung eintippen';
        field.classList.remove('wrong');
        field.focus();
    }

    if (question.speakPrompt) speakPrompt();
}

/**
 * Zeigt Emoji oder Bild über der Frage, oder blendet die Figur aus.
 * @param {{kind: 'emoji', text: string} | {kind: 'url', url: string} | null} image
 */
function renderFigure(image) {
    const figure = document.getElementById('quiz-figure');
    const emoji = document.getElementById('quiz-emoji');
    const img = document.getElementById('quiz-image');

    emoji.textContent = '';
    img.hidden = true;
    img.removeAttribute('src');

    if (!image) {
        figure.hidden = true;
        return;
    }

    if (image.kind === 'emoji') {
        emoji.textContent = image.text;
    } else {
        img.src = image.url;
        img.hidden = false;
    }
    figure.hidden = false;
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
    if (!session || !question || waiting) return;

    const result = mode.check(question, given, session.level);

    if (result.correct) {
        // Als richtig gewertet, aber nicht ganz – auf Basis etwa ein fehlender
        // Akzent. Fürs Schwächenprofil trotzdem notieren.
        if (result.tolerated) {
            const full = mode.completeAnswer ? mode.completeAnswer(question, given) : given;
            session.errors.push({ given: trimGiven(full), type: result.tolerated, tolerated: true });
        }

        session.correct++;
        reward.better();
        button?.classList.add('right');
        if (mode.speakAnswerOnCorrect) {
            tts.speak(question.answer, langFor(question.answerSide));
        }
        resolveItem();
        scoreboard.render(session);

        // Ein Hinweis zur richtigen Antwort braucht Zeit zum Lesen: Dann geht
        // es erst mit «Weiter» weiter, sonst nach einer kurzen Pause.
        waiting = true;
        if (result.note) {
            showFeedback('ok', 'Richtig!', result.note, true);
        } else {
            showFeedback('ok', 'Richtig!', '');
            advanceTimer = window.setTimeout(advance, button ? 700 : 600);
        }
        return;
    }

    session.wrong++;
    session.tries++;
    const error = describeError(given);
    session.errors.push(error);
    reward.worse();

    // Getippte Antworten bekommen einen Hinweis auf die Art des Fehlers – auf
    // Expert nicht, dort muss man selbst darauf kommen.
    const hint = !button && session.level !== 'expert' ? hintForError(error) : null;
    const note = result.note ?? hint ?? '';
    scoreboard.render(session);

    if (button) {
        // Falsch geklickt: Knopf sperren, die Frage bleibt stehen.
        button.classList.add('wrong');
        button.disabled = true;
        showFeedback('no', 'Nicht ganz – versuch es nochmals.', note);
        return;
    }

    const field = document.getElementById('answer-input');
    field.classList.add('wrong');
    window.setTimeout(() => field.classList.remove('wrong'), 400);

    if (session.tries >= MAX_TRIES) {
        field.value = question.fieldAnswer ?? question.answer;
        tts.speak(question.answer, langFor(question.answerSide));
        resolveItem();
        scoreboard.render(session);
        waiting = true;
        showFeedback('no', `Richtig wäre: ${question.answer}`,
            'Am Ende der Runde lässt es sich mit «Fehler wiederholen» nochmals üben.', true);
        return;
    }

    showFeedback('no', 'Nicht ganz – noch ein Versuch.', note);
}

// ------------------------------------------------------------ Rückmeldung

/**
 * Zeigt unten, wie die Antwort war.
 * @param {'ok' | 'no'} kind
 * @param {string} title
 * @param {string} note Hinweis darunter, leer = keiner
 * @param {boolean} [withNext] Mit Knopf «Weiter» – die Runde wartet darauf
 */
function showFeedback(kind, title, note, withNext = false) {
    const box = document.getElementById('quiz-feedback');
    box.dataset.kind = kind;
    document.getElementById('feedback-title').textContent = title;
    document.getElementById('quiz-note').textContent = note;

    const next = document.getElementById('quiz-next');
    next.hidden = !withNext;
    box.hidden = false;
    if (withNext) next.focus();
}

function hideFeedback() {
    document.getElementById('quiz-feedback').hidden = true;
}

function stopWaiting() {
    waiting = false;
    if (advanceTimer !== null) window.clearTimeout(advanceTimer);
    advanceTimer = null;
}

/** Zur nächsten Frage – vom Knopf «Weiter», der Enter-Taste oder der Pause. */
function advance() {
    if (!waiting) return;
    stopWaiting();
    nextQuestion();
}

/**
 * Ein Satz dazu, was am Fehler falsch war. Bei einer Verwechslung: was das
 * getippte Wort wirklich heisst.
 * @param {import('./learning/errors.js').ErrorEntry} error
 */
function hintForError(error) {
    if (error.type === 'confusion') {
        const other = state.session.pool.find(entry => entry.id === error.confusedWith);
        return other?.source ? `«${other.target}» heisst «${other.source}».` : null;
    }
    return hintFor(error);
}

// Eingaben werden gekürzt gespeichert – ein versehentlich eingefügter Text
// soll das Protokoll nicht aufblähen.
const MAX_GIVEN = 120;

function trimGiven(given) {
    return given.trim().slice(0, MAX_GIVEN);
}

/**
 * Hält fest, was falsch war und welcher Art der Fehler ist.
 * @param {string} given
 * @returns {import('./learning/errors.js').ErrorEntry}
 */
function describeError(given) {
    const session = state.session;

    // Bei "spelling" ist zu jeder falschen Option bekannt, wie sie entstand.
    const known = question.optionErrors?.[given];
    if (known) return { given: trimGiven(given), ...known };

    // Mit vorgegebenem Artikel wird nur der Rest getippt – klassifiziert wird
    // die ganze Antwort, sonst sähe jeder Fehler wie ein fehlender Artikel aus.
    const full = mode.completeAnswer ? mode.completeAnswer(question, given) : given;

    // Andere Einträge der Runde, als Text auf der Antwortseite: Trifft die
    // Eingabe einen davon, wurden zwei Wörter verwechselt. Übungsaufgaben
    // haben kein source/target und fallen hier heraus.
    const current = session.items[session.index];
    const side = question.answerSide === 'source' ? 'source' : 'target';
    const others = session.pool
        .filter(entry => entry.id !== current.id && typeof entry[side] === 'string')
        .map(entry => ({ id: entry.id, text: entry[side] }));

    // Gelten mehrere Schreibweisen, zählt die, der die Eingabe am nächsten kam.
    const expected = (question.accept ?? [question.answer])
        .map(form => ({ form, distance: editDistance(full.toLowerCase(), form.toLowerCase()) }))
        .sort((a, b) => a.distance - b.distance)[0].form;

    return {
        given: trimGiven(full),
        ...classify({ given: full, expected, lang: langFor(question.answerSide), others })
    };
}

/**
 * Schliesst den aktuellen Eintrag ab: protokollieren und weiterzählen.
 *
 * Protokolliert wird ein Datensatz pro Wort, nicht pro Tastendruck. `correct`
 * heisst hier: auf Anhieb gewusst. Die einzelnen Fehlversuche stehen mit
 * Eingabe und Fehlerklasse in `errors`.
 */
function resolveItem() {
    const session = state.session;
    if (!session) return;

    const item = session.items[session.index];
    const clean = session.tries === 0;

    if (!clean && !session.missed.includes(item.id)) session.missed.push(item.id);

    const exerciseId = session.context?.exerciseId;

    storage.logAttempt({
        deckId: session.deck.id,
        contentVersion: session.deck.version ?? 0,
        itemId: item.id,
        mode: mode.id,
        ...(exerciseId ? { exerciseId } : {}),
        ...(session.context?.grammarId ? { grammarId: session.context.grammarId } : {}),
        skill: mode.skill,
        source: session.context?.source ?? (exerciseId ? 'drill' : 'quiz'),
        level: session.level,
        correct: clean,
        tries: session.tries,
        errors: session.errors,
        durationMs: Date.now() - session.shownAt
    }).catch(error => console.warn('Versuch konnte nicht gespeichert werden:', error));

    session.index++;
}

// --------------------------------------------------------------- Abschluss

function finish() {
    const session = state.session;
    if (!session) return;

    tts.stop();
    hideFeedback();
    scoreboard.clear();

    const total = session.items.length;
    const solved = total - session.missed.length;

    showScore(solved, total);

    const list = document.getElementById('result-list');
    list.replaceChildren();

    const missed = missedItems();
    for (const item of missed) {
        const row = document.createElement('li');

        // Wortschatz-Eintrag: Zielwort – Ausgangswort. Übungsaufgabe: Lösung –
        // Aufgabenstellung.
        const isTask = item.text !== undefined;
        const primary = isTask
            ? (Array.isArray(item.answer) ? item.answer[0] : item.answer)
            : item.target;
        const secondary = isTask ? item.text : item.source;

        const target = document.createElement('strong');
        target.textContent = primary;
        target.lang = session.deck.targetLang;

        const source = document.createElement('span');
        source.textContent = secondary;
        source.lang = isTask ? session.deck.targetLang : session.deck.sourceLang;

        row.append(target, source);
        list.append(row);
    }

    const hasMissed = missed.length > 0;
    document.getElementById('result-missed-box').hidden = !hasMissed;
    const again = document.getElementById('result-missed');
    again.hidden = !hasMissed;
    again.textContent = missed.length === 1
        ? 'Den Fehler wiederholen'
        : `Die ${missed.length} Fehler wiederholen`;
    // Ohne Fehler ist «nochmals» der Hauptknopf.
    document.getElementById('result-again').classList.toggle('primary', !hasMissed);

    if (!hasMissed) reward.reveal();

    suggestLevel(session, total, solved)
        .catch(error => console.warn('Runde konnte nicht vermerkt werden:', error));

    screens.show('screen-result');
}

/**
 * Ring, Titel und ein Satz zum Ergebnis.
 * @param {number} solved auf Anhieb richtig
 * @param {number} total Wörter der Runde
 */
function showScore(solved, total) {
    const share = total > 0 ? solved / total : 0;
    const missed = total - solved;
    const name = state.learnerName.trim();
    const to = name ? `, ${name}` : '';

    document.getElementById('result-score').textContent = `${solved}/${total}`;
    document.getElementById('result-ring').setAttribute('aria-label',
        `${solved} von ${total} auf Anhieb richtig`);

    // Kreisumfang bei r = 54, so lang ist der volle Ring.
    const length = 2 * Math.PI * 54;
    const fill = document.getElementById('result-ring-fill');
    fill.style.strokeDasharray = `${share * length} ${length}`;

    const [title, text] =
        missed === 0 ? [`Alles richtig${to}!`, 'Kein einziger Fehler – stark.']
        : share >= .8 ? [`Stark${to}!`, missed === 1
            ? 'Ein Wort sitzt noch nicht. Übe es gleich nochmals.'
            : `${missed} Wörter sitzen noch nicht. Übe sie gleich nochmals.`]
        : share >= .5 ? [`Gut gemacht${to}!`, 'Wiederhole die Fehler gleich – dann sitzen sie schneller.']
        : [`Dranbleiben${to}!`, 'Aller Anfang ist schwer. Wiederhole die Fehler gleich nochmals.'];

    document.getElementById('result-title').textContent = title;
    document.getElementById('result-text').textContent = text;
}

// So viele Runden bleiben für den Niveau-Vorschlag im Gedächtnis.
const ROUNDS_KEPT = 20;

/**
 * Vermerkt die Runde und schlägt das nächste Niveau vor, wenn die letzten
 * Runden auf diesem fast fehlerfrei waren. Die App wechselt nie von selbst.
 */
async function suggestLevel(session, total, clean) {
    const box = document.getElementById('result-level');
    box.hidden = true;

    const rounds = await storage.getSetting('rounds', []);
    rounds.push({ level: session.level, total, clean, ts: Date.now() });
    await storage.setSetting('rounds', rounds.slice(-ROUNDS_KEPT));

    const next = LEVELS[LEVELS.indexOf(session.level) + 1];
    if (!next || !readyForNextLevel(rounds, session.level)) return;

    // Derselbe Vorschlag kommt nicht nach jeder Runde wieder.
    if (await storage.getSetting('levelSuggested', null) === next) return;
    await storage.setSetting('levelSuggested', next);

    const label = next.charAt(0).toUpperCase() + next.slice(1);
    document.getElementById('result-level-text').textContent =
        `Die letzten Runden liefen fast fehlerfrei. Bereit für das Niveau ${label}?`;
    const button = document.getElementById('result-level-up');
    button.textContent = `auf ${label} wechseln`;
    button.dataset.level = next;
    box.hidden = false;
}
