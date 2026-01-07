import { getJournal } from './storage.js';

function makeSeries(j, key){
  const dates = Object.keys(j).sort();
  const vals=[];
  for(const d of dates){
    const v = Number(j[d]?.[key]);
    if(Number.isFinite(v)) vals.push(v);
  }
  return vals;
}

export function renderCharts(view){
  const j=getJournal();
  const energy = makeSeries(j,"energy");
  const stress = makeSeries(j,"stress");

  view.innerHTML = `
    <div class="card">
      <div class="h1">Courbes</div>
      <div class="muted">Retour visuel simple. (V1: énergie & stress)</div>
      <hr/>
      <div class="grid cols2">
        <div class="card" style="box-shadow:none">
          <div class="h2">Énergie</div>
          ${energy.length ? `<canvas id="cEnergy" width="420" height="220"></canvas>` : `<div class="muted">Aucune donnée énergie.</div>`}
        </div>
        <div class="card" style="box-shadow:none">
          <div class="h2">Stress</div>
          ${stress.length ? `<canvas id="cStress" width="420" height="220"></canvas>` : `<div class="muted">Aucune donnée stress.</div>`}
        </div>
      </div>
    </div>
  `;
  if(energy.length) drawLine(view.querySelector("#cEnergy"), energy);
  if(stress.length) drawLine(view.querySelector("#cStress"), stress);
}

function drawLine(canvas, values){
  const ctx=canvas.getContext("2d");
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.globalAlpha=0.35;
  ctx.strokeStyle="#888";
  ctx.beginPath(); ctx.moveTo(30,10); ctx.lineTo(30,h-20); ctx.lineTo(w-10,h-20); ctx.stroke();
  ctx.globalAlpha=1;

  const min=Math.min(...values), max=Math.max(...values);
  const span=(max-min)||1;
  const px=(i)=> 30 + i*((w-50)/(Math.max(1,values.length-1)));
  const py=(v)=> (h-20) - ((v-min)/span)*(h-40);

  ctx.strokeStyle="#bbb";
  ctx.lineWidth=2;
  ctx.beginPath();
  values.forEach((v,i)=>{
    const x=px(i), y=py(v);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle="#bbb";
  values.forEach((v,i)=>{
    const x=px(i), y=py(v);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  });
}
