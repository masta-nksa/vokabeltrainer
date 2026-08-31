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
