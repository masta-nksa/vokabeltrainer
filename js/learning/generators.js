// Erzeugt Grammatik-Aufgaben aus dem Wortschatz. Wer bei einem Wort Genus und
// Zahl kennt, kann daraus Übungen zu Artikel und mon/ma/mes machen, ohne jede
// Aufgabe einzeln zu schreiben – jede neue Unit bringt ihre Übungen mit.
//
// Ein Übungsset nennt seine Generatoren (data/exercises/<deck>.json):
//   "generators": [{ "type": "possessive", "tags": ["wf:famille"] }]
//
// Die Aufgaben haben dieselbe Form wie handgeschriebene (js/data/exercises.js)
// und feste Kennungen aus Set und Eintrag, damit der Lernstand hält.

import { splitArticle, shuffle } from '../util.js';
import { languageProfile } from './languages.js';
import { groupOf, inLevel, targetForms } from '../data/decks.js';

/** @typedef {import('../data/exercises.js').Task} Task */

// ----------------------------------------------------------------- Helfer

/** Die Einträge, aus denen ein Generator schöpft: Unit, Niveau, Wortfeld. */
function candidates(set, spec, deck, level) {
    return deck.units
        .filter(unit => groupOf(unit) === set.unitId)
        .flatMap(unit => unit.items)
        .filter(item => inLevel(item, level))
        .filter(item => !spec.tags || spec.tags.some(tag => item.tags?.includes(tag)))
        .filter(item => item.pos === 'noun' && item.number && hasClearGender(item, deck.targetLang));
}

/**
 * Ein Wort mit Formen verschiedenen Genus ("un enfant", "une enfant") taugt
 * nicht für eine Genus-Aufgabe – beide Antworten wären richtig.
 */
export function hasClearGender(item, lang) {
    if (item.number === 'pl') return true;
    if (!item.gender) return false;
    const articles = languageProfile(lang).articles;
    const genders = new Set(targetForms(item)
        .map(form => articles[splitArticle(form, lang)?.article.toLowerCase()]?.gender)
        .filter(Boolean));
    return genders.size <= 1;
}

/** Erste Bedeutung eines Eintrags: "das Baby, das Kleinkind" → "das Baby". */
function firstMeaning(source) {
    return source.split(',')[0].trim();
}

/**
 * Setzt vor ein deutsches Nomen "mein/meine" bzw. "ein/eine", abgelesen am
 * Artikel der Ausgangssprache. Ohne erkennbaren Artikel: null.
 * @param {string} source
 * @param {'possessive' | 'indefinite'} kind
 * @param {boolean} plural
 */
export function germanWith(source, kind, plural) {
    const match = /^(der|die|das|ein|eine)\s+(.+)$/i.exec(firstMeaning(source));
    if (!match) return null;
    const feminine = ['die', 'eine'].includes(match[1].toLowerCase());

    if (kind === 'possessive') return `${plural || feminine ? 'meine' : 'mein'} ${match[2]}`;
    if (plural) return null; // keine unbestimmte Mehrzahl im Deutschen
    return `${feminine ? 'eine' : 'ein'} ${match[2]}`;
}

// -------------------------------------------------------------- mon/ma/mes

function possessiveTasks(set, spec, deck, level) {
    const profile = languageProfile(deck.targetLang);
    const forms = profile.possessive;
    if (!forms) return [];

    return candidates(set, spec, deck, level).flatMap(item => {
        const plural = item.number === 'pl';
        const vowel = profile.vowelStart.test(item.lemma);
        const form = plural ? forms.pl : item.gender === 'f' && !vowel ? forms.f : forms.m;
        const german = germanWith(item.source, 'possessive', plural);
        if (!german) return [];

        const note = plural ? `Mehrzahl → ${forms.pl}`
            : item.gender === 'f' && vowel ? `weiblich, beginnt aber mit Vokal → ${forms.m}`
                : item.gender === 'f' ? `weiblich → ${forms.f}`
                    : `männlich → ${forms.m}`;

        // Expert schreibt den ganzen Ausdruck aus dem Deutschen.
        if (level === 'expert') {
            return [{
                id: `${set.id}:${item.id}`,
                type: 'gap',
                text: `${german}  →  ___`,
                answer: targetForms(item).map(target => `${form} ${splitArticle(target, deck.targetLang)?.rest ?? item.lemma}`),
                note
            }];
        }

        return [{
            id: `${set.id}:${item.id}`,
            type: 'gap',
            text: `___ ${item.lemma}  (${german})`,
            answer: form,
            choices: [forms.m, forms.f, forms.pl],
            note
        }];
    });
}

