// Selbsttest für Niveaus und Fehlerklassen: node tools/test-learning.mjs
import { classify, fromOperations, editDistance } from '../js/learning/errors.js';
import { toLevel } from '../js/learning/levels.js';
import { splitArticle, misspellings } from '../js/util.js';
import * as writing from '../js/modes/writing.js';
import * as spelling from '../js/modes/spelling.js';
import { enrichItem, inLevel, targetForms, groupOf, itemsFrom, prepareDeck } from '../js/data/decks.js';
import { generate, germanWith, relation } from '../js/learning/generators.js';

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

// ------------------------------------------------------- Generatoren

const famille = ['wf:famille'];
const grammarDeck = prepareDeck({
    id: 'g', targetLang: 'fr', sourceLang: 'de',
    units: [{ id: 'u2-lz2', title: 'LZ2', group: 'u2', items: [
        { id: 'mere', source: 'die Mutter', target: 'la mère', accept: ['la maman'], tags: famille },
        { id: 'pere', source: 'der Vater', target: 'le père', tags: famille },
        { id: 'parents', source: 'die Eltern', target: 'les parents', gender: 'm', number: 'pl', tags: famille },
        { id: 'oncle', source: 'ein Onkel', target: 'un oncle', tags: famille },
        { id: 'enfant', source: 'ein Kind', target: 'un enfant', accept: ['une enfant'], tags: famille },
        { id: 'chat', source: 'die Katze', target: 'le chat', level: 'erweitert', tags: famille },
        { id: 'voici', source: 'hier ist', target: 'voici' }
    ] }]
});
const answerOf = (tasks, id) => [].concat(tasks.find(task => task.id === id)?.answer ?? []);

const poss = generate({ id: 's', unitId: 'u2', generators: [{ type: 'possessive', tags: famille }] }, grammarDeck, 'basis');
check('mon/ma/mes aus Genus und Zahl',
    answerOf(poss, 's:mere')[0] === 'ma' && answerOf(poss, 's:pere')[0] === 'mon' && answerOf(poss, 's:parents')[0] === 'mes');
check('Basis bietet mon, ma, mes als Knöpfe', poss[0].choices.join() === 'mon,ma,mes');
check('zweideutiges Genus (un/une enfant) bleibt draussen', !poss.some(task => task.id === 's:enfant'));
check('Zusatzwortschatz erst ab Erweitert', !poss.some(task => task.id === 's:chat'));
check('Wörter ohne Genus bleiben draussen', !poss.some(task => task.id === 's:voici'));

const possExpert = generate({ id: 's', unitId: 'u2', generators: [{ type: 'possessive', tags: famille }] }, grammarDeck, 'expert');
check('Expert schreibt den ganzen Ausdruck',
    possExpert.find(task => task.id === 's:mere').text.startsWith('meine Mutter')
    && answerOf(possExpert, 's:mere').includes('ma mère') && answerOf(possExpert, 's:mere').includes('ma maman'));
check('deutsches Genus zählt nicht: die Katze → mon chat', answerOf(possExpert, 's:chat')[0] === 'mon chat');

const art = generate({ id: 'a', unitId: 'u2', generators: [{ type: 'article', tags: famille }] }, grammarDeck, 'expert');
check('Artikel le / la / les', answerOf(art, 'a:pere')[0] === 'le' && answerOf(art, 'a:mere')[0] === 'la' && answerOf(art, 'a:parents')[0] === 'les');
check("vor Vokal l' – und bei «ein Onkel» gilt auch un",
    answerOf(art, 'a:oncle')[0] === "l'" && answerOf(art, 'a:oncle').includes('un'));
check('Expert: unbestimmter Artikel dazu', answerOf(art, 'a:mere:un')[0] === 'une' && !art.some(task => task.id === 'a:oncle:un'));
check('andere Unit → keine Aufgaben',
    generate({ id: 'a', unitId: 'u9', generators: [{ type: 'article' }] }, grammarDeck, 'expert').length === 0);

