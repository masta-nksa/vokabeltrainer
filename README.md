# Vokabeltrainer

Mehrsprachiger Vokabeltrainer für den Unterricht. Läuft als statische Seite
auf GitHub Pages – kein Build-Schritt, keine Abhängigkeiten.

## Lernmodi

| Modus | Ablauf |
|---|---|
| **terms** | Zielsprache wird angezeigt und vorgelesen, aus mehreren Übersetzungen die richtige wählen |
| **spelling** | Ausgangssprache wird angezeigt, aus mehreren Schreibweisen die korrekte wählen |
| **writing** | Ausgangssprache wird angezeigt, Übersetzung eintippen |

Das **Niveau Basis / Erweitert / Expert** wirkt je Modus:

| Modus | Basis | Erweitert | Expert |
|---|---|---|---|
| *terms* | 4 Optionen, Ablenker deutlich anders lang | 6 Optionen, zufällige Ablenker | 8 Optionen, Ablenker ähnlich lang |
| *spelling* | 4 Optionen, nur fehlender oder doppelter Buchstabe | 6 Optionen, alle Fehlerarten | 8 Optionen, zwei Fehler kombiniert |
| *writing* | Artikel steht vor dem Feld (*la ___*), fehlender Akzent zählt als richtig mit Hinweis | Artikel selbst schreiben, Akzente zählen, Hinweis nach Akzentfehler | wie Erweitert, ohne Hinweis |

Die Zahl der Optionen ist begrenzt durch das, was die gewählten Lektionen
hergeben. Die Werte stehen als kleine Tabelle `LEVELS` im jeweiligen Modus
(`js/modes/`) und `optionCount()` in `js/util.js`. Wer die App schon mit
einfach/mittel/schwer benutzt hat, behält seine Wahl (`js/learning/levels.js`).

Den Artikel vorzugeben klappt bei Einträgen, die mit *le/la/les/l'/un/une/des*
bzw. *a/an/the* beginnen. Sätze, lange Wendungen und Einträge mit mehreren
Formen (*les maths, les mathématiques*) bleiben ganz.

