import { esc, ageFromBirth } from './ui.js';
import { getProfile, setProfile, DEFAULT_PROFILE } from './storage.js';

export function renderSettings(view, onSaved){
  const p=getProfile();
  const age=ageFromBirth(p.birthDate);

  view.innerHTML = `
    <div class="card">
      <div class="h1">Paramètres</div>
      <div class="muted">Local-first par défaut. Non médical.</div>
      <hr/>
      <div class="grid cols2">
        <div class="card" style="box-shadow:none">
          <div class="h2">Profil</div>
          <div class="field"><label>Prénom</label><input id="firstName" value="${esc(p.firstName)}"/></div>
          <div class="field"><label>Date de naissance</label><input id="birthDate" type="date" value="${esc(p.birthDate)}"/></div>
          <div class="field"><label>Sexe</label>
            <select id="sex">
              ${opt("unspecified","Non spécifié",p.sex)}
              ${opt("male","Homme",p.sex)}
              ${opt("female","Femme",p.sex)}
              ${opt("intersex","Intersexe",p.sex)}
            </select>
          </div>
          <div class="row">
            <div class="field" style="flex:1"><label>Taille (cm)</label><input id="heightCm" inputmode="numeric" value="${esc(p.heightCm)}"/></div>
            <div class="field" style="flex:1"><label>Poids (kg)</label><input id="weightKg" inputmode="decimal" value="${esc(p.weightKg)}"/></div>
          </div>
          <div class="row">
            <div class="badge">Âge: ${age===null?"—":esc(age)}</div>
            <div class="badge">Fuseau: ${esc(p.timezone||"—")}</div>
          </div>

          <hr/>
          <div class="h2">Contexte</div>
          <div class="field"><label>Activité</label>
            <select id="activity">
              ${opt("low","Faible",p.activity)}
              ${opt("moderate","Modérée",p.activity)}
              ${opt("high","Élevée",p.activity)}
            </select>
          </div>
          <div class="field"><label>Phase / période</label>
            <select id="lifeStage">
              ${opt("none","Aucune (normal)",p.lifeStage)}
              ${opt("adolescent","Adolescent",p.lifeStage)}
              ${opt("adult","Adulte",p.lifeStage)}
              ${opt("senior","Senior",p.lifeStage)}
              ${opt("menstruation","Menstruations",p.lifeStage)}
              ${opt("pregnancy","Grossesse",p.lifeStage)}
              ${opt("postpartum","Post-partum",p.lifeStage)}
              ${opt("perimenopause","Péri-ménopause",p.lifeStage)}
              ${opt("menopause","Ménopause",p.lifeStage)}
              ${opt("andropause","Andropause",p.lifeStage)}
            </select>
          </div>
          <div class="field"><label>Contraintes / douleurs (auto-déclaratif)</label><input id="constraints" value="${esc(p.constraints)}"/></div>

          <hr/>
          <div class="h2">Objectifs</div>
          <div class="field"><label>Principal</label>
            <select id="goalPrimary">
              ${opt("cut","Sèche",p.goals?.primary)}
              ${opt("maintenance","Maintenance",p.goals?.primary)}
              ${opt("gain","Prise",p.goals?.primary)}
              ${opt("sleep","Sommeil",p.goals?.primary)}
              ${opt("mobility","Mobilité",p.goals?.primary)}
              ${opt("strength","Force",p.goals?.primary)}
              ${opt("stress","Stress",p.goals?.primary)}
            </select>
          </div>
          <div class="field"><label>Secondaire</label>
            <select id="goalSecondary">
              ${opt("sleep","Sommeil",p.goals?.secondary)}
              ${opt("mobility","Mobilité",p.goals?.secondary)}
              ${opt("strength","Force",p.goals?.secondary)}
              ${opt("stress","Stress",p.goals?.secondary)}
              ${opt("cut","Sèche",p.goals?.secondary)}
              ${opt("maintenance","Maintenance",p.goals?.secondary)}
              ${opt("gain","Prise",p.goals?.secondary)}
            </select>
          </div>

          <hr/>
          <div class="h2">Nutrition</div>
          <div class="field"><label>Régime</label>
            <select id="diet">
              ${opt("omnivore","Omnivore",p.diet)}
              ${opt("no_pork","Sans porc",p.diet)}
              ${opt("halal","Halal",p.diet)}
              ${opt("kosher","Kasher",p.diet)}
              ${opt("vegetarian","Végétarien",p.diet)}
              ${opt("vegan","Vegan",p.diet)}
              ${opt("pescatarian","Pescatarien",p.diet)}
            </select>
          </div>
          <div class="field"><label>Allergies / exclusions</label><input id="allergies" value="${esc(p.allergies)}"/></div>
          <div class="field"><label>Repas par jour</label>
            <select id="mealsPerDay">${[2,3,4,5].map(n=>`<option value="${n}" ${Number(p.mealsPerDay||4)===n?"selected":""}>${n}</option>`).join("")}</select>
          </div>

          <hr/>
          <div class="h2">Personnalisation</div>
          <div class="field"><label>Thème</label>
            <select id="theme">
              ${opt("armor_vision","Armor Vision",p.preferences?.theme)}
              ${opt("holistic_studio","Holistic Studio",p.preferences?.theme)}
              ${opt("minimal_dark","Minimal (dark)",p.preferences?.theme)}
              ${opt("minimal_light","Minimal (light)",p.preferences?.theme)}
            </select>
          </div>
          <div class="field"><label>Densité</label>
            <select id="density">
              ${opt("comfortable","Confort",p.preferences?.density)}
              ${opt("compact","Compact",p.preferences?.density)}
            </select>
          </div>
          <div class="row">
            <label class="row" style="gap:8px"><input type="checkbox" id="timerFullScreen" ${p.preferences?.timerFullScreen?"checked":""}/> <span class="small">Minuteur plein écran (option)</span></label>
          </div>

          <hr/>
          <div class="h2">Chat API (optionnel)</div>
          <div class="row">
            <label class="row" style="gap:8px"><input type="checkbox" id="apiEnabled" ${p.api?.enabled?"checked":""}/> <span class="small">Activer</span></label>
          </div>
          <div class="field"><label>Endpoint (URL)</label><input id="apiEndpoint" value="${esc(p.api?.endpoint||"")}" placeholder="https://..."/></div>
          <div class="field"><label>Header (nom)</label><input id="apiHeaderName" value="${esc(p.api?.headerName||"Authorization")}" placeholder="Authorization"/></div>
          <div class="field"><label>API key (local)</label><input id="apiKey" value="${esc(p.api?.apiKey||"")}" placeholder="..."/></div>
          <div class="muted small">Attendu: <span class="kbd">{"reply":"..."}</span></div>

          <div class="row" style="margin-top:12px">
            <button class="btn" id="save">Enregistrer</button>
            <button class="btn danger" id="reset">Réinitialiser</button>
          </div>
        </div>

        <div class="card" style="box-shadow:none">
          <div class="h2">Avertissement</div>
          <div class="muted">
            <ul>
              <li>Outil de bien-être/éducation. <b>Non médical</b>.</li>
              <li>Aucun diagnostic, aucun traitement, aucune posologie.</li>
              <li>En cas d’urgence: 112/15.</li>
              <li>Données locales par défaut.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  view.querySelector("#save").onclick=()=>{
    const np = {
      ...p,
      firstName: val("firstName"),
      birthDate: val("birthDate"),
      sex: val("sex"),
      heightCm: val("heightCm"),
      weightKg: val("weightKg"),
      activity: val("activity"),
      lifeStage: val("lifeStage"),
      constraints: val("constraints"),
      goals:{ primary: val("goalPrimary"), secondary: val("goalSecondary") },
      diet: val("diet"),
      allergies: val("allergies"),
      mealsPerDay: Number(val("mealsPerDay")||4),
      preferences:{
        ...(p.preferences||{}),
        theme: val("theme"),
        density: val("density"),
        timerFullScreen: !!view.querySelector("#timerFullScreen").checked
      },
      api:{
        enabled: !!view.querySelector("#apiEnabled").checked,
        endpoint: val("apiEndpoint"),
        headerName: val("apiHeaderName") || "Authorization",
        apiKey: val("apiKey")
      }
    };
    setProfile(np);
    onSaved?.(np);
  };

  view.querySelector("#reset").onclick=()=>{
    setProfile(structuredClone(DEFAULT_PROFILE));
    onSaved?.(getProfile());
  };
}

function opt(value,label,current){
  return `<option value="${esc(value)}" ${String(current||"")===String(value)?"selected":""}>${esc(label)}</option>`;
}
function val(id){
  const el=document.getElementById(id);
  return el ? (el.value||"").trim() : "";
}
