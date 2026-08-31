// Selbsttest für den CSV-Import: node tools/test-csv.mjs
import { readTextFile, deckFromCsv } from '../js/data/csv.js';

const source = 'Lektion;Englisch;Deutsch\r\n'
    + 'U1;a clock;eine Uhr\r\n'
    + 'U1;the sky;der Himmel\r\n'
    + '\r\n'
    + 'U2;"Hallo; Welt";Gruss\r\n';

let failures = 0;
const check = (name, condition) => {
    console.log(`${condition ? 'ok  ' : 'FEHL'} ${name}`);
    if (!condition) failures++;
};

// Excel unter Windows schreibt gerne UTF-16 mit BOM.
const utf16 = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(source, 'utf16le')]);
const fromUtf16 = await readTextFile(new Blob([utf16]));
check('UTF-16 wird erkannt', fromUtf16 === source);

const utf8 = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(source, 'utf8')]);
const fromUtf8 = await readTextFile(new Blob([utf8]));
check('UTF-8 mit BOM wird erkannt', fromUtf8 === source);

const deck = deckFromCsv(fromUtf16, { id: 't', title: 'Test', sourceLang: 'de', targetLang: 'en' });
check('Kopfzeile übersprungen', deck.units[0].items[0].target === 'a clock');
check('Leerzeile ignoriert', deck.units.length === 2);
check('Lektion U1 hat zwei Einträge', deck.units[0].items.length === 2);
check('Semikolon in Anführungszeichen bleibt', deck.units[1].items[0].target === 'Hallo; Welt');
check('Ausgangssprache in Spalte 3', deck.units[0].items[1].source === 'der Himmel');

const swapped = deckFromCsv(fromUtf16, {
    id: 't', title: 'Test', sourceLang: 'de', targetLang: 'en', targetFirst: false
});
check('Spaltentausch wirkt', swapped.units[0].items[0].source === 'a clock');

console.log(failures === 0 ? '\nAlle Prüfungen bestanden.' : `\n${failures} Prüfung(en) fehlgeschlagen.`);
process.exit(failures === 0 ? 0 : 1);
