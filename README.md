# Vokabeltrainer

Mehrsprachiger Vokabeltrainer für den Unterricht. Läuft als statische Seite
auf GitHub Pages – kein Build-Schritt, keine Abhängigkeiten.

## Lernmodi

| Modus | Ablauf |
|---|---|
| **terms** | Zielsprache wird angezeigt und vorgelesen, aus vier Übersetzungen die richtige wählen |
| **spelling** | Ausgangssprache wird angezeigt, aus vier Schreibweisen die korrekte wählen |
| **writing** | Ausgangssprache wird angezeigt, Übersetzung eintippen |

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
  modes/            Die drei Lernmodi
  ui/               Screens, Lektionsauswahl, Scoreboard, Druck, Belohnung
  speech/tts.js     Sprachausgabe
  speech/assess.js  Schnittstelle für die spätere Ausspracheprüfung
data/decks/         Mitgelieferte Wortschätze als JSON
tools/              Entwicklungsskripte, werden nicht ausgeliefert
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
