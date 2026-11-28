// Collaudo del motore «finestra-quinte» contro music21 (finestra-quinte.rif.json) e i numeri del quaderno (§2.6, §2.7, §4.7, §4.8, §5.1).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), F = require("../../pattern/motori/finestra-quinte.js").calcola, RIF = require("./finestra-quinte.rif.json");

test("tredici finestre = scale, armature, tipi e relative di music21", () => {
  for (let t = F.T_MIN; t <= F.T_MAX; t++) {
    const r = RIF[t], righe = F.righe(t), dentro = righe.filter((x) => x.dentro);
    assert.equal(dentro.length, 7, "sette righe nella finestra");
    assert.deepEqual(dentro.map((x) => x.q), PN.intervallo(t - 1, t + 5), "posti consecutivi");
    const perGrado = [...dentro].sort((a, b) => a.g - b.g);
    assert.deepEqual(perGrado.map((x) => x.nome), r.scala, "scala di " + r.tonica);
    assert.deepEqual(perGrado.map((x) => x.tipo), r.tipi, "tipi in " + r.tonica);
    assert.deepEqual(F.armatura(t).note.map(PN.nomeQ), r.armatura, "armatura di " + r.tonica);
    assert.equal(dentro.filter((x) => x.alterata).length, r.armatura.length, "alterazioni = righe oltre le linee");
    assert.equal(PN.nomeQ(F.relativa(t)), r.relativa, "relativa di " + r.tonica);
    assert.deepEqual(r.tritoni, [[4, 7]], "un solo tritono, IV–VII");
    const tri = F.tritono(t);
    assert.deepEqual([PN.gradoDiQ(t, tri.basso), PN.gradoDiQ(t, tri.alto)], [3, 6]);
    assert.equal(tri.quinte, 6); assert.equal(tri.semitoni, 6); assert.equal(PN.mod(6 * 7, 12), 6);
    assert.deepEqual(perGrado.map((x) => x.funzione), RIF.funzioni_2_6);
  }
});
test("posizione = tipo: tre maggiori in basso, tre minori sopra, il diminuito in cima", () => {
  for (let t = F.T_MIN; t <= F.T_MAX; t++) assert.deepEqual(F.righe(t).filter((x) => x.dentro).map((x) => x.tipo), ["magg", "magg", "magg", "min", "min", "min", "dim"]);
});
test("le due regole del §4.7: semitono sopra l'ultimo diesis, penultimo bemolle", () => {
  for (let t = 1; t <= F.T_MAX; t++) {
    assert.equal(F.sopraUltimo(t), 1); assert.equal(RIF[t].sopra_ultimo, 1); assert.equal(RIF[t].ultimo_grado, 7, "l'ultimo diesis è il VII");
    assert.equal(F.ultimaAlterazione(t), t + 5, "il diesis nuovo è il posto che entra in alto");
  }
  for (let t = F.T_MIN; t <= -2; t++) { assert.equal(F.penultimo(t), t); assert.equal(PN.nomeQ(F.penultimo(t)), RIF[t].penultimo); }
  assert.equal(PN.gradoDiQ(-1, F.ultimaAlterazione(-1)), 3, "fa maggiore: il si♭ è il IV grado");
});
test("scorrere = traslare: un passo in su toglie il IV e aggiunge il nuovo VII", () => {
  for (let t = F.T_MIN; t < F.T_MAX; t++) {
    const a = new Set(PN.finestraQ(t)), b = new Set(PN.finestraQ(t + 1));
    assert.deepEqual([...a].filter((q) => !b.has(q)), [t - 1]); assert.deepEqual([...b].filter((q) => !a.has(q)), [t + 6]);
    assert.equal(PN.gradoDiQ(t + 1, t + 6), 6);
  }
});
test("enarmonia (§4.8): fa♯ e sol♭ maggiore usano gli stessi tasti", () => {
  assert.equal(F.enarmonica(6), -6); assert.equal(F.enarmonica(-6), 6); assert.equal(F.enarmonica(3), null);
  assert.ok(F.stessiTasti(6, -6)); assert.deepEqual(RIF["6"].pc, RIF["-6"].pc);
  assert.deepEqual(F.tasti(6).map((k) => k.nome), ["fa♯", "sol♯", "la♯", "si", "do♯", "re♯", "mi♯"], "§4.8");
});
test("numeri del quaderno e righe di lettura", () => {
  assert.deepEqual(F.armatura(2).note.map(PN.nomeQ), ["fa♯", "do♯"], "§2.5: re maggiore");
  assert.deepEqual([1, 2, 3, 4].map((t) => PN.nomeQ(F.ultimaAlterazione(t))), ["fa♯", "do♯", "sol♯", "re♯"], "§5.1");
  assert.equal(F.mostra(3), "la maggiore · 3 ♯");
  assert.equal(F.frase(3, false), "**la maggiore**: 3 diesis (fa♯, do♯, sol♯). L'ultimo, sol♯, è il VII grado: la tonica sta un semitono sopra.");
  assert.equal(F.frase(-3, false), "**mi♭ maggiore**: 3 bemolle (si♭, mi♭, la♭). La tonica, mi♭, è il penultimo bemolle.");
  assert.equal(F.frase(-1, false), "**fa maggiore**: un bemolle, il si♭ (è il IV grado).");
  assert.match(F.frase(3, true), /Relativa minore: \*\*fa♯ minore\*\*/);
  assert.match(F.frase(4, false), /mi maggiore/); assert.match(F.frase(6, false), /sol♭ maggiore\*\*: stessi sette tasti/);
  for (let t = F.T_MIN; t <= F.T_MAX; t++) { const k = F.tasti(t); assert.ok(k.every((x) => x.midi >= 60 && x.midi <= 83)); assert.deepEqual(k.map((x) => PN.mod(x.midi, 12)).sort((a, b) => a - b), RIF[t].pc); }
});
