// Prove del motore «comma» contro il riferimento a frazioni esatte e i numeri del quaderno (§4.8, §4.10, §4.11).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), C = require("../../pattern/motori/comma.js").calcola, RIF = require("./comma.rif.json");
const vicino = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} contro ${b}`);

test("costanti = rapporti esatti", () => {
  vicino(C.quintaPura(), RIF.quinta_pura, "quinta pura"); vicino(C.commaPitagorico(), RIF.comma_pitagorico, "comma pitagorico");
  vicino(C.commaSintonico(), RIF.comma_sintonico, "comma sintonico"); vicino(C.terzaPura(), RIF.terza_pura, "terza pura");
});
test("tre accordature: quinte, scarti, terze, catena = riferimento", () => {
  for (const nome of C.ACCORDATURE) {
    const r = RIF.accordature[nome];
    C.accordatura(nome).forEach((q, k) => { vicino(q, r.quinte[k], `${nome}, quinta ${k}`); vicino(C.scarto(nome, k), r.scarti[k], `${nome}, scarto ${k}`); });
    vicino(C.totale(nome), 8400, nome + ": dodici quinte = sette ottave"); vicino(r.totale, 8400, "riferimento " + nome, 1e-6);
    vicino(C.somma(nome), r.somma_scarti, nome + ": somma degli scarti"); vicino(C.somma(nome), -C.commaPitagorico(), nome + ": la somma è il comma");
    vicino(C.terzaMaggiore(nome), r.terza, nome + ": terza maggiore");
    C.terze(nome).forEach((t, k) => vicino(t, r.terze[k], `${nome}, terza ${k}`, 1e-8));
    for (let k = -1; k <= 12; k++) vicino(C.deriva(nome, k), r.catena[k], `${nome}, catena ${k}`, 1e-8);
  }
});
test("numeri della spec (tre decimali)", () => {
  const t = (x) => PN.num(x, 3);
  assert.equal(t(C.quintaPura()), "701,955"); assert.equal(t(C.commaPitagorico()), "23,460"); assert.equal(t(C.commaSintonico()), "21,506");
  assert.equal(t(C.quinta("mesotonica")), "696,578"); assert.equal(t(C.accordatura("mesotonica")[C.LUPO]), "737,637");
  assert.equal(t(C.accordatura("pitagorica")[C.LUPO]), "678,495"); assert.equal(t(C.terzaPura()), "386,314"); assert.equal(t(C.terzaMaggiore("pitagorica")), "407,820");
  assert.equal(PN.num(C.quinta("mesotonica") - 700, 2), "−3,42"); assert.equal(PN.num(C.scarto("mesotonica", 0), 2), "−5,38"); assert.equal(PN.num(C.scarto("mesotonica", C.LUPO), 2), "35,68");
  assert.equal(C.nomeQuinta(C.LUPO), "sol♯–mi♭"); assert.equal(C.nomeQuinta(0), "do–sol"); assert.equal(C.nomeQuinta(11), "fa–do");
});
test("numeri del quaderno: §4.8 e §4.10", () => {
  const u = (x) => PN.num(x, 1);
  // §4.8: «circa 23 centesimi»; «circa due centesimi» per quinta nell'equabile
  assert.equal(PN.num(C.commaPitagorico(), 0), "23"); assert.equal(PN.num(C.quintaPura() - C.quinta("equabile"), 0), "2");
  // A.3
  assert.equal(PN.num(RIF.dodici_quinte, 2), "129,75"); assert.equal(PN.num(RIF.comma_rapporto, 4), "1,0136"); assert.equal(u(C.commaPitagorico()), "23,5");
  const A3 = { 1: "702,0", 2: "203,9", 3: "905,9", 4: "407,8", 5: "1109,8", 6: "611,7", "-1": "498,0", "-2": "996,1", "-3": "294,1", "-4": "792,2", "-5": "90,2", "-6": "588,3" };
  for (const [k, v] of Object.entries(A3)) { assert.equal(u(RIF.tabella_A3[k]), v, "tabella A.3, " + k); assert.equal(u(PN.mod(Number(k) * C.quintaPura(), 1200)), v, "motore, " + k); }
  assert.equal(u(C.miDiesisFa("pitagorica")), "23,5", "mi♯ sopra il fa");
  // A.4
  assert.equal(u(C.commaSintonico()), "21,5"); assert.equal(u(C.terzaMaggiore("pitagorica")), "407,8"); assert.equal(u(C.terzaPura()), "386,3");
  assert.equal(u(C.terzaMaggiore("pitagorica") - C.terzaPura()), "21,5");
  assert.equal(u(C.quinta("mesotonica")), "696,6"); assert.equal(u(C.accordatura("mesotonica")[C.LUPO]), "737,6");
  assert.equal(PN.num(C.scarto("mesotonica", C.LUPO), 0), "36", "lupo: 36 più del puro");
  const t3 = C.terze("mesotonica"), pure = t3.filter((x) => Math.abs(x - C.terzaPura()) < 1e-6), altre = t3.filter((x) => Math.abs(x - C.terzaPura()) >= 1e-6);
  assert.equal(pure.length, 8, "otto terze pure su dodici"); assert.equal(altre.length, 4);
  altre.forEach((x) => { assert.equal(u(x), "427,4"); assert.equal(PN.num(x - C.terzaPura(), 0), "41"); });
  // A.5: equabile
  assert.equal(PN.num(C.terzaMaggiore("equabile") - C.terzaPura(), 1), "13,7"); assert.equal(PN.num(C.terzaMaggiore("equabile") - C.terzaPura(), 2), "13,69");   // prova alla tastiera assert.equal(PN.num(C.quintaPura() - 700, 1), "2,0");
  assert.equal(PN.num(-C.miDiesisFa("mesotonica"), 0), "41", "mesotonico: mi♯ 41 sotto il fa"); vicino(C.miDiesisFa("equabile"), 0, "equabile: mi♯ = fa");
  // A.2: tabella degli intervalli puri
  const A2 = { "3/2": "702,0", "4/3": "498,0", "5/4": "386,3", "6/5": "315,6", "5/3": "884,4", "8/5": "813,7" };
  for (const [r, v] of Object.entries(A2)) assert.equal(u(RIF.intervalli_A2[r]), v, r);
});
test("numeri del quaderno: §4.11 B.3 (catene di 5, 41 e 53 quinte)", () => {
  assert.equal(PN.num(RIF.quinte_41, 1), "−19,8"); assert.equal(PN.num(41 * C.quintaPura() - 24 * 1200, 1), "−19,8");
  assert.equal(PN.num(RIF.quinte_53, 1), "3,6"); assert.equal(PN.num(53 * C.quintaPura() - 31 * 1200, 1), "3,6");
  assert.equal(PN.num(Math.abs(RIF.quinte_5), 0), "90");
});
