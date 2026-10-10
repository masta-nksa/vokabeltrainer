// Sprachprofile: alles, was von der Lernsprache abhängt, an einem Ort.
// Eine weitere Sprache ist ein weiterer Eintrag hier – Modi, Spiele und
// Fehlerklassen fragen das Profil ab und brauchen keinen Sonderfall.
//
// Dieses Modul hat bewusst keine Importe: util.js und errors.js stützen sich
// darauf.

/**
 * @typedef {Object} LanguageProfile
 * @property {string} name
 * @property {string[]} specialChars   Zeichen für die Akzentleiste
 * @property {Record<string, {gender?: 'm' | 'f', number?: 'sg' | 'pl'}>} articles
 *   Artikel, die am Anfang eines Eintrags stehen können, und was sie verraten
 * @property {RegExp} [elided]         Elidierter Artikel am Wortanfang (l')
 * @property {{m: string, f: string, pl: string, elided?: string}} [definite]
 * @property {{m: string, f: string, pl: string}} [possessive]
 * @property {RegExp} [vowelStart]     Wortanfang, vor dem elidiert wird
 * @property {Record<string, string>} [eliding]  le → l', de → d' …
 * @property {{gender: string[][], number: string[][]}} pairs
 *   Wortpaare, die sich nur im Genus bzw. in der Zahl unterscheiden
 * @property {boolean} [genderByE]     Weibliche Form durch angehängtes -e
 */

/** @type {Record<string, LanguageProfile>} */
export const LANGUAGES = {
    fr: {
        name: 'Französisch',
        specialChars: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ'],
        articles: {
            le: { gender: 'm', number: 'sg' },
            la: { gender: 'f', number: 'sg' },
            les: { number: 'pl' },
            un: { gender: 'm', number: 'sg' },
            une: { gender: 'f', number: 'sg' },
            des: { number: 'pl' }
        },
        elided: /^([lL]['’])(\S.*)$/,
        definite: { m: 'le', f: 'la', pl: 'les', elided: "l'" },
        possessive: { m: 'mon', f: 'ma', pl: 'mes' },
        vowelStart: /^[aeiouyhàâäéèêëîïôöûüùœ]/i,
        eliding: { le: "l'", la: "l'", de: "d'", je: "j'", se: "s'", ce: "c'", ne: "n'", me: "m'", te: "t'", que: "qu'" },
        pairs: {
            gender: [
                ['le', 'la'], ['un', 'une'], ['mon', 'ma'], ['ton', 'ta'], ['son', 'sa'],
                ['il', 'elle'], ['ils', 'elles'], ['ce', 'cette'], ['cet', 'cette']
            ],
            number: [
                ['le', 'les'], ['la', 'les'], ["l'", 'les'], ['un', 'des'], ['une', 'des'],
                ['mon', 'mes'], ['ma', 'mes'], ['ton', 'tes'], ['ta', 'tes'], ['son', 'ses'], ['sa', 'ses'],
                ['il', 'ils'], ['elle', 'elles'], ['est', 'sont'], ['a', 'ont'],
                ['ce', 'ces'], ['cette', 'ces'], ['appelle', 'appellent']
            ]
        },
        genderByE: true
    },
    en: {
        name: 'Englisch',
        specialChars: [],
        articles: { a: { number: 'sg' }, an: { number: 'sg' }, the: {} },
        pairs: {
            gender: [['he', 'she'], ['his', 'her'], ['him', 'her'], ['himself', 'herself']],
            number: [['is', 'are'], ['was', 'were'], ['has', 'have'], ['this', 'these'], ['that', 'those']]
        }
    }
};

/**
 * Profil zu einer Sprachkennung; unbekannte Sprachen bekommen ein leeres.
 * @param {string} [lang] BCP-47, nur der Sprachteil zählt
 * @returns {LanguageProfile}
 */
export function languageProfile(lang) {
    const code = (lang ?? '').slice(0, 2).toLowerCase();
    return LANGUAGES[code] ?? { name: code, specialChars: [], articles: {}, pairs: { gender: [], number: [] } };
}

/** Kennt die Sprache ein grammatisches Geschlecht mit Artikeln? */
export function hasGender(lang) {
    return Boolean(languageProfile(lang).definite);
}
