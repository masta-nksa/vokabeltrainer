// Auswahl von Wortschatz und Lektionen.

import * as storage from '../storage/index.js';
import { languageName, countItems } from '../data/decks.js';
import { state } from '../state.js';

/** @type {() => void} */
let onChange = () => {};

/** @param {() => void} handler Wird bei jeder Änderung der Auswahl gerufen. */
export function init(handler) {
    onChange = handler;

    document.getElementById('deck-select')
        .addEventListener('change', event => selectDeck(event.target.value));

    document.getElementById('units-all')
        .addEventListener('click', () => setAll(true));

    document.getElementById('units-none')
        .addEventListener('click', () => setAll(false));
}

/** Füllt die Wortschatz-Liste und wählt einen aus. */
export async function refresh(preferredDeckId = null) {
    const decks = await storage.listDecks();
    const select = document.getElementById('deck-select');
    select.replaceChildren();

    for (const deck of decks) {
        const option = document.createElement('option');
        option.value = deck.id;
        option.textContent =
            `${deck.title} (${languageName(deck.sourceLang)} → ${languageName(deck.targetLang)}, ${countItems(deck)} Wörter)`;
        select.append(option);
    }

    if (decks.length === 0) {
        renderUnits(null);
        return;
    }

    const chosen = decks.some(deck => deck.id === preferredDeckId)
        ? preferredDeckId
        : decks[0].id;
    select.value = chosen;
    await selectDeck(chosen);
}

async function selectDeck(deckId) {
    const deck = await storage.getDeck(deckId);

    // Die Auswahl nur verwerfen, wenn tatsächlich ein anderer Wortschatz
    // gewählt wurde. Wer aus einer Runde zurückkommt, findet seine Lektionen
    // sonst jedes Mal abgewählt vor.
    if (state.deck?.id !== deckId) state.selectedUnits = [];

    state.deck = deck ?? null;
    renderUnits(deck);
    await storage.setSetting('lastDeckId', deckId);
    updateSelection();
}

/** @param {import('../storage/index.js').Deck | null} deck */
function renderUnits(deck) {
    const container = document.getElementById('unit-list');
    container.replaceChildren();

    if (!deck) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = 'Noch kein Wortschatz vorhanden. Lade eine CSV-Datei hoch.';
        container.append(hint);
        return;
    }

    for (const unit of deck.units) {
        const row = document.createElement('label');
        row.className = 'unit';

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.value = unit.id;
        box.checked = state.selectedUnits.includes(unit.id);
        box.addEventListener('change', updateSelection);

        const text = document.createElement('span');
        // textContent statt innerHTML: Lektionstitel stammen aus hochgeladenen
        // Dateien und dürfen kein Markup einschleusen.
        text.textContent = unit.title;

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = String(unit.items.length);

        row.append(box, text, badge);
        container.append(row);
    }
}

function boxes() {
    return [...document.querySelectorAll('#unit-list input[type="checkbox"]')];
}

function setAll(checked) {
    for (const box of boxes()) box.checked = checked;
    updateSelection();
}

function updateSelection() {
    state.selectedUnits = boxes().filter(box => box.checked).map(box => box.value);
    onChange();
}
