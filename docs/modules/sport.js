import { esc } from './ui.js';
import { getProfile } from './storage.js';

let PROGRAMS=null;
export async function loadSportPrograms(){
  if(PROGRAMS) return PROGRAMS;
  const res = await fetch('./data/sport/programs.json', {cache:'no-store'});
  PROGRAMS = await res.json();
  return PROGRAMS;
}

function capForLifeStage(p){
  const stage = p.lifeStage || "none";
  const caps = {
    pregnancy:"doux", postpartum:"doux",
    menstruation:"modere",
    perimenopause:"modere", menopause:"modere",
    andropause:"modere",
    senior:"modere", adolescent:"modere"
  };
  return caps[stage] || "intense";
}
function normalizeLevel(level){
  if(level==="modere") return "modéré";
  return level;
}

export function buildSuggestion({minutes, pain, energy}){
  const p=getProfile();
  let level="doux";
  if(energy>=7 && pain<=2) level="modéré";
  if(energy>=8 && pain<=1) level="intense";
  if(pain>=6) level="doux";

  const cap = normalizeLevel(capForLifeStage(p));
  if(cap==="doux") level="doux";
  if(cap==="modéré" && level==="intense") level="modéré";

  const lines=[];
  if(minutes<=12) lines.push("10–12 min: mobilité douce + respiration.");
  else if(minutes<=25) lines.push("20 min: mobilité 5 min + renfo léger 12 min + respiration 3 min.");
  else lines.push("30–40 min: mobilité 8 min + renfo 20 min + retour au calme 5 min.");
  if(p.constraints) lines.push("Contraintes profil: adapter amplitude, éviter douleur.");
  if(pain>=4) lines.push("Douleur: privilégier technique, mobilité douce.");
  if(p.lifeStage!=="none") lines.push(`Phase: ${p.lifeStage}. Intensité bornée automatiquement (non médical).`);
  return `<div><div><b>Niveau</b>: ${esc(level)}</div><ul>${lines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
}

export async function renderSessions(view, openModal, onStartTimer){
  const p=getProfile();
  const data = await loadSportPrograms();
  const cap = normalizeLevel(capForLifeStage(p));
  view.innerHTML = `
    <div class="card">
      <div class="h1">Séances</div>
      <div class="muted">Choisis une séance. Non médical. Cap: ${esc(cap==="intense"?"aucun":cap)}</div>
      <hr/>
      <div class="list">
        ${(data.catalog||[]).map(it=>`
          <div class="item">
            <div>
              <div style="font-weight:900">${esc(it.title)}</div>
              <div class="muted small">${it.durationMin} min • ${esc((it.tags||[]).join(' • '))}</div>
            </div>
            <div class="row">
              <button class="btn secondary" data-open="${esc(it.id)}">Ouvrir</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  view.querySelectorAll("[data-open]").forEach(btn=>{
    btn.onclick=()=>{
      const id = btn.getAttribute("data-open");
      const it = (data.catalog||[]).find(x=>x.id===id);
      if(!it) return;
      const steps = (it.steps||[]).map(s=>`<li>${esc(s.name)} — ${Math.round((s.sec||0)/60)} min</li>`).join('');
      const html = `
        <div class="muted small">Durée: ${it.durationMin} min</div><hr/>
        <ol>${steps}</ol><hr/>
        <div class="row">
          <button class="btn" id="startTimer">Démarrer minuteur</button>
          <button class="btn secondary" id="closeModal">Fermer</button>
        </div>
      `;
      openModal(it.title, html, ()=>{
        document.getElementById("closeModal").onclick=()=>openModal(null,null,true);
        document.getElementById("startTimer").onclick=()=>{
          openModal(null,null,true);
          const seconds = (it.steps||[]).reduce((a,s)=>a+(s.sec||0),0) || (it.durationMin*60);
          onStartTimer({seconds, label: it.title});
        };
      });
    };
  });
}
