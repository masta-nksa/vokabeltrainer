// Einstiegspunkt: Start, Auswahl, Import, Verdrahtung der Bausteine.

import * as storage from './storage/index.js';
import { ensureBuiltinDecks, itemsFrom, languageName } from './data/decks.js';
import * as tts from './speech/tts.js';
import { readTextFile, deckFromCsv } from './data/csv.js';
import { state } from './state.js';
import { stripDiacritics } from './util.js';
import * as screens from './ui/screens.js';
import * as lessonSelect from './ui/lessonSelect.js';
import * as print from './ui/print.js';
import * as reward from './ui/reward.js';
import * as quiz from './quiz.js';

const HEROES = {
    'Iron Man': 'img/ironman.gif',
    'Captain America': 'img/captainamerica.gif',
    'Thor': 'img/thor.gif',
    'Hulk': 'img/hulk.gif',
    'Black Widow': 'img/blackwidow.gif',
    'Scarlet Witch': 'img/scarletwitch.gif'
};

// --------------------------------------------------------------- Startseite

function initStart() {
    const heroSelect = document.getElementById('hero-select');

    for (const name of Object.keys(HEROES)) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        heroSelect.append(option);
    }

    heroSelect.addEventListener('change', () => showHero(heroSelect.value));

    document.getElementById('start-form').addEventListener('submit', async event => {
        event.preventDefault();

        const name = document.getElementById('name-input').value.trim();
        if (name === '') return;

        state.learnerName = name;
        state.hero = heroSelect.value;

        await storage.setSetting('learnerName', name);
        await storage.setSetting('hero', heroSelect.value);

        await openSelection();
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
    document.getElementById('greeting').textContent =
        `Hallo ${state.learnerName}, los geht es.`;

    const lastDeckId = await storage.getSetting('lastDeckId', null);
    await lessonSelect.refresh(lastDeckId);
    screens.show('screen-select');
}

/** Aktiviert die Modus-Knöpfe nur, wenn etwas ausgewählt ist. */
function onSelectionChange() {
    const count = selectedItems().length;
    const hint = document.getElementById('selection-hint');

    for (const button of document.querySelectorAll('[data-mode]')) {
        button.disabled = count === 0;
    }
    document.getElementById('print-open').disabled = count === 0;

    hint.textContent = count === 0
        ? 'Wähle mindestens eine Lektion.'
        : `${count} Wörter ausgewählt`;

    renderVoicePicker();
}

function selectedItems() {
    if (!state.deck) return [];
    return itemsFrom(state.deck, state.selectedUnits);
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
    quiz.init({ onLeave: openSelection });

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
        document.getElementById('hero-select').value = hero;
        showHero(hero);
    }

    state.learnerName = name;
    state.hero = hero;

    screens.show('screen-start');
    onSelectionChange();
}

main().catch(error => {
    console.error(error);
    alert('Die App konnte nicht starten. Details stehen in der Browser-Konsole.');
});
