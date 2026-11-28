# Pattern

La sezione «Pattern» del Leggio riprende i concetti del quaderno e li mostra come grafici interattivi: una **tavola** per idea, con il linguaggio della matematica (rette, modulo 12, esponenziali, onde, successioni, processi). È indipendente dal quaderno: non ne copia il testo, lo richiama con i numeri di paragrafo (§5.4).

Due regole reggono tutto:

1. **Corretto e deterministico.** Ogni numero che compare in una tavola è calcolato dal codice, mai scritto a mano, e ha un controllo in `tests/pattern/` contro valori ricavati in modo indipendente (music21, frazioni, un secondo metodo di calcolo).
2. **Una tavola, una conclusione.** Il titolo dice che cosa si capisce; il grafico lo fa vedere; il testo è poco.

## File

| File | Che cosa contiene |
|---|---|
| `pattern.html` | la pagina: elenco (per capitolo o per idea matematica), vista della tavola, stile |
| `pattern.json` | i dati delle tavole: titolo, paragrafi, motore, parametri, testi. Arriva dalla rete a ogni apertura, come `piano.json` |
| `pattern/nucleo.js` | la matematica condivisa: retta delle quinte, scale, armature, triadi, frequenze, centesimi |
| `pattern/grafico.js` | piano cartesiano in SVG, tastiera, comandi (cursore, scelta, interruttore), suono |
| `pattern/motori/<nome>.js` | un **motore** per tipo di grafico: calcolo e disegno |
| `tests/pattern/` | riferimenti indipendenti (`*.rif.py` → `*.rif.json`) e prove (`*.test.js`): `node --test tests/pattern/*.test.js` |
| `tests/pattern_dati.py` | controlli di costruzione su `pattern.json` e sull'elenco dei file del service worker |
| `tests/pattern_stati.py` | prova a fondo: ogni combinazione dei comandi di ogni tavola, misurata nel browser |

## Una tavola in `pattern.json`

```json
{ "id": "giri-rette", "titolo": "La tabella dei giri è fatta di rette parallele", "sotto": "una riga",
  "idea": "rette", "par": ["4.3", "5.4"], "motore": "giri-rette", "param": {},
  "guarda": ["**Parola chiave**: una frase."], "formule": ["y = x + d"], "prova": "un gesto alla tastiera",
  "corsi": [{ "corso": "Analisi matematica 1", "tema": "…" }], "calcolo": ["come è verificato"] }
```

- `idea` è una delle voci di `idee`; `par` sono paragrafi del quaderno: da lì viene l'ordine «per capitolo».
- Nei testi valgono solo `**grassetto**` e `` `formula` ``.
- Una tavola nuova che riusa un motore esistente è **solo dati**: si aggiunge a `pattern.json`, senza toccare il codice né la versione dell'app.

## Un motore

```js
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");
  const calcola = { /* funzioni pure: tutto ciò che il disegno mostra passa da qui, e le prove le chiamano da node */ };
  function disegna(ctx, param) {
    const PG = root.PG;
    // ctx.lettura("testo con **grassetto**"): la riga che legge il grafico, sopra · ctx.graf: dove va il grafico · ctx.comandi: i comandi, fermi in fondo allo schermo
    // a ogni tocco si ricalcola e si ridisegna tutto: ctx.graf.replaceChildren(...)
    return { smonta() { /* ferma timer e suoni */ } };
  }
  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("nome-del-motore", def);
})(typeof self !== "undefined" ? self : this);
```

La pagina carica il motore da sola, dal nome scritto nella tavola. Un motore nuovo va aggiunto all'elenco `ASSETS` di `sw.js`, e si alza la versione dell'app.

### Disegno: `PG` (in `pattern/grafico.js`)

