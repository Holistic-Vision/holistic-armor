import { esc, dayKey } from './ui.js';
import { getProfile, upsertJournal, getJournal } from './storage.js';
import { buildSuggestion } from './sport.js';

export function renderToday(view){
  const p=getProfile();
  const date = dayKey();
  const j=getJournal();
  const e = j[date] || {energy:"", stress:"", pain:"", minutes:"", note:""};

  view.innerHTML = `
    <div class="card">
      <div class="h1">Aujourd’hui (${esc(date)})</div>
      <div class="muted">Check-in rapide + suggestion. Non médical.</div>
      <hr/>
      <div class="grid cols2">
        <div>
          <div class="field"><label>Énergie (1–10)</label><input id="energy" inputmode="numeric" value="${esc(e.energy)}"/></div>
          <div class="field"><label>Stress (1–10)</label><input id="stress" inputmode="numeric" value="${esc(e.stress)}"/></div>
          <div class="field"><label>Douleur (0–10)</label><input id="pain" inputmode="numeric" value="${esc(e.pain)}"/></div>
          <div class="field"><label>Temps dispo (minutes)</label><input id="minutes" inputmode="numeric" value="${esc(e.minutes)}"/></div>
          <div class="field"><label>Note</label><textarea id="note">${esc(e.note||"")}</textarea></div>
          <div class="row" style="margin-top:10px">
            <button class="btn" id="save">Enregistrer</button>
            <button class="btn secondary" id="suggest">Suggestion</button>
          </div>
        </div>
        <div>
          <div class="card" style="box-shadow:none">
            <div class="h2">Suggestion</div>
            <div id="suggestBox" class="muted">Clique “Suggestion”.</div>
          </div>
        </div>
      </div>
      <hr/>
      <div class="muted small">Phase: <b>${esc(p.lifeStage||"none")}</b> • Intensité bornée automatiquement (non médical).</div>
    </div>
  `;

  view.querySelector("#save").onclick=()=>{
    const entry = { energy: val("energy"), stress: val("stress"), pain: val("pain"), minutes: val("minutes"), note: view.querySelector("#note").value||"" };
    upsertJournal(date, entry);
    window.__HA_TOAST?.("Enregistré.");
  };

  view.querySelector("#suggest").onclick=()=>{
    const minutes = parseInt(val("minutes")||"20",10);
    const pain = parseInt(val("pain")||"0",10);
    const energy = parseInt(val("energy")||"5",10);
    view.querySelector("#suggestBox").innerHTML = buildSuggestion({minutes, pain, energy});
  };
}
function val(id){ const el=document.getElementById(id); return el ? (el.value||"").trim() : ""; }
