// Selbsttest für Niveaus und Fehlerklassen: node tools/test-learning.mjs
import { classify, fromOperations, editDistance } from '../js/learning/errors.js';
import { toLevel } from '../js/learning/levels.js';
import { splitArticle, misspellings } from '../js/util.js';
import * as writing from '../js/modes/writing.js';
import * as spelling from '../js/modes/spelling.js';
import { enrichItem, inLevel, targetForms, groupOf, itemsFrom, prepareDeck } from '../js/data/decks.js';

let failures = 0;
const check = (name, condition) => {
    console.log(`${condition ? 'ok  ' : 'FEHL'} ${name}`);
    if (!condition) failures++;
};

// ------------------------------------------------------------- Niveaus

check('alte Stufe easy → basis', toLevel('easy') === 'basis');
check('alte Stufe medium → erweitert', toLevel('medium') === 'erweitert');
check('alte Stufe hard → expert', toLevel('hard') === 'expert');
check('neues Niveau bleibt', toLevel('expert') === 'expert');
check('unbekannt → erweitert', toLevel(null) === 'erweitert' && toLevel('quatsch') === 'erweitert');

// ---------------------------------------------------- Artikel abtrennen

const gm = splitArticle('la grand-mère', 'fr');
check('la grand-mère → la + grand-mère', gm?.article === 'la' && gm.rest === 'grand-mère' && gm.joiner === ' ');
const acteur = splitArticle("l'acteur", 'fr');
check("l'acteur → l' + acteur", acteur?.article === "l'" && acteur.rest === 'acteur' && acteur.joiner === '');
check('les grands-parents → les', splitArticle('les grands-parents', 'fr')?.article === 'les');
check('a clock → a (en)', splitArticle('a clock', 'en-GB')?.article === 'a');
check('Satz bleibt ganz', splitArticle("C'est ma famille.", 'fr') === null);
check('un/une enfant bleibt ganz', splitArticle('un/une enfant', 'fr') === null);
check('Liste mehrerer Formen bleibt ganz', splitArticle('les maths, les mathématiques (f pl)', 'fr') === null);
check('ohne Artikel → null', splitArticle('onze', 'fr') === null);
check('Sprache ohne Liste → null', splitArticle('la casa', 'es') === null);

// --------------------------------------------------------- Fehlerklassen

const fr = (given, expected, others) => classify({ given, expected, lang: 'fr', others });

check('Akzent', fr('la grand-mere', 'la grand-mère').type === 'accent');
check('Genus le/la', fr('le tante', 'la tante').type === 'gender');
check('Genus mon/ma', fr('mon mère', 'ma mère').type === 'gender');
check('Genus durch -e', fr('marié', 'mariée').type === 'gender');
check('Zahl ma/mes', fr('ma parents', 'mes parents').type === 'number');
check('Zahl est/sont', fr('ils est', 'ils sont').type === 'number');
check('Zahl il/ils + appelle/appellent',
    fr("il s'appelle", "ils s'appellent").type === 'number');
check('Elision le acteur', fr('le acteur', "l'acteur").type === 'elision');
check('Elision typografisches Apostroph', fr('le acteur', 'l’acteur').type === 'elision');
check('Elision verkehrt', fr("l'chat", 'le chat').type !== 'unknown');

const missing = fr('la cousin', 'la cousine');
check('fehlendes -e als Genus', missing.type === 'gender');
const swap = fr('le frèer', 'le frère');
check('Dreher', swap.type === 'letters' && swap.detail === 'swap');
const dbl = fr('la cousinne', 'la cousine');
check('Verdopplung', dbl.type === 'letters' && dbl.detail === 'double');
const drop = fr('le classur', 'le classeur');
check('Auslassung', drop.type === 'letters' && drop.detail === 'missing');
check('zwei Fehler', fr('le clasur', 'le classeur').detail === 'multiple');

const others = [{ id: 'oncle', text: 'un oncle' }, { id: 'tante', text: 'la tante' }];
const confused = fr('un oncle', 'la tante', others);
check('Verwechslung mit anderem Eintrag', confused.type === 'confusion' && confused.confusedWith === 'oncle');
check('ganz anders → unknown', fr('bonjour', 'la tante').type === 'unknown');

check('Englisch Zahl is/are', classify({ given: 'they is', expected: 'they are', lang: 'en' }).type === 'number');
check('Englisch Plural -s', classify({ given: 'two cat', expected: 'two cats', lang: 'en' }).type === 'number');
check('Editierdistanz Dreher = 1', editDistance('frère', 'frèer') === 1);

check('Operationen: nur Akzent', fromOperations(['accent']).type === 'accent');
check('Operationen: ein Dreher', fromOperations(['swap']).detail === 'swap');
check('Operationen: kombiniert', fromOperations(['accent', 'double']).detail === 'multiple');

const variants = misspellings('grand-mère', 6, { edits: 1 });
check('Varianten tragen ihre Operationen',
    variants.length > 0 && variants.every(v => typeof v.text === 'string' && v.ops.length === 1));

// -------------------------------------------------- Modus spelling

const pool = [
    { id: 'a', source: 'die Grossmutter', target: 'la grand-mère' },
    { id: 'b', source: 'der Onkel', target: 'un oncle' }
];
const sq = spelling.buildQuestion(pool[0], pool, 'basis');
check('spelling Basis: 4 Optionen höchstens', sq.options.length <= 4);
check('spelling: jede falsche Option hat eine Fehlerklasse',
    sq.options.filter(o => o !== sq.answer).every(o => sq.optionErrors[o]?.type));

