# Konzept v2 – Selbstlernmodul Wortschatz & Grammatik

Stand 8. Oktober 2026. Ausgangspunkt war die Durchsicht von *dis donc!*
Unité 2 (Buchseiten 44–73) und die Frage, wie die App wachsen kann: neue
Units, Login, KI-Agent, weitere Sprachen, Minispiele.

## Leitidee

Die App ist ein **Selbstlernmodul für Wortschatz und Grammatik**. Aus jeder
Unit wird nur übernommen, was dem Spracherwerb im engeren Sinn dient. Lesetexte,
Plakat, Steckbrief, Lied und Sprachfamilien bleiben im Buch.

Sie ist ein **freiwilliges Angebot neben dem Unterricht**, nicht ein Werkzeug
für die ganze Klasse. Wer sie nutzt, tut es für sich. Daraus folgt: keine
Klassenverwaltung, keine Zuweisungen, keine Auswertung einzelner SuS durch
die Lehrperson. Alles muss ohne Anleitung im Unterricht verständlich sein.

Vier Dinge machen den Unterschied zu einer Wortliste:

1. **Fehler werden einzeln gespeichert**, nicht nur «richtig/falsch». Daraus
   entsteht ein Schwächenprofil, das bestimmt, was als Nächstes geübt wird.
2. **Grammatik-Übungen werden aus dem Wortschatz erzeugt**, wo es geht. Wer
   bei einem Wort Genus und Zahl kennt, kann daraus Übungen zu Artikel und
   mon/ma/mes erzeugen, ohne jede Aufgabe einzeln zu schreiben.
3. **Minispiele** nutzen denselben Wortschatz und speisen dasselbe
   Fehlerprotokoll. Ein Spiel ist eine andere Oberfläche für dieselbe
   Sprachübung, kein Extra daneben.
4. **Drei Niveaus – Basis, Erweitert, Expert –** gelten für jede Aufgabe und
   jedes Spiel, mit einem einzigen Schalter.

### Was aus Unité 2 übernommen wird

| Übernommen | Inhalt |
|---|---|
| Wortschatz | Vocabulaire Lernziel 1–3 (Niveau Basis), Vocabulaire plus (Niveau Erweitert), Randvokabeln wie le chapeau, le pantalon, les chaussures (Erweitert) |
| Grammatik | Possessivbegleiter *mon/ma/mes* · *être* 3. Person *est/sont* · *s'appeler* *s'appelle/s'appellent* · *c'est / ce sont* · *voici/voilà* · Genus und Artikel *le/la/l'/les* |
| Satzmuster | «X est la sœur de Y», «C'est ma mère. Elle s'appelle …» – als Lücken- und Satzbau-Übungen |

| Nicht übernommen | Warum |
|---|---|
| Chaplin-Text, Fragen dazu | Leseverstehen, Text lizenziert |
| Plakat, Präsentation, Steckbrief | Produktion, offene Aufgaben; Steckbrief fragt Personendaten ab |
| Sprachfamilien, Flaggen, Lied, Spiele im Kreis | kein Wortschatz- oder Grammatik-Training |
| Familie Lionel, Illustrationen | Figuren und Bilder des Lehrmittels sind nicht frei |

Aussprache (ch/j, Virelangue) kommt später über `speech/assess.js`. Die
betroffenen Wörter bekommen schon jetzt einen Tag (`sound:ʃ`, `sound:ʒ`).

## 1. Inhaltsmodell

```
Course (Lehrmittel + Sprache)          fr-disdonc-1, en-doubledecker-3
 └─ Unit                               u2 «La famille»
     ├─ Section (Lernziel | Voci-Test) u2.lz1, u2.lz2, u2.lz3, u2.plus
     │   └─ Item (Wort / Ausdruck)
     └─ GrammarPoint                   fr.possessif, fr.etre-3p, …
         ├─ explanation (eigener Text)
         ├─ drills (handgeschriebene Aufgaben)
         └─ generators (Aufgaben aus Item-Daten)
```

