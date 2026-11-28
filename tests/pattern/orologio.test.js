// Collaudo del motore «orologio» (intervalli e triadi) contro music21 (orologio.rif.json) e i numeri del quaderno (§1.1, §2.7, §3.1, §3.3, §3.6, §4.7).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), O = require("../../pattern/motori/orologio.js").calcola, RIF = require("./orologio.rif.json");

test("undici intervalli: nome, rivolto e orbita = music21 e forza bruta", () => {
  for (let n = 1; n <= 11; n++) {
    const r = RIF.intervalli[n];
    assert.equal(O.nomeIntervallo(n), r.nome, "intervallo " + n);
    assert.equal(O.rivoltoIntervallo(n), r.rivolto); assert.equal(O.nomeIntervallo(O.rivoltoIntervallo(n)), r.nome_rivolto);
    assert.equal(n + O.rivoltoIntervallo(n), 12);
    assert.deepEqual(O.orbita(n), r.orbita, "orbita di " + n);
    assert.equal(O.orbita(n).length, 12 / O.mcd(n, 12), "12 / MCD");
  }
  assert.deepEqual(O.orbita(7), PN.intervallo(0, 11).map(PN.pcQ), "per quinte: la retta delle quinte");
  assert.equal(O.rivoltoIntervallo(6), 6, "§2.7: il tritono è il rivolto di sé stesso");
  assert.deepEqual([O.nomeIntervallo(4), O.nomeIntervallo(3), O.nomeIntervallo(7), O.nomeIntervallo(5)], ["terza maggiore", "terza minore", "quinta giusta", "quarta giusta"], "§3.1");
  assert.deepEqual(O.orbita(4).map((p) => O.NOMI_PC[p]), ["do", "mi", "la♭"], "4 semitoni: tre note (sul quadrante la♭ = sol♯)");
  assert.equal(O.orbita(6).length, 2); assert.equal(O.orbita(2).length, 6); assert.equal(O.orbita(3).length, 4);
});
test("righe di lettura degli intervalli", () => {
  assert.equal(O.fraseIntervallo(7, false), "7 semitoni: **quinta giusta** (do–sol). Il rivolto misura 12 − 7 = 5: **quarta giusta** (sol–do).");
  assert.match(O.fraseIntervallo(6, false), /rivolto di sé stesso, metà esatta dell'ottava/);
  assert.match(O.fraseIntervallo(7, true), /MCD\(7, 12\) = 1, quindi tocca 12 \/ 1 = \*\*12 note\*\*, tutte: è il circolo delle quinte \(do, sol, re, la, mi…\)/);
  assert.match(O.fraseIntervallo(4, true), /3 note\*\* \(do, mi, la♭\): sono le note di \*\*do–mi–sol♯\*\*, la triade aumentata/);
  assert.equal(PN.pcQ(O.triade(0, "aum").q[2]), 8, "sol♯ e la♭: stesso tasto");
  assert.match(O.fraseIntervallo(6, true), /2 note/);
});
test("72 triadi: nomi, classi, lati e rivolti = music21", () => {
  O.FONDAMENTALI.forEach((q, i) => {
    const f = ["C", "D-", "D", "E-", "E", "F", "F#", "G", "A-", "A", "B-", "B"][i];
    assert.equal(PN.pcQ(q), i, "fondamentali in ordine cromatico");
    for (const tipo of O.ORDINE_TIPI) {
      const r = RIF.triadi[f + ":" + tipo], t = O.triade(q, tipo);
      assert.deepEqual(t.nomi, r.nomi, f + " " + tipo); assert.deepEqual(t.pc, r.pc); assert.deepEqual(t.lati, r.lati); assert.equal(t.somma, 12);
      for (let b = 0; b < 3; b++) {
        const v = O.rivoltoTriade(q, tipo, b), rr = r.rivolti[b];
        assert.deepEqual(v.midi, rr.midi, `${f} ${tipo} basso ${b}`); assert.deepEqual(v.nomi, rr.nomi); assert.equal(v.sigla, rr.sigla);
        if (rr.inversione != null) { assert.equal(rr.inversione, b, "music21: rivolto"); assert.equal(rr.fondamentale, t.nomi[0], "music21: fondamentale"); }
        assert.ok(v.midi.every((m) => m >= 60 && m <= 83), "sulla tastiera disegnata");
        assert.ok(O.stessoInsieme(v.midi, t.pc), "stesse tre note in ogni rivolto");
      }
    }
  });
});
test("numeri del quaderno: §1.1, §3.3, §3.6", () => {
  const lati = (tipo) => O.triade(0, tipo).lati.join("-");
  assert.deepEqual(O.ORDINE_TIPI.map(lati), ["4-3-5", "3-4-5", "3-3-6", "4-4-4", "5-2-5", "2-5-5"]);
  assert.deepEqual(O.triade(0, "dim").nomi, ["do", "mi♭", "sol♭"]); assert.deepEqual(O.triade(0, "aum").nomi, ["do", "mi", "sol♯"]);
  assert.deepEqual(O.triade(0, "sus4").nomi, ["do", "fa", "sol"]); assert.deepEqual(O.triade(0, "sus2").nomi, ["do", "re", "sol"]);
  assert.deepEqual([0, 1, 2].map((b) => O.rivoltoTriade(0, "magg", b).nomi.join("-")), ["do4-mi4-sol4", "mi4-sol4-do5", "sol4-do5-mi5"]);
  assert.deepEqual([0, 1, 2].map((b) => O.rivoltoTriade(0, "magg", b).sigla), ["C", "C/E", "C/G"]);
  assert.ok(O.stessoInsieme(O.triade(0, "aum").pc, O.triade(4, "aum").pc) && O.stessoInsieme(O.triade(0, "aum").pc, O.triade(8, "aum").pc), "do, mi, sol♯ aumentati");
  assert.deepEqual(O.gemella(0, "sus4"), { q: -1, tipo: "sus2" }, "do sus4 = fa sus2");
  for (const q of O.FONDAMENTALI) { assert.ok(O.gemella(q, "sus4")); assert.ok(O.gemella(q, "sus2")); }
  assert.ok(Object.values(RIF.sus4_uguale_sus2_sulla_quarta).every(Boolean));
  assert.equal(O.fraseTriade(0, "magg", 1), "**do maggiore**, do–mi–sol: lati 4 + 3 + 5 = 12. Al basso mi: primo rivolto, C/E. Stesse tre note, stesso triangolo.");
  assert.match(O.fraseTriade(0, "sus4", 0), /\*\*Do sus4\*\* e \*\*fa sus2\*\* sono lo stesso triangolo/);
  assert.match(O.fraseTriade(0, "aum", 0), /la triade aumentata costruita su ognuno dei suoi tre tasti \(do, mi, la♭\) ha gli stessi tre tasti/);
  // Statistica: i rivolti in posizione stretta sono le 3 permutazioni cicliche delle 6 possibili
  const perm = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  assert.equal(perm.filter((p) => [0, 1, 2].some((b) => p.join() === O.rivoltoTriade(0, "magg", b).ordine.join())).length, 3);
});
