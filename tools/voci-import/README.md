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
git -C vokabeltrainer diff
```

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
    { "id": "t1", "label": "Test 1", "date": "2026-09-03",
      "fromTerm": "clapsticks", "toTerm": "to paint" },
    { "id": "t2", "label": "Test 2", "date": "2026-09-17",
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
  Lernfortschritt zählt es über die gemeinsame Item-ID zusammen).
- **`rows[].image`** – ein Emoji oder ein Dateiname aus
  `img/decks/<deckId>/`. Leer = kein Bild. `imageHint` ist nur eine Notiz aus
  der Erkennung und hilft beim Aussuchen; sie wandert nicht ins Deck.
- **`keep: false`** lässt eine Zeile beim Bauen weg.

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
