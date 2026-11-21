# Verifica calcolata della teoria usata nel manuale (music21 + frazioni esatte). Un'esecuzione sola.
from music21 import scale, key, chord, interval, pitch, note, roman, harmony
from fractions import Fraction as Fr
import math, music21
IT={'C':'do','D':'re','E':'mi','F':'fa','G':'sol','A':'la','B':'si'}
def it(p):
    p=pitch.Pitch(p) if not isinstance(p,pitch.Pitch) else p
    return IT[p.step]+p.accidental.modifier.replace('#','♯').replace('-','♭') if p.accidental and p.accidental.alter else IT[p.step]
def names(ps): return ' '.join(it(p) for p in ps)
print("music21", music21.__version__)
print("\n== SCALE MAGGIORI, passi in semitoni, alterazioni, quarta nota")
for t in ['C','G','D','A','E','B','F#','G-','F','B-']:
    sc=scale.MajorScale(t); ps=sc.getPitches(t+'4',t+'5')
    passi=[ps[i+1].midi-ps[i].midi for i in range(7)]
    ks=key.Key(t); alt=[it(p) for p in ks.alteredPitches]
    print(f"{it(t)} maggiore: {names(ps)} | passi {passi} | armatura {ks.sharps:+d}: {' '.join(alt) or 'nessuna'} | 4ª nota {it(ps[3])} | 7ª {it(ps[6])} | relativa minore {it(ks.relative.tonic)} minore")
print("\n== SCALE MINORI")
for t in ['A','E','C','G']:
    nat=scale.MinorScale(t).getPitches(t+'4',t+'5'); arm=scale.HarmonicMinorScale(t).getPitches(t+'4',t+'5')
    print(f"{it(t)} minore naturale: {names(nat)} | passi {[nat[i+1].midi-nat[i].midi for i in range(7)]} | armonica: {names(arm)} | armatura {key.Key(t,'minor').sharps:+d}")
print("\n== TRIADI SUI GRADI (do, re, sol maggiore; mi minore naturale e armonica)")
def tri(k,deg): 
    rn=roman.RomanNumeral(deg,k); return rn
for kn,mode in [('C','major'),('D','major'),('G','major')]:
    k=key.Key(kn,mode); out=[]
    for d in ['I','ii','iii','IV','V','vi','viio']:
        rn=roman.RomanNumeral(d,k); out.append(f"{d}={names(rn.pitches)} ({rn.quality})")
    print(it(kn),'maggiore:',' · '.join(out))
    out=[]
    for d in ['I7','ii7','iii7','IV7','V7','vi7','viiø7']:
        rn=roman.RomanNumeral(d,k); out.append(f"{d}={names(rn.pitches)} [{rn.commonName}]")
    print('   settime:',' · '.join(out))
km=key.Key('e','minor')
print("mi minore naturale:", ' · '.join(f"{d}={names(roman.RomanNumeral(d,km).pitches)} ({roman.RomanNumeral(d,km).quality})" for d in ['i','iio','III','iv','v','VI','VII']))
print("mi minore, V e V7 con sensibile:", names(roman.RomanNumeral('V',km).pitches), '|', names(roman.RomanNumeral('V7',km).pitches))
print("\n== ACCORDI: nome, fondamentale, rivolto")
def ch(label, ps):
    c=chord.Chord(ps); 
    print(f"{label}: {names(c.pitches)} → {c.commonName}; fondamentale {it(c.root())}; basso {it(c.bass())}; rivolto {c.inversion()}; pitchedCommonName {c.pitchedCommonName}")
