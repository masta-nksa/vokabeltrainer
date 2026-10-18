// Einstiegspunkt: Start, Auswahl, Import, Verdrahtung der Bausteine.

import * as storage from './storage/index.js';
import { ensureBuiltinDecks, itemsFrom, languageName, prepareDeck } from './data/decks.js';
import * as tts from './speech/tts.js';
import { readTextFile, deckFromCsv } from './data/csv.js';
import { exercisesFor, setsForUnits, tasksFor } from './data/exercises.js';
import { state } from './state.js';
import { stripDiacritics } from './util.js';
import { toLevel } from './learning/levels.js';
import { loadInsight } from './learning/insight.js';
import { pickForYou, summarize } from './learning/mastery.js';
import * as insightView from './ui/insight.js';
import * as screens from './ui/screens.js';
import * as lessonSelect from './ui/lessonSelect.js';
import * as print from './ui/print.js';
import * as reward from './ui/reward.js';
import * as quiz from './quiz.js';
import * as games from './games/host.js';
import { fromHash } from './games/challenge.js';
import * as challengeView from './ui/challenge.js';

const HEROES = {
    'Iron Man': 'img/ironman.gif',
    'Captain America': 'img/captainamerica.gif',
    'Thor': 'img/thor.gif',
    'Hulk': 'img/hulk.gif',
    'Black Widow': 'img/blackwidow.gif',
    'Scarlet Witch': 'img/scarletwitch.gif'
};

// --------------------------------------------------------------- Startseite

/** Der gewählte Held, leer = keiner. */
function chosenHero() {
    return document.querySelector('input[name="hero"]:checked')?.value ?? '';
}

/** @param {string} name */
function chooseHero(name) {
    const radio = [...document.querySelectorAll('input[name="hero"]')].find(input => input.value === name);
    if (radio) radio.checked = true;
}

function initStart() {
    const choice = document.getElementById('hero-choice');

    for (const name of Object.keys(HEROES)) {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'hero';
        radio.value = name;
        const text = document.createElement('span');
        text.textContent = name;
        label.append(radio, text);
        choice.append(label);
    }

    choice.addEventListener('change', () => showHero(chosenHero()));

    document.getElementById('start-form').addEventListener('submit', async event => {
        event.preventDefault();

        const name = document.getElementById('name-input').value.trim();
        if (name === '') return;

        state.learnerName = name;
        state.hero = chosenHero();

        await storage.setSetting('learnerName', name);
        await storage.setSetting('hero', state.hero);

        await openSelection();
        if (pendingChallenge) await presentChallenge();
    });
}

/** @param {string} name */
function showHero(name) {
    const box = document.getElementById('hero');
    const image = document.getElementById('hero-image');

    if (!name || !HEROES[name]) {
        box.hidden = true;
        return;
    }

    image.src = HEROES[name];
    image.alt = name;
    box.hidden = false;
    reward.reset();
}

// ------------------------------------------------------------ Lektionswahl

async function openSelection() {
    document.getElementById('greeting').textContent = `Hallo ${state.learnerName}`;
    document.getElementById('avatar').textContent =
        state.learnerName.trim().charAt(0).toUpperCase();

    // Nach einer Runde hat sich der Lernstand geändert.
    insightStale = true;

    const lastDeckId = await storage.getSetting('lastDeckId', null);
    await lessonSelect.refresh(lastDeckId);
    screens.show('screen-select');
}

/** Aktiviert die Modus-Knöpfe nur, wenn etwas ausgewählt ist. */
function onSelectionChange() {
    const count = selectedItems().length;

    for (const button of document.querySelectorAll('[data-mode]')) {
        button.disabled = count === 0;
    }
    document.getElementById('print-open').disabled = count === 0;

    renderVoicePicker();
    refreshGames();
    refreshExercises().catch(error => console.warn('Übungen nicht geladen:', error));
    refreshInsight().catch(error => console.warn('Lernstand nicht geladen:', error));
}

// ------------------------------------------------------------ Spielen

/** Zeigt die Spiele, die mit den gewählten Wörtern auf diesem Niveau gehen. */
function refreshGames() {
    const deck = state.deck;
    const block = document.getElementById('game-block');
    const list = document.getElementById('game-list');
    const items = selectedItems();

    const available = deck ? games.availableGames(deck, items, state.level) : [];
    list.replaceChildren();

    for (const game of available) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-tile';
        button.title = game.description;
        button.append(svgIcon(GAME_ICONS[game.id] ?? 'i-bolt'), game.label);
        button.addEventListener('click', () =>
            games.play(game.id, deck, items, { units: [...state.selectedUnits] }));
        list.append(button);
    }

    block.hidden = available.length === 0;
}

