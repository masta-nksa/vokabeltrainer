# Vokabeltrainer

Mehrsprachiger Vokabeltrainer für den Unterricht. Läuft als statische Seite
auf GitHub Pages – kein Build-Schritt, keine Abhängigkeiten.

## Lernmodi

| Modus | Ablauf |
|---|---|
| **terms** | Zielsprache wird angezeigt und vorgelesen, aus vier Übersetzungen die richtige wählen |
| **spelling** | Ausgangssprache wird angezeigt, aus vier Schreibweisen die korrekte wählen |
| **writing** | Ausgangssprache wird angezeigt, Übersetzung eintippen |

Dazu **Anwenden**: kleine Übungen zu einer Unit (Grammatik, Sachwissen), die
in der Auswahl unter den Modus-Knöpfen erscheinen, sobald eine passende
Lektion gewählt ist. Siehe [Anwendungsübungen](#anwendungsübungen).

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
  data/decks.js     Deck-Verwaltung
  data/exercises.js Anwendungsübungen laden und auswählen
  modes/            Lernmodi (terms, spelling, writing) und exercise
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

Über den Import-Knopf in der Lektionsauswahl einlesen. Der Wortschatz bleibt
danach im Browser gespeichert.

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

`tools/voci-import/` macht aus einem gescannten *Vocabulary Practice Sheet*
(PDF oder Foto) eine Lektion: Seiten rendern, Wortliste und Test-Einteilung
erkennen, in einer lokalen Tabelle korrigieren, ins Deck schreiben. Der bequeme
Weg ist der Skill **`/voci-unit <pfad>`**; Details in
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
      "unitId": "3_3",                        // haengt an dieser Unit
      "title": "Unit 3 – Simple Past: regelmaessige Verben",
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

- **`unitId`** ist die Unit ohne Test-Zusatz (`3_3`). Ein Set erscheint in der
  Auswahl, sobald eine Lektion dieser Unit gewaehlt ist (`3_3-t1`, `3_3-t2`, …).
- **`type: "gap"`** – Luecke `___` im `text`, `answer` ist ein String oder eine
  Liste erlaubter Formen. Gross-/Kleinschreibung und Randzeichen sind egal.
- **`type: "mc"`** – `options` als Knoepfe, `answer` ist genau einer der Texte.
- **`note`** erscheint nach dem ersten Fehlversuch als Hilfe.
- Task-IDs werden beim Laden vergeben (`<setId>-01` …); Uebungs-Versuche landen
  mit `mode: "exercise"` und `exerciseId` im selben Fortschrittsspeicher wie
  der Wortschatz.

Kein Text aus dem Lehrmittel abschreiben – eigene Saetze; Fakten sind frei.

## Entwicklung

Die App braucht keinen Build. Zum Testen genügt ein statischer Server, weil
ES-Module und `fetch` unter `file://` nicht laufen:

```
python -m http.server 5510
```

Selbsttest des CSV-Imports:

```
node tools/test-csv.mjs
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
