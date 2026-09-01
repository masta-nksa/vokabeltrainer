// CSV einlesen und schreiben.

/**
 * Liest eine Datei als Text und erkennt die Kodierung an der Byte-Order-Mark.
 *
 * Excel speichert CSV auf Windows gerne als UTF-16. Wer das ungeprüft als
 * UTF-8 liest, bekommt entweder Zeichensalat oder gar nichts – deshalb wird
 * hier zuerst in die ersten Bytes geschaut statt blind file.text() zu rufen.
 *
 * @param {File | Blob} file
 * @returns {Promise<string>}
 */
export async function readTextFile(file) {
    const buffer = await file.arrayBuffer();
    const head = new Uint8Array(buffer.slice(0, 3));

    let encoding = 'utf-8';
    if (head[0] === 0xFF && head[1] === 0xFE) encoding = 'utf-16le';
    else if (head[0] === 0xFE && head[1] === 0xFF) encoding = 'utf-16be';

    // Die BOM selbst gehört nicht zum Inhalt.
    return new TextDecoder(encoding).decode(buffer).replace(/^\uFEFF/, '');
}

/**
 * Zerlegt CSV-Text in Zeilen aus Feldern. Trennzeichen ist das Semikolon,
 * Felder dürfen in doppelte Anführungszeichen gesetzt sein.
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    const endField = () => { row.push(field.trim()); field = ''; };
    const endRow = () => {
        endField();
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (quoted) {
            if (char === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else quoted = false;
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') quoted = true;
        else if (char === ';') endField();
        else if (char === '\n') endRow();
        else if (char !== '\r') field += char;
    }
    endRow();

    return rows;
}

/**
 * Kennung für eine Lektion aus ihrem Titel.
 *
 * Meist trägt der Titel die Kennung schon vorne weg ("2_0 Welcome back!").
 * Wo das erste Wort mehrfach vorkommt – etwa bei "Lernziel 1", "Lernziel 2" –
 * würde daraus für alle dieselbe Kennung, und die Lektionen fielen in der
 * Auswahl zu einer einzigen zusammen. Dann muss der ganze Titel herhalten.
 *
 * @param {string[]} titles Alle Lektionstitel in der Reihenfolge der Datei
 * @returns {Map<string, string>} Titel auf Kennung
 */
export function unitIds(titles) {
    const unique = [...new Set(titles)];
    const firstWords = unique.map(title => title.split(' ')[0]);
    const ambiguous = new Set(
        firstWords.filter((word, index) => firstWords.indexOf(word) !== index));

    const slug = title => title
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const ids = new Map();
    unique.forEach((title, index) => {
        const first = firstWords[index];
        ids.set(title, (first && !ambiguous.has(first)) ? first : (slug(title) || `u${index + 1}`));
    });
    return ids;
}

/**
 * Baut aus CSV-Text ein Deck.
 *
 * Erwartet drei Spalten: Lektion, und die beiden Sprachen. Welche der beiden
 * Sprachspalten die Zielsprache ist, entscheidet `targetFirst` – die
 * Altbestände haben die Zielsprache in Spalte 2.
 *
 * @param {string} text
 * @param {{id: string, title: string, sourceLang: string, targetLang: string, targetFirst?: boolean}} meta
 * @returns {import('../storage/index.js').Deck}
 */
export function deckFromCsv(text, meta) {
    const rows = parseCsv(text);
    if (rows.length === 0) throw new Error('Die Datei enthält keine Daten.');

    // Kopfzeile überspringen, falls vorhanden.
    const first = rows[0].map(cell => cell.toLowerCase());
    const hasHeader = first.some(cell =>
        ['lektion', 'lesson', 'unit', 'kapitel'].includes(cell));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const targetFirst = meta.targetFirst !== false;
    const units = [];
    const byTitle = new Map();
    const ids = unitIds(dataRows.map(row => row[0]).filter(Boolean));

    for (const row of dataRows) {
        const [unitTitle, second, third] = row;
        const target = targetFirst ? second : third;
        const source = targetFirst ? third : second;
        if (!unitTitle || !source || !target) continue;

        if (!byTitle.has(unitTitle)) {
            const unit = { id: ids.get(unitTitle), title: unitTitle, items: [] };
            byTitle.set(unitTitle, unit);
            units.push(unit);
        }

        const unit = byTitle.get(unitTitle);
        unit.items.push({
            id: `${unit.id}-${String(unit.items.length + 1).padStart(3, '0')}`,
            source,
            target
        });
    }

    if (units.length === 0) {
        throw new Error('Keine verwertbaren Zeilen gefunden. Erwartet werden drei Spalten, getrennt durch Semikolon.');
    }

    return {
        id: meta.id,
        title: meta.title,
        sourceLang: meta.sourceLang,
        targetLang: meta.targetLang,
        units
    };
}

/**
 * Schreibt ein Deck zurück als CSV – Lektion;Zielsprache;Ausgangssprache.
 * @param {import('../storage/index.js').Deck} deck
 */
export function deckToCsv(deck) {
    const escape = value => /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const lines = ['Lektion;Zielsprache;Ausgangssprache'];

    for (const unit of deck.units) {
        for (const item of unit.items) {
            lines.push([unit.title, item.target, item.source].map(escape).join(';'));
        }
    }

    return lines.join('\r\n');
}