«Section» ersetzt das heutige Doppelleben von «Unit» als Lernziel (Französisch)
bzw. als Voci-Test (Englisch). Die heutige Namenskonvention `3_2-t1` → `3_2`
für die Zuordnung von Übungen entfällt, weil die Hierarchie das ausdrückt.

### Item

```jsonc
{
  "id": "grand-mere",                // stabil, aus dem Lemma, nie wiederverwendet
  "source": "die Grossmutter",
  "target": "la grand-mère",         // wie bisher: was gezeigt/abgefragt wird
  "lemma": "grand-mère",             // ohne Artikel – für Kreuzworträtsel, Pendu
  "pos": "noun",                     // noun | verb | adj | phrase | …
  "gender": "f",                     // m | f – bei l'/les nicht aus dem Artikel ablesbar
  "number": "sg",                    // sg | pl  (les parents: pl)
  "image": "👵",
  "level": "basis",                  // basis | erweitert | expert, siehe Abschnitt 2
  "tags": ["wf:famille"],
  "concept": "grandmother",          // optional, verknüpft Sprachen
  "aliases": ["lernziel-2-007"]      // frühere IDs, damit alter Lernstand passt
}
```

Alle neuen Felder sind optional. Ein Item mit nur `source`/`target` funktioniert
weiter, es nimmt nur an den Spielen und Generatoren nicht teil, die das Feld
brauchen (kein `lemma` → kein Kreuzworträtsel, kein `gender` → kein
Genus-Spiel).

**Stabile IDs.** Heute vergibt die App Übungs-IDs aus der Position
(`<setId>-01`), und beim Neuimport von DoubleDecker Unit 1 wurden die Wort-IDs
ersetzt. Sobald Lernstand pro Person zählt, verliert so jemand seine
Geschichte. Regel ab v2: ID steht im Inhalt, wird aus dem Lemma gebildet, nie
für anderen Inhalt wiederverwendet, frühere IDs wandern in `aliases`.

### GrammarPoint

```jsonc
{
  "id": "fr.possessif",
  "title": "mon, ma, mes",
  "explanation": "Vor einem männlichen Wort steht mon, vor einem weiblichen ma, vor der Mehrzahl mes.",
  "examples": ["mon père", "ma mère", "mes parents"],
  "generators": [
    { "type": "possessive", "from": { "tags": ["wf:famille"] } }
  ],
  "drills": [
    { "id": "poss-01", "type": "gap", "text": "Voici ___ cousine.", "answer": "ma" }
  ]
}
```

**Generatoren** erzeugen Aufgaben aus Item-Feldern. Für Unité 2:

| Generator | braucht | Beispiel |
|---|---|---|
| `article` | `gender`, `number`, `lemma` | ___ grand-mère → *la* |
| `possessive` | `gender`, `number` | ___ cousins → *mes* |
| `form` | Verbtabelle im GrammarPoint | Lionel et Pascal ___ frères → *sont* |
| `order` | Satz als Item (`pos: phrase`) | ma / C'est / mère → *C'est ma mère* |

Damit wächst jede neue Unit mit Wortliste plus Feldern automatisch um
Grammatik-Übungen. Handgeschriebene `drills` bleiben für alles, was sich nicht
erzeugen lässt.

## 2. Niveaus: Basis, Erweitert, Expert

Ein Schalter in der Auswahl, gilt für alle Aufgaben und Spiele und bleibt pro
Person gespeichert. Er ersetzt das heutige einfach/mittel/schwer (alte
Einstellung wird übernommen: `easy` → `basis`, `medium` → `erweitert`,
`hard` → `expert`).

Ein einziger Schalter statt getrennter Regler für «Wortumfang» und
«Schwierigkeit» – für die Unterstufe ist eine Wahl verständlicher als zwei.
Das Niveau wirkt auf zwei Ebenen:

### Welche Wörter

Jedes Item trägt ein `level`. Wo das Lehrmittel eine Einteilung hat, wird sie
übernommen:

| Niveau | Wortumfang | Herkunft bei *dis donc!* |
|---|---|---|
| Basis | Grundwortschatz | «Vocabulaire» |
| Erweitert | + erweiterter Wortschatz | «Vocabulaire plus», Randvokabeln der Buchseiten |
| Expert | + Wendungen und Sätze, Wiederholung aus früheren Units | Satz-Items (`pos: phrase`), ältere Sections |

