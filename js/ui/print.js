// Druckvorlage: Tabelle der gewählten Wörter, wahlweise mit Lücke zum
// Ausfüllen.

import { shuffle } from '../util.js';
import { languageName } from '../data/decks.js';

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
    const table = document.getElementById('print-table');
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

    for (const item of rows) {
        const row = body.insertRow();
        if (mode === 'both') {
            row.insertCell().textContent = item.target;
            row.insertCell().textContent = item.source;
        } else if (mode === 'source') {
            row.insertCell().textContent = item.source;
            row.insertCell().className = 'blank';
        } else {
            row.insertCell().textContent = item.target;
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
        'body{font-family:system-ui,sans-serif;margin:2rem}' +
        'h1{font-size:1.2rem}' +
        'table{width:100%;border-collapse:collapse;margin-top:1rem}' +
        'th,td{border:1px solid #999;padding:.5rem;text-align:left}' +
        'td.blank{width:55%}' +
        '</style></head><body><h1></h1></body></html>'
    );
    win.document.close();
    win.document.querySelector('h1').textContent = title;
    win.document.body.append(win.document.importNode(table, true));

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

function cardLines(item) {
    const mode = printMode();
    if (mode === 'target') return [item.target];
    if (mode === 'source') return [item.source];
    return [item.target, item.source];
}

function isDuplex() {
    const checkbox = document.getElementById('print-duplex');
    return !!(checkbox && checkbox.checked);
}

function cardHtml(text, isBack) {
    const cls = isBack ? 'card back' : 'card';
    return '<div class="' + cls + '"><span class="line-main">' + escapeHtml(text) + '</span></div>';
}

function cardPageHtml(pageItems, isBack) {
    const cardsHtml = pageItems.map(item => {
        const [main, sub] = cardLines(item);
        const subHtml = sub ? '<span class="line-sub">' + escapeHtml(sub) + '</span>' : '';
        const cls = isBack ? 'card back' : 'card';
        return '<div class="' + cls + '"><span class="line-main">' + escapeHtml(main) + '</span>' + subHtml + '</div>';
    }).join('');
    return '<section class="card-page">' + cardsHtml + '</section>';
}

function printCardsWindow() {
    const win = openPrintWindow();
    if (!win) return;

    const title = deck ? deck.title : 'Wortschatz';
    const duplex = isDuplex();
    const pagesHtml = [];

    for (let i = 0; i < rows.length; i += CARDS_PER_PAGE) {
        const pageItems = rows.slice(i, i + CARDS_PER_PAGE);
        if (duplex) {
            const frontHtml = pageItems.map(item => cardHtml(item.target, false)).join('');
            const backHtml = pageItems.map(item => cardHtml(item.source, true)).join('');
            pagesHtml.push('<section class="card-page">' + frontHtml + '</section>');
            pagesHtml.push('<section class="card-page">' + backHtml + '</section>');
        } else {
            pagesHtml.push(cardPageHtml(pageItems, false));
        }
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
        // Rückseite um 180° gedreht: der Drucker wendet das Blatt an der
        // langen (vertikalen) Kante, die Nutzerin dreht die fertige Karte
        // aber um ihre eigene lange (horizontale) Kante – zwei um 90°
        // versetzte Wendeachsen ergeben in Summe eine halbe Drehung.
        '.card.back{transform:rotate(180deg)}' +
        '.line-main{font-size:clamp(.9rem,3.2vw,1.3rem);font-weight:600;overflow-wrap:break-word}' +
        '.line-sub{font-size:clamp(.7rem,2.2vw,.95rem);color:#555;overflow-wrap:break-word}' +
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