/** Symbol je Spiel, aus dem Symbolvorrat in index.html. */
const GAME_ICONS = { crossword: 'i-grid', sorter: 'i-sort', speed: 'i-bolt' };

/** @param {string} id Kennung eines Symbols in index.html */
function svgIcon(id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${id}`);
    svg.append(use);
    return svg;
}

function selectedItems() {
    if (!state.deck) return [];
    return itemsFrom(state.deck, state.selectedUnits, state.level);
}

// ------------------------------------------------------------ Lernstand

/** Nach einer Runde oder einem Deckwechsel muss der Lernstand neu gelesen werden. */
let insightStale = true;

/**
 * Liest den Lernstand zum gewählten Deck (nur wenn nötig) und beschriftet den
 * Knopf «Für dich» mit dem, was ansteht.
 */
async function refreshInsight() {
    const deck = state.deck;
    const button = document.getElementById('foryou-start');
    const hint = document.getElementById('foryou-detail');
    const pick = 'Wähle mindestens eine Lektion.';

    if (!deck) {
        state.insight = null;
        button.disabled = true;
        hint.textContent = pick;
        return;
    }

    // Sofort sagen, ob etwas gewählt ist – der Lernstand kommt gleich nach.
    if (selectedItems().length === 0) {
        button.disabled = true;
        hint.textContent = pick;
    }

    if (insightStale || state.insight?.deckId !== deck.id) {
        insightStale = false;
        const insight = await loadInsight(deck);
        // Zwischenzeitlicher Deckwechsel: Ergebnis gehört nicht mehr hierher.
        if (state.deck?.id !== deck.id) return;
        state.insight = insight;
    }

    const items = selectedItems();
    button.disabled = items.length === 0;
    if (items.length === 0) {
        hint.textContent = pick;
        return;
    }

    const summary = summarize(items, state.insight.mastery, state.insight.now);
    hint.textContent = `${items.length} Wörter · ${summary.due} zur Wiederholung · ${summary.new} neu`;
}

/** Startet die gemischte Runde: fällige, neue und ein paar sichere Wörter. */
function startForYou() {
    const deck = state.deck;
    const items = selectedItems();
    if (!deck || !state.insight || items.length === 0) return;

    const picked = pickForYou(items, state.insight.mastery, Date.now());
    quiz.start('terms', deck, picked.map(entry => entry.item), {
        title: 'Für dich',
        subtitle: '',
        source: 'foryou',
        itemModes: Object.fromEntries(picked.map(entry => [entry.item.id, entry.mode])),
        pool: items
    });
}

/** Öffnet «Meine Stolpersteine» für die gewählten Lektionen – oder das ganze Deck. */
async function openInsight() {
    const deck = state.deck;
    if (!deck || !state.insight) return;

    const selected = selectedItems();
    const everything = itemsFrom(deck, deck.units.map(unit => unit.id), state.level);
    const scope = selected.length > 0 ? selected : everything;
    const label = selected.length > 0
        ? `${deck.title} · gewählte Lektionen (${selected.length} Wörter)`
        : `${deck.title} · alle Lektionen (${everything.length} Wörter)`;

    const sets = await exercisesFor(deck.id);

    insightView.render(deck, scope, label, state.insight, sets, {
        practice(items, modeId, title) {
            if (items.length === 0) return;
            quiz.start(modeId, deck, items, {
                title, subtitle: '', source: 'insight',
                // Ablenker aus dem ganzen Deck, sonst gäbe es bei zwei Wörtern keine Wahl.
                pool: everything
            });
        },
        practiceGrammar(exerciseId) {
            const set = sets.find(entry => entry.id === exerciseId);
            if (set) quiz.startExercise(deck, set);
            return Boolean(set);
        }
    });

    screens.show('screen-insight');
}

/** Stellt das Niveau um – vom Schalter oder vom Vorschlag nach einer Runde. */
function setLevel(level) {
    state.level = toLevel(level);
    storage.setSetting('level', state.level);

    showLevel();

    // Das Niveau bestimmt auch, welche Wörter dazugehören.
    lessonSelect.refreshCounts();
    onSelectionChange();
}

/** Name und Held als Zeile unter «Mehr». */
function showProfile() {
    document.getElementById('profile-summary').textContent =
        `${state.learnerName || 'ohne Namen'} · ${state.hero ? `Held: ${state.hero}` : 'kein Held'}`;
}

/** Was das Niveau in den Modi bewirkt, in einem Satz (Werte: LEVELS der Modi). */
const LEVEL_HINTS = {
    basis: '4 Antworten zur Auswahl. Beim Schreiben steht der Artikel schon da, fehlende Akzente zählen als richtig.',
    erweitert: '6 Antworten zur Auswahl. Artikel selbst schreiben, Akzente zählen. Nach einem Fehler gibt es einen Hinweis.',
    expert: '8 ähnliche Antworten zur Auswahl. Schreiben ohne Hinweise.'
};

/** Setzt den Schalter und den Satz darunter auf das aktuelle Niveau. */
function showLevel() {
    const radio = document.querySelector(`input[name="level"][value="${state.level}"]`);
    if (radio) radio.checked = true;
    document.getElementById('level-hint').textContent = LEVEL_HINTS[state.level] ?? '';
}

// ------------------------------------------------------------ Challenge

/** Eine Herausforderung aus dem Link, mit dem die App geöffnet wurde. */
let pendingChallenge = null;

/**
 * Liest eine Herausforderung aus der Adresse und nimmt sie dort wieder
 * heraus – sonst käme sie bei jedem Neuladen wieder.
 */
function takeChallengeFromAddress() {
    pendingChallenge = fromHash(location.hash);
    if (location.hash.includes('c=')) {
        history.replaceState(null, '', location.pathname + location.search);
    }
    challengeView.announce(pendingChallenge);
}

/** Zeigt die wartende Herausforderung mit allem, was man dazu wissen muss. */
async function presentChallenge() {
    const challenge = pendingChallenge;
    if (!challenge) return;

    // Das Deck kann inzwischen in einem anderen aufgegangen sein.
    const decks = await storage.listDecks();
    const stored = decks.find(entry => entry.id === challenge.deck)
        ?? decks.find(entry => entry.aliases?.includes(challenge.deck));
    const deck = stored ? prepareDeck(stored) : null;
    const game = games.getGame(challenge.game);
    const items = deck ? itemsFrom(deck, challenge.units, challenge.level) : [];
    const playable = Boolean(deck && game && game.available(deck, items, challenge.level));

    let problem = '';
    if (!game) problem = 'Dieses Spiel kennt deine Fassung der App noch nicht.';
    else if (!deck) problem = 'Dieser Wortschatz ist auf diesem Gerät nicht vorhanden.';
    else if (!playable) problem = 'Mit diesen Lektionen lässt sich das Spiel hier nicht starten.';
    else if ((deck.version ?? 0) !== challenge.ver) {
        problem = 'Der Wortschatz wurde seit dieser Herausforderung geändert – die Partie kann leicht abweichen.';
    }

    const done = () => {
        pendingChallenge = null;
        challengeView.announce(null);
    };

    challengeView.showIncoming(challenge, { gameLabel: game?.label ?? challenge.game, deck, playable, problem }, {
        accept() {
            done();
            games.play(challenge.game, deck, items, {
                seed: challenge.seed,
                spec: challenge.spec ?? null,
                level: challenge.level,
                units: challenge.units,
                challenge: { alias: challenge.alias, score: challenge.score, ms: challenge.ms }
            });
        },
        decline() {
            done();
            screens.show('screen-select');
        }
    });
}

// ------------------------------------------------------------ Anwenden

/** Für welches Deck die Übungssets zuletzt geholt wurden. */
let exerciseCache = { deckId: null, sets: [] };

/**
 * Zeigt unter den Modus-Knöpfen die Anwendungsübungen, die zu mindestens
 * einer gewählten Lektion passen. Nichts Passendes: der Block bleibt weg.
 */
async function refreshExercises() {
    const deck = state.deck;
    const block = document.getElementById('exercise-block');
    const list = document.getElementById('exercise-list');

    if (!deck) {
        block.hidden = true;
        return;
    }

    if (exerciseCache.deckId !== deck.id) {
        exerciseCache = { deckId: deck.id, sets: await exercisesFor(deck.id) };
    }

    // Zwischenzeitlicher Deckwechsel: Ergebnis gehört nicht mehr hierher.
    if (state.deck?.id !== deck.id) return;

    // Ein Set, das auf diesem Niveau keine Aufgabe hergibt, erscheint nicht.
    const available = setsForUnits(exerciseCache.sets, deck, state.selectedUnits)
        .filter(set => tasksFor(set, deck, state.level).length > 0);
    list.replaceChildren();

    for (const set of available) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chip';
        button.textContent = set.title.replace(/^Unit[ée]?\s*\d+\s*[–-]\s*/, '');
        button.addEventListener('click', () => quiz.startExercise(deck, set));
        list.append(button);
    }

    block.hidden = available.length === 0;
}

// ------------------------------------------------------------ Stimmenwahl

/** Für welches Deck die Auswahl zuletzt aufgebaut wurde. */
let voicePickerDeckId = null;

/** Die Sprachen, in denen dieses Deck spricht. */
function deckLanguages() {
    const deck = state.deck;
    return deck ? [...new Set([deck.targetLang, deck.sourceLang])] : [];
}

/** Ein echtes Wort aus dem Deck als Hörprobe. */
function sampleFor(lang) {
    const item = state.deck?.units[0]?.items[0];
    if (!item) return lang;
    return lang === state.deck.targetLang ? item.target : item.source;
}

function saveVoices() {
    const map = {};
    for (const lang of deckLanguages()) {
        const uri = tts.getPreferred(lang);
        if (uri) map[lang] = uri;
    }
    return storage.setSetting('voices', map);
}

/**
 * Baut die Stimmenauswahl auf, eine Zeile je Sprache des Decks.
 * @param {boolean} force Auch dann neu aufbauen, wenn das Deck dasselbe ist
 */
function renderVoicePicker(force = false) {
    const box = document.getElementById('voice-picker');
    const deck = state.deck;

    if (!force && deck?.id === voicePickerDeckId) return;
    voicePickerDeckId = deck?.id ?? null;

    box.replaceChildren();
    if (!deck) return;

    if (!tts.isAvailable()) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = 'Dieser Browser kann nichts vorlesen.';
        box.append(hint);
        return;
    }

    for (const lang of deckLanguages()) {
        const row = document.createElement('div');
        row.className = 'row';

        const available = tts.voicesFor(lang);

        // Ohne installierte Stimme liest der Browser den Text mit irgendeiner
        // anderen vor. Das klingt falsch, ohne dass ein Fehler sichtbar wird –
        // also wird es hier ausgesprochen.
        if (available.length === 0) {
            const warning = document.createElement('p');
            warning.className = 'hint error';
            warning.textContent =
                `Für ${languageName(lang)} ist auf diesem Gerät keine Stimme installiert. `
                + 'Der Browser liest den Text sonst mit einer fremden Stimme vor. '
                + 'Unter Windows lässt sich das nachrüsten: Einstellungen, '
                + 'Zeit und Sprache, Sprache und Region, Sprache hinzufügen, '
                + 'dabei die Sprachausgabe mitinstallieren.';
            box.append(warning);
            continue;
        }

        const field = document.createElement('span');
        const label = document.createElement('label');
        label.textContent = languageName(lang);
        label.htmlFor = `voice-${lang}`;

        const select = document.createElement('select');
        select.id = `voice-${lang}`;
        select.append(new Option('automatisch wählen', ''));

        for (const voice of available) {
            select.append(new Option(`${voice.name} (${voice.lang})`, voice.voiceURI));
        }

        select.value = tts.getPreferred(lang);
        select.addEventListener('change', async () => {
            tts.setPreferred(lang, select.value);
            await saveVoices();
            tts.speak(sampleFor(lang), lang);
        });

        field.append(label, select);

        const test = document.createElement('button');
        test.type = 'button';
        test.textContent = 'anhören';
        test.addEventListener('click', () => tts.speak(sampleFor(lang), lang));

        row.append(field, test);
        box.append(row);
    }
}

function initSelection() {
    lessonSelect.init(onSelectionChange);

    for (const radio of document.querySelectorAll('input[name="level"]')) {
        radio.addEventListener('change', () => {
            if (radio.checked) setLevel(radio.value);
        });
    }

    document.getElementById('foryou-start').addEventListener('click', startForYou);

    for (const tab of document.querySelectorAll('[data-tab]')) {
        tab.addEventListener('click', () => {
            if (tab.dataset.tab === 'screen-insight') {
                openInsight().catch(error => console.warn('Lernstand nicht geladen:', error));
            } else {
                if (tab.dataset.tab === 'screen-more') showProfile();
                screens.show(tab.dataset.tab);
            }
        });
    }

    // «Name und Held» führt zurück zur Startseite; dort geht es wie beim
    // ersten Besuch mit «Los geht's» weiter.
    document.getElementById('profile-edit').addEventListener('click', () => screens.show('screen-start'));

    for (const button of document.querySelectorAll('[data-mode]')) {
        button.addEventListener('click', () => {
            const items = selectedItems();
            if (items.length === 0 || !state.deck) return;
            quiz.start(button.dataset.mode, state.deck, items);
        });
    }

    document.getElementById('print-open').addEventListener('click', () => {
        if (state.deck) print.open(state.deck, selectedItems());
    });
}

// ------------------------------------------------------------------ Import

function slugify(text) {
    return stripDiacritics(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'wortschatz';
}

function initImport() {
    const form = document.getElementById('import-form');
    const message = document.getElementById('import-message');

    form.addEventListener('submit', async event => {
        event.preventDefault();
        message.textContent = '';
        message.className = 'hint';

        const file = document.getElementById('import-file').files[0];
        if (!file) {
            message.textContent = 'Bitte zuerst eine Datei wählen.';
            message.className = 'hint error';
            return;
        }

        try {
            const text = await readTextFile(file);
            const title = document.getElementById('import-title').value.trim()
                || file.name.replace(/\.csv$/i, '');

            const deck = deckFromCsv(text, {
                id: `${slugify(title)}-${Date.now().toString(36)}`,
                title,
                sourceLang: document.getElementById('import-source').value,
                targetLang: document.getElementById('import-target').value,
                targetFirst: document.getElementById('import-target-first').checked
            });

            await storage.saveDeck(deck);
            await lessonSelect.refresh(deck.id);
            onSelectionChange();

            const count = deck.units.reduce((sum, unit) => sum + unit.items.length, 0);
            message.textContent = `${deck.title}: ${deck.units.length} Lektionen, ${count} Wörter übernommen.`;
            form.reset();
        } catch (error) {
            message.textContent = error instanceof Error ? error.message : String(error);
            message.className = 'hint error';
        }
    });

    document.getElementById('deck-delete').addEventListener('click', async () => {
        const deck = state.deck;
        if (!deck) return;

        if (deck.builtin) {
            alert('Mitgelieferte Wortschätze lassen sich nicht löschen.');
            return;
        }
        if (!confirm(`"${deck.title}" wirklich löschen?`)) return;

        await storage.deleteDeck(deck.id);
        await lessonSelect.refresh(null);
        onSelectionChange();
    });
}

// ------------------------------------------------------------------- Start

async function main() {
    initStart();
    initSelection();
    initImport();
    print.init();
    quiz.init({ onLeave: openSelection, onLevelUp: setLevel });
    games.init({
        onLeave: openSelection,
        onStart: challengeView.hideShare,
        onChallenge: round => challengeView.share(round)
            .catch(error => console.warn('Link konnte nicht erstellt werden:', error))
    });
    challengeView.init();
    takeChallengeFromAddress();

    // Ein Link, der bei offener App eintrifft, lädt die Seite nicht neu.
    window.addEventListener('hashchange', () => {
        takeChallengeFromAddress();
        if (pendingChallenge && screens.current() === 'screen-select') {
            presentChallenge().catch(error => console.warn('Herausforderung nicht lesbar:', error));
        }
    });

    await ensureBuiltinDecks();

    tts.usePreferred(await storage.getSetting('voices', {}));

    // Chrome kennt die Stimmen beim ersten Aufbau oft noch nicht.
    if (tts.isAvailable()) {
        speechSynthesis.addEventListener('voiceschanged', () => renderVoicePicker(true));
    }

    // Name und Held aus dem letzten Besuch übernehmen.
    const name = await storage.getSetting('learnerName', '');
    const hero = await storage.getSetting('hero', '');

    if (name) document.getElementById('name-input').value = name;
    if (hero && HEROES[hero]) {
        chooseHero(hero);
        showHero(hero);
    }

    state.learnerName = name;
    state.hero = hero;

    // Ohne gespeichertes Niveau gilt die frühere Stufe (einfach/mittel/schwer).
    state.level = toLevel(await storage.getSetting('level', null)
        ?? await storage.getSetting('difficulty', null));
    showLevel();

    screens.show('screen-start');
    onSelectionChange();
}

main().catch(error => {
    console.error(error);
    alert('Die App konnte nicht starten. Details stehen in der Browser-Konsole.');
});
