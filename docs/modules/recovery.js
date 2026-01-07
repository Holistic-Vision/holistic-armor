import { esc } from './ui.js';
let DATA=null;
async function loadData(){
  if(DATA) return DATA;
  const res=await fetch('./data/recovery/sleep_stress.json', {cache:'no-store'});
  DATA=await res.json();
  return DATA;
}
export async function renderRecovery(view){
  const d=await loadData();
  view.innerHTML = `
    <div class="card">
      <div class="h1">Récupération & sommeil</div>
      <div class="muted">Protocoles non médicaux.</div>
      <hr/>
      <div class="list">
        ${(d.protocols||[]).map(p=>`
          <div class="item">
            <div>
              <div style="font-weight:900">${esc(p.title)}</div>
              <div class="muted small">${(p.steps||[]).length} étapes</div>
            </div>
            <button class="btn secondary" data-open="${esc(p.id)}">Voir</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  view.querySelectorAll("[data-open]").forEach(b=>{
    b.onclick=()=>{
      const id=b.getAttribute("data-open");
      const p=(d.protocols||[]).find(x=>x.id===id);
      if(!p) return;
      window.__HA_OPEN_MODAL?.(p.title, `<ol>${(p.steps||[]).map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`);
    };
  });
}
