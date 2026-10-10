// Auswahl von Wortschatz und Lektionen.

import * as storage from '../storage/index.js';
import { languageName, countItems, prepareDeck, inLevel, groupOf } from '../data/decks.js';
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

    state.deck = deck ? prepareDeck(deck) : null;
    renderUnits(state.deck);
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

    // Decks mit `groups` zeigen die Lektionen unter ihrer Unit; die
    // Überschrift wählt alle Lektionen der Unit an oder ab.
    const titles = new Map((deck.groups ?? []).map(group => [group.id, group.title]));
    let currentGroup = null;

    for (const unit of deck.units) {
        const group = groupOf(unit);
        if (titles.has(group) && group !== currentGroup) {
            currentGroup = group;
            const heading = document.createElement('button');
            heading.type = 'button';
            heading.className = 'unit-group';
            heading.textContent = titles.get(group);
            heading.addEventListener('click', () => toggleGroup(group));
            container.append(heading);
        }

        const row = document.createElement('label');
        row.className = 'unit';

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.value = unit.id;
        box.dataset.group = group;
        box.checked = state.selectedUnits.includes(unit.id);
        box.addEventListener('change', updateSelection);

        const text = document.createElement('span');
        // textContent statt innerHTML: Lektionstitel stammen aus hochgeladenen
        // Dateien und dürfen kein Markup einschleusen.
        text.textContent = unit.title;

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.dataset.unit = unit.id;

        row.append(box, text, badge);
        container.append(row);
    }

    refreshCounts();
}

/**
 * Schreibt in jede Lektion, wie viele Wörter sie auf dem gewählten Niveau
 * hat. Nach einem Niveauwechsel aufrufen.
 */
export function refreshCounts() {
    const deck = state.deck;
    if (!deck) return;

    for (const badge of document.querySelectorAll('#unit-list .badge')) {
        const unit = deck.units.find(entry => entry.id === badge.dataset.unit);
        if (unit) badge.textContent = String(unit.items.filter(item => inLevel(item, state.level)).length);
    }
}

/** Wählt alle Lektionen einer Unit an – oder ab, wenn schon alle gewählt sind. */
function toggleGroup(group) {
    const members = boxes().filter(box => box.dataset.group === group);
    const allChecked = members.every(box => box.checked);
    for (const box of members) box.checked = !allChecked;
    updateSelection();
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