// ------------------------------------------------------------ le/la/l'/les

function articleTasks(set, spec, deck, level) {
    const profile = languageProfile(deck.targetLang);
    const forms = profile.definite;
    if (!forms) return [];

    const indefinite = Object.entries(profile.articles)
        .filter(([word]) => !Object.values(forms).includes(word));
    const indefiniteFor = gender => indefinite.find(([, info]) => info.gender === gender && info.number === 'sg')?.[0];

    return candidates(set, spec, deck, level).flatMap(item => {
        const plural = item.number === 'pl';
        const vowel = profile.vowelStart.test(item.lemma);
        const form = plural ? forms.pl : vowel && forms.elided ? forms.elided : forms[item.gender];
        const kind = item.gender === 'f' ? 'weiblich' : 'männlich';
        const note = plural ? `Mehrzahl → ${forms.pl}`
            : vowel && forms.elided ? `beginnt mit Vokal → ${forms.elided} (${kind})`
                : `${kind} → ${form}`;

        const german = germanWith(item.source, 'indefinite', plural);
        const un = indefiniteFor(item.gender);

        // Steht das deutsche Wort schon mit "ein" da ("ein Onkel"), ist offen,
        // welcher Artikel gemeint ist – dann gilt auch der unbestimmte.
        const sourceIndefinite = /^eine?\s/i.test(firstMeaning(item.source));

        const tasks = [{
            id: `${set.id}:${item.id}`,
            type: 'gap',
            text: `___ ${item.lemma}  (${firstMeaning(item.source)})`,
            answer: sourceIndefinite && un ? [form, un] : form,
            choices: [forms.m, forms.f, forms.elided, forms.pl].filter(Boolean),
            note
        }];

        // Expert übt zusätzlich den unbestimmten Artikel.
        if (level === 'expert' && german && un && !sourceIndefinite) {
            tasks.push({
                id: `${set.id}:${item.id}:un`,
                type: 'gap',
                text: `___ ${item.lemma}  (${german})`,
                answer: un,
                note: `${kind} → ${un}`
            });
        }
        return tasks;
    });
}

// ------------------------------------------------------------ Verwandtschaft

/**
 * Was ist a für b? Ein Schlüssel wie "mother", "uncle", "cousin_f" – oder
 * null, wenn die beiden nicht in einer benannten Beziehung stehen.
 * @param {{id: string, g: 'm' | 'f', parents?: string[]}} a
 * @param {{id: string, g: 'm' | 'f', parents?: string[]}} b
 * @param {Map<string, {id: string, g: 'm' | 'f', parents?: string[]}>} people
 */
