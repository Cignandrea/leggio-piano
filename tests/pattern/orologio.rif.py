"""Valori di riferimento per pattern/motori/orologio.js, ricavati con music21 (intervalli, trasposizioni, accordi) e per forza bruta.
Uso: python3 tests/pattern/orologio.rif.py  → riscrive tests/pattern/orologio.rif.json"""
import json, pathlib
from music21 import interval, pitch, chord

IT = {"C": "do", "D": "re", "E": "mi", "F": "fa", "G": "sol", "A": "la", "B": "si"}
def it(nome): return IT[nome[0]] + nome[1:].replace("#", "♯").replace("-", "♭")
def ito(p): return it(p.name) + str(p.octave)
NOMI = {"Minor Second": "seconda minore", "Major Second": "seconda maggiore", "Minor Third": "terza minore", "Major Third": "terza maggiore",
        "Perfect Fourth": "quarta giusta", "Augmented Fourth": "tritono", "Diminished Fifth": "tritono", "Perfect Fifth": "quinta giusta",
        "Minor Sixth": "sesta minore", "Major Sixth": "sesta maggiore", "Minor Seventh": "settima minore", "Major Seventh": "settima maggiore"}

intervalli = {}
for n in range(1, 12):
    i = interval.Interval(n)
    # Orbita per forza bruta: si traspone il do di n semitoni finché la classe torna 0.
    p, orb = pitch.Pitch("C4"), [0]
    while True:
        p = p.transpose(n)
        if p.pitchClass == 0: break
        orb.append(p.pitchClass)
    intervalli[str(n)] = {"nome": NOMI[i.niceName], "rivolto": i.complement.semitones, "nome_rivolto": NOMI[i.complement.niceName], "orbita": orb}

# Le dodici fondamentali del cursore (ordine cromatico) e i sei tipi, costruiti con gli intervalli di music21
FOND = ["C", "D-", "D", "E-", "E", "F", "F#", "G", "A-", "A", "B-", "B"]
TIPI = {"magg": ("M3", "P5"), "min": ("m3", "P5"), "dim": ("m3", "d5"), "aum": ("M3", "A5"), "sus4": ("P4", "P5"), "sus2": ("M2", "P5")}
QUAL = {"major": "magg", "minor": "minor", "diminished": "dim", "augmented": "aum"}
SUFF = {"magg": "", "min": "m", "dim": "°", "aum": "+", "sus4": "sus4", "sus2": "sus2"}
def sig(name): return name.replace("#", "♯").replace("-", "♭")
triadi = {}
for f in FOND:
    for tipo, (a, b) in TIPI.items():
        r = pitch.Pitch(f + "4"); note = [r, r.transpose(a), r.transpose(b)]
        pcs = [p.pitchClass for p in note]
        # lati: per forza bruta, la distanza oraria tra ogni nota e la successiva nel giro r → 2ª → 3ª → r
        lati = [next(k for k in range(1, 13) if (pcs[i] + k) % 12 == pcs[(i + 1) % 3]) for i in range(3)]
        riv = []
        for basso in range(3):
            ordine = [(basso + i) % 3 for i in range(3)]
            # la nota al basso nell'ottava che va dal do4 al si4 (MIDI 60–71), le altre subito sopra
            pb = next(pitch.Pitch(note[basso].name + str(o)) for o in range(2, 7) if 60 <= pitch.Pitch(note[basso].name + str(o)).ps <= 71)
            ps = [pb]
            for i in ordine[1:]:
                q = next(pitch.Pitch(note[i].name + str(o)) for o in range(2, 8) if pitch.Pitch(note[i].name + str(o)).ps > ps[-1].ps)
                ps.append(q)
            c = chord.Chord(ps)
            d = {"midi": [int(p.ps) for p in ps], "nomi": [ito(p) for p in ps], "sigla": sig(note[0].name) + SUFF[tipo] + ("/" + sig(note[basso].name) if basso else "")}
            if tipo in ("magg", "min", "dim", "aum"):
                d["inversione"] = c.inversion(); d["fondamentale"] = it(c.root().name); d["qualita"] = c.quality
            riv.append(d)
        triadi[f"{f}:{tipo}"] = {"nomi": [it(p.name) for p in note], "pc": pcs, "lati": lati, "rivolti": riv}

# Il §3.6: do sus4 (do-fa-sol) e fa sus2 (fa-sol-do) hanno le stesse classi di altezza
gemelle = {f: sorted({p.pitchClass for p in (pitch.Pitch(f + "4"), pitch.Pitch(f + "4").transpose("P4"), pitch.Pitch(f + "4").transpose("P5"))}) ==
              sorted({p.pitchClass for p in (pitch.Pitch(f + "4").transpose("P4"), pitch.Pitch(f + "4").transpose("P4").transpose("M2"), pitch.Pitch(f + "4").transpose("P4").transpose("P5"))})
           for f in FOND}
out = {"intervalli": intervalli, "triadi": triadi, "sus4_uguale_sus2_sulla_quarta": gemelle}
pathlib.Path(__file__).with_name("orologio.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto orologio.rif.json:", len(intervalli), "intervalli,", len(triadi), "triadi")
