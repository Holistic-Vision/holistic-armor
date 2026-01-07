# Holistic Armor™

Holistic Armor est un produit de coaching autonome (bien-être / éducation) basé sur :
- un **core-pack** (contenus, règles, schémas de suivi, RGPD/garde-fous) versionné,
- une ou plusieurs applications (web / mobile) qui **consomment** ce core-pack.

## Avertissement santé (résumé)
Holistic Armor **ne fournit pas** de diagnostic, de traitement, ni de recommandation médicale personnalisée.
En cas de symptômes inquiétants ou urgence : **112 / 15 (France)**.

## Structure du repo
- `packages/core-pack/` : **source de vérité** (JSON + médias + RGPD + notifications + tracking)
- `packages/web-app/` : application web (à créer / compléter)
- `apps/demo-pages/` : démo GitHub Pages read-only (optionnel)

## Démarrage rapide (core-pack)
1. Placer les fichiers issus de tes ZIP dans `packages/core-pack/` (voir `MOVE_MAP.md`).
2. Vérifier la présence des JSON listés dans `packages/core-pack/core-pack.manifest.json`.
3. Commit + tag (ex : `core-pack@1.1.0`).

## Publication
- Vitrine/Démo : GitHub Pages (read-only)
- Produit SaaS : déploiement web + auth + paiement + stockage + IA

## Licence
À définir (recommandé : licence commerciale/propriétaire si vente au particulier).