for lab,ps in [("do-mi-sol",['C4','E4','G4']),("mi-sol-do",['E4','G4','C5']),("sol-do-mi",['G3','C4','E4']),
  ("do-mi♭-sol",['C4','E-4','G4']),("do-mi♭-sol♭",['C4','E-4','G-4']),("do-mi-sol♯",['C4','E4','G#4']),
  ("do-mi-la",['C4','E4','A4']),("do-mi-sol-la",['C4','E4','G4','A4']),("do-fa-la",['C4','F4','A4']),("do-fa-la♭",['C4','F4','A-4']),
  ("do-re-sol sus2",['C4','D4','G4']),("do-fa-sol sus4",['C4','F4','G4']),("do-sol",['C4','G4']),
  ("sol-si-re-fa",['G3','B3','D4','F4']),("do-mi-sol-si♭",['C4','E4','G4','B-4']),("do-mi-sol-si",['C4','E4','G4','B4']),
  ("si-re-fa",['B3','D4','F4']),("si-re-fa-la",['B3','D4','F4','A4']),("si-re♯-fa♯-la",['B3','D#4','F#4','A4']),
  ("do♯-mi-sol",['C#4','E4','G4']),("la-do♯-mi-sol",['A3','C#4','E4','G4']),("mi-sol-si",['E4','G4','B4']),
  ("do-mi-sol♭",['C4','E4','G-4']),("do-mi♭-sol♯",['C4','E-4','G#4']),("do-mi♭-la♭",['C4','E-4','A-4'])]:
    ch(lab,ps)
print("\n== SIGLE → note")
for s in ['C','Cm','Cdim','Caug','Csus2','Csus4','C5','C6','C7','Cmaj7','G7','A7','B7','Em','Am','Dm','F','Fm','C/E','C/G','F/C','A5','D5','E5','Am7']:
    try:
        cs=harmony.ChordSymbol(s); print(f"{s}: {names(cs.pitches)}")
    except Exception as e: print(s,'ERR',e)
print("\n== INTERVALLI")
for a,b in [('C4','G4'),('G4','C5'),('F4','B4'),('B4','F5'),('C4','E4'),('C4','E-4'),('C4','G-4'),('C4','G#4'),('B4','C5'),('B-4','C5'),('G4','C5'),('G4','E5'),('G3','C5'),('G3','E5'),('F4','E4'),('E4','D4'),('D4','C4'),('C4','D4'),('C4','F4'),('C4','A4'),('C4','B4'),('C4','B-4'),('E#4','F4'),('C-5','B4')]:
    iv=interval.Interval(pitch.Pitch(a),pitch.Pitch(b)); print(f"{it(a)}→{it(b)}: {iv.niceName}, {iv.semitones} semitoni")
print("quinte giuste sopra le 12 note:", ' · '.join(f"{it(t)}→{it(pitch.Pitch(t).transpose('P5'))}" for t in ['C','D-','D','E-','E','F','F#','G','A-','A','B-','B']))
print("\n== RISOLUZIONE DEL TRITONO in do: fa-si → mi-do ; si-fa → do-mi")
for (a,b),(c,d) in [(('F4','B4'),('E4','C5')),(('B3','F4'),('C4','E4'))]:
    print(f"{it(a)}-{it(b)} ({interval.Interval(pitch.Pitch(a),pitch.Pitch(b)).niceName}) → {it(c)}-{it(d)} ({interval.Interval(pitch.Pitch(c),pitch.Pitch(d)).niceName}); moti: {pitch.Pitch(c).midi-pitch.Pitch(a).midi:+d}, {pitch.Pitch(d).midi-pitch.Pitch(b).midi:+d}")
print("\n== TONALITÀ MAGGIORI CHE CONTENGONO mi minore (mi-sol-si) e ruolo")
for t in ['C','G','D','A','E','B','F#','D-','A-','E-','B-','F']:
    k=key.Key(t); pcs={p.name for p in k.pitches}
    if {'E','G','B'}<=pcs:
        deg=k.getScaleDegreeFromPitch('E'); print(f"  {it(t)} maggiore: grado {deg}")
