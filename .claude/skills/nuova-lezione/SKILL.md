---
name: nuova-lezione
description: Aggiunge a Repaso una lezione del tutor di spagnolo partendo dai suoi PDF, Word o foto. Usala quando Lorenzo carica il materiale di una lezione nuova o chiede di aggiungerla all'app.
---

# Aggiungere una lezione del tutor a Repaso

Obiettivo: il materiale della lezione diventa una sezione nuova di `CURRICULUM` in `index.html`, fedele al tutor,
con esercizi per ogni regola, senza toccare i progressi già salvati.

## Passi

1. **Leggi tutto il materiale** (usa le skill `pdf` e `docx` se servono). Annota: vocaboli ed espressioni, verbi e
   tempi verbali, regole di grammatica, esempi del tutor, esercizi del tutor con le soluzioni.
2. **Scrivi una sezione nuova in fondo a `CURRICULUM`**, nell'ordine delle lezioni:
   `@L L14 | L14 | Titolo spagnolo | sottotitolo italiano` (le schede di grammatica usano `✦` come etichetta).
   Formato delle righe: è spiegato nel commento sopra `CURRICULUM`.
   - Ogni `# unità` raccoglie un argomento.
   - Ogni regola `G titolo | spiegazione` è seguita dai suoi esercizi: almeno 4 tra `?` (scelta),
     `>` (traduzione, con alternative separate da ` / `), `=` (componi), `!` (correggi).
   - Usa le frasi del tutor; se ne aggiungi, solo con vocabolario e tempi già fatti.
3. **Non modificare righe esistenti**: l'id di una carta nasce dal suo testo spagnolo e i progressi di Lorenzo
   sono legati a quell'id. Se una riga vecchia ha un errore, segnalalo a Lorenzo prima di correggerla.
4. **Grammatica**: se la lezione introduce una regola importante, valuta un argomento nuovo in `GRAMMAR`
   (osserva, scopri, regola con tabella e confronto italiano, trappole, capisci) collegato con `rules:['L14|Titolo regola']`.
5. **Conversazione**: se la lezione ha una situazione comunicativa, aggiungi uno scenario a `CONV`.
6. **Controlla**: usa la skill `revisore-spagnolo` sul testo nuovo, poi `node tests/cards.js index.html`
   (nessun problema nuovo) e infine la skill `prova-e-pubblica`.

## Principi didattici da rispettare

- Mai contenuti oltre quello che il tutor ha fatto.
- Spagnolo di Spagna: vosotros, ordenador, coche, móvil, zumo.
- Spiegazioni in italiano, brevi, con il confronto con l'italiano dove aiuta.