Dazu **Anwenden**: kleine Übungen zu einer Unit (Grammatik, Sachwissen), die
in der Auswahl unter den Modus-Knöpfen erscheinen, sobald eine passende
Lektion gewählt ist. Siehe [Anwendungsübungen](#anwendungsübungen). Das
Niveau wirkt hier noch nicht.

## Drucken

In der Lektionsauswahl unter **Drucken**: die gewählten Wörter entweder als
**Liste** (Tabelle, wahlweise mit Lücke zum Ausfüllen) oder als
**Karteikarten** ausgeben.

Karteikarten sind DIN A8 quer (74 × 52 mm), 8 pro A4-Blatt – zum Ausschneiden
und Laminieren als Lernkärtchen. Mit der Option **doppelseitig** entstehen
abwechselnd Vorder- und Rückseiten (Zielsprache vorne, Ausgangssprache
hinten) für den Duplex-Druck; die Rückseite ist gedreht für einen Drucker,
der an der langen Kante wendet, und für eine Karte, die man selbst an ihrer
langen Kante umdreht. Beim doppelseitigen Druck steht immer die Zielsprache
vorne und die Ausgangssprache hinten – die Wahl *Was soll auf dem Blatt
stehen?* gilt dann nicht.

## Aufbau

```
index.html          Einstieg, alle Screens
css/styles.css
js/
  main.js           Bootstrap und Screen-Steuerung
  state.js          Zentraler App-Zustand
  storage/db.js     IndexedDB (Decks, Versuche, Einstellungen)
  storage/index.js  Storage-Schnittstelle – später gegen Server austauschbar
  data/csv.js       CSV-Import und -Export
  data/decks.js     Deck-Verwaltung, Einträge aufbereiten (prepareDeck)
  data/exercises.js Anwendungsübungen laden, Aufgaben einer Runde ziehen
  modes/            Lernmodi (terms, spelling, writing) und exercise
  learning/         Niveaus, Fehlerklassen, Sprachprofile, Aufgaben-Generatoren
  ui/               Screens, Lektionsauswahl, Scoreboard, Druck, Belohnung
  speech/tts.js     Sprachausgabe
  speech/assess.js  Schnittstelle für die spätere Ausspracheprüfung
data/decks/         Mitgelieferte Wortschätze als JSON
data/exercises/     Anwendungsübungen je Deck als JSON
img/decks/<deck>/   Bilddateien zu einzelnen Wörtern (optional)
tools/              Entwicklungsskripte, werden nicht ausgeliefert
tools/voci-import/  Vokabelblatt (PDF/Foto) -> Lektion; Skill /voci-unit
```

## Wortschatz ergänzen

CSV mit Semikolon als Trennzeichen, UTF-8:

```
Lektion;Ausgangssprache;Zielsprache
2_0 Welcome back!;eine Uhr;a clock
```

Über *eigenen Wortschatz laden* (dezenter Link unter der Wortschatz-Auswahl
in der Lektionsauswahl) einlesen. Der Wortschatz bleibt danach im Browser
gespeichert.

Lektionen mit gleichem ersten Wort – etwa "Lernziel 1" und "Lernziel 2" –
bleiben getrennt und einzeln wählbar.

### Mitgelieferte Wortschätze

Ein Deck gehört nach `data/decks/` und mit einem Eintrag in
`data/decks/index.json` angemeldet. Jeder Eintrag trägt eine `version`.

Die App vergleicht diese Zahl bei jedem Start mit der Fassung im Browser und
holt neu, was älter ist. Deshalb gilt: **wer ein bestehendes Deck ändert,
zählt die `version` in beiden Dateien hoch.** Ohne das behalten alle, die die
Seite schon einmal offen hatten, für immer den alten Stand. Ein Deck mit
neuer Kennung wird immer geladen.

Der Lernfortschritt hängt nicht am Deck, sondern liegt in einem eigenen
Speicher – ein Ersetzen kostet niemanden seine Statistik. Selbst importierte
Wortschätze werden nie überschrieben.

Veröffentlicht wird durch Pushen auf `main`; GitHub Pages baut von selbst.

### Aufbau eines Decks

Ein Deck ist ein Kurs: ein Lehrmittel in einer Sprache.

```jsonc
{
  "id": "fr-disdonc", "title": "Französisch – dis donc!",
  "sourceLang": "de", "targetLang": "fr", "version": 2,
  "aliases": ["fr-unite-1"],                 // frühere Deck-Kennungen
  "groups": [{ "id": "u2", "title": "Unité 2 – Drôle de famille" }],
  "units": [
    { "id": "u2-lz2", "title": "Lernziel 2", "group": "u2",
      "items": [
        { "id": "u2-mere", "source": "die Mutter", "target": "la mère",
          "accept": ["la maman"], "image": "👩", "tags": ["wf:famille"] },
        { "id": "u2-age", "source": "das Alter", "target": "l'âge",
          "gender": "m", "level": "erweitert" }
      ] }
  ]
}
```

- **`units`** sind die wählbaren Lektionen (Lernziel, Voci-Test). **`group`**
  nennt die Unit des Lehrmittels; `groups` gibt ihr einen Titel. Die Auswahl
  zeigt die Units als Überschriften, ein Klick wählt alle Lektionen darunter.
  Decks ohne Gruppen – ältere, selbst importierte – erscheinen als flache
  Liste.
- **`id`** eines Eintrags ist stabil: nie für einen anderen Eintrag
  wiederverwenden, der Lernstand hängt daran. Ändert sich eine Kennung doch,
  kommt die alte in **`aliases`**.
- **`target`** ist die Hauptform, **`accept`** nennt weitere Schreibweisen,
  die als richtig gelten. Angaben wie «(m)» gehören nicht ins Lösungswort,
  sondern in `gender`.
- **`level`** – `erweitert` oder `expert`; ohne Angabe gehört der Eintrag zum
  Grundwortschatz. Bei *dis donc!* ist «Vocabulaire» Basis und «Vocabulaire
  plus» Erweitert. Das gewählte Niveau schliesst die tieferen ein.
- **`gender`**, **`number`** nur dort, wo der Artikel es nicht verrät
  (`l'âge`, `les parents`). Den Rest – Lemma ohne Artikel, Genus aus
  *le/la/un/une*, Mehrzahl aus *les/des* – leitet `prepareDeck` beim Laden
  ab, auch für selbst importierte Wortschätze.
- **`tags`** ordnen einem Wortfeld zu (`wf:famille`); die Generatoren der
  Grammatikübungen greifen darüber auf die passenden Wörter zu.

Was von der Sprache abhängt – Artikel, Wortpaare für die Fehlerklassen,
Elision, Sonderzeichen – steht in `js/learning/languages.js`. Eine weitere
Sprache ist dort ein weiterer Eintrag.

Geht ein Deck in einem anderen auf, nennt der Index-Eintrag des neuen
`"replaces": ["<alte Kennung>"]`; die App räumt das alte dann im Browser weg.

### Bilder zu Wörtern

Ein Eintrag darf ein `image` tragen. Zwei Formen:

```jsonc
{ "id": "3_2-005", "source": "Gitarre", "target": "guitar", "image": "🎸" }
{ "id": "3_2-018", "source": "…", "target": "…", "image": "3_2-018.webp" }
```

Ein **Emoji** steht direkt im Feld. Ein **Dateiname** verweist auf
`img/decks/<deckId>/<datei>` – dort als kleines WebP ablegen (Richtwert 160 px).
`resolveImage` in `js/storage/index.js` unterscheidet die beiden. Gezeigt wird
das Bild in den Modi `writing` und `spelling`; bei `terms` nicht, dort stünde
sonst die Antwort als Bild neben den vier Wörtern.

Vorerst **Emoji, wo möglich**. Bilddateien nur aus freien Quellen (CC0 / Public
Domain / eigene Zeichnung) – Grafik aus Lehrmittelblättern ist lizenziert.

Für importierte Wortschätze ist ein IndexedDB-Store `images` angelegt (leer,
`db.js` Version 2); dort landen später Bilder, die eine hochgeladene Liste
mitbringt.

### Vokabelblatt einlesen

`tools/voci-import/` macht aus einem gescannten Vokabelblatt (PDF oder Foto)
die Lektionen einer Unit: Seiten rendern, Wortliste und Einteilung (Tests oder
Lernziele) erkennen, in einer lokalen Tabelle korrigieren, ins Deck schreiben.
Der bequeme Weg ist der Skill **`/voci-unit <pfad>`**; Details in
`tools/voci-import/README.md`.

## Anwendungsübungen

Neben dem Wortschatz stehen je Unit kleine Übungen zum Anwenden – Grammatik
(Plural, Simple Past) und Sachwissen (Leseverstehen, Olympische Spiele). Sie
liegen in `data/exercises/<deckId>.json` und werden **nicht** gespeichert; die
App holt sie bei Bedarf frisch. Ein Deck ohne Datei hat einfach keine Übungen.

```jsonc
{
  "deckId": "en-doubledecker-3",
  "sets": [
    {
      "id": "3_3-past-regular",
      "unitId": "3_3",                        // hängt an dieser Unit
      "title": "Unit 3 – Simple Past: regelmässige Verben",
      "intro": "…",                           // erscheint als Untertitel
      "tasks": [
        { "type": "gap", "text": "look  →  ___", "answer": "looked" },
        { "type": "gap", "text": "carry  →  ___", "answer": "carried",
          "note": "Konsonant + -y  →  -ied" },  // Hinweis nach einem Fehler
        { "type": "mc",  "text": "…?", "options": ["a", "b", "c"], "answer": "b" }
      ]
    }
  ]
}
```

- **`unitId`** ist die Unit des Lehrmittels, also die `group` der Lektionen
  (`3_3`, `u2`). Ein Set erscheint in der Auswahl, sobald eine Lektion dieser
  Unit gewählt ist.
- **`type: "gap"`** – Lücke `___` im `text`, `answer` ist ein String oder eine
  Liste erlaubter Formen. Gross-/Kleinschreibung und Randzeichen sind egal.
  Mit **`choices`** (`["mon", "ma", "mes"]`) erscheinen auf Niveau Basis
  Knöpfe; ab Erweitert wird getippt.
- **`type: "mc"`** – `options` als Knöpfe, `answer` ist genau einer der Texte.
- **`note`** erscheint nach dem ersten Fehlversuch als Hilfe.
- **`level`** an einer Aufgabe: ab welchem Niveau sie erscheint.
- **`id`** jeder Aufgabe steht im JSON und bleibt, auch wenn Aufgaben
  dazukommen oder umgestellt werden – der Lernstand hängt daran. Versuche
  landen mit `mode: "exercise"`, `exerciseId` und, falls gesetzt, `grammarId`
  im selben Speicher wie der Wortschatz.

Eine Runde zieht höchstens 15 Aufgaben und mischt neu – wer öfter übt, sieht
andere.

Kein Text aus dem Lehrmittel abschreiben – eigene Sätze; Fakten sind frei.

### Aufgaben aus dem Wortschatz

Ein Set kann seine Aufgaben auch **erzeugen** lassen
(`js/learning/generators.js`). Dann wächst die Übung mit jeder Unit mit:

```jsonc
{
  "id": "u2-possessif", "unitId": "u2", "grammarId": "fr.possessif",
  "title": "Unité 2 – mon, ma, mes",
  "intro": "Männlich: mon. Weiblich: ma. Mehrzahl: mes.",
  "generators": [{ "type": "possessive", "tags": ["wf:famille"] }],
  "tasks": [ /* handgeschriebene Sätze dazu, optional */ ]
}
```

| Generator | Aufgabe | Basis | Erweitert | Expert |
|---|---|---|---|---|
| `article` | `___ grand-mère (die Grossmutter)` → *la* | Knöpfe *le / la / l' / les* | tippen | dazu der unbestimmte Artikel |
| `possessive` | `___ fils (mein Sohn)` → *mon* | Knöpfe *mon / ma / mes* | tippen | ganzer Ausdruck: `meine Tante → ma tante` |
| `kinship` | `Emma est la mère de Léa. Léa est ___ d'Emma.` → *la fille* | vier Knöpfe, nur Umkehrungen | tippen, dazu Ketten über einen Elternteil (Onkel, Grosseltern) | nur Ketten und Enkel |

`article` und `possessive` nehmen die Nomen der Unit mit passendem `tags`,
soweit Genus und Zahl feststehen und der Eintrag zum Niveau gehört.
`kinship` braucht im Set einen Stammbaum `family` (Personen mit Eltern, dazu
die Wörter für jede Beziehung) – erfundene Namen, nicht die Familie aus dem
Lehrmittel.

## Entwicklung

Die App braucht keinen Build. Zum Testen genügt ein statischer Server, weil
ES-Module und `fetch` unter `file://` nicht laufen:

```
python -m http.server 5510
```

Der Server schickt keine Cache-Header, deshalb liefert der Browser geänderte
Module und Stylesheets nach dem Speichern mitunter noch aus dem Cache. Wirkt
eine Änderung nicht, hart neu laden (Strg+F5).

Alle Befehle in dieser README – auch die der Werkzeuge unter `tools/` – gelten
für den Ordner `vokabeltrainer/` als Arbeitsverzeichnis.

Selbsttest des CSV-Imports:

```
node tools/test-csv.mjs
```

Selbsttest für Niveaus, Artikel-Erkennung und Fehlerklassen:

```
node tools/test-learning.mjs
```

Wortschatz aus einer CSV in ein Deck umwandeln:

```
node tools/csv-to-deck.mjs <csv> <ziel.json> <deckId> <Titel> <sourceLang> <targetLang> [version]
```

## Wie es weitergeht

Die App ist auf zwei Erweiterungen vorbereitet:

**Lernfortschritt und Login.** Jede beantwortete Frage wird in IndexedDB
protokolliert – mit `userId`, das vorerst `local` lautet. Kommt ein Login
dazu, tritt die echte Kennung an diese Stelle, und die Auswertung ist eine
Abfrage auf bereits vorhandenen Daten. Der gesamte Datenzugriff läuft über
`js/storage/index.js`; ein Server wird dort angeschlossen, nicht verstreut
in der App.

**Fehler.** Seit Oktober 2026 hält jeder Datensatz auch fest, *was* falsch
war: jeder Fehlversuch mit Eingabe und Fehlerklasse (`errors`), dazu Niveau,
Fertigkeit (`skill`), Dauer und Deck-Version. Die Fehlerklassen – Akzent,
Genus, Zahl, Elision, Buchstabenfehler, Verwechslung mit einem anderen Wort
der Runde – bestimmt `js/learning/errors.js`. Auf Basis tolerierte Akzente
stehen als `tolerated` mit drin. Angezeigt wird davon noch nichts; die Daten
sind die Grundlage für die «Für dich»-Runde und das Schwächenprofil
(docs/KONZEPT.md, Abschnitt 3).

Das ist zugleich die Antwort auf die Frage nach einer Statistik. Entschieden
(1. September 2026): **gemessen wird der Lernfortschritt, nicht der
Seitenaufruf.** Wie oft die Seite geöffnet wurde, sagt über den Unterricht
wenig; wie viele Vokabeln eine Klasse geübt hat und wo sie hängen bleibt,
sagt viel. Die Daten dafür liegen bereits vor – es fehlt der Ort, an dem sie
zusammenlaufen.

Nötig sind dafür drei Dinge: ein Login, damit `userId` etwas bedeutet; ein
Server, weil GitHub Pages nur Dateien ausliefert und nichts entgegennimmt;
und eine Auswertungsansicht für die Lehrperson.

**IP-Adressen werden bewusst nicht erfasst.** Sie sind Personendaten von
Schülerinnen und Schülern und bräuchten Rechtsgrundlage und Information der
Betroffenen – ein schlechtes Geschäft für eine Zahl, die ohnehin nicht die
gesuchte ist. Wird eines Tages doch eine reine Besucherzählung gebraucht,
genügt ein Dienst ohne IP-Speicherung wie GoatCounter mit einem einzigen
Script-Tag; das Hosting muss dafür nicht wechseln.

**Ausspracheprüfung.** `js/speech/assess.js` beschreibt die Schnittstelle für
einen Dienst wie Azure Pronunciation Assessment. Der Schlüssel gehört nicht
in den Browser, die Aufnahme geht an einen eigenen Proxy.
