# Lezione 5 (21/11/2026): verifica calcolata della teoria del capitolo. Un'esecuzione sola.
from music21 import scale, key, roman, pitch, clef, interval
import music21
IT={'C':'do','D':'re','E':'mi','F':'fa','G':'sol','A':'la','B':'si'}
def it(p):
    p=pitch.Pitch(p) if not isinstance(p,pitch.Pitch) else p
    return IT[p.step]+(p.accidental.modifier.replace('#','♯').replace('-','♭') if p.accidental and p.accidental.alter else '')
print("music21", music21.__version__)
print("\n== Armature e posto dei diesis sul rigo in chiave di violino (ordine fa do sol re; ottave fa5 do5 sol5 re5)")
tc=clef.TrebleClef(); base=tc.lowestLine
def posto(nome):
    n=pitch.Pitch(nome).diatonicNoteNum-base   # 0 = primo rigo, 1 = primo spazio, ...
    return (f"{n//2+1}º rigo" if n%2==0 and n<=8 else f"{n//2+1}º spazio" if n<8 else "spazio sopra il 5º rigo" if n==9 else f"posizione {n}")
for nome in ["F#5","C#5","G#5","D#5"]: print("  ",it(nome), "→", posto(nome))
for t in ['C','G','D','A','E']:
    k=key.Key(t); print(f"  {it(t)} maggiore: {k.sharps} diesis: {' '.join(it(p) for p in k.alteredPitches) or 'nessuno'}; tonica un semitono sopra l'ultimo diesis: {it(k.alteredPitches[-1].transpose('m2')) if k.sharps else '-'}")
print("\n== Scale di la e di mi maggiore: note, tasti neri, dita")
RH=[1,2,3,1,2,3,4,5]; LH=[5,4,3,2,1,3,2,1]
for t in ['C','G','D','A','E']:
    ps=scale.MajorScale(t).getPitches(t+'4',t+'5'); neri=lambda p: bool(p.accidental and p.accidental.alter)
    print(f"  {it(t)}: "+" ".join(it(p) for p in ps))
    print("     destra :", " ".join(f"{it(p)}{'•' if neri(p) else ''}={d}" for p,d in zip(ps,RH)), "| dito prima del pollice (3ª nota):", it(ps[2]), "nero" if neri(ps[2]) else "bianco", "| su due ottave il 4 è su", it(ps[6]), "nero" if neri(ps[6]) else "bianco")
    print("     sinistra:", " ".join(f"{it(p)}{'•' if neri(p) else ''}={d}" for p,d in zip(ps,LH)), "| il medio scavalca su (6ª nota):", it(ps[5]), "nero" if neri(ps[5]) else "bianco")
print("  quinta di la:", it(pitch.Pitch('A').transpose('P5')), "| mi maggiore ha in più:", it([p for p in key.Key('E').alteredPitches if p.name not in [q.name for q in key.Key('A').alteredPitches]][0]))
print("\n== Giro pop I–V–VI–IV e giro armonico I–VI–II–V nelle cinque tonalità")
def sig(rn):
    r=rn.root().name.replace('-','b'); return r+('m' if rn.quality=='minor' else '')
for nome,gradi in (("giro pop",['I','V','vi','IV']),("giro armonico",['I','vi','ii','V'])):
    for t in ['C','G','D','A','E']:
        k=key.Key(t); print(f"  {nome} in {t}: "+" ".join(sig(roman.RomanNumeral(g,k)) for g in gradi))
print("\n== Tipi sui gradi in ogni tonalità: II e VI minori, I IV V maggiori")
for t in ['C','G','D','A','E']:
    k=key.Key(t); print("  ",t,{g:roman.RomanNumeral(g,k).quality for g in ['I','ii','IV','V','vi']})
print("\n== Schema della tabella: il V di una tonalità è il I della successiva; il IV di una è il I della precedente")
T=['C','G','D','A','E']
for a,b in zip(T,T[1:]):
    print(f"   V di {a} = {roman.RomanNumeral('V',key.Key(a)).root().name}; I di {b} = {b}; IV di {b} = {roman.RomanNumeral('IV',key.Key(b)).root().name}; II di {b} = {sig(roman.RomanNumeral('ii',key.Key(b)))} = VI di {a} = {sig(roman.RomanNumeral('vi',key.Key(a)))}")
print("\n== V–I: la dominante riporta alla tonica (sensibile un semitono sotto la tonica)")
for t in T:
    k=key.Key(t); v=roman.RomanNumeral('V',k); print("  ",t,": V =",sig(v),"contiene la sensibile", it(v.third), "→", it(k.tonic))
print("\n== La maggiore: accordi sui gradi (per il brano in la)")
k=key.Key('A'); print("  ", " ".join(sig(roman.RomanNumeral(g,k)) for g in ['I','ii','iii','IV','V','vi'])+" G#dim")
print("\n== Scorciatoia della tabella: il VI sta un tono sopra il V, il IV un tono sotto (scala maggiore)")
for t in ['C','G','D','A','E']:
    k=key.Key(t); v=k.pitchFromDegree(5); print("  ",t,": V =",it(v),"| VI =",it(k.pitchFromDegree(6)),interval.Interval(v,k.pitchFromDegree(6)).name,"sopra | IV =",it(k.pitchFromDegree(4)),interval.Interval(k.pitchFromDegree(4),v).name,"sotto")
print("\n== Fine della scala: all'ottava il mignolo (5) se si chiude; se prosegue passa il pollice (1) sulla tonica")
print("   destra, due ottave: 1 2 3 1 2 3 4 | 1 2 3 1 2 3 4 5 (stessa diteggiatura per do, sol, re, la, mi: fonte A1)")