- `PG.piano({ h, x:[min,max], y:[min,max], xt, yt, xlab, ylab, xlog, ylog, m:{l,r,t,b}, aria })` → `P`. Le tacche sono numeri oppure `{ v, t, cls }`. Larghezza 360 unità.
- `P.retta(x1,y1,x2,y2,cls)` · `P.spezzata([[x,y]…],cls)` · `P.curva(fn,cls,n,[da,a])` · `P.area(punti,cls)` · `P.fasciaX(x0,x1,cls)` · `P.fasciaY(y0,y1,cls)`
- `P.punto(x,y,{ r, cls, forma: cerchio|quadro|rombo|tri, vuoto, t, pos: n|s|e|o|ne|no|se|so, tcls, tit, su })`: con `su` il punto si tocca.
- `P.testo(x,y,"…",{ cls, anc, dx, dy, px })` · `P.sx(x)`, `P.sy(y)`, `P.s(tag, attributi, …figli)` per il disegno libero · `P.dati`, `P.sopra` i due strati.
- `PG.tastiera({ da, a, h, segna: { midi: { cls: "f-a", t } } })`: estremi su tasti bianchi.
- `PG.cursore({ etichetta, min, max, passo, valore, mostra, su })` · `PG.seg({ etichetta, opzioni:[{v,t}], valore, su })` · `PG.interruttore({ etichetta, valore, su })` · `PG.pulsante({ t, su })` · `PG.riga(…)` · `PG.legenda([{ cls, forma, t }])`
- `PG.suona([{ f, g, tipo }], secondi)` · `PG.zitto()` · `PG.h(tag, attributi, …figli)` per l'HTML.
- Classi: serie `s-a` (rosso), `s-b` (blu), `s-c` (verde), `s-d` (ocra), `s-m` (grigio); linee `fine`, `grossa`, `tratt`, `punt`; testi `m` (grigio), `p` (piccolo), `g` (grande); segni sulla tastiera `f-a … f-d`, `f-i`.

### Regole di disegno

- Telefono a 390 px, tema chiaro e scuro: niente colori scritti nel motore, solo le classi.
- Il colore non è mai l'unico segnale: a ogni colore corrisponde una forma, un tratteggio o un'etichetta.
- Testi nel grafico non sotto le 10 unità. I comandi di `PG` sono larghi almeno 44 px; i punti da toccare dentro un grafico arrivano a circa 38 px e non devono essere l'unico modo di cambiare un valore: accanto ci vuole sempre un cursore o una scelta.
- Sullo schermo la tavola è: riga di lettura, grafico, comandi fermi in fondo. Il primo grafico deve bastare a capire: ciò che viene dopo (secondo grafico, tastiera) si vede scorrendo, con i comandi sempre sotto il dito.
- Ogni grafico ha `aria`: una frase che dice i numeri a chi non vede.
- Rosso e blu, quando ci sono le due mani, sono destra e sinistra, come nel resto dell'app.

## Testi

Voce da manuale, impersonale, come il quaderno: niente «il maestro», niente nomi di persone (il repository è pubblico). Frasi brevi; ogni punto di «Che cosa guardare» apre con due o tre parole chiave in grassetto. Un modello si chiama modello, e se ne dicono i limiti. In `corsi` entrano solo rimandi a materiali dei corsi letti davvero.

## Aggiungere una tavola dopo una lezione

1. Per ogni paragrafo nuovo del capitolo: c'è una regolarità che un grafico fa vedere meglio delle parole? Se no, niente tavola.
2. Se un motore esistente basta, si aggiunge la tavola a `pattern.json` con i suoi parametri.
3. Se serve un motore nuovo: file in `pattern/motori/`, riferimento indipendente e prova in `tests/pattern/`, riga in `sw.js`, versione alzata.
4. `node --test tests/pattern/*.test.js`, poi `python3 tests/pattern_stati.py --tutte` (tutte le combinazioni dei comandi con i cursori agli estremi, a 390 px in chiaro e in scuro e a 360 px: nessuna scritta sovrapposta o tagliata), poi `LEGGIO_CHIAVE=… python3 tests/collaudo.py` fino a «TUTTO OK». Le foto dello stato iniziale non bastano: i difetti stanno agli estremi dei cursori.
5. Chi scrive una tavola non la certifica: prima di pubblicare un motore nuovo, testi e calcoli si fanno rileggere da un verificatore che non l'ha costruito (il 28/11/2026 ha trovato due affermazioni false in tavole le cui prove passavano tutte).