Ein Niveau schliesst die darunterliegenden ein. Decks ohne Einteilung
(DoubleDecker, Young World) haben überall `basis` – dort wirkt das Niveau nur
auf die Aufgabenform. Beim Import (`/voci-unit`, `curate.html`) wird `level`
eine eigene Spalte.

### Wie schwer die Aufgabe ist

| Aufgabe | Basis | Erweitert | Expert |
|---|---|---|---|
| *terms* | 4 Optionen, unähnliche Ablenker | 6 Optionen, ähnliche Ablenker | 8 Optionen, Verwechslungspaare bevorzugt |
| *spelling* | 4 Optionen, offensichtliche Fehler | 6 Optionen, alle Fehlerarten | 8 Optionen, kombinierte Fehler |
| *writing* | Artikel vorgegeben (*la ___*), fehlende Akzente toleriert mit Hinweis | Artikel selbst schreiben, Akzente zählen | wie Erweitert, ohne Hinweis nach dem ersten Fehler |
| Grammatik-Drills | Auswahl per Knopf (*mon / ma / mes*) | Lücke tippen | Form umbilden oder ganzen Ausdruck schreiben (*ma tante* → *mes tantes*) |
| Kreuzworträtsel | 6–8 Wörter, erster Buchstabe steht, Akzente tolerant, Emoji-Hinweis | 10 Wörter, keine Buchstaben vorgegeben, Akzente zählen | 12–14 Wörter, nur deutscher Hinweis, Zeit zählt |
| Genus-Sortierer | *le / la* | + *l'* und *les* (Genus muss man wissen) | *mon / ma / mes*, höheres Tempo |
| Speed-Runde | 90 s, Auswahl | 60 s, Auswahl | 45 s, tippen |
| Pendu | 8 Fehlversuche | 6 | 4, Akzente zählen |
| Satzbau | 3–4 Kärtchen | + Satzzeichen | + ein überzähliges Kärtchen |
| Memory | 6 Paare mit Emoji | 8 Paare | 10 Paare, nur Wörter |

Die Werte sind Startwerte und stehen in einer Tabelle im Code (wie heute
`DIFFICULTY` in `spelling.js` und `optionCount()` in `util.js`), damit sie
sich nach den ersten Erfahrungen leicht anpassen lassen.

### Niveau im Lernstand

- Jedes Event speichert das Niveau, auf dem geübt wurde.
- Ein Wort steigt im Leitner-Fach nur auf, wenn es mindestens auf *Erweitert*
  richtig war; auf *Basis* gilt es als «erkannt», nicht als «sicher».
- Hat jemand auf einem Niveau über mehrere Runden fast alles auf Anhieb
  richtig, **schlägt** die App das nächste Niveau vor. Sie wechselt nie von
  selbst.
- Challenges werden immer auf einem festen Niveau gespielt und nur mit
  Partien desselben Niveaus verglichen.

## 3. Fehlerspeicher und Schwächenprofil

Das ist der Kern von v2. Heute speichert `logAttempt` pro Wort nur `correct`
und `tries` – **was** falsch eingegeben wurde, geht verloren.

### Event (erweitert das heutige Attempt)

```jsonc
{
  "id": "…", "userId": "local", "ts": 1791450000000,
  "deckId": "fr-disdonc-1", "contentVersion": 5,
  "itemId": "grand-mere",            // oder Drill-/Generator-ID
  "grammarId": "fr.possessif",       // falls Grammatik-Aufgabe
  "skill": "produce",                // recognize | spell | produce | grammar
  "source": "quiz",                  // quiz | drill | game | challenge
  "level": "erweitert",              // Niveau, auf dem geübt wurde
  "game": null,                      // z. B. "crossword"
  "correct": false,                  // auf Anhieb gewusst
  "tries": 1,
  "errors": [
    { "given": "la grand-mere", "type": "accent" }
  ],
  "durationMs": 6400
}
```

