# MOVE_MAP — Fusion des 3 ZIP vers `packages/core-pack/`

## Source
- ZIP 1 : `holistic_armor_v1_pack.zip`
- ZIP 2 : `holistic_armor_v1plus_pack.zip`
- ZIP 3 : `holistic_armor_v1plus_followup_pack.zip`

## Destination (repo)
Tout va dans : `holistic-armor/packages/core-pack/`

---

## 1) Depuis ZIP 2 (V1+) → core-pack
Copier :
- `content/sessions/*` → `packages/core-pack/content/sessions/`
- `content/nutrition/*` → `packages/core-pack/content/nutrition/`
- `content/programs/*` → `packages/core-pack/content/programs/`
- `content/quotes_fr.json` → `packages/core-pack/content/quotes_fr.json`
- `content/audio_scripts/*` → `packages/core-pack/content/audio_scripts/`
- `media/images/*` → `packages/core-pack/media/images/`
- `media/audio/*` → `packages/core-pack/media/audio/`
- `legal/DISCLAIMER_FR.txt` → `packages/core-pack/legal/DISCLAIMER_FR.txt`

## 2) Depuis ZIP 3 (Follow-up) → core-pack
Copier :
- `tracking/schemas/*` → `packages/core-pack/tracking/schemas/`
- `tracking/examples/*` → `packages/core-pack/tracking/examples/`
- `notifications/notifications_pack_v1plus.json` → `packages/core-pack/notifications/notifications_pack_v1plus.json`
- `rgpd/templates/*` → `packages/core-pack/rgpd/templates/`
- `rgpd/policies/*` → `packages/core-pack/rgpd/policies/`
- `rgpd/records/*` → `packages/core-pack/rgpd/records/`
- `docs/*` → `packages/core-pack/docs/` (fusionner sans écraser)

## 3) Depuis ZIP 1 (V1) → core-pack
Copier uniquement ce qui manque (ne pas écraser les fichiers V1+/Follow-up).

---

## Vérification finale (checklist)
Dans `packages/core-pack/` tu dois voir au minimum :
- `core-pack.manifest.json`
- `content/sessions/movement_sessions.json`
- `content/sessions/breath_sessions.json`
- `content/sessions/sleep_sessions.json`
- `content/sessions/meditation_sessions.json`
- `content/nutrition/nutrition_templates.json`
- `content/programs/prog_12w_armor_balance_0001.json`
- `content/quotes_fr.json`
- `content/audio_scripts/`
- `tracking/schemas/` + `tracking/examples/`
- `notifications/notifications_pack_v1plus.json`
- `rgpd/templates/` + `rgpd/policies/` + `rgpd/records/`
- `legal/DISCLAIMER_FR.txt`
- `media/images/` + `media/audio/`
