# Versioning (Holistic Armor™)

Format : `MAJOR.MINOR.PATCH`

## Règles
- **MAJOR** : rupture de compatibilité (schemas, champs JSON, comportement)
- **MINOR** : ajout rétrocompatible (nouveaux champs optionnels, nouveaux contenus)
- **PATCH** : corrections (typos, ajustements, bugs de contenu)

## Tags recommandés
- Core-pack : `core-pack@1.1.0`
- Web-app : `web-app@0.1.0`

## Compatibilité
La compatibilité est déclarée dans `packages/core-pack/core-pack.manifest.json` → `compatibility`.
