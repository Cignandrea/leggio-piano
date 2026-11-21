# Leggio del piano

App per allenarsi al piano: la sessione di esercizi preparata dopo ogni lezione, con tastiera disegnata, metronomo, giri di accordi e diario. Si installa sul telefono da Chrome (⋮ → «Installa app») e si apre senza barra degli indirizzi.

## Come si aggiorna
- **Il piano degli esercizi** sta in `piano.json`. Quando cambia, l'app lo prende da sola alla riapertura (il service worker chiede prima alla rete la pagina e il piano).
- **L'app** è `index.html`. Ogni modifica si collauda prima di pubblicarla: `python3 tests/collaudo.py` (Chrome a 390 px, tema chiaro e scuro, sessione simulata, diario, uso senza rete, piano nuovo).
- Ogni volta che cambia `index.html` si alza la versione in due punti uguali: `APP_VERSION` in `index.html` e `VERSION` in `sw.js`.

## Dove stanno i dati
- Il diario delle sessioni resta sul telefono (memoria del browser). A fine sessione «Copia per Claude» copia le sessioni nuove, da incollare in chat.
- La stessa pagina funziona anche come artifact su claude.ai: lì piano e diario vivono nel database dell'artifact.

## Formato di `piano.json`
`{schema: 2, versione, lezione, quando, fonte, blocchi, valuta, messaggio}`. Ogni blocco ha `id`, `titolo`, `rif`, `testo`, `occhio`, `avviso?`, `bpm?`, `fasi` e uno tra `figura`, `varianti`, `figuraDa`, `widget` (`gradi`, `sus`, `giro` con `giri`), oppure nessuno (blocco di solo testo). Le figure usano solo tasti bianchi (`tasti` = scarti in tasti bianchi dalla `base`).