Ein Datensatz pro Aufgabe wie bisher; `errors` hält jeden Fehlversuch mit der
tatsächlichen Eingabe und seiner Klasse. Bestehende Datensätze bleiben gültig,
es kommen nur Felder dazu.

### Fehlerklassen

Regelbasiert, abhängig vom Sprachprofil. Für Französisch:

| Klasse | erkannt an | Beispiel |
|---|---|---|
| `accent` | gleich nach `stripDiacritics` | *grand-mere* statt *grand-mère* |
| `gender` | nur Artikel/Begleiter im Genus vertauscht | *le tante*, *mon mère* |
| `number` | nur Zahl falsch | *ma parents*, *il sont* |
| `elision` | *le acteur* statt *l'acteur* | |
| `letters` | Editierdistanz 1–2 (Auslassung, Verdopplung, Dreher) | *frére*, *cousinne* |
| `confusion` | Eingabe = anderes Wort der Lektion | *oncle* statt *tante* → Paar wird gemerkt |
| `unknown` | alles andere | |

Im Modus *spelling* ist die Klasse sogar exakt bekannt, weil jede falsche
Option mit einer bekannten Operation (`misspellings` in `util.js`) erzeugt
wurde – die Option trägt ihre Operation einfach mit. Im Modus *terms* ist jeder
Fehlklick eine `confusion` mit genau benanntem Partnerwort.

### Lernstand (berechnet, nicht gepflegt)

Aus den Events wird pro Item und Fertigkeit ein Stand abgeleitet:

- **Fach 0–5** nach Leitner (das Lehrmittel erklärt die Lernkartei selbst,
  S. 56) mit Fälligkeitsdatum.
- **Stufenfolge** pro Wort: erkennen (*terms*) → richtig schreiben
  (*spelling*) → selbst schreiben (*writing*). Ein Wort gilt als sicher, wenn es
  an zwei verschiedenen Tagen frei geschrieben richtig war.
- **Schwächenprofil** quer über alle Wörter: häufigste Fehlerklassen
  («Akzente», «Genus le/la»), Verwechslungspaare (*oncle/tante*), schwache
  Grammatikpunkte.

Der Stand ist eine Projektion: jederzeit aus den Events neu berechenbar. Das
macht spätere Sync- und Regeländerungen ungefährlich.

### Wie die App die Schwächen nutzt

1. **Gemischte Runde «Für dich»**: etwa 60 % fällige und schwache Wörter, 30 %
   neue, 10 % sichere zur Bestätigung.
2. **Gezielte Hilfe**: Bei gehäuften `gender`-Fehlern erscheinen Genus-Farben
   und der Hinweis zum GrammarPoint; bei `accent` bevorzugt der Modus
   *spelling* Akzent-Varianten.
3. **Verwechslungspaare** werden absichtlich zusammen als Ablenker gezeigt,
   bis die Unterscheidung sitzt.
4. **Ansicht «Meine Stolpersteine»** für die SuS selbst: die fünf häufigsten
   Fehlerarten mit Beispiel und Knopf «gezielt üben».

## 4. Minispiele

Jedes Spiel ist ein Modul wie die Modi in `js/modes/`: es bekommt eine
Wortmenge und einen Zufallsgenerator, baut daraus eine Partie, prüft Eingaben
mit derselben Prüfung wie das Quiz und schreibt Events (`source: "game"`).
Spiele nutzen also das Fehlerprofil und füttern es.

| Spiel | Sprachlicher Kern | braucht |
|---|---|---|
| **Kreuzworträtsel** | Hinweis deutsch (+ Emoji), französisches Wort mit sichtbarer Buchstabenzahl ins Gitter schreiben | `lemma` |
| **Genus-Sortierer** | Wörter fallen herunter, nach *le* / *la* (oder *mon/ma/mes*) wischen | `gender`, `number` |
| **Speed-Runde** | 60 Sekunden, so viele Übersetzungen wie möglich (*terms*) | – |
| **Pendu** | Galgenmännchen mit deutschem Hinweis | `lemma` |
| **Satzbau** | Wortkärtchen in die richtige Reihenfolge | Satz-Items |
| **Memory** | Paare deutsch–französisch aufdecken | – |

