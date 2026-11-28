/* Pattern — nucleo: la matematica condivisa dalle tavole.
   Solo funzioni pure: nessun accesso alla pagina, nessun valore scritto a mano che si possa calcolare.
   Convenzioni:
   - q  = posto sulla retta delle quinte (do = 0, sol = 1, re = 2 … fa = −1, si♭ = −2 …);
   - pc = classe di altezza: semitoni sopra il do, modulo 12 (do = 0 … si = 11);
   - g  = grado della scala maggiore, da 0 (I) a 6 (VII);
   - t  = tonalità maggiore, indicata con il posto q della sua tonica (do = 0, sol = 1, fa = −1 …). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PN = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const mod = (a, n) => ((a % n) + n) % n;
  const intervallo = (da, a) => { const v = []; for (let i = da; i <= a; i++) v.push(i); return v; };

  /* ---------- Nomi delle note sulla retta delle quinte ---------- */
  const NOMI_Q = ["fa", "do", "sol", "re", "la", "mi", "si"];   // i sette nomi in ordine di quinte, da q = −1
  const LETTERE_Q = ["F", "C", "G", "D", "A", "E", "B"];
  const segni = (n) => (n > 0 ? "♯".repeat(n) : "♭".repeat(-n));
  const alterazioniQ = (q) => Math.floor((q + 1) / 7);           // 0 naturale, +1 diesis, −1 bemolle…
  const nomeQ = (q) => NOMI_Q[mod(q + 1, 7)] + segni(alterazioniQ(q));
  const letteraQ = (q) => LETTERE_Q[mod(q + 1, 7)] + segni(alterazioniQ(q));
  const pcQ = (q) => mod(7 * q, 12);                              // una quinta giusta = 7 semitoni

  /* ---------- La scala come retta: semitoni del grado k ---------- */
  // Il grado k (0 = tonica) della scala con «intercetta» c sta a ⌊(12k + c)/7⌋ semitoni dalla tonica.
  // c = 5 dà la scala maggiore, c = 2 la minore naturale; c = 0…6 dà i sette modi dei tasti bianchi.
  const semitoniRetta = (k, c) => Math.floor((12 * k + c) / 7);
  const C_MAGGIORE = 5, C_MINORE = 2;
  const scalaSemitoni = (c) => intervallo(0, 7).map((k) => semitoniRetta(k, c));
  const passiScala = (c) => { const s = scalaSemitoni(c); return s.slice(1).map((v, i) => v - s[i]); };   // 2 = tono, 1 = semitono
  const MODI = [   // per intercetta c; «da» = nota dei tasti bianchi da cui si legge il modo
    { c: 0, nome: "locrio", da: "si" }, { c: 1, nome: "frigio", da: "mi" }, { c: 2, nome: "minore naturale (eolio)", da: "la" },
    { c: 3, nome: "dorico", da: "re" }, { c: 4, nome: "misolidio", da: "sol" }, { c: 5, nome: "maggiore (ionico)", da: "do" },
    { c: 6, nome: "lidio", da: "fa" },
  ];

  /* ---------- La scala maggiore sulla retta delle quinte ---------- */
  // Posto di ogni grado rispetto alla tonica, ricavato dalla retta: è l'unico q tra −1 e +5 con 7q ≡ semitoni (mod 12).
  const Q_GRADO = intervallo(0, 6).map((g) => intervallo(-1, 5).find((q) => pcQ(q) === semitoniRetta(g, C_MAGGIORE)));
  const ROMANI = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const NOMI_GRADO = ["tonica", "sopratonica", "mediante", "sottodominante", "dominante", "sopradominante", "sensibile"];
  const scalaQ = (t) => Q_GRADO.map((d) => t + d);                // i sette gradi di t, in ordine di grado
  const finestraQ = (t) => intervallo(t - 1, t + 5);              // le stesse sette note, in ordine di quinte
  const gradoDiQ = (t, q) => Q_GRADO.indexOf(q - t);              // −1 se q non appartiene alla scala di t

  /* ---------- Armatura di chiave ---------- */
  // Le note naturali occupano i posti da −1 a +5: nella scala di t sono diesis i posti ≥ 6, bemolle i posti ≤ −2.
  function armatura(t) {
    const f = finestraQ(t);
    const diesis = f.filter((q) => q >= 6), bemolle = f.filter((q) => q <= -2).reverse();
    if (diesis.length) return { n: diesis.length, segno: "♯", note: diesis };
    if (bemolle.length) return { n: bemolle.length, segno: "♭", note: bemolle };
    return { n: 0, segno: "", note: [] };
  }

  /* ---------- Triadi ---------- */
  const TIPI = {
    magg: { nome: "maggiore", accordo: "maggiore", sigla: "", semitoni: [0, 4, 7] }, min: { nome: "minore", accordo: "minore", sigla: "m", semitoni: [0, 3, 7] },
    dim: { nome: "diminuita", accordo: "diminuito", sigla: "°", semitoni: [0, 3, 6] }, aum: { nome: "aumentata", accordo: "aumentato", sigla: "+", semitoni: [0, 4, 8] },
  };
  const tipoDaSemitoni = (terza, quinta) => Object.keys(TIPI).find((k) => TIPI[k].semitoni[1] === terza && TIPI[k].semitoni[2] === quinta) || null;
  // Triade sul grado g della tonalità t, costruita con le sole note della scala (grado, +2, +4).
  function triade(t, g) {
    const s = scalaQ(t), q = [s[mod(g, 7)], s[mod(g + 2, 7)], s[mod(g + 4, 7)]];
    const terza = mod(pcQ(q[1]) - pcQ(q[0]), 12), quinta = mod(pcQ(q[2]) - pcQ(q[0]), 12);
    const tipo = tipoDaSemitoni(terza, quinta);
    return { g: mod(g, 7), romano: ROMANI[mod(g, 7)], q, tipo, nome: nomeQ(q[0]) + " " + TIPI[tipo].accordo, breve: nomeQ(q[0]) + (tipo === "magg" ? "" : " " + TIPI[tipo].accordo), sigla: letteraQ(q[0]) + TIPI[tipo].sigla };
  }
  const FUNZIONI = ["T", "S", "T/D", "S", "D", "T", "D"];        // funzione armonica dei sette gradi (quaderno §2.6)

  /* ---------- Frequenze e centesimi ---------- */
  const LA4 = 440;
  const freqMidi = (m) => LA4 * Math.pow(2, (m - 69) / 12);       // temperamento equabile, la4 = 440 Hz (MIDI 69)
  const freqTasto = (n) => freqMidi(n + 20);                      // tasti del pianoforte da 1 (la0) a 88 (do8)
  const cents = (rapporto) => 1200 * Math.log2(rapporto);
  const MIDI_DO4 = 60;
  const nomeMidi = (m) => ["do", "do♯", "re", "mi♭", "mi", "fa", "fa♯", "sol", "la♭", "la", "si♭", "si"][mod(m, 12)] + (Math.floor(m / 12) - 1);

  /* ---------- Numeri in italiano ---------- */
  const num = (x, dec) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(dec === undefined ? 0 : dec).replace(".", ",").replace(/^-/, "−");

  return {
    mod, intervallo, NOMI_Q, LETTERE_Q, segni, alterazioniQ, nomeQ, letteraQ, pcQ,
    semitoniRetta, C_MAGGIORE, C_MINORE, scalaSemitoni, passiScala, MODI,
    Q_GRADO, ROMANI, NOMI_GRADO, scalaQ, finestraQ, gradoDiQ, armatura,
    TIPI, tipoDaSemitoni, triade, FUNZIONI,
    LA4, freqMidi, freqTasto, cents, MIDI_DO4, nomeMidi, num,
  };
});