// -------------------------------------------------- Modus writing

const deck = { id: 'd', targetLang: 'fr' };
const item = { id: 'gm', source: 'die Grossmutter', target: 'la grand-mère' };

const basis = writing.buildQuestion(item, [], 'basis', deck);
check('Basis gibt den Artikel vor', basis.prefix === 'la' && basis.fieldAnswer === 'grand-mère');
check('Basis: Rest genügt', writing.check(basis, 'grand-mère', 'basis').correct);
check('Basis: mit Artikel geht auch', writing.check(basis, 'la grand-mère', 'basis').correct);
const tolerated = writing.check(basis, 'grand-mere', 'basis');
check('Basis: Akzent toleriert, aber notiert', tolerated.correct && tolerated.tolerated === 'accent' && tolerated.note);
check('Basis: falscher Artikel mitgetippt ist falsch', !writing.check(basis, 'le grand-mère', 'basis').correct);
check('Basis: falscher Artikel bleibt stehen', writing.completeAnswer(basis, 'le grand-mère') === 'le grand-mère');

const erweitert = writing.buildQuestion(item, [], 'erweitert', deck);
check('Erweitert gibt keinen Artikel vor', erweitert.prefix === undefined);
const accentE = writing.check(erweitert, 'la grand-mere', 'erweitert');
check('Erweitert: Akzent zählt, mit Hinweis', !accentE.correct && accentE.note);
const accentX = writing.check(erweitert, 'la grand-mere', 'expert');
check('Expert: Akzent zählt, ohne Hinweis', !accentX.correct && !accentX.note);
check('Apostroph vom iPad', writing.check({ answer: "l'acteur" }, 'l’acteur', 'expert').correct);

const elided = writing.buildQuestion({ id: 'x', source: 'der Schauspieler', target: "l'acteur" }, [], 'basis', deck);
check("Basis l': ohne Leerzeichen ergänzt", writing.completeAnswer(elided, 'acteur') === "l'acteur");

// ---------------------------------------------------- Inhaltsmodell

const noun = enrichItem({ id: 'x', source: 'die Grossmutter', target: 'la grand-mère' }, 'fr');
check('Lemma, Genus, Zahl aus dem Artikel',
    noun.lemma === 'grand-mère' && noun.gender === 'f' && noun.number === 'sg' && noun.pos === 'noun');
check('ohne Angabe Niveau basis', noun.level === 'basis');
const plural = enrichItem({ id: 'x', source: 'die Eltern', target: 'les parents', gender: 'm' }, 'fr');
check('les → Mehrzahl, Genus aus dem Deck', plural.number === 'pl' && plural.gender === 'm');
const elidedNoun = enrichItem({ id: 'x', source: 'das Alter', target: "l'âge", gender: 'm' }, 'fr');
check("l' verrät kein Genus – das Deck sagt es", elidedNoun.gender === 'm' && elidedNoun.lemma === 'âge');
check('Satz wird als phrase erkannt',
    enrichItem({ id: 'x', source: 'Das ist meine Familie.', target: "C'est ma famille." }, 'fr').pos === 'phrase');
check('Verb bleibt ohne Genus', enrichItem({ id: 'x', source: 'singen', target: 'chanter' }, 'fr').gender === undefined);

check('Niveau schliesst tiefere ein',
    inLevel({ level: 'basis' }, 'expert') && inLevel({ level: 'erweitert' }, 'erweitert') && !inLevel({ level: 'erweitert' }, 'basis'));
check('alle Schreibweisen', targetForms({ target: 'la géo', accept: ['la géographie'] }).length === 2);
check('Gruppe aus dem Feld', groupOf({ id: 'u2-lz1', group: 'u2' }) === 'u2');
check('Gruppe aus alter Kennung', groupOf({ id: '3_2-t1' }) === '3_2' && groupOf({ id: '2_0' }) === '2_0');

const course = prepareDeck({
    id: 'c', targetLang: 'fr', sourceLang: 'de',
    units: [{ id: 'a', title: 'A', items: [
        { id: '1', source: 'die Mutter', target: 'la mère', accept: ['la maman'] },
        { id: '2', source: 'der Enkel', target: 'le petit-fils', level: 'erweitert' }
    ] }]
});
check('Basis zeigt nur den Grundwortschatz', itemsFrom(course, ['a'], 'basis').length === 1);
check('Erweitert nimmt den Zusatzwortschatz dazu', itemsFrom(course, ['a'], 'erweitert').length === 2);

const mother = writing.buildQuestion(course.units[0].items[0], [], 'erweitert', course);
check('weitere Schreibweise gilt', writing.check(mother, 'la maman', 'erweitert').correct);
check('Hauptform gilt', writing.check(mother, 'la mère', 'erweitert').correct);
const motherBasis = writing.buildQuestion(course.units[0].items[0], [], 'basis', course);
check('Basis: gleicher Artikel bei allen Formen → vorgegeben',
    motherBasis.prefix === 'la' && writing.check(motherBasis, 'maman', 'basis').correct);
const child = writing.buildQuestion({ id: '3', source: 'ein Kind', target: 'un enfant', accept: ['une enfant'] }, [], 'basis', course);
check('Basis: verschiedene Artikel → keiner vorgegeben', child.prefix === undefined);

console.log(failures === 0 ? '\nAlle Prüfungen bestanden.' : `\n${failures} Prüfung(en) fehlgeschlagen.`);
process.exit(failures === 0 ? 0 : 1);