print("\n== NOTE IN COMUNE tra triadi di do maggiore")
k=key.Key('C'); T={d:set(p.name for p in roman.RomanNumeral(d,k).pitches) for d in ['I','ii','iii','IV','V','vi','viio']}
for a,b in [('I','iii'),('I','vi'),('ii','IV'),('V','viio'),('iii','V'),('IV','vi'),('I','IV'),('I','V'),('ii','vi')]:
    print(f"  {a}–{b}: {len(T[a]&T[b])} ({' '.join(it(x) for x in sorted(T[a]&T[b]))})")
print("tritono di la7 e di do♯°:", "do♯-sol in entrambi:", {'C#','G'}<= {p.name for p in harmony.ChordSymbol('A7').pitches}, {'C#','G'}<={'C#','E','G'})
print("sol7 contiene si-re-fa:", {'B','D','F'}<={p.name for p in harmony.ChordSymbol('G7').pitches})
print("\n== ACCORDI PRESI IN PRESTITO")
print("fa minore in do minore: grado", key.Key('c').getScaleDegreeFromPitch('F'), "| iv di do minore =", names(roman.RomanNumeral('iv',key.Key('c')).pitches), "| la♭ in do maggiore?", 'A-' in {p.name for p in key.Key('C').pitches})
print("do minore: iv di sol minore =", names(roman.RomanNumeral('iv',key.Key('g')).pitches), "| mi♭ in sol maggiore?", 'E-' in {p.name for p in key.Key('G').pitches}, "| in mi minore nat.?", 'E-' in {p.name for p in key.Key('e').pitches})
print("re♯ in sol maggiore?", 'D#' in {p.name for p in key.Key('G').pitches})
print("\n== DITEGGIATURA: tasti neri delle scale e nota del pollice (4ª) e del passaggio in discesa (3ª)")
for t in ['C','G','D','A','E']:
    ps=scale.MajorScale(t).getPitches(t+'4',t+'5'); print(f"  {it(t)}: 3ª {it(ps[2])}, 4ª {it(ps[3])}, 5ª {it(ps[4])}, 6ª {it(ps[5])}; neri: {' '.join(it(p) for p in ps if p.accidental and p.accidental.alter)or 'nessuno'}")
print("\n== DURATE: secondi per figura")
for bpm in (60,90,120):
    print(f"  {bpm} BPM: semiminima {60/bpm:.3g} s, minima {120/bpm:.3g} s, semibreve {240/bpm:.3g} s")
print("\n== ACUSTICA")
c=lambda r:1200*math.log2(float(r))
print(f"comma pitagorico {Fr(3,2)**12/Fr(2)**7} = {float(Fr(3,2)**12/Fr(2)**7):.5f} = {c(Fr(3,2)**12/Fr(2)**7):.2f} c; comma sintonico 81/80 = {c(Fr(81,80)):.2f} c")
for n,r in [('ottava',Fr(2)),('quinta',Fr(3,2)),('quarta',Fr(4,3)),('terza magg.',Fr(5,4)),('terza min.',Fr(6,5)),('sesta magg.',Fr(5,3)),('sesta min.',Fr(8,5))]:
    et=round(c(r)/100)*100; print(f"  {n} {r}: puro {c(r):.1f} c, equabile {et}, differenza {et-c(r):+.1f}")
def pyth(k):
    r=Fr(3,2)**k
    while r>=2: r/=2
    while r<1: r*=2
    return r
