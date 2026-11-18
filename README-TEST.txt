WALLET-PRO 2.3.5 — VERSIONE DI TEST SEPARATA

1. Crea un NUOVO repository pubblico GitHub, ad esempio Wallet-PRO-Test.
2. Carica NELLA RADICE tutti i file e la cartella vendor di questo pacchetto (non caricare la cartella contenitore).
3. Vai in Settings > Pages > Build and deployment > Deploy from a branch; branch main, folder /(root).
4. Attendi la pubblicazione e apri https://TUO-UTENTE.github.io/Wallet-PRO-Test/
5. NON usare il backup reale per le prime prove: usa dati fittizi.
6. Apri online, aspetta l'installazione del Service Worker, poi attiva modalita aereo e prova una busta paga PDF testuale e una scansionata.
7. Controlla importi, duplicati, riapertura offline e aggiornamenti.

IMPORTANTE:
- Questa versione TEST disabilita intenzionalmente OneSignal: non testa le notifiche push.
- I dati del repository TEST hanno storage separato dal repository principale se il percorso e diverso, ma i dati sullo stesso dominio possono condividere origin/localStorage. Per isolamento REALE usa un altro dominio/origine (ad esempio un account GitHub Pages diverso o sottodominio distinto) o un profilo browser separato. Non ripristinare backup reali durante i test.
- pdf.js e worker sono la coppia 6.5.438; isEvalSupported:false resta attivo.
- Le librerie Excel e OCR restano locali e sono incluse.
- Il Service Worker installa solo quando HTML, PDF, Excel e OCR (incluse le lingue) sono tutti disponibili. Icone e manifest sono opzionali: verificare comunque in modalita aereo.
- Le notifiche push OneSignal sono disabilitate solo in questa build TEST.
- Non e stata eseguita una prova reale su Safari iPhone o Android.