**Reihenfolge:** Kreuzworträtsel zuerst (ausdrücklich gewünscht), dann
Genus-Sortierer (die einzige Grammatik als Spiel), dann Speed-Runde.

### Kreuzworträtsel im Detail

- Wortzahl je nach Niveau (Abschnitt 2), aus der gewählten Section, bevorzugt schwache (im Übungsmodus;
  in einer Challenge entscheidet der Seed, siehe unten).
- Nur Items mit einem Lemma ohne Leerzeichen. Bindestriche (*grand-mère*) sind
  vorgegebene Felder.
- Hinweis: deutsches Wort, Emoji falls vorhanden, Genus als (m)/(f).
- Akzente: Ein Buchstabe ohne Akzent ist auf *Basis* richtig, auf *Erweitert*
  und *Expert* nicht. Eine Akzentleiste (é è ê à ç ô …) über der Tastatur
  liefert das Sprachprofil.
- Jedes fertig eingetragene Wort wird als Event geloggt, Fehlversuche mit
  Eingabe und Klasse.
- Aufbau des Gitters: gieriges Platzieren mit Kreuzungen, dichtestes von ein
  paar Versuchen gewinnt. Mit festem Seed kommt immer dasselbe Gitter heraus.

## 5. Challenges zwischen SuS

Eine Challenge ist **dieselbe Partie für zwei oder mehr Personen**. Das geht
ohne Server, wenn eine Partie vollständig durch ihre Parameter bestimmt ist:

```jsonc
// im URL-Fragment: …/#c=<base64url>
{ "v": 1, "game": "crossword", "deck": "fr-disdonc-1", "ver": 5,
  "sections": ["u2.lz2"], "level": "erweitert", "seed": 48213,
  "score": 920, "ms": 74000, "alias": "Renard 7" }
```

**Stufe A – sofort möglich, ohne Server.**
Partie spielen → «Herausfordern» → Link oder QR-Code an Freundinnen und
Freunde schicken (Chat, Teams). Wer den Link öffnet, spielt dasselbe Gitter und sieht danach
den Vergleich. Die Daten stehen im `#`-Fragment, das nie an einen Server
geht. Statt Namen gibt es zufällige Spitznamen (*Renard 7*). Ein Link lässt
sich fälschen – für ein Spiel unter Freunden ist das in Ordnung.

Technisch braucht das nur einen Zufallsgenerator mit Seed (z. B. mulberry32)
statt `Math.random()` bei der Partie-Erzeugung und eine Warnung, wenn die
Deck-Version im Link nicht mehr zum Stand passt.

**Stufe B – mit Login.**
- **Freunde:** über einen Freundescode verbinden; danach Herausforderungen
  direkt in der App statt per Link, Ergebnisse bleiben sichtbar.
- **Challenge der Woche:** ein Rätsel pro Unit und Niveau für alle, die die App
  nutzen – Bestenliste mit Spitznamen.

**Pädagogische Leitplanken**
- Standard ist «gegen die eigene Bestzeit». In Bestenlisten erscheint nur,
  wer das selbst einschaltet.
- Gezeigt werden die ersten Plätze und der eigene Platz, nie eine
  vollständige Rangliste mit letztem Platz.
- Punkte zählen Genauigkeit vor Tempo: ein Fehler kostet mehr, als
  Schnelligkeit einbringt. So lohnt sich Raten nicht.

## 6. Weitere Sprachen: Sprachprofil

Was sprachabhängig ist, steht in `data/languages/<code>.json`, nicht im Code:

```jsonc
{
  "code": "fr", "name": "Französisch",
  "tts": "fr-FR", "assess": "fr-FR",
  "specialChars": ["é","è","ê","ë","à","â","ç","î","ï","ô","û","ù","œ"],
  "normalize": { "apostrophes": true, "ligatures": { "oe": "œ" } },
  "features": { "gender": ["m","f"], "articles": { "m": "le", "f": "la", "pl": "les", "elided": "l'" },
                "possessive": { "m": "mon", "f": "ma", "pl": "mes" } }
}
```

