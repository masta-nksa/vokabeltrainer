---
name: voci-unit
description: >-
  Macht aus einem Vocabulary-Practice-Sheet (PDF-Scan oder Foto eines
  Lehrmittel-Blatts) eine neue Lektion im mitgelieferten Deck des
  Vokabeltrainers: Seiten rendern, Wortliste englisch–deutsch und die
  Test-Einteilung erkennen, in einer lokalen Tabellen-Oberfläche korrigieren,
  ins Deck-JSON schreiben, Version hochzählen, committen. Unbedingt verwenden,
  sobald ein Voci-Blatt, ein Vokabelblatt, ein "Vocabulary Practise Sheet", eine
  Unit-Wortliste oder ein Lehrmittel-Scan in den Vokabeltrainer übernommen
  werden soll – auch wenn nur "die Vokabeln von Unit X einlesen", "das Blatt
  importieren" oder "eine neue Lektion anlegen" verlangt wird und weder Blatt
  noch Deck ausdrücklich genannt sind.
---

# Voci-Unit

Übernimmt ein Vocabulary-Practice-Sheet ins Deck `data/decks/<deck>.json` des
Vokabeltrainers. Die Werkzeuge liegen unter `tools/voci-import/`, ihr Aufbau
steht in `tools/voci-import/README.md`.

Diese Skill läuft im Repo `vokabeltrainer/`. Wenn das aktuelle
Arbeitsverzeichnis darüber liegt, zuerst dorthin wechseln.

## Was der Nutzer übergibt

Einen Pfad auf ein PDF oder ein Foto, z. B.
`fotomaterial/english/Unit2_DD3.pdf`. Fehlt er, danach fragen.

## Ablauf

### 1. Deck und Unit bestimmen

Aus dem Dateinamen und `data/decks/index.json` ableiten, dann **einmal
bestätigen lassen**:

- welches Deck (`deckId`, `deckFile`, `deckTitle`, `sourceLang`, `targetLang`)
- `unit.number` und `unit.title` (Titel des Blatts, z. B. „Unit 2 – Music")
- `unit.code` – dem Deck folgen: DoubleDecker 3 / Unit 2 → `3_2`; Young World 2 /
  Unit 5 → `2_5`. Im Zweifel an bestehenden Unit-IDs im Deck ablesen.

### 2. Seiten rendern

```bash
python tools/voci-import/rasterize.py <eingabe> tools/voci-import/draft/pages [--pages a-b]
```

Bei einem PDF mit mehreren Seiten zuerst grob rendern, die Blattseiten
(„DD3 Vocabulary Practise Sheet …") heraussuchen und mit `--pages` erneut nur
diese rendern. Scheitert der Import von `pymupdf`, `python -m pip install pymupdf`
und nochmal.

### 3. Erkennen

Die gerenderten Seiten unter `tools/voci-import/draft/pages/` **anschauen**
(Read auf die PNG). Nicht auf einen vorhandenen OCR-/Textlayer verlassen – die
Scans sind gestempelt, umbrochen, teils mit Handschrift der SuS überschrieben.
Zeile für Zeile ablesen:

- `nr` – die Nummer aus Spalte 1
- `en` – die englische Spalte, exakte Schreibweise (Gross-/Kleinschreibung wie
  gedruckt, „to " bei Verben behalten, Wortumbruch der Zelle zusammenführen:
  „saxophon e" → „saxophone")
- `de` – die deutsche Spalte, mit Umlauten
- `imageHint` – wenn die Bildzelle nicht leer ist: ein bis drei Wörter, was das
  Bild zeigt (Deutsch). Leere Zelle → `imageHint` leer.
- `image` – wo ein **eindeutiges** Emoji passt (Instrumente, einfache Nomen),
  dieses eintragen; sonst leer lassen. **Nie** eine Grafik aus dem Blatt
  ausschneiden oder einbetten.
- `keep` – `true`, ausser die Zeile ist offensichtlich kein Lernwort.

Besonderheiten, die bei DoubleDecker 3 vorkamen:

- Steht in einer Zelle ein Wortpaar über zwei Zeilen (Adjektiv + Steigerung,
  „tall," / „taller"), bleibt es **ein** Eintrag: `en: "tall, taller"`.
- Unter der Tabelle kann ein **Grammatikkasten** stehen („Verb «to be»"). Endet
  der Testbereich der Fusszeile dort („… – I didnt"), gehören seine Zeilen als
  weitere `rows` mit fortlaufender Nummer dazu.
- Nummern und Begriffe der Fusszeile widersprechen sich gelegentlich („22–36"
  gegen „Second – I didnt"). Massgebend sind die **Begriffe**.

Die **Fusszeile** des Blatts nennt meist die Tests mit Datum und Wortbereich
(„Test 1  1-23 (Clapsticks – paint)  Thursday 3rd of September"). Daraus die
`tests` füllen: `fromTerm`/`toTerm` als ersten/letzten **englischen Begriff**
(nicht die Nummer), `date` als ISO-Datum. Findet sich keine Test-Einteilung,
`tests: []` lassen – dann wird eine einzige Lektion gebaut.

**Die Daten der Fusszeile nie ungeprüft übernehmen.** Sie ist teils aus der
vorigen Unit kopiert (das Unit-2-Blatt nannte die Termine von Unit 1). Verbindlich
ist die Terminliste „Homework and English Tests (Dates)" auf Seite 1 des
Unit-1-PDFs – dort die Voci-Tests der Unit nachschlagen. Das Jahr ergibt sich
aus dem Schuljahr (Schuljahr 26/27: September bis Dezember 2026, Januar bis
Juni 2027); im Zweifel den Nutzer fragen.

Ergebnis nach `tools/voci-import/draft/draft.json` schreiben, Schema siehe
`tools/voci-import/README.md`. `pages` mit den Dateinamen der gerenderten
Seiten füllen.

### 4. Kuratieren

```bash
node tools/voci-import/serve.mjs
```

im Hintergrund starten, dann die Browser-Ansicht auf `http://localhost:5511`
öffnen. Dem Nutzer sagen: Tabelle prüfen (besonders `en`/`de`-Schreibweise und
die Test-Bereiche), Emoji setzen wo gewünscht, **Speichern**. Warten, bis der
Nutzer „fertig" o. ä. sagt. Server danach stoppen.

Meldet Node `EADDRINUSE`, läuft auf 5511 bereits ein Server – oft ein vom
Nutzer selbst gestarteter. Er liest `draft.json` bei jeder Anfrage frisch, also
einfach weiterverwenden und den Nutzer die Seite neu laden lassen. Nicht
abschiessen, ohne zu fragen.

### 5. Bauen

```bash
node tools/voci-import/build.mjs
```

Bricht ab, wenn ein `fromTerm`/`toTerm` nicht in den Zeilen steht – dann die
Schreibweise im Entwurf und im Test angleichen und erneut.

### 6. Prüfen und committen

`git diff` zeigen. Kontrollieren: Deck-`version` und der Eintrag in
`data/decks/index.json` sind um genau 1 gestiegen; die alten Lektionen anderer
Units sind unverändert. Auf Freigabe committen:

```
feat: Voci Unit N (<Titel>) ins Deck <deckId>
```

und auf Nachfrage pushen. `tools/voci-import/draft/` gehört **nicht** in den
Commit (steht in `.gitignore`).

## Nach dem Import

Der Vokabeltrainer zeigt Bilder (Emoji oder Datei aus `img/decks/<deckId>/`)
in den Modi `writing` und `spelling` an; `resolveImage` in
`js/storage/index.js` löst den Wert auf. Neue Bilddateien kommen als WebP nach
`img/decks/<deckId>/<itemId>.webp` und werden im Entwurf mit dem Dateinamen
eingetragen.

Anwendungsübungen (Grammatik, Sachwissen) gehören **nicht** zu diesem Skill:
sie stehen von Hand in `data/exercises/<deckId>.json`, ein Set hängt über
`unitId` an der Unit (`3_3`, ohne `-t1`/`-t2`). Nach dem Import einer neuen Unit
kurz anbieten, dafür ein paar Sets zu schreiben – mit eigenen Sätzen, nicht mit
Texten aus dem Lehrmittel. Aufbau: README, Abschnitt *Anwendungsübungen*.