export function relation(a, b, people) {
    if (a.id === b.id) return null;
    const parents = person => (person.parents ?? []).map(id => people.get(id)).filter(Boolean);
    const isParent = (x, y) => (y.parents ?? []).includes(x.id);
    const siblings = (x, y) => x.id !== y.id && (x.parents ?? []).length > 0
        && (x.parents ?? []).some(id => (y.parents ?? []).includes(id));
    const partners = (x, y) => x.id !== y.id
        && [...people.values()].some(child => isParent(x, child) && isParent(y, child));
    const pick = (f, m) => (a.g === 'f' ? f : m);

    if (isParent(a, b)) return pick('mother', 'father');
    if (isParent(b, a)) return pick('daughter', 'son');
    if (siblings(a, b)) return pick('sister', 'brother');
    if (parents(b).some(p => isParent(a, p))) return pick('grandmother', 'grandfather');
    if (parents(a).some(p => isParent(b, p))) return pick('granddaughter', 'grandson');

    const auntOrUncle = parents(b).some(p =>
        siblings(a, p) || [...people.values()].some(s => siblings(s, p) && partners(a, s)));
    if (auntOrUncle) return pick('aunt', 'uncle');

    if (parents(a).some(pa => parents(b).some(pb => siblings(pa, pb)))) return pick('cousin_f', 'cousin_m');
    return null;
}

function kinshipTasks(set, spec, deck, level) {
    const profile = languageProfile(deck.targetLang);
    const family = set.family;
    if (!family) return [];

    const people = new Map(family.people.map(person => [person.id, person]));
    const all = [...people.values()];
    const hard = new Set(family.advanced ?? []);
    const usable = key => key && (level !== 'basis' || !hard.has(key));

    // "de Léa", aber "d'Emma"
    const of = person => (profile.vowelStart.test(person.name) ? `d'${person.name}` : `de ${person.name}`);
    const says = (x, key, y) => `${x.name} est ${family.terms[key]} ${of(y)}.`;
    const asks = (x, y) => `${x.name} est ___ ${of(y)}.`;

    const terms = Object.entries(family.terms).filter(([key]) => usable(key)).map(([, term]) => term);
    const withChoices = (task, answer) => (level === 'basis'
        ? { ...task, choices: shuffle([answer, ...shuffle(terms.filter(term => term !== answer)).slice(0, 3)]) }
        : task);

    const tasks = [];

    for (const a of all) {
        for (const b of all) {
            const forward = relation(a, b, people);
            if (!usable(forward)) continue;
            const answer = family.terms[forward];

            // Umkehrung: "Emma est la mère de Léa. Léa est ___ d'Emma." Expert
            // bekommt sie nur noch mit den schwierigeren Wörtern (Enkel).
            const back = relation(b, a, people);
            const plainForExpert = level === 'expert' && !hard.has(forward) && !hard.has(back);
            if (usable(back) && !plainForExpert) {
                tasks.push(withChoices({
                    id: `${set.id}:${a.id}-${b.id}`,
                    type: 'gap',
                    text: `${says(b, back, a)}  ${asks(a, b)}`,
                    answer
                }, answer));
            }

            // Kette über einen Elternteil: Tante, Onkel, Grosseltern. Auf Basis
            // zu anspruchsvoll.
            if (level === 'basis') continue;
            for (const p of (b.parents ?? []).map(id => people.get(id))) {
                const first = relation(a, p, people);
                const second = relation(p, b, people);
                if (!usable(first) || !usable(second)) continue;
                tasks.push({
                    id: `${set.id}:${a.id}-${p.id}-${b.id}`,
                    type: 'gap',
                    text: `${says(a, first, p)}  ${says(p, second, b)}  ${asks(a, b)}`,
                    answer
                });
            }
        }
    }

    return tasks;
}

// ------------------------------------------------------------------ Einstieg

const GENERATORS = {
    possessive: possessiveTasks,
    article: articleTasks,
    kinship: kinshipTasks
};

/**
 * Alle Aufgaben, die die Generatoren eines Sets auf diesem Niveau hergeben.
 * @param {import('../data/exercises.js').ExerciseSet} set
 * @param {import('../storage/index.js').Deck} deck  mit prepareDeck aufbereitet
 * @param {import('./levels.js').Level} level
 * @returns {Task[]}
 */
export function generate(set, deck, level) {
    return (set.generators ?? []).flatMap(spec => GENERATORS[spec.type]?.(set, spec, deck, level) ?? []);
}