- Spiele und Generatoren fragen `features` ab: Englisch hat kein Genus, also
  erscheint dort kein Genus-Sortierer – ohne Sonderfall im Code.
- Die Fehlerklassen `gender`, `number`, `elision` werden aus `features`
  abgeleitet.
- **Apostroph-Fehler heute:** `normalize()` in `util.js` setzt `'` und `’`
  nicht gleich. iPads und Macs tippen standardmässig `’`, also wird *c’est*
  im Modus *writing* abgelehnt. Betrifft schon Unité 1 und erst recht Unité 2
  (*l'acteur, s'appelle, c'est*). Das sollte vor dem Import von Unité 2
  behoben werden – unabhängig vom übrigen Konzept.

Oberflächensprache (Deutsch) bleibt getrennt von Ausgangs- und Zielsprache.

## 7. Login, Sync, KI – was das Modell dafür vorbereitet

### Login mit Zugangskarte (unabhängig von der Schul-IT)

Kein Microsoft-Login: Dafür müsste die Schul-IT die App im Schulkonto
freigeben. Stattdessen ein eigener, einfacher Login nach dem Vorbild von
*Anton* – Spitzname plus Zugangskarte mit QR-Code, E-Mail nur optional.

**Ablauf für SuS**

1. **Ohne Konto loslegen.** Wie heute: alles läuft lokal, nichts wird
   verlangt.
2. **«Fortschritt sichern».** Spitzname wählen (kein voller Name). Die App
   zeigt die **Zugangskarte**: QR-Code plus
   kurzer Code zum Abtippen (`KATZE-7Q4M-X2PL`). Karte drucken, als Bild
   speichern oder abfotografieren. Der bisherige Lernstand wandert ins Konto.
3. **Auf einem anderen Gerät** den QR-Code mit der normalen Kamera scannen –
   er enthält einen Link (`…/#login=<geheimnis>`), der direkt eingeloggt
   öffnet. Oder den kurzen Code eintippen. Das Gerät bleibt danach angemeldet.
4. **Optional E-Mail** (eigene oder die der Eltern) hinterlegen. Wer die Karte
   verliert, bekommt per Mail einen Link und damit eine neue Karte; die alte
   wird ungültig.

**Wiederherstellung ohne Lehrperson.** Weil niemand eine Klassenliste führt,
muss jede Person selbst wieder hineinkommen können:

- Die Karte lässt sich auf jedem angemeldeten Gerät jederzeit wieder anzeigen
  oder neu ausstellen («Meine Zugangskarte»). Solange ein Gerät angemeldet
  ist, ist nichts verloren.
- Beim Sichern bietet die App die Karte als Bild zum Speichern und als
  Druckvorlage an (A8 wie die Karteikarten, `js/ui/print.js`) und erinnert
  freundlich an die E-Mail.
- Ohne Karte, ohne angemeldetes Gerät und ohne E-Mail ist das Konto verloren.
  Das sagt die App beim Sichern klar.

**Sicherheit**

- Der QR-Code trägt ein langes Zufallsgeheimnis (128 Bit) – er ist das
  Passwort. Gespeichert wird auf dem Server nur ein Hash davon.
- Der kurze Abtipp-Code ist kürzer und darum mit Versuchsbegrenzung
  geschützt (wenige Fehlversuche pro Minute).
- Das Geheimnis steht im `#`-Teil des Links. Der geht nie an einen Server und
  in kein Server-Log; die App entfernt ihn nach dem Login sofort aus der
  Adresszeile.
- Jede Karte lässt sich sperren und ersetzen. Unter «Meine Geräte» sieht man,
  wo man angemeldet ist, und kann Geräte abmelden.
- Restrisiko: Wer eine Karte abfotografiert, kann sich anmelden – wie bei
  Anton. Für Lernstand und Spielstände vertretbar; darum keine weiteren
  Personendaten im Konto.

**Technik (Firebase)**

- Erster Start: anonymes Firebase-Konto (`signInAnonymously`), damit
  Sync von Anfang an eine feste Kennung hat.
- Zugangskarte: eine Serverfunktion speichert den Hash des Geheimnisses zur
  Kennung. Beim Scannen prüft sie den Hash und gibt ein Firebase-Login-Token
  für **dieselbe** Kennung aus (`createCustomToken` → `signInWithCustomToken`).
- E-Mail-Wiederherstellung: Firebase-Login per E-Mail-Link, an das Konto
  gekoppelt; keine Passwörter.
- Firebase-Konten liegen nicht in der Schweiz; dort steht darum nur die
  Kennung und die optionale E-Mail. Lernstand und Spitzname liegen in
  Firestore in Zürich (`europe-west6`).
- Ohne Microsoft-Login wäre auch Cloudflare (Workers + D1) gleich einfach
  möglich – dann aber E-Mail-Versand und Login-Sicherheit selbst gebaut.
  Firebase bleibt der Vorschlag, weil anonyme Konten und E-Mail-Links
  fertig und erprobt sind.

### Weitere Vorbereitung

- **Lernstand übernehmen:** `userId` steht schon in jedem Event. Beim Sichern
  wird `local` auf die echte Kennung umgeschrieben; der Stand vor dem Login
  bleibt.
- **Sync:** Events werden nur angehängt und tragen eine UUID. Sync heisst:
  noch nicht hochgeladene IDs schicken. Keine Konflikte, offline geht weiter.
  Der Lernstand wird auf jedem Gerät aus den Events berechnet.
- **Lehrperson:** keine Sicht auf einzelne SuS. Möglich und nützlich ist eine
  **anonyme Gesamtstatistik** über alle Nutzenden: welche Wörter und
  Fehlerklassen am meisten Mühe machen – als Rückmeldung für den Unterricht.
- **Testtermine** bleiben wie heute im Inhalt (Titel bzw. Feld der Section),
  da es keine Klassen gibt, an die man sie hängen könnte.
- **KI-Agent:** liest das Schwächenprofil und arbeitet mit denselben
  Bausteinen. Naheliegend: «Erklär mir, warum hier *ma* und nicht *mon*» auf
  Basis des GrammarPoint; zusätzliche Drills zu den eigenen Fehlerklassen
  (mit `origin: "ai"`, von der Lehrperson geprüft, bevor sie allen angeboten
  werden). Anfragen nur über einen eigenen Proxy, keine Personendaten ans
  Modell.

## 8. Umsetzung in Schritten

Jeder Schritt ist für sich nutzbar und veröffentlichbar.

1. ~~**Apostroph-Normalisierung** in `normalize()`~~ – erledigt, auf `main`
   (81462d3).
2. **Niveau-Schalter Basis / Erweitert / Expert** statt einfach/mittel/schwer,
   alte Einstellung übernehmen, Tabelle der Startwerte für die bestehenden
   Modi. Klein und sofort sichtbar.
3. **Fehlerspeicher:** `errors[]`, `skill`, `source`, `durationMs` im Event;
   Klassifizierer `js/learning/errors.js`; *spelling*-Optionen tragen ihre
   Operation mit. IndexedDB Version 3 mit Index `byUserItem`. Ab hier sammeln
   sich Daten, auch wenn noch nichts sie anzeigt.
4. **Inhaltsmodell v2:** Course/Unit/Section, stabile IDs mit `aliases`,
   Felder `lemma`/`gender`/`number`/`pos`/`level`/`tags`; Migrationsskript für die
   drei bestehenden Decks; `/voci-unit` und `curate.html` um die neuen Felder
   erweitern.
5. **Unité 2 importieren** (Wortschatz + Felder) und GrammarPoints
   *possessif*, *être 3p*, *s'appeler*, *c'est/ce sont* mit Generatoren.
6. **Lernstand und «Für dich»-Runde**, Ansicht «Meine Stolpersteine».
7. **Kreuzworträtsel** mit Seed, dann **Genus-Sortierer**, **Speed-Runde**.
8. **Challenge-Links** (Stufe A).
9. Login mit Zugangskarte, Sync, anonyme Gesamtstatistik, Challenges
   Stufe B.
10. KI-Agent.
