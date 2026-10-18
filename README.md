# Vokabeltrainer

Mehrsprachiger Vokabeltrainer für den Unterricht. Läuft als statische Seite
auf GitHub Pages – kein Build-Schritt, keine Abhängigkeiten.

## Aufbau

Die **Startseite** fragt nach dem Vornamen und dem Helden, der freigespielt
werden soll (Auswahl als Chips; das Bild ist erst unscharf und wird mit jeder
richtigen Antwort klarer). Danach landet man bei **Lernen**: Kurs wählen, darunter die Units als
aufklappbare Blöcke mit einer Kachel je Lektion (bei *dis donc!* je Lernziel
«Vocabulaire» und «plus» nebeneinander). Rechts – auf dem Handy darunter –
Niveau, der Knopf **Für dich**, die Modi zum Selbstwählen, Grammatik und
Spiele. Auf dem Handy klebt «Für dich» unten und nennt, wie viele Wörter
gewählt sind; darunter liegt das Menü **Lernen · Fortschritt · Mehr**, auf
breiten Bildschirmen steht es oben. **Fortschritt** öffnet «Meine
Stolpersteine», **Mehr** enthält aufklappbare Zeilen für Stimme, Drucken und
das Laden eines eigenen Wortschatzes sowie «Name und Held», das zurück zur
Startseite führt. In einer Runde oder einem Spiel ist das Menü ausgeblendet.

In der **Lernrunde** stehen oben Schliessen, ein Fortschrittsbalken und der
Zähler der erledigten Wörter, darunter Modus und Niveau, die Wortkarte und die
Antworten. Die Rückmeldung erscheint unten über die ganze Breite: grün
«Richtig!» (die Runde geht nach einer kurzen Pause von selbst weiter) oder
orange mit Hinweis. Wer getippt zweimal danebenliegt oder zu einer richtigen
Antwort einen Hinweis bekommt, sieht den Knopf **Weiter** – die Runde wartet,
bis man gelesen hat; Enter tut dasselbe.

Das **Ergebnis** zeigt einen Ring mit den auf Anhieb richtigen Wörtern, einen
Satz je nach Quote und die Wörter, die noch nicht sitzen. Die Knöpfe
«Fehler wiederholen», «Ganze Runde nochmals» und «Zur Übersicht» bleiben auf
dem Handy unten sichtbar, auch bei langer Liste.

**Fortschritt** («Meine Stolpersteine») zeigt die Lernkartei als Balken von
warm (wackelt) bis blau (sitzt), die häufigsten Fehlerarten mit Balken und
Beispielen, verwechselte Wortpaare, die Trefferquote je Grammatikübung und
die unsicheren Wörter – jeweils mit einem Knopf «üben».

Die **Spiele** haben dieselbe Kopfzeile wie die Lernrunde (Schliessen, Titel,
Anleitung) und darunter eine Statuszeile mit Punkten und Zeit. Das
**Spiel-Ergebnis** zeigt Punkte, Zeit und die Wörter, die noch nicht sitzen;
«Freunde herausfordern» öffnet darüber die Karte mit dem Link.

## Lernmodi

