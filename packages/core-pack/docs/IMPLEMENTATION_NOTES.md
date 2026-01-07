# Notes d’implémentation — Journal, courbes, notifications, RGPD (V1+)

## Journal & suivi
- DailyCheckin : saisie 60 secondes. Optionnel : libido/mood/hydratation.
- MeasurementsEntry : 1 à 2 fois/semaine. Photos standardisées (front/side/back).
- AdherenceEvent : généré automatiquement quand une session est lancée/terminée, et quand un log est saisi.
- ChartSeries : calcul serveur ou local (moyennes glissantes + tendances).

## Médias (photos/vidéos/sons)
- Stockage local chiffré (si possible) + synchronisation cloud optionnelle.
- Toujours associer un `thumbUri` pour UI rapide.
- Export DSAR : fournir un manifest listant les médias + copies des fichiers.

## Notifications
- Appliquer quiet hours.
- Anti-spam: appliquer maxPerDay et regrouper (batch) si nécessaire.
- Night shift preset : messages adaptés (avant service, pause, retour, pré-sommeil).
- Règles adaptatives: si sommeil bas/stress haut -> pousser respiration/sommeil plutôt que séances intenses.

## RGPD
- Consentement versionné + log.
- Export/suppression en 1 clic.
- Minimisation: ne pas demander d’antécédents médicaux détaillés.
- Garde-fous chat IA : refuser posologie/diagnostic et rediriger urgences.

