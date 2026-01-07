import { esc, dayKey } from './ui.js';
import { getJournal, upsertJournal } from './storage.js';

export function renderJournal(view){
  const j=getJournal();
  const dates = Object.keys(j).sort().reverse();

  view.innerHTML = `
    <div class="card">
      <div class="h1">Journal (rétroactif)</div>
      <div class="muted">Tu peux remplir n’importe quel jour (hier, 1 mois, etc.).</div>
      <hr/>
      <div class="grid cols2">
        <div class="card" style="box-shadow:none">
          <div class="h2">Ajouter / modifier</div>
          <div class="field"><label>Date</label><input id="jDate" type="date" value="${esc(dayKey())}"/></div>
          <div class="row">
            <div class="field" style="flex:1"><label>Énergie (1–10)</label><input id="jEnergy" inputmode="numeric"/></div>
            <div class="field" style="flex:1"><label>Stress (1–10)</label><input id="jStress" inputmode="numeric"/></div>
          </div>
          <div class="row">
            <div class="field" style="flex:1"><label>Douleur (0–10)</label><input id="jPain" inputmode="numeric"/></div>
            <div class="field" style="flex:1"><label>Minutes (activité)</label><input id="jMinutes" inputmode="numeric"/></div>
          </div>
          <div class="field"><label>Note</label><textarea id="jNote"></textarea></div>
          <div class="row" style="margin-top:10px">
            <button class="btn" id="jSave">Enregistrer</button>
            <button class="btn secondary" id="jLoad">Charger</button>
          </div>
          <div class="muted small" style="margin-top:10px">Compléter les périodes manquantes améliore la précision des analyses.</div>
        </div>

        <div class="card" style="box-shadow:none">
          <div class="h2">Dernières entrées</div>
          <div class="list" id="jList">
            ${dates.length ? dates.slice(0,20).map(d=>row(d,j[d])).join("") : `<div class="muted">Aucune entrée.</div>`}
          </div>
        </div>
      </div>
    </div>
  `;

  view.querySelector("#jSave").onclick=()=>{
    const date = val("jDate");
    const entry = { energy: val("jEnergy"), stress: val("jStress"), pain: val("jPain"), minutes: val("jMinutes"), note: view.querySelector("#jNote").value||"" };
    upsertJournal(date, entry);
    window.__HA_TOAST?.("Enregistré.");
    renderJournal(view);
  };

  view.querySelector("#jLoad").onclick=()=>{
    const date = val("jDate");
    const j2=getJournal();
    const e=j2[date]||{};
    set("jEnergy", e.energy||"");
    set("jStress", e.stress||"");
    set("jPain", e.pain||"");
    set("jMinutes", e.minutes||"");
    view.querySelector("#jNote").value = e.note||"";
    window.__HA_TOAST?.("Chargé.");
  };

  view.querySelectorAll("[data-pick]").forEach(b=>{
    b.onclick=()=>{
      const date=b.getAttribute("data-pick");
      view.querySelector("#jDate").value = date;
      view.querySelector("#jLoad").click();
    };
  });
}

function row(date,e){
  return `
    <div class="item">
      <div>
        <div style="font-weight:900">${esc(date)}</div>
        <div class="muted small">Énergie ${esc(e.energy||"—")} • Stress ${esc(e.stress||"—")} • Douleur ${esc(e.pain||"—")}</div>
      </div>
      <button class="btn secondary" data-pick="${esc(date)}">Ouvrir</button>
    </div>
  `;
}
function val(id){ const el=document.getElementById(id); return el ? (el.value||"").trim() : ""; }
function set(id,v){ const el=document.getElementById(id); if(el) el.value=v; }
