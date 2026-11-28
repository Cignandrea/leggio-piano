// Collaudo del motore «rigo-asse» contro music21 (rigo-asse.rif.json) e i numeri del quaderno (§2.3, §4.7, §5.1).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), R = require("../../pattern/motori/rigo-asse.js").calcola, RIF = require("./rigo-asse.rif.json");

test("le due chiavi sono rette di pendenza 1: intercette e note = music21", () => {
  assert.deepEqual(R.INTERCETTA, { violino: RIF.chiavi.violino.intercetta, basso: RIF.chiavi.basso.intercetta });
  assert.deepEqual(R.INTERCETTA, { violino: 2, basso: -10 });
  for (const ch of ["violino", "basso"]) for (let p = R.P_MIN; p <= R.P_MAX; p++) {
    assert.equal(R.nomeGrado(R.nota(p, ch)), RIF.chiavi[ch].note[p], `${ch}, posizione ${p}`);
    assert.equal(R.nota(p + 1, ch) - R.nota(p, ch), 1, "pendenza 1");
  }
  assert.equal(R.nota(RIF.do_centrale.violino, "violino"), 0); assert.equal(R.nota(RIF.do_centrale.basso, "basso"), 0);
});
test("§2.3: righi e spazi delle due chiavi, il rigo centrale", () => {
  const righi = (ch) => [0, 2, 4, 6, 8].map((p) => R.lettera(R.nota(p, ch))).join(" "), spazi = (ch) => [1, 3, 5, 7].map((p) => R.lettera(R.nota(p, ch))).join(" ");
  assert.equal(righi("violino"), "mi sol si re fa"); assert.equal(spazi("violino"), "fa la do mi");
  assert.equal(righi("basso"), "sol si re fa la"); assert.equal(spazi("basso"), "la do mi sol");
  assert.equal(R.nomeGrado(R.nota(2, "violino")), "sol4"); assert.equal(R.nomeGrado(R.nota(6, "basso")), "fa3");
  assert.equal(R.lettera(R.nota(4, "violino")), "si"); assert.equal(R.lettera(R.nota(4, "basso")), "re");
  assert.deepEqual(R.scarto(), { gradi: -12, nomi: 2 }); assert.equal(PN.mod(-12, 7), 2);
  for (let p = R.P_MIN; p <= R.P_MAX; p++) assert.equal(PN.mod(R.nota(p, "basso") - R.nota(p, "violino"), 7), 2, "di nome, due note più su");
  assert.equal(R.frase(4), "Terzo rigo: **si4** in chiave di violino, **re3** in chiave di basso. Stessa posizione sul rigo: in chiave di basso la nota suona 12 note più in basso, ma di nome è due note più su (si → re: −12 ≡ +2 mod 7).");
  assert.match(R.frase(-2), /do centrale/); assert.match(R.frase(10), /do centrale/);
});
test("i diesis in armatura: posti = regola di incisione, music21 e §5.1", () => {
  const d = R.diesis(7);
  assert.deepEqual(d.map((x) => x.nome), RIF.diesis.map((x) => x.nome), "ordine dei diesis (§4.7)");
  assert.deepEqual(d.map((x) => x.p), RIF.diesis.map((x) => x.p), "posti sul rigo");
  assert.ok(RIF.diesis.every((x) => x.n_posti === 1), "un solo posto possibile per nome");
  assert.deepEqual(d.slice(0, 4).map((x) => x.p), RIF.par_5_1, "§5.1");
  assert.ok(d.every((x) => x.scritta.replace(/\d$/, "") === x.nome.replace("♯", "")), "la nota scritta in quel posto ha il nome del diesis");
  assert.deepEqual(R.passi(), [-3, 4, -3, -3, 4, -3]);
  assert.ok(R.passi().every((s) => PN.mod(s, 7) === 4), "+4 ≡ −3 (mod 7): sempre una quinta sopra, di nome");
  assert.ok(d.slice(1).every((x, i) => x.q - d[i].q === 1), "ogni diesis è una quinta sopra il precedente");
});
test("righe di lettura dei diesis", () => {
  assert.equal(R.fraseDiesis(0), "Nessun diesis: **do maggiore**.");
  assert.equal(R.fraseDiesis(3), "3 diesis: fa♯, do♯, sol♯. L'ultimo è sol♯, scritto nello spazio sopra il quinto rigo: un semitono sotto la tonica, **la maggiore**.");
  assert.match(R.fraseDiesis(4), /re♯, scritto sul quarto rigo: un semitono sotto la tonica, \*\*mi maggiore/); assert.match(R.fraseDiesis(2), /do♯, scritto nel terzo spazio/); assert.match(R.fraseDiesis(5), /non sono ancora nel quaderno/);
  assert.match(R.fraseDiesis(1), /Un diesis, il fa♯, scritto sul quinto rigo: un semitono sotto la tonica, \*\*sol maggiore\*\*/);
});