Auf dem Bildschirm heissen sie **Erkennen** (*terms*), **Buchstabieren**
(*spelling*) und **Schreiben** (*writing*).

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
unter «Grammatik» erscheinen, sobald eine passende Lektion gewählt ist. Siehe [Anwendungsübungen](#anwendungsübungen). Das
Niveau wirkt hier noch nicht.

## Für dich und Meine Stolpersteine

Der Knopf **Für dich** stellt aus den gewählten Lektionen eine Runde von 15
Wörtern zusammen: vor allem, was zur Wiederholung dran oder noch unsicher ist,
dazu Neues und ein wenig Sicheres. Jedes Wort kommt im Modus, der zu seinem
Stand passt – erst erkennen (*terms*), dann die Schreibweise (*spelling*),
dann selbst schreiben (*writing*).

Dahinter steht eine Lernkartei nach Leitner mit fünf Fächern (Wiederholung
nach 1, 2, 4, 8, 16 Tagen). Auf Anhieb richtig lässt ein Wort ein Fach
steigen – einmal pro Tag, erst ab Niveau Erweitert, und über Fach 3 hinaus
nur, wenn es selbst geschrieben wurde. Ein Fehler bringt es zurück ins erste
Fach.

**Meine Stolpersteine** (Menü «Fortschritt») zeigt, wo es hakt: die Lernkartei, die häufigsten
Fehlerarten der letzten 30 Tage mit Beispielen, verwechselte Wortpaare, die
Trefferquote je Grammatikübung und die unsicheren Wörter – jeweils mit einem
Knopf, der genau das übt. Wörter, die jemand verwechselt hat, tauchen ab
Niveau Erweitert in *terms* absichtlich gemeinsam als Antwortmöglichkeiten
auf.

Nach einem Tippfehler sagt die App, woran es lag (Akzent, Geschlecht,
Einzahl/Mehrzahl, Apostroph, Buchstaben) – auf Expert nicht. Waren die letzten
drei Runden auf einem Niveau fast fehlerfrei, schlägt sie das nächste vor;
umgestellt wird nur auf Knopfdruck.

Der Lernstand wird nicht gespeichert, sondern bei jedem Öffnen aus den
protokollierten Antworten berechnet (`js/learning/mastery.js`). Eine geänderte
Regel gilt darum sofort für alles Bisherige.

## Spiele

Unter **Spielen** stehen, sobald die gewählten Wörter es hergeben:

| Spiel | Worum es geht | Basis | Erweitert | Expert |
|---|---|---|---|---|
| **Kreuzworträtsel** | deutscher Hinweis, das Wort der Zielsprache ins Gitter | 7 Wörter, erster Buchstabe steht, fehlende Akzente gelten | 10 Wörter, Akzente zählen | 13 Wörter, ohne Bild-Hinweis und ohne Tipp nach einem Fehler |
| **Genus-Sortierer** | fallende Wörter ins richtige Fach | *le* / *la* | männlich / weiblich, auch bei *l'* und *les* | *mon* / *ma* / *mes*, schneller |
| **Speed-Runde** | so viele Wörter wie möglich | 90 s, aus vier wählen | 60 s | 45 s, tippen |

Jede Antwort in einem Spiel landet im selben Protokoll wie die des Quiz
(`source: "game"`, `game: "<id>"`) – mit Eingabe und Fehlerklasse. Das
Kreuzworträtsel zählt für die Lernkartei wie selbst geschrieben; der
Genus-Sortierer übt eine Regel und bewegt keine Karte, seine Fehler stehen
aber in «Meine Stolpersteine».

Punkte belohnen Genauigkeit vor Tempo: Im Kreuzworträtsel gibt ein Wort 100
Punkte, jeder Fehlversuch und jeder aufgedeckte Buchstabe kostet 30. In der
Speed-Runde kostet ein Fehler so viel, wie ein Treffer bringt.

Ein Spiel ist ein Modul unter `js/games/` mit `available(deck, items, level)`
und `start(context)`; `host.js` stellt Bildschirm, Protokoll und Ergebnis.
Der Genus-Sortierer erscheint nur bei Sprachen, deren Profil ein Geschlecht
kennt (`js/learning/languages.js`) – Englisch hat ihn nicht.

Der Zufall der Spiele hat einen Startwert (`js/games/rng.js`): Dieselben
Wörter und derselbe Startwert ergeben dieselbe Partie. Darauf bauen die
Challenges.

### Freunde herausfordern

Nach einem Spiel erzeugt **Freunde herausfordern** einen Link. Wer ihn
öffnet, spielt genau diese Partie – gleiches Gitter, gleiche Reihenfolge –
und sieht danach, wer besser war. Mehr Punkte gewinnen, bei Gleichstand die
kürzere Zeit.

Das braucht weder Konto noch Server: Alle Angaben (Spiel, Wortschatz,
Lektionen, Niveau, Startwert, Punkte, Zeit, Spitzname) stehen im `#`-Teil der
Adresse (`js/games/challenge.js`). Dieser Teil wird nie an einen Server
geschickt; die App nimmt ihn nach dem Lesen aus der Adresszeile. Statt eines
Namens steht ein zufälliger Spitzname wie *Renard 7*, der sich neu würfeln
lässt.

Ein Link ist fremde Eingabe und wird geprüft (`validate`): unbekanntes
Format, seltsame Kennungen oder Zahlen führen dazu, dass er verworfen wird.
Fälschen lässt er sich trotzdem – wer will, schreibt sich 9999 Punkte hinein.
Für ein Spiel unter Freunden ist das in Ordnung; eine Rangliste, auf die es
ankommt, bräuchte einen Server.

Wurde der Wortschatz seit der Herausforderung geändert, sagt die App das vor
dem Start. Einen QR-Code erzeugt sie noch nicht.

## Drucken

Unter **Mehr › Drucken**: die unter «Lernen» gewählten Wörter entweder als
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
fonts/              Schriften (WOFF2, Latin) mit Lizenztexten
js/
  main.js           Bootstrap und Screen-Steuerung
  state.js          Zentraler App-Zustand
  storage/db.js     IndexedDB (Decks, Versuche, Einstellungen)
  storage/index.js  Storage-Schnittstelle – später gegen Server austauschbar
  data/csv.js       CSV-Import und -Export
  data/decks.js     Deck-Verwaltung, Einträge aufbereiten (prepareDeck)
  data/exercises.js Anwendungsübungen laden, Aufgaben einer Runde ziehen
  modes/            Lernmodi (terms, spelling, writing) und exercise
  learning/         Niveaus, Fehlerklassen, Sprachprofile, Aufgaben-Generatoren,
                    Lernstand (mastery.js rechnet, insight.js liest aus dem Speicher)
  games/            Spiele: host.js (Rahmen), crossword, sorter, speed,
                    crosswordGrid.js (Gitter), rng.js (Zufall mit Startwert)
  ui/               Screens, Lektionsauswahl, Scoreboard, Druck, Belohnung,
                    «Meine Stolpersteine»
  speech/tts.js     Sprachausgabe
  speech/assess.js  Schnittstelle für die spätere Ausspracheprüfung
data/decks/         Mitgelieferte Wortschätze als JSON
data/exercises/     Anwendungsübungen je Deck als JSON
img/decks/<deck>/   Bilddateien zu einzelnen Wörtern (optional)
tools/              Entwicklungsskripte, werden nicht ausgeliefert
tools/voci-import/  Vokabelblatt (PDF/Foto) -> Lektion; Skill /voci-unit
```

**Schriften.** Titel, grosse Zahlen und das Wort in der Lernrunde stehen in
*Fredoka* (600), alles andere in *Atkinson Hyperlegible* (400 und 700), einer
Schrift des Braille Institute, die auf gute Unterscheidbarkeit der Buchstaben
ausgelegt ist. Beide stehen unter der SIL Open Font License 1.1 (Lizenztexte
in `fonts/`) und liegen im Repo – die Seite ruft keinen fremden Server auf.
Quelle: die npm-Pakete `@fontsource/fredoka` und
`@fontsource/atkinson-hyperlegible`, Version 5.3.0, nur der Latin-Ausschnitt
(enthält alle französischen Akzente und œ).

## Wortschatz ergänzen

CSV mit Semikolon als Trennzeichen, UTF-8:

```
Lektion;Ausgangssprache;Zielsprache
2_0 Welcome back!;eine Uhr;a clock
```

Unter **Mehr › Eigenen Wortschatz laden** einlesen. Der Wortschatz bleibt danach im Browser
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
  "sourceLang": "de", "targetLang": "fr", "version": 3,
  "aliases": ["fr-unite-1"],                 // frühere Deck-Kennungen
  "groups": [{ "id": "u2", "title": "Unité 2 – Drôle de famille" }],
  "units": [
    { "id": "u2-lz2", "title": "Lernziel 2", "group": "u2",
      "items": [
        { "id": "u2-mere", "source": "die Mutter", "target": "la mère",
          "accept": ["la maman"], "image": "👩", "tags": ["wf:famille"] },
        { "id": "u2-parents", "source": "die Eltern", "target": "les parents",
          "gender": "m", "number": "pl" }
      ] },
    { "id": "u2-lz3-plus", "title": "Lernziel 3 plus", "group": "u2",
      "items": [
        { "id": "u2-age", "source": "das Alter", "target": "l'âge",
          "gender": "m" }
      ] }
  ]
}
```

- **`units`** sind die wählbaren Lektionen (Lernziel, Voci-Test). Bei
  *dis donc!* bekommt jedes Lernziel zwei Lektionen: «Lernziel 2» mit der
  Wortliste «Vocabulaire» und «Lernziel 2 plus» mit «Vocabulaire plus».
  **`group`**
  nennt die Unit des Lehrmittels; `groups` gibt ihr einen Titel. Die Auswahl
  zeigt jede Unit als aufklappbaren Block; eine Lektion `<id>-plus` steht als
  zweite Kachel neben der Lektion `<id>`, «alle wählen» nimmt die ganze Unit.
  Decks ohne Gruppen – ältere, selbst importierte – erscheinen als ein Block
  «Lektionen».
- **`id`** eines Eintrags ist stabil: nie für einen anderen Eintrag
  wiederverwenden, der Lernstand hängt daran. Ändert sich eine Kennung doch,
  kommt die alte in **`aliases`**.
- **`target`** ist die Hauptform, **`accept`** nennt weitere Schreibweisen,
  die als richtig gelten. Angaben wie «(m)» gehören nicht ins Lösungswort,
  sondern in `gender`.
- **`level`** – `erweitert` oder `expert`; ohne Angabe gehört der Eintrag zum
  Grundwortschatz. Das gewählte Niveau schliesst die tieferen ein. Ein
  Eintrag mit `level` fehlt auf tieferen Niveaus ganz – darum tragen die
  «plus»-Wörter von *dis donc!* kein `level`, sie stehen in eigenen
  Lektionen.
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
stehen als `tolerated` mit drin. Daraus entstehen die «Für dich»-Runde und
die Ansicht «Meine Stolpersteine» (siehe oben).

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
