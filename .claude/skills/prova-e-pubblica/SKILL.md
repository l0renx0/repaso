---
name: prova-e-pubblica
description: Esegue tutti i test di Repaso e, se passano, pubblica index.html sull'Artifact e fa push su GitHub. Usala dopo ogni modifica all'app.
---

# Provare e pubblicare Repaso

1. **Test**: `tests/run.sh index.html`. Tutti i controlli devono essere puliti:
   - `cards`: nessuna riga sotto «problemi» tranne le liste informative («stesso italiano…», «stessa parola…»)
     e il caso noto «a frecuentemente»;
   - `flows`: nessun FAIL; nessun errore della pagina in nessun test;
   - `save` e `slow-load`: i progressi tornano tutti dopo la riapertura;
   - `simulate`: 0 errori, ricordo al ritorno tra 0,88 e 0,93, circa 6 minuti al giorno.
   Se qualcosa fallisce, correggi e rilancia: non pubblicare con test rossi.
2. **Guarda le schermate cambiate** a 390px (iPhone) e 1280px (Mac), in tema chiaro e scuro.
3. **Pubblica** `index.html` sull'Artifact https://claude.ai/artifact/2REiEAHCm9EVGu1Bn2Umca (stesso link:
   i progressi di Lorenzo restano). Non cambiare le capability dichiarate (`sample`, `db`, `user`).
4. **GitHub**: commit su `main` con un messaggio in italiano che spiega cosa cambia per Lorenzo, poi push.
5. **Riferisci a Lorenzo** in italiano semplice: cosa è cambiato, come l'hai verificato, cosa non hai potuto
   verificare (microfono, vibrazione, iPhone reale).