check('mein/meine aus dem deutschen Artikel',
    germanWith('das Baby, das Kleinkind', 'possessive', false) === 'mein Baby'
    && germanWith('die Tante', 'indefinite', false) === 'eine Tante'
    && germanWith('Montag', 'possessive', false) === null);

const tree = {
    people: [
        { id: 'marc', name: 'Marc', g: 'm' }, { id: 'claire', name: 'Claire', g: 'f' },
        { id: 'emma', name: 'Emma', g: 'f', parents: ['marc', 'claire'] },
        { id: 'jules', name: 'Jules', g: 'm', parents: ['marc', 'claire'] },
        { id: 'hugo', name: 'Hugo', g: 'm' }, { id: 'lucie', name: 'Lucie', g: 'f' },
        { id: 'lea', name: 'Léa', g: 'f', parents: ['emma', 'hugo'] },
        { id: 'theo', name: 'Théo', g: 'm', parents: ['jules', 'lucie'] }
    ],
    terms: {
        mother: 'la mère', father: 'le père', daughter: 'la fille', son: 'le fils', sister: 'la sœur', brother: 'le frère',
        grandmother: 'la grand-mère', grandfather: 'le grand-père', granddaughter: 'la petite-fille', grandson: 'le petit-fils',
        aunt: 'la tante', uncle: "l'oncle", cousin_f: 'la cousine', cousin_m: 'le cousin'
    },
    advanced: ['granddaughter', 'grandson']
};
const folk = new Map(tree.people.map(person => [person.id, person]));
const rel = (a, b) => relation(folk.get(a), folk.get(b), folk);
check('Verwandtschaft: Eltern und Kinder', rel('emma', 'lea') === 'mother' && rel('lea', 'hugo') === 'daughter');
check('Verwandtschaft: Geschwister', rel('jules', 'emma') === 'brother');
check('Verwandtschaft: Grosseltern und Enkel', rel('claire', 'theo') === 'grandmother' && rel('lea', 'marc') === 'granddaughter');
check('Verwandtschaft: Onkel, auch angeheiratet', rel('jules', 'lea') === 'uncle' && rel('hugo', 'theo') === 'uncle' && rel('lucie', 'lea') === 'aunt');
check('Verwandtschaft: Cousin und Cousine', rel('theo', 'lea') === 'cousin_m' && rel('lea', 'theo') === 'cousin_f');
check('nicht verwandt → nichts', rel('hugo', 'lucie') === null && rel('hugo', 'marc') === null);

const kinSet = { id: 'k', unitId: 'u2', generators: [{ type: 'kinship' }], family: tree };
const kinBasis = generate(kinSet, grammarDeck, 'basis');
check('Basis: Umkehrung mit vier Knöpfen, ohne Enkel',
    kinBasis.length > 0 && kinBasis.every(task => task.choices.length === 4 && !/petit/.test([].concat(task.answer).join())));
check("d' vor Vokal und h", kinBasis.some(task => task.text.includes("d'Emma")) && kinBasis.some(task => task.text.includes("d'Hugo"))
    && !kinBasis.some(task => /de (Emma|Hugo)/.test(task.text)));
const kinMid = generate(kinSet, grammarDeck, 'erweitert');
const uncleTask = kinMid.find(task => task.id === 'k:jules-emma-lea');
check('Erweitert: Kette zum Onkel', uncleTask && [].concat(uncleTask.answer)[0] === "l'oncle" && !uncleTask.choices);
const kinExpert = generate(kinSet, grammarDeck, 'expert');
check('Expert: nur Ketten und Enkel', kinExpert.length > 0 && kinExpert.length < kinMid.length);

console.log(failures === 0 ? '\nAlle Prüfungen bestanden.' : `\n${failures} Prüfung(en) fehlgeschlagen.`);
process.exit(failures === 0 ? 0 : 1);
