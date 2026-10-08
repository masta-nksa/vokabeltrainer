# Voci-Import

Aus einem **Vocabulary-Practice-Sheet** (PDF-Scan oder Foto) eine Lektion im
mitgelieferten Deck machen. Der bequeme Weg ist der Skill `/voci-unit` – er
führt durch alle Schritte. Die Teile lassen sich aber auch einzeln aufrufen.

```
rasterize.py   PDF/Foto  ->  draft/pages/page-NN.png
(Erkennung)    Claude liest die Seiten und schreibt draft/draft.json
serve.mjs      lokale Oberfläche zum Korrigieren  (curate.html)
build.mjs      draft.json  ->  data/decks/<deck>.json  +  index.json
```

Alles unter `draft/` ist Arbeitsmaterial und steht in `.gitignore` – es wird
nie eingecheckt. Auch die Original-Cliparts der Verlage bleiben dadurch aussen
vor; im Deck landen nur Emoji oder selbst beschaffte Bilder (siehe unten).

## Ablauf von Hand

Alle Befehle im Ordner `vokabeltrainer/` ausführen – aus dem übergeordneten
Ordner findet Node die Skripte nicht (`MODULE_NOT_FOUND`).

```bash
# 1. Seiten rendern (nur die Blattseiten, 1-basiert)
python tools/voci-import/rasterize.py fotomaterial/english/Unit2_DD3.pdf \
    tools/voci-import/draft/pages --pages 2-4

# 2. Erkennung: draft/draft.json anlegen (siehe Schema unten)

# 3. Oberfläche starten, im Browser korrigieren, speichern
node tools/voci-import/serve.mjs
#    -> http://localhost:5511

# 4. ins Deck schreiben
node tools/voci-import/build.mjs

# 5. prüfen und committen
git diff
```

Meldet Node bei Schritt 3 `EADDRINUSE`, läuft noch ein früherer Server auf
Port 5511. Der liest den Entwurf bei jeder Anfrage frisch von der Platte – die
Seite einfach neu laden, ein zweiter Start ist unnötig.

## draft.json

```jsonc
{
  "deckId": "en-doubledecker-3",
  "deckFile": "data/decks/en-doubledecker-3.json",
  "deckTitle": "English – DoubleDecker 3",
  "sourceLang": "de",
  "targetLang": "en",
  "unit": { "code": "3_2", "number": 2, "title": "Unit 2 – Music" },
  "pages": ["page-02.png", "page-03.png", "page-04.png"],
  "tests": [
    { "id": "t1", "label": "Test 1", "date": "2026-10-29",
      "fromTerm": "clapsticks", "toTerm": "to paint" },
    { "id": "t2", "label": "Test 2", "date": "2026-11-12",
      "fromTerm": "to choose", "toTerm": "song" }
  ],
  "rows": [
    { "nr": 1, "en": "clapsticks", "de": "Schlaghölzer",
      "image": "", "imageHint": "gekreuzte Schlaghölzer", "keep": true }
  ]
}
```

- **`unit.code`** folgt dem Deck: DoubleDecker 3, Unit 2 → `3_2`. Die Item-IDs
  werden `3_2-001`, `3_2-002`, … aus der Zeilennummer `nr`. Stabil bei einem
  zweiten Lauf, eine Zeile lässt sich einzeln korrigieren.
- **`tests`** – je Eintrag eine Lektion. `fromTerm`/`toTerm` sind der erste und
  letzte englische Begriff des Testbereichs, exakt wie in der Tabelle. Bereiche
  dürfen sich überschneiden (dann steht ein Wort in beiden Lektionen; der
  Lernfortschritt zählt es über die gemeinsame Item-ID zusammen). Endet der
  Bereich in einem Grammatikkasten unter der Tabelle (Unit 3: `I didn't`),
  gehören dessen Zeilen als weitere `rows` dazu.
- **Testdaten nicht der Fusszeile allein glauben.** Sie ist teils aus der
  vorigen Unit kopiert (Unit 2 nannte die Termine von Unit 1). Verbindlich ist
  die Terminliste auf Seite 1 des Unit-1-PDFs.
- **`rows[].image`** – ein Emoji oder ein Dateiname aus
  `img/decks/<deckId>/`. Leer = kein Bild. `imageHint` ist nur eine Notiz aus
  der Erkennung und hilft beim Aussuchen; sie wandert nicht ins Deck.
- **`keep: false`** lässt eine Zeile beim Bauen weg.
- **`notes`** (optional, oberste Ebene) – freie Notiz aus der Erkennung, etwa
  Auffälligkeiten des Blatts. Wird nicht ins Deck übernommen.

## Bilder

Vorerst **Emoji, wo möglich**. Für Begriffe ohne passendes Emoji entweder
nichts hinterlegen oder ein selbst beschafftes Bild (CC0 / Public Domain / eigene
Zeichnung) als WebP nach `img/decks/<deckId>/<itemId>.webp` legen und den
Dateinamen eintragen. Grafik aus den Verlagsblättern wird **nicht** übernommen –
die ist lizenziert (teils bezahlte Stockware).

## Voraussetzungen

- Node ≥ 18 (nur Standardbibliothek)
- Python mit PyMuPDF für PDFs: `python -m pip install pymupdf`
  (Fotos brauchen stattdessen Pillow)
