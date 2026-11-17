# Repaso: guida per Claude

App di ripasso dello spagnolo di Lorenzo, costruita sulle lezioni del suo tutor privato.
Tutta l'app è un solo file, `index.html`, pubblicato come Artifact su claude.ai:
https://claude.ai/artifact/2REiEAHCm9EVGu1Bn2Umca

Lorenzo scrive in italiano: rispondi in italiano, in modo semplice, spiegando il perché delle scelte.

## Come è fatto `index.html`

- **CSS** in testa: token di colore su `:root` con varianti scure, poi blocchi per sezione
  (`v3`, `v4: parla`, `v5`, `v6: the exercise screen`).
- **`CURRICULUM`**: il materiale del tutor in un formato a righe (spiegato nel commento sopra la costante).
  `parseCurriculum` lo trasforma in lezioni, unità, regole (`RULES`) e carte (`BUILT.items`).
- **`GRAMMAR`**: 21 argomenti (l'ultimo, «Gli accenti», insegna le regole dell'accento scritto) di teoria guidata (osserva, scopri, regola, capisci, pratica), collegati alle regole del tutor.
- **Motore delle sessioni**: `buildQueue` (scelta delle carte), `makeEx` (scelta dell'esercizio secondo `stage`),
  `check` / `grade` (correzione), `evGrade` (voto dedotto da come si risponde), `grade_` + `schedule` (FSRS-5),
  `afterAnswer` (ripetizioni nella sessione e secondo richiamo delle carte nuove).
- **`Store`**: salvataggio. Nell'account (capability `db`) in `data/users/<id>/repaso/{prog,lessons,items,meta}/<doc>`,
  più una copia sul dispositivo (`localStorage`, chiave `repaso:v3`). All'avvio le due copie vengono unite.
- **Claude** (capability `sample`): importazione delle lezioni, correzione delle traduzioni, «Perché?», conversazioni.

## Regole da non rompere

1. **Gli id delle carte non devono cambiare.** I progressi sono salvati per id (`L3:w:la-farmacia`), che nasce
   dal testo spagnolo della riga del curriculum. Correggere il testo di una riga esistente cambia l'id e fa
   perdere i progressi di quella carta: in quel caso aggiungi una riga nuova o chiedi prima.
2. **Il percorso dell'archivio non cambia**: `data/users/<id>/repaso/...`. Un percorso con un numero pari di
   segmenti per una raccolta fa ripiegare l'app sul dispositivo, e su iPhone i dati si perdono alla chiusura.
3. **Nessuna scrittura nell'account prima di averlo letto** (`Store.init` blocca la coda finché non ha finito).
4. **Spagnolo di Spagna** (vosotros, ordenador, coche, zumo), accenti e ¿¡ sempre corretti. Niente contenuti oltre
   quello che il tutor ha fatto.
5. **Ogni carta deve accettare la propria risposta giusta.** I test `cards.js` lo controllano su tutte le carte.

## Provare e pubblicare

```bash
tests/run.sh            # tutti i controlli, circa 10 minuti
node tests/cards.js index.html          # solo contenuti
node tests/simulate.js index.html 120 1 # apprendente simulato per 120 giorni
```

I test usano Playwright con Chromium (già installati nelle sessioni cloud di Claude Code), simulano Claude, il
microfono e l'archivio dell'account. Valori di riferimento della simulazione: 0 errori, ricordo al ritorno
circa 90% (l'obiettivo), circa 6 minuti al giorno.

Per pubblicare: pubblica `index.html` sull'Artifact qui sopra (stesso link, i progressi restano), poi fai commit
e push su `main` di questo repository.

## Aggiungere una lezione del tutor

Lorenzo carica qui i PDF o i documenti Word della lezione. Trascrivi il materiale nel formato di `CURRICULUM`
(una sezione `@L` nuova in fondo, nell'ordine del tutor), con le regole `G` seguite dai loro esercizi.
Poi lancia `tests/cards.js` e verifica che non compaiano problemi nuovi.

## Skill del progetto

In `.claude/skills/`: `nuova-lezione` (dal materiale del tutor al curriculum), `revisore-spagnolo`
(controllo della lingua prima di inserire contenuti), `prova-e-pubblica` (test, Artifact, GitHub).
