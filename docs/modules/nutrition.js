import { esc, hash, pick, dayKey } from './ui.js';
import { getProfile } from './storage.js';

let RULES=null;
async function loadRules(){
  if(RULES) return RULES;
  const res = await fetch('./data/nutrition/nutrition_rules.json', {cache:'no-store'});
  RULES = await res.json();
  return RULES;
}
function applyDietFilters(text, diet, rules){
  const filters = rules.dietFilters?.[diet] || [];
  const lower = (text||"").toLowerCase();
  for(const bad of filters){
    if(lower.includes(String(bad).toLowerCase())) return false;
  }
  return true;
}
function chooseMeal(arr, seed, diet, rules){
  const items = (arr||[]).filter(x=>applyDietFilters(x, diet, rules));
  if(!items.length) return "—";
  return items[Math.abs(seed)%items.length];
}

export async function renderNutrition(view){
  const p=getProfile();
  const rules = await loadRules();
  const types = rules.types || {};
  const prefType = p.goals?.primary || "cut";
  const typeKey = types[prefType] ? prefType : "cut";

  view.innerHTML = `
    <div class="card">
      <div class="h1">Nutrition</div>
      <div class="muted">Plans modèles (non médicaux). Aucun écran vide.</div>
      <hr/>
      <div class="grid cols2">
        <div class="card" style="box-shadow:none">
          <div class="h2">Sélection</div>
          <div class="field"><label>Objectif</label>
            <select id="ntype">
              ${Object.entries(types).map(([k,v])=>`<option value="${esc(k)}" ${k===typeKey?"selected":""}>${esc(v.label||k)}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Variante</label><select id="nvariant"></select></div>
          <div class="row" style="margin-top:10px"><button class="btn" id="apply">Appliquer</button></div>
          <hr/>
          <div class="row">
            <div class="badge">Régime: ${esc(p.diet||"—")}</div>
            <div class="badge">Allergies: ${esc(p.allergies||"—")}</div>
            <div class="badge">Repas/j: ${esc(String(p.mealsPerDay||4))}</div>
          </div>
          <div class="muted small" style="margin-top:8px">Filtrage simple par mots-clés (paramètres).</div>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="h2">Menu du jour</div>
          <div id="notes" class="muted small"></div>
          <div class="grid cols2">
            <div class="card" style="box-shadow:none"><div class="h2">Breakfast</div><div id="m1" class="muted">—</div></div>
            <div class="card" style="box-shadow:none"><div class="h2">Lunch</div><div id="m2" class="muted">—</div></div>
            <div class="card" style="box-shadow:none"><div class="h2">Snack</div><div id="m3" class="muted">—</div></div>
            <div class="card" style="box-shadow:none"><div class="h2">Dinner</div><div id="m4" class="muted">—</div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const ntype=view.querySelector("#ntype");
  const nvariant=view.querySelector("#nvariant");

  function loadVariants(){
    const t=ntype.value;
    const vs=Object.entries(types[t].variants||{}).map(([k,v])=>({k, label:v.label||k}));
    nvariant.innerHTML = vs.map(v=>`<option value="${esc(v.k)}">${esc(v.label)}</option>`).join("");
    nvariant.value = vs[0]?.k || "moderate";
  }
  loadVariants();
  ntype.onchange=loadVariants;

  view.querySelector("#apply").onclick=()=>{
    const t=ntype.value;
    const v=nvariant.value;
    const plan = types?.[t]?.variants?.[v];
    if(!plan){ window.__HA_TOAST?.("Plan introuvable."); return; }

    const seed = hash(dayKey()+"|"+(p.firstName||"")+"|"+t+"|"+v);
    const meals = plan.meals||{};
    const diet = p.diet || "omnivore";

    view.querySelector("#notes").innerHTML = (plan.notes||[]).map(n=>`• ${esc(n)}`).join("<br/>") + "<hr/>";
    view.querySelector("#m1").textContent = chooseMeal(meals.breakfast, seed+1, diet, rules);
    view.querySelector("#m2").textContent = chooseMeal(meals.lunch, seed+2, diet, rules);
    view.querySelector("#m3").textContent = chooseMeal(meals.snack, seed+3, diet, rules);
    view.querySelector("#m4").textContent = chooseMeal(meals.dinner, seed+4, diet, rules);
  };

  view.querySelector("#apply").click();
}
