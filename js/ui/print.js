// Druckvorlage: Tabelle der gewählten Wörter, wahlweise mit Lücke zum
// Ausfüllen.

import { shuffle } from '../util.js';
import { languageName, targetForms } from '../data/decks.js';

// Auf dem Blatt stehen alle Schreibweisen: "la géo, la géographie".
const targetText = item => targetForms(item).join(', ');

/** @type {import('../storage/index.js').Item[]} */
let rows = [];
/** @type {import('../storage/index.js').Deck | null} */
let deck = null;

export function init() {
    document.getElementById('print-shuffle').addEventListener('click', () => {
        rows = shuffle(rows);
        renderTable();
    });
    document.getElementById('print-start').addEventListener('click', printWindow);
    document.getElementById('print-close').addEventListener('click', close);
    document.getElementById('print-overlay').addEventListener('click', close);

    for (const radio of document.querySelectorAll('input[name="print-mode"]')) {
        radio.addEventListener('change', renderTable);
    }
    for (const radio of document.querySelectorAll('input[name="print-layout"]')) {
        radio.addEventListener('change', updateLayoutFields);
    }
    updateLayoutFields();
}

// Die Wahl "Was soll auf dem Blatt stehen?" gilt nur für die Liste – eine
// Karteikarte hat immer eine Sprache vorne und die andere hinten.
function updateLayoutFields() {
    const cards = printLayout() === 'cards';
    document.getElementById('print-mode-field').hidden = cards;
    document.getElementById('print-list-hint').hidden = cards;
    document.getElementById('print-twice-field').hidden = cards;
    document.getElementById('print-cards-hint').hidden = !cards;
}

/**
 * @param {import('../storage/index.js').Deck} selectedDeck
 * @param {import('../storage/index.js').Item[]} items
 */
export function open(selectedDeck, items) {
    deck = selectedDeck;
    rows = [...items];
    renderTable();
    document.getElementById('print-overlay').hidden = false;
    document.getElementById('print-dialog').hidden = false;
}

export function close() {
    document.getElementById('print-overlay').hidden = true;
    document.getElementById('print-dialog').hidden = true;
}

function printMode() {
    if (printLayout() === 'cards') return 'both';
    const checked = document.querySelector('input[name="print-mode"]:checked');
    return checked ? checked.value : 'both';
}

function printLayout() {
    const checked = document.querySelector('input[name="print-layout"]:checked');
    return checked ? checked.value : 'list';
}

function headings() {
    if (!deck) return ['', ''];
    const source = languageName(deck.sourceLang);
    const target = languageName(deck.targetLang);
    const mode = printMode();

    if (mode === 'both') return [target, source];
    if (mode === 'source') return [source, target];
    return [target, source];
}

function renderTable() {
    fillTable(document.getElementById('print-table'), rows);
}

/**
 * @param {HTMLTableElement} table
 * @param {import('../storage/index.js').Item[]} list
 */
function fillTable(table, list) {
    table.replaceChildren();

    const [left, right] = headings();
    const head = table.createTHead().insertRow();
    for (const title of [left, right]) {
        const cell = document.createElement('th');
        cell.textContent = title;
        head.append(cell);
    }

    const mode = printMode();
    const body = table.createTBody();

    for (const item of list) {
        const row = body.insertRow();
        if (mode === 'both') {
            row.insertCell().textContent = targetText(item);
            row.insertCell().textContent = item.source;
        } else if (mode === 'source') {
            row.insertCell().textContent = item.source;
            row.insertCell().className = 'blank';
        } else {
            row.insertCell().textContent = targetText(item);
            row.insertCell().className = 'blank';
        }
    }
}

/**
 * Druckt in einem eigenen Fenster. Die Seite selbst bleibt dabei unangetastet
 * samt allen Ereignisbindungen.
 */
function printWindow() {
    if (printLayout() === 'cards') {
        printCardsWindow();
    } else {
        printListWindow();
    }
}