print("  catena pitagorica salendo:", [f"{c(pyth(k)):.1f}" for k in range(0,7)], "scendendo:", [f"{c(pyth(-k)):.1f}" for k in range(0,7)])
print(f"  fa♯ {pyth(6)} {c(pyth(6)):.2f} c; sol♭ {pyth(-6)} {c(pyth(-6)):.2f} c; mi♯ {c(pyth(11)):.2f} c; fa {c(pyth(-1)):.2f} c; differenza mi♯−fa {c(pyth(11))-c(pyth(-1)):.2f}")
print(f"  terza pitagorica 81/64 = {c(Fr(81,64)):.1f} c")
m5=5**0.25; print(f"  mesotonico: quinta {c(m5):.2f} c, lupo {1200*7-11*c(m5):.2f} c, terza larga {1200-2*c(Fr(5,4)):.1f} c; mi♯ mesotonico − fa: {((11*c(m5))%1200)-((-1*c(m5))%1200):.1f} c")
s=2**(1/12); print(f"  semitono equabile {s:.6f}; do4 {440*s**-9:.2f} Hz, mi4 {440*s**-5:.2f}, sol4 {440*s**-2:.2f}; battimenti quinta |3·do−2·sol| = {abs(3*440*s**-9-2*440*s**-2):.2f} Hz; terza |5·do−4·mi| = {abs(5*440*s**-9-4*440*s**-5):.2f} Hz; √2 = {2**0.5:.4f}")
f0=440*s**-33
print("  armonici di do2 (%.1f Hz):"%f0, [ (n, pitch.Pitch(midi=round(69+12*math.log2(n*f0/440))).nameWithOctave, round(100*(69+12*math.log2(n*f0/440)-round(69+12*math.log2(n*f0/440))))) for n in range(1,9)])
phi=(1+5**0.5)/2
print("  Fibonacci:", [(f"{a}/{b}", round(a/b,3), round(c(Fr(a,b)),1)) for a,b in [(2,1),(3,2),(5,3),(8,5),(13,8),(21,13),(34,21)]], "phi", round(phi,4), round(1200*math.log2(phi),1), "1/phi", round(1/phi,3))
print("  quinte che quasi chiudono il cerchio:", [(n, round((n*c(Fr(3,2)))%1200 if (n*c(Fr(3,2)))%1200<600 else (n*c(Fr(3,2)))%1200-1200,1)) for n in (5,7,12,41,53)])
print("  catena di quinte dal fa:", names([pitch.Pitch('F').transpose(interval.Interval(7*i)) if False else pitch.Pitch('F4').transpose('P5'*0) for i in range(0)]) or '', ' '.join(it(p) for p in __import__('functools').reduce(lambda acc,_: acc+[acc[-1].transpose('P5')], range(11), [pitch.Pitch('F')])))
print("  55/88 =", 55/88, " 55/89 =", round(55/89,4))
print("\n== AGGIUNTE (revisione)")
q=5**0.25
note=['E-','B-','F','C','G','D','A','E','B','F#','C#','G#']  # catena mesotonica da mi♭ a sol♯ (11 quinte)
cents={n:(i-3)*c(q)%1200 for i,n in enumerate(note)}
import itertools
terze=[]
for i,n in enumerate(note):
    for m in note:
        d=(cents[m]-cents[n])%1200
        if abs(d-386.31)<0.2 or abs(d-427.37)<0.2: terze.append((n,m,round(d,1)))
print("  mesotonico, terze maggiori: pure", sum(1 for t in terze if abs(t[2]-386.3)<0.2), "· larghe", sum(1 for t in terze if abs(t[2]-427.4)<0.2))
import math as _m
m13=69+12*_m.log2(13*f0/440); print("  armonico 13 del do2:", pitch.Pitch(midi=round(m13)).nameWithOctave, f"{100*(m13-round(m13)):+.1f} c")
print("  scala di do maggiore, coppie di note a 6 semitoni:", [(it(a),it(b)) for a,b in itertools.combinations(scale.MajorScale('C').getPitches('C4','B4'),2) if (b.midi-a.midi)==6])
from music21 import clef
def dn(n):
    q=pitch.Pitch(); q.diatonicNoteNum=n; return it(q)+str(q.octave)
for nome,cl in (("violino",clef.TrebleClef()),("basso",clef.BassClef())):
    b=cl.lowestLine
    print(f"  chiave di {nome}: righi", " ".join(dn(b+2*k) for k in range(5)), "· spazi", " ".join(dn(b+1+2*k) for k in range(4)), "· rigo centrale", dn(b+4))
