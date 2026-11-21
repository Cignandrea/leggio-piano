# Leggio del piano

App per allenarsi al piano, in tre sezioni:

- **Oggi**: la sessione di esercizi preparata dopo l'ultima lezione, con tastiera disegnata, metronomo, giri di accordi e diario.
- **Esercizi**: lo storico di tutti gli esercizi creati, raggruppati per area; ognuno si può ripetere da solo, senza toccare la sessione di oggi.
- **Quaderno**: il quaderno delle lezioni, scritto come un manuale. Si legge in due ordini, con l'interruttore in alto: **per lezione** (i capitoli) o **per argomento** (gli stessi paragrafi in sequenza logica). Ogni paragrafo ha le sue «Fonti e verifiche». È cifrato: si apre solo con la chiave.

Si installa sul telefono da Chrome (⋮ → «Installa app») e si apre senza barra degli indirizzi. Funziona anche senza rete, con l'ultima versione scaricata.

## Come si aggiorna
- **La sessione di oggi** sta in `piano.json` (schema 3). La lista `sessione` richiama gli esercizi della libreria per id (`"armature"`) o con modifiche (`{"da": "perno", "fasi": [...]}`); un blocco con `id` proprio vale solo per quella sessione. Se un richiamo non si trova nella libreria, l'app tiene la sessione di prima e lo dice. (La chiave si chiama `sessione` e non `blocchi` apposta: le app 1.0.x la ignorano invece di mostrare righe vuote.)
- **La libreria degli esercizi** sta in `esercizi.json`: ogni esercizio ha una casa sola, con `area`, `lezione` e `data`. Un esercizio nuovo entra qui e la sessione lo richiama.
- **Il quaderno** sta in `quaderno.cifrato.json` (AES-256-GCM). Si modifica solo con `tools/quaderno.py` e la chiave nella variabile `LEGGIO_CHIAVE`:
  - `decifra <file fuori dal repo>` · `cifra <file>` · `controlla`;
  - `cartelle <cartella fuori dal repo>`: il quaderno in chiaro come cartelle `lezioni/ argomenti/ domande/ meta/`;
  - `applica <out/>`: applica le scritture di `out/writes.json` e ricifra.
  Il testo in chiaro e la chiave non entrano mai nel repository.
  - Dallo schema 3 il quaderno si cifra solo se supera i controlli di costruzione (`problemi_schema3`): voce da manuale nel testo, almeno una verifica per paragrafo, ogni paragrafo con un posto nell'ordine per argomento. Se un controllo non passa, resta pubblicato il quaderno di prima.
  - Un capitolo nuovo si scrive con `tools/capitolo.py` (`salva(lezione, dopo={"5.1": "4.7"}, …)`: ogni paragrafo va dopo quello a cui segue nell'ordine per argomento), da uno script tenuto fuori dal repository.
- **Le fonti** dei paragrafi sono nei dossier di ricerca in `fonti/` (una voce per affermazione: esito, fonti lette, limiti).
- **L'app** è `index.html` + `quaderno.html`. Ogni modifica si collauda prima di pubblicarla: `LEGGIO_CHIAVE=... python3 tests/collaudo.py` (Chrome a 390 px, tema chiaro e scuro, sessione simulata, libreria, diario, quaderno con chiave giusta e sbagliata, uso senza rete).
- Ogni volta che cambia l'app si alza la versione in due punti uguali: `APP_VERSION` in `index.html` e `VERSION` in `sw.js`.
- Il service worker chiede prima alla rete pagine e file `.json`, così sessione, libreria e quaderno nuovi arrivano alla riapertura.

## Dove stanno i dati
- Il diario delle sessioni e le spunte dei compiti restano sul telefono (memoria del browser). A fine sessione «Copia per Claude» copia le sessioni nuove, da incollare in chat.
- La chiave del quaderno resta sul telefono dopo il primo accesso con il link `quaderno.html#chiave=…`.

## Formato degli esercizi
Ogni esercizio ha `id`, `titolo`, `rif`, `testo`, `occhio`, `avviso?`, `bpm?`, `fasi` e uno tra `figura`, `varianti`, `figuraDa`, `widget` (`gradi`, `sus`, `giro` con `giri`), oppure nessuno (solo testo). Le figure usano solo tasti bianchi (`tasti` = scarti in tasti bianchi dalla `base`). Nei giri: `"F:2"` = due battute, `"F/E"` = accordo con basso diverso (una nota sola), `quarti: true` = basso su ogni tempo; il basso suona fondamentale, quinta e ottava.

Librerie incluse in `vendor/` (marked, DOMPurify, abcjs): licenze in `vendor/LICENZE.md`.