function printListWindow() {
    const table = document.getElementById('print-table');
    const win = openPrintWindow();
    if (!win) return;

    const title = deck ? deck.title : 'Wortschatz';
    win.document.write(
        '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">' +
        '<title>' + escapeHtml(title) + '</title><style>' +
        // Für den beidseitigen Druck: der Kopf wiederholt sich auf jeder
        // Seite, und keine Zeile wird zwischen Vorder- und Rückseite geteilt.
        '@page{size:A4;margin:15mm}' +
        'body{font-family:system-ui,sans-serif;margin:0}' +
        'h1{font-size:1.2rem;margin-top:0}' +
        'table{width:100%;border-collapse:collapse;margin-top:1rem}' +
        'thead{display:table-header-group}' +
        'tr{break-inside:avoid}' +
        'th,td{border:1px solid #999;padding:.5rem;text-align:left}' +
        'td.blank{width:55%}' +
        '.again{break-before:page}' +
        '</style></head><body><h1></h1></body></html>'
    );
    win.document.close();
    win.document.querySelector('h1').textContent = title;
    win.document.body.append(win.document.importNode(table, true));

    // Dieselben Wörter noch einmal, neu gemischt und auf einer neuen Seite –
    // beim beidseitigen Druck landet die zweite Liste auf der Rückseite.
    if (document.getElementById('print-twice').checked) {
        const again = win.document.createElement('table');
        again.className = 'again';
        fillTable(again, shuffle(rows));
        win.document.body.append(again);
    }

    win.focus();
    win.print();
    win.close();
}

// DIN A8 quer (74 x 52 mm) – 2 Spalten x 4 Zeilen pro A4-Blatt. Quer, weil
// die Karte nach dem Schneiden im Querformat in der Hand gehalten wird.
const CARD_WIDTH_MM = 74;
const CARD_HEIGHT_MM = 52;
const CARD_GAP_MM = 4;
const CARDS_PER_PAGE = 8; // 2 Spalten x 4 Zeilen

function cardHtml(text) {
    return '<div class="card"><span class="line-main">' + escapeHtml(text) + '</span></div>';
}

/** Karteikarten: abwechselnd Vorderseite (Zielsprache) und Rückseite (Ausgangssprache). */
function printCardsWindow() {
    const win = openPrintWindow();
    if (!win) return;

    const title = deck ? deck.title : 'Wortschatz';
    const pagesHtml = [];

    for (let i = 0; i < rows.length; i += CARDS_PER_PAGE) {
        const pageItems = rows.slice(i, i + CARDS_PER_PAGE);
        const frontHtml = pageItems.map(item => cardHtml(targetText(item))).join('');
        // Der Drucker wendet das Blatt an der langen (senkrechten) Kante:
        // was vorne links steht, liegt hinten rechts. Deshalb tauschen die
        // beiden Karten jeder Zeile auf der Rückseite ihre Plätze; fehlt
        // in der letzten Zeile die rechte Karte, bleibt hinten links frei.
        const backCells = [];
        for (let j = 0; j < pageItems.length; j += 2) {
            const right = pageItems[j + 1];
            backCells.push(right ? cardHtml(right.source) : '<div class="card empty"></div>');
            backCells.push(cardHtml(pageItems[j].source));
        }
        pagesHtml.push('<section class="card-page">' + frontHtml + '</section>');
        pagesHtml.push('<section class="card-page">' + backCells.join('') + '</section>');
    }

    win.document.write(
        '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">' +
        '<title>' + escapeHtml(title) + '</title><style>' +
        '@page{size:A4;margin:8mm}' +
        '*{box-sizing:border-box}' +
        'body{margin:0;font-family:system-ui,sans-serif}' +
        '.card-page{display:grid;grid-template-columns:repeat(2,' + CARD_WIDTH_MM + 'mm);' +
        'grid-template-rows:repeat(4,' + CARD_HEIGHT_MM + 'mm);gap:' + CARD_GAP_MM + 'mm;' +
        'justify-content:center;align-content:center;' +
        'width:100%;height:100vh;page-break-after:always}' +
        '.card-page:last-child{page-break-after:auto}' +
        '.card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3em;' +
        'border:1px dashed #999;padding:.4em;text-align:center;overflow:hidden}' +
        // Keine Drehung der Rückseite: Blatt und fertige Karte werden beide
        // um eine senkrechte Achse gewendet (die Karte seitwärts wie eine
        // Buchseite), die Schrift steht danach auf beiden Seiten aufrecht.
        '.card.empty{border:none}' +
        '.line-main{font-size:clamp(.9rem,3.2vw,1.3rem);font-weight:600;overflow-wrap:break-word}' +
        '</style></head><body>' + pagesHtml.join('') + '</body></html>'
    );
    win.document.close();

    win.focus();
    win.print();
    win.close();
}

function openPrintWindow() {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
        alert('Der Browser hat das Druckfenster blockiert. Bitte Pop-ups für diese Seite erlauben.');
        return null;
    }
    return win;
}

function escapeHtml(text) {
    return String(text).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
}
