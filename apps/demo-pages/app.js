const CORE_BASE = './assets/core-pack';

let state = loadState() || defaultState();

function ensureConsents(){
  const c = state.consents;
  return c.termsAccepted.accepted && c.privacyAccepted.accepted && c.healthDisclaimerAccepted.accepted;
}

function setActiveNav(route){
  document.querySelectorAll('.nav__item').forEach(a=>{
    a.classList.toggle('active', a.dataset.route === route);
  });
}

function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

async function fetchJson(path){
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error(`Fetch failed: ${path}`);
  return await res.json();
}

const cache = {};
async function loadCore(){
  if(cache.core) return cache.core;
  // Try load known files (from manifest paths if present)
  const manifestPath = `${CORE_BASE}/core-pack.manifest.json`;
  let manifest = null;
  try{ manifest = await fetchJson(manifestPath); }catch{}
  // Fallback paths (based on packs)
  const core = { manifest };
  async function maybe(name, p){
    try{ core[name] = await fetchJson(`${CORE_BASE}/${p}`); }catch(e){ core[name]=null; }
  }

  // Heuristic: locate likely filenames (packs may vary). We'll attempt common ones.
  await maybe('movement', 'content/sessions/movement_sessions.json');
  await maybe('breath', 'content/sessions/breath_sessions.json');
  await maybe('sleep', 'content/sessions/sleep_sessions.json');
  await maybe('meditation', 'content/sessions/meditation_sessions.json');
  await maybe('nutrition', 'content/nutrition/nutrition_templates.json');
  await maybe('program', 'content/programs/prog_12w_armor_balance_0001.json');
  await maybe('quotes', 'content/quotes_fr.json');
  await maybe('notifs', 'notifications/notifications_pack_v1plus.json');
  await maybe('disclaimers', 'rgpd/templates/in_app_disclaimers.json');

  cache.core = core;
  return core;
}

function todayStr(){
  return new Date().toISOString().slice(0,10);
}

function computeAdherence7d(){
  const now = new Date();
  const cut = new Date(now.getTime() - 7*24*3600*1000);
  const events = state.adherence.filter(e => new Date(e.dateTime) >= cut);
  if(!events.length) return 0;
  const avg = events.reduce((s,e)=>s + (e.score ?? 0), 0) / events.length;
  return Math.round(avg);
}

function kpiCard(title, value, sub){
  return `<div class="card kpi"><div class="kpi__v">${value}</div><div class="kpi__k">${title}</div><div class="small">${sub||''}</div></div>`;
}

function layout(title, bodyHtml){
  return `<div class="row" style="justify-content:space-between;align-items:flex-end">
    <div>
      <div class="h1">${title}</div>
    </div>
  </div>
  <div class="sep"></div>
  ${bodyHtml}`;
}

function safetyBanner(core){
  const txt = core?.disclaimers?.globalBanner || 'Holistic Armor est un outil de bien-être/éducation. Aucun diagnostic ni traitement.';
  return `<div class="card"><div class="row" style="justify-content:space-between">
    <div>
      <div class="h2">Avertissement</div>
      <div class="small">${escapeHtml(txt)}</div>
    </div>
    <span class="badge badge--warn">Non médical</span>
  </div></div>`;
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}


function safeNum(v, def=0){
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function ageFromDob(dob){
  if(!dob) return null;
  const d = new Date(dob+'T00:00:00');
  if(String(d) === 'Invalid Date') return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if(m < 0 || (m===0 && now.getDate() < d.getDate())) a--;
  return a;
}
function mifflinStJeorBMR(sex, weightKg, heightCm, age){
  if(!weightKg || !heightCm || !age) return null;
  const s = (sex === 'female') ? -161 : 5;
  return 10*weightKg + 6.25*heightCm - 5*age + s;
}
function activityMultiplier(level){
  const map = {sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9};
  return map[level] || 1.375;
}
function interpolateTemplate(txt, ctx){
  return (txt||'')
    .replace(/\{\{name\}\}/g, ctx.name || 'toi')
    .replace(/\{\{goal\}\}/g, ctx.goalLabel || 'ton objectif')
    .replace(/\{\{time\}\}/g, ctx.time || '20–40 min')
    .replace(/\{\{energy\}\}/g, String(ctx.energy ?? '—'))
    .replace(/\{\{stress\}\}/g, String(ctx.stress ?? '—'))
    .replace(/\{\{pain\}\}/g, String(ctx.pain ?? '—'));
}
async function offlineRespond(userText){
  const kb = await fetchJson('./offline/chat_kb_fr.json').catch(()=>({intents:[]}));
  const msg = (userText||'').trim();
  const lower = msg.toLowerCase();
  const blocked = ['posologie','dosage','diagnostic','traitement','ordonnance','médicament','medicament'];
  if(blocked.some(w => lower.includes(w))){
    return "Je ne peux pas fournir de diagnostic, traitement, posologie, ni interpréter des analyses. Je peux aider sur l’hygiène de vie (sommeil, mouvement, nutrition générale, stress). Urgence : 112/15.";
  }
  const d = todayStr();
  const c = state.checkins[d]?.metrics || {};
  const ctx = {name: state.profile?.name || '', goalLabel: state.profile?.goal || '', energy:c.energy, stress:c.stress, pain:c.pain, time: state.profile?.timeToday || ''};
  let picked = null;
  for(const it of (kb.intents||[])){
    for(const p of (it.patterns||[])){
      try{ if(new RegExp(p,'i').test(lower)){ picked = it; break; } }catch{}
    }
    if(picked) break;
  }
  if(!picked){
    const missing = [];
    if(!state.profile?.goal) missing.push("objectif");
    if(!state.profile?.workSchedule?.notes) missing.push("horaires");
    if(!c.energy) missing.push("énergie (1–10)");
    if(!c.stress) missing.push("stress (1–10)");
    if(c.pain === undefined) missing.push("douleur (0–10)");
    return (missing.length ? "Pour personnaliser : " + missing.join(', ') + "." : "Donne objectif + temps dispo + énergie/stress/douleur.") + " Je réponds avec 3 actions + une option courte.";
  }
  const responses = picked.responses || [];
  let out = responses.length ? responses[Math.floor(Date.now()/60000) % responses.length] : '';
  out = interpolateTemplate(out, ctx);
  if(picked.id === 'nutrition_basics'){
    const age = ageFromDob(state.profile?.dob);
    const bmr = mifflinStJeorBMR(state.profile?.sex, safeNum(state.profile?.weightKg), safeNum(state.profile?.heightCm), age);
    if(bmr){
      const tdee = Math.round(bmr * activityMultiplier(state.profile?.activityLevel||'light'));
      out += `\n\nRepère (estimation) : entretien ~${tdee} kcal/j.`;
    }
  }
  return out.trim();
}


function pushAdherence(category, itemId, status, score, notes){
  state.adherence.push({
    userId: 'local',
    dateTime: new Date().toISOString(),
    category, itemId, status,
    score, notes: notes || ''
  });
  saveState(state);
}

async function viewDashboard(){
  const core = await loadCore();
  const d = todayStr();
  const checkin = state.checkins[d];
  const meas = state.measurements[d];

  const adherence7d = computeAdherence7d();
  const sleepQ = checkin?.metrics?.sleep?.quality ?? '—';
  const energy = checkin?.metrics?.energy ?? '—';
  const stress = checkin?.metrics?.stress ?? '—';

  const html = layout('Tableau de bord', `
    ${safetyBanner(core)}
    <div class="sep"></div>
    <div class="grid">
      ${kpiCard('Adhérence (7j)', adherence7d + '%', 'Basé sur tes actions enregistrées')}
      ${kpiCard('Énergie (jour)', energy, '1–10')}
      ${kpiCard('Stress (jour)', stress, '1–10')}
      ${kpiCard('Sommeil (qualité)', sleepQ, '1–10')}
    </div>

    <div class="sep"></div>
    <div class="grid">
      <div class="card">
        <div class="h2">Actions rapides</div>
        <div class="row">
          <button class="btn btn--accent" id="goToday">Ouvrir “Aujourd’hui”</button>
          <button class="btn" id="goJournal">Saisir le journal</button>
          <button class="btn" id="goChat">Chat IA</button>
        </div>
        <div class="small">Données stockées localement sur ton appareil.</div>
      </div>
      <div class="card">
        <div class="h2">Démarrage du cycle</div>
        <label>Date de début</label>
        <input type="date" id="startDate" value="${escapeHtml(state.profile.startDate)}">
        <div class="row" style="margin-top:10px">
          <button class="btn btn--accent" id="saveStart">Enregistrer</button>
        </div>
        <div class="small">Utilisé pour déterminer semaine/jour du programme.</div>
      </div>
    </div>
  `);

  const view = document.getElementById('view');
  view.innerHTML = html;
  document.getElementById('goToday').onclick = ()=> location.hash = '#/today';
  document.getElementById('goJournal').onclick = ()=> location.hash = '#/journal';
  document.getElementById('goChat').onclick = ()=> location.hash = '#/chat';
  document.getElementById('saveStart').onclick = ()=>{
    state.profile.startDate = document.getElementById('startDate').value || todayStr();
    saveState(state);
    location.hash = '#/today';
  };
}

function daysBetween(aStr,bStr){
  const a = new Date(aStr+'T00:00:00');
  const b = new Date(bStr+'T00:00:00');
  return Math.floor((b-a)/86400000);
}

async function pickTodaySession(core){
  // Use 12-week program if available, else fallback to movement session list index by day.
  const start = state.profile.startDate || todayStr();
  const d = todayStr();
  const dayIndex = Math.max(0, daysBetween(start, d));
  const week = Math.floor(dayIndex/7) + 1;
  const day = (dayIndex%7) + 1;

  let item = null;
  if(core.program && core.program.weeks){
    const w = core.program.weeks.find(x=>x.week===week) || core.program.weeks[core.program.weeks.length-1];
    const dd = w?.days?.find(x=>x.day===day) || w?.days?.[0];
    item = { week, day, plan: dd };
  }
  if(!item){
    item = { week, day, plan: { movementId: core.movement?.sessions?.[dayIndex % (core.movement?.sessions?.length||1)]?.id } };
  }
  return item;
}

function findSessionById(core, id){
  const all = []
    .concat(core.movement?.sessions||[])
    .concat(core.breath?.sessions||[])
    .concat(core.sleep?.sessions||[])
    .concat(core.meditation?.sessions||[]);
  return all.find(s=>s.id===id) || null;
}

async function viewToday(){
  const core = await loadCore();
  const plan = await pickTodaySession(core);
  const d = todayStr();
  const checkin = state.checkins[d];
  const movementId = plan?.plan?.movementId || plan?.plan?.movement?.id;
  const breathId = plan?.plan?.breathId || plan?.plan?.breath?.id;
  const sleepId = plan?.plan?.sleepId || plan?.plan?.sleep?.id;
  const meditationId = plan?.plan?.meditationId || plan?.plan?.meditation?.id;

  const ids = [
    {label:'Mouvement', id: movementId, category:'movement'},
    {label:'Respiration', id: breathId, category:'breath'},
    {label:'Sommeil', id: sleepId, category:'sleep'},
    {label:'Méditation', id: meditationId, category:'meditation'},
  ].filter(x=>x.id);

  const cards = ids.map(x=>{
    const s = findSessionById(core, x.id);
    if(!s) return '';
    return `<div class="card">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="h2">${escapeHtml(x.label)} — ${escapeHtml(s.title||s.name||s.id)}</div>
          <div class="small">${escapeHtml(s.summary||s.intent||'')}</div>
        </div>
        <span class="badge">${escapeHtml(s.durationMin ? s.durationMin+' min' : '')}</span>
      </div>
      <div class="sep"></div>
      <div class="row">
        <button class="btn btn--accent" data-start="${escapeHtml(s.id)}" data-cat="${escapeHtml(x.category)}">Démarrer</button>
        <button class="btn" data-done="${escapeHtml(s.id)}" data-cat="${escapeHtml(x.category)}">Marquer fait</button>
        <button class="btn" data-skip="${escapeHtml(s.id)}" data-cat="${escapeHtml(x.category)}">Skip</button>
      </div>
    </div>`;
  }).join('');

  const html = layout(`Aujourd’hui (S${plan.week} • J${plan.day})`, `
    ${safetyBanner(core)}
    <div class="sep"></div>
    <div class="grid">${cards || `<div class="card"><div class="h2">Programme non chargé</div><div class="small">Vérifie le core-pack dans assets.</div></div>`}</div>
    <div class="sep"></div>
    <div class="card">
      <div class="h2">Check-in rapide</div>
      <div class="row">
        <button class="btn" id="openCheckin">${checkin ? 'Modifier' : 'Saisir'} le journal du jour</button>
      </div>
    </div>
  `);

  const view = document.getElementById('view');
  view.innerHTML = html;

  view.querySelectorAll('[data-start]').forEach(btn=>{
    btn.onclick = ()=> location.hash = '#/sessions?open=' + encodeURIComponent(btn.dataset.start) + '&cat=' + encodeURIComponent(btn.dataset.cat);
  });
  view.querySelectorAll('[data-done]').forEach(btn=>{
    btn.onclick = ()=>{ pushAdherence(btn.dataset.cat, btn.dataset.done, 'done', 100); alert('Enregistré : fait'); };
  });
  view.querySelectorAll('[data-skip]').forEach(btn=>{
    btn.onclick = ()=>{ pushAdherence(btn.dataset.cat, btn.dataset.skip, 'skipped', 0); alert('Enregistré : skip'); };
  });
  document.getElementById('openCheckin').onclick = ()=> location.hash = '#/journal';
}

async function viewSessions(){
  const core = await loadCore();
  const params = new URLSearchParams((location.hash.split('?')[1]||''));
  const openId = params.get('open');

  const groups = [
    {title:'Mouvement', key:'movement', sessions: core.movement?.sessions||[]},
    {title:'Respiration', key:'breath', sessions: core.breath?.sessions||[]},
    {title:'Sommeil', key:'sleep', sessions: core.sleep?.sessions||[]},
    {title:'Méditation', key:'meditation', sessions: core.meditation?.sessions||[]},
  ];

  const listHtml = groups.map(g=>{
    const rows = g.sessions.map(s=>`
      <tr>
        <td>${escapeHtml(s.title||s.name||s.id)}</td>
        <td class="small">${escapeHtml(s.durationMin ? s.durationMin+' min' : '')}</td>
        <td><button class="btn btn--accent" data-open="${escapeHtml(s.id)}">Ouvrir</button></td>
      </tr>`).join('');
    return `<div class="card">
      <div class="row" style="justify-content:space-between">
        <div class="h2">${escapeHtml(g.title)}</div>
        <span class="badge">${g.sessions.length}</span>
      </div>
      <div class="sep"></div>
      <table><thead><tr><th>Titre</th><th>Durée</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join('<div class="sep"></div>');

  const html = layout('Séances', `
    ${safetyBanner(core)}
    <div class="sep"></div>
    <div id="sessionDetail"></div>
    <div class="sep"></div>
    <div class="grid">${listHtml}</div>
  `);

  const view = document.getElementById('view');
  view.innerHTML = html;

  view.querySelectorAll('[data-open]').forEach(b=> b.onclick = ()=>{
    location.hash = '#/sessions?open=' + encodeURIComponent(b.dataset.open);
  });

  if(openId){
    renderSessionDetail(core, openId);
  }
}

function renderSessionDetail(core, id){
  const s = findSessionById(core, id);
  const holder = document.getElementById('sessionDetail');
  if(!s){ holder.innerHTML = ''; return; }

  const steps = (s.steps||s.sequence||[]).map((st,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${escapeHtml(st.title||st.name||'Étape')}</td>
      <td class="small">${escapeHtml(st.desc||st.description||'')}</td>
      <td class="small">${escapeHtml(st.durationSec ? Math.round(st.durationSec/60)+' min' : st.durationMin ? st.durationMin+' min' : '')}</td>
    </tr>
  `).join('');

  holder.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <div class="h2">${escapeHtml(s.title||s.name||s.id)}</div>
          <div class="small">${escapeHtml(s.summary||s.intent||'')}</div>
        </div>
        <span class="badge">${escapeHtml(s.durationMin ? s.durationMin+' min' : '')}</span>
      </div>
      <div class="sep"></div>
      <div class="row">
        <button class="btn btn--accent" id="btnStartTimer">Démarrer (timer)</button>
        <button class="btn" id="btnDone">Marquer fait</button>
        <button class="btn" id="btnSkip">Skip</button>
      </div>
      <div id="timerBox" class="sep"></div>
      <table>
        <thead><tr><th>#</th><th>Étape</th><th>Détails</th><th>Durée</th></tr></thead>
        <tbody>${steps || `<tr><td colspan="4" class="small">Aucune étape détaillée.</td></tr>`}</tbody>
      </table>
    </div>
  `;

  const cat = (core.movement?.sessions||[]).some(x=>x.id===id) ? 'movement'
    : (core.breath?.sessions||[]).some(x=>x.id===id) ? 'breath'
    : (core.sleep?.sessions||[]).some(x=>x.id===id) ? 'sleep'
    : 'meditation';

  document.getElementById('btnDone').onclick = ()=>{ pushAdherence(cat, id, 'done', 100); alert('Enregistré : fait'); };
  document.getElementById('btnSkip').onclick = ()=>{ pushAdherence(cat, id, 'skipped', 0); alert('Enregistré : skip'); };

  document.getElementById('btnStartTimer').onclick = ()=> startTimer(s, cat);
}

let timerInterval = null;
function startTimer(session, cat){
  const steps = session.steps || session.sequence || [];
  const box = document.getElementById('timerBox');
  if(timerInterval) clearInterval(timerInterval);

  // Build a simple linear timer: if no steps, use durationMin
  let timeline = [];
  if(steps.length){
    steps.forEach((st,i)=>{
      const sec = st.durationSec ?? ((st.durationMin ?? 1) * 60);
      timeline.push({ title: st.title||st.name||`Étape ${i+1}`, sec: Math.max(1, sec), desc: st.desc||st.description||'' });
    });
  } else {
    timeline = [{ title: session.title||session.name||'Séance', sec: Math.max(60, (session.durationMin||10)*60), desc: session.summary||'' }];
  }

  let idx = 0;
  let remaining = timeline[0].sec;
  const total = timeline.reduce((s,x)=>s+x.sec,0);
  let elapsed = 0;

  function render(){
    const cur = timeline[idx];
    const mmss = s => {
      const m = Math.floor(s/60); const ss = s%60;
      return `${m}:${String(ss).padStart(2,'0')}`;
    };
    box.innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="h2">Timer</div>
            <div class="small">${escapeHtml(cur.title)} — ${escapeHtml(cur.desc||'')}</div>
          </div>
          <span class="badge">${mmss(remaining)}</span>
        </div>
        <div class="sep"></div>
        <div class="row">
          <button class="btn" id="tPause">Pause</button>
          <button class="btn" id="tStop">Stop</button>
        </div>
        <div class="small">Progression: ${Math.round((elapsed/total)*100)}%</div>
      </div>`;

    document.getElementById('tPause').onclick = ()=>{
      if(timerInterval){
        clearInterval(timerInterval); timerInterval=null;
        document.getElementById('tPause').textContent = 'Reprendre';
      }else{
        tickStart();
      }
    };
    document.getElementById('tStop').onclick = ()=>{
      if(timerInterval) clearInterval(timerInterval);
      timerInterval=null;
      box.innerHTML = '';
    };
  }

  function tick(){
    remaining -= 1;
    elapsed += 1;
    if(remaining <= 0){
      idx += 1;
      if(idx >= timeline.length){
        if(timerInterval) clearInterval(timerInterval);
        timerInterval=null;
        pushAdherence(cat, session.id, 'done', 100);
        box.innerHTML = `<div class="card"><div class="h2">Séance terminée</div><div class="small">Action enregistrée.</div></div>`;
        return;
      }
      remaining = timeline[idx].sec;
    }
    // update only badge and progress cheaply
    const badge = box.querySelector('.badge');
    if(badge){
      const m = Math.floor(remaining/60), s = remaining%60;
      badge.textContent = `${m}:${String(s).padStart(2,'0')}`;
    }
  }

  function tickStart(){
    render();
    timerInterval = setInterval(tick, 1000);
  }
  tickStart();
}

async function viewNutrition(){
  const core = await loadCore();
  const pack = core.nutrition || {};
  const templates = pack.templates || [];
  const p = state.profile || {};
  const d = todayStr();
  const last = state.checkins[d]?.metrics || {};
  const defaultType = (last.energy && last.energy <= 4) ? 'low' : 'moderate';
  const dayType = state.checkins[d]?.nutritionDayType || p.carbDayType || defaultType;

  function findTemplate(type){
    return templates.find(t => (t.carbDayType||'').toLowerCase() === type) || templates[0] || null;
  }
  const tpl = findTemplate(dayType);
  const meals = tpl?.meals || [];

  const age = ageFromDob(p.dob);
  const bmr = mifflinStJeorBMR(p.sex, safeNum(p.weightKg), safeNum(p.heightCm), age);
  const tdee = bmr ? Math.round(bmr * activityMultiplier(p.activityLevel||'light')) : null;

  const mealCards = meals.map(m=>{
    const opt = (m.options||[])[0];
    const alt = opt?.alternatives || {};
    const altLines = [];
    if(p.religion === 'halal' && alt.halal) altLines.push("Halal : " + alt.halal.join(', '));
    if(p.dietStyle === 'vegan' && alt.vegan) altLines.push("Vegan : " + alt.vegan.join(', '));
    if((p.allergies||[]).includes('gluten') && alt.gluten_free) altLines.push("Sans gluten : " + alt.gluten_free.join(', '));
    if((p.allergies||[]).includes('lactose') && alt.dairy_free) altLines.push("Sans lait : " + alt.dairy_free.join(', '));
    return `
      <div class="card">
        <div class="h2">${escapeHtml(m.slot||'repas')}</div>
        <div class="small">${escapeHtml(opt?.title||'Option')}</div>
        ${altLines.length ? `<div class="sep"></div><div class="small">${altLines.map(x=>escapeHtml(x)).join('<br>')}</div>` : ``}
        ${opt?.notes ? `<div class="sep"></div><div class="small">${escapeHtml(opt.notes)}</div>` : ``}
      </div>`;
  }).join('');

  const html = layout('Nutrition', `
    ${safetyBanner(core)}
    <div class="sep"></div>

    <div class="grid">
      <div class="card">
        <div class="h2">Plan du jour</div>
        <div class="small">Type : <b>${escapeHtml(dayType)}</b>${tpl?.title ? ` — ${escapeHtml(tpl.title)}` : ``}</div>
        <div class="sep"></div>

        <label>Type (carb cycling)</label>
        <select id="dayType">
          <option value="low">low</option>
          <option value="moderate">moderate</option>
          <option value="high">high</option>
        </select>

        <div class="row" style="margin-top:10px">
          <button class="btn btn--accent" id="saveDayType">Appliquer</button>
          <button class="btn" id="toggleTpl">Templates</button>
        </div>

        <div class="sep"></div>
        <div class="small">
          ${tdee ? `Repère (estimation) : entretien ~${tdee} kcal/j.` : `Renseigne taille/poids/date de naissance dans Paramètres pour un repère calorique.`}
        </div>
      </div>

      <div class="card">
        <div class="h2">Préférences</div>
        <div class="small">
          Régime : ${escapeHtml(p.dietStyle||'—')}<br>
          Religion : ${escapeHtml(p.religion||'—')}<br>
          Allergies : ${escapeHtml((p.allergies||[]).join(', ') || '—')}<br>
          Évite : ${escapeHtml((p.dislikes||[]).join(', ') || '—')}
        </div>
      </div>
    </div>

    <div class="sep"></div>
    <div class="grid">
      ${mealCards || `<div class="card"><div class="small">Aucun repas trouvé.</div></div>`}
    </div>

    <div class="sep"></div>
    <div class="card" id="tplTable" style="display:none">
      <div class="h2">Templates</div>
      <div class="sep"></div>
      <table>
        <thead><tr><th>Titre</th><th>Type</th></tr></thead>
        <tbody>
          ${(templates||[]).map(t=>`<tr><td>${escapeHtml(t.title||t.id||'Template')}</td><td class="small">${escapeHtml(t.carbDayType||'')}</td></tr>`).join('') || `<tr><td colspan="2" class="small">Aucun template.</td></tr>`}
        </tbody>
      </table>
    </div>
  `);

  document.getElementById('view').innerHTML = html;
  document.getElementById('dayType').value = dayType;

  document.getElementById('saveDayType').onclick = ()=>{
    const v = document.getElementById('dayType').value;
    state.checkins[d] = state.checkins[d] || {userId:'local',date:d,metrics:{energy:6,stress:6,pain:0,sleep:{durationMin:420,quality:6}},notes:'',attachments:[]};
    state.checkins[d].nutritionDayType = v;
    saveState(state);
    router();
  };
  document.getElementById('toggleTpl').onclick = ()=>{
    const el = document.getElementById('tplTable');
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
  };
}


async function viewJournal(){
  const core = await loadCore();
  const d = todayStr();
  const existing = state.checkins[d]?.metrics || null;
  const sleep = existing?.sleep || {};

  const html = layout('Journal (check-in)', `
    ${safetyBanner(core)}
    <div class="sep"></div>
    <div class="grid">
      <div class="card">
        <div class="h2">Saisie du jour</div>
        <label>Énergie (1–10)</label>
        <input type="number" id="energy" min="1" max="10" value="${existing?.energy ?? 6}">
        <label>Stress (1–10)</label>
        <input type="number" id="stress" min="1" max="10" value="${existing?.stress ?? 6}">
        <label>Douleur (0–10)</label>
        <input type="number" id="pain" min="0" max="10" value="${existing?.pain ?? 0}">
        <label>Libido (0–10)</label>
        <input type="number" id="libido" min="0" max="10" value="${existing?.libido ?? 5}">
        <label>Sommeil (durée min)</label>
        <input type="number" id="sleepDur" min="0" max="1440" value="${sleep.durationMin ?? 420}">
        <label>Sommeil (qualité 1–10)</label>
        <input type="number" id="sleepQ" min="1" max="10" value="${sleep.quality ?? 6}">
        <label>Notes</label>
        <textarea id="notes" placeholder="Résumé de la journée…">${escapeHtml(state.checkins[d]?.notes||'')}</textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn btn--accent" id="saveCheckin">Enregistrer</button>
        </div>
      </div>

      <div class="card">
        <div class="h2">Médias (photo/vidéo/son)</div>
        <div class="small">Stockés localement (IndexedDB). Recommandé : fichiers raisonnables.</div>
        <label>Ajouter un fichier</label>
        <input type="file" id="fileAdd" accept="image/*,video/*,audio/*">
        <div class="sep"></div>
        <div id="mediaList"></div>
      </div>
    </div>
  `);

  const view = document.getElementById('view');
  view.innerHTML = html;

  document.getElementById('saveCheckin').onclick = ()=>{
    const metrics = {
      energy: clampInt(document.getElementById('energy').value,1,10),
      stress: clampInt(document.getElementById('stress').value,1,10),
      pain: clampInt(document.getElementById('pain').value,0,10),
      libido: clampInt(document.getElementById('libido').value,0,10),
      sleep: {
        durationMin: clampInt(document.getElementById('sleepDur').value,0,1440),
        quality: clampInt(document.getElementById('sleepQ').value,1,10),
      }
    };
    state.checkins[d] = {
      userId:'local', date:d, metrics,
      notes: document.getElementById('notes').value || '',
      attachments: state.checkins[d]?.attachments || []
    };
    saveState(state);
    pushAdherence('journal','checkin_'+d,'done',100);
    alert('Journal enregistré.');
    location.hash = '#/dashboard';
  };

  document.getElementById('fileAdd').onchange = async (ev)=>{
    const f = ev.target.files?.[0];
    if(!f) return;
    const id = 'media_' + Date.now() + '_' + Math.random().toString(16).slice(2);
    await putBlob(id, f);
    const type = f.type.startsWith('image/') ? 'photo' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'file';
    const att = { type, uri: `idb://${id}`, createdAt: new Date().toISOString(), tags: [] };
    state.checkins[d] = state.checkins[d] || { userId:'local', date:d, metrics:{energy:6,stress:6,pain:0,sleep:{durationMin:420,quality:6}}, notes:'', attachments:[] };
    state.checkins[d].attachments = state.checkins[d].attachments || [];
    state.checkins[d].attachments.push(att);
    saveState(state);
    await renderMediaList(d);
    ev.target.value = '';
  };

  await renderMediaList(d);
}

function clampInt(v, min, max){
  const n = parseInt(v,10);
  if(Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

async function renderMediaList(date){
  const list = document.getElementById('mediaList');
  const atts = state.checkins[date]?.attachments || [];
  if(!atts.length){ list.innerHTML = '<div class="small">Aucun média.</div>'; return; }

  const rows = await Promise.all(atts.map(async (a, idx)=>{
    const id = (a.uri||'').startsWith('idb://') ? a.uri.slice(6) : null;
    let preview = '';
    if(id){
      const blob = await getBlob(id);
      if(blob){
        const url = URL.createObjectURL(blob);
        if(a.type==='photo') preview = `<img src="${url}" style="max-width:100%;border-radius:12px;border:1px solid var(--border)">`;
        else if(a.type==='audio') preview = `<audio controls src="${url}" style="width:100%"></audio>`;
        else if(a.type==='video') preview = `<video controls src="${url}" style="width:100%;border-radius:12px;border:1px solid var(--border)"></video>`;
        else preview = `<a class="btn" href="${url}" download>Télécharger</a>`;
      }
    }
    return `<div class="card" style="margin-bottom:10px">
      <div class="row" style="justify-content:space-between">
        <div><span class="badge">${escapeHtml(a.type)}</span> <span class="small">${escapeHtml(new Date(a.createdAt).toLocaleString())}</span></div>
        <button class="btn btn--danger" data-del="${idx}">Supprimer</button>
      </div>
      <div class="sep"></div>
      ${preview || `<div class="small">Prévisualisation indisponible.</div>`}
    </div>`;
  }));
  list.innerHTML = rows.join('');
  list.querySelectorAll('[data-del]').forEach(b=>{
    b.onclick = async ()=>{
      const idx = parseInt(b.dataset.del,10);
      const a = atts[idx];
      if(a?.uri?.startsWith('idb://')) await delBlob(a.uri.slice(6));
      atts.splice(idx,1);
      state.checkins[date].attachments = atts;
      saveState(state);
      await renderMediaList(date);
    };
  });
}

async function viewCharts(){
  const core = await loadCore();
  // Build series from checkins + measurements
  const pointsEnergy = [];
  const pointsStress = [];
  const pointsSleepQ = [];
  const pointsSleepDur = [];
  Object.keys(state.checkins).sort().forEach(d=>{
    const m = state.checkins[d]?.metrics;
    if(!m) return;
    if(typeof m.energy === 'number') pointsEnergy.push({t:d, v:m.energy});
    if(typeof m.stress === 'number') pointsStress.push({t:d, v:m.stress});
    if(typeof m.sleep?.quality === 'number') pointsSleepQ.push({t:d, v:m.sleep.quality});
    if(typeof m.sleep?.durationMin === 'number') pointsSleepDur.push({t:d, v:m.sleep.durationMin/60});
  });

  const html = layout('Courbes', `
    ${safetyBanner(core)}
    <div class="sep"></div>
    <div class="grid">
      <div class="card">
        <div class="h2">Énergie</div>
        <canvas id="cEnergy" style="width:100%"></canvas>
      </div>
      <div class="card">
        <div class="h2">Stress</div>
        <canvas id="cStress" style="width:100%"></canvas>
      </div>
      <div class="card">
        <div class="h2">Sommeil qualité</div>
        <canvas id="cSleepQ" style="width:100%"></canvas>
      </div>
      <div class="card">
        <div class="h2">Sommeil durée (heures)</div>
        <canvas id="cSleepD" style="width:100%"></canvas>
      </div>
    </div>
  `);
  const view = document.getElementById('view');
  view.innerHTML = html;

  renderLineChart(document.getElementById('cEnergy'), pointsEnergy, 'Énergie (1–10)');
  renderLineChart(document.getElementById('cStress'), pointsStress, 'Stress (1–10)');
  renderLineChart(document.getElementById('cSleepQ'), pointsSleepQ, 'Sommeil qualité (1–10)');
  renderLineChart(document.getElementById('cSleepD'), pointsSleepDur, 'Sommeil durée (h)');
}

async function viewChat(){
  const core = await loadCore();
  const cfg = state.chat;

  const html = layout('Chat IA (encadré)', `
    ${safetyBanner(core)}
    <div class="sep"></div>
    <div class="grid">
      <div class="card">
        <div class="h2">Configuration</div>
        <label>Mode</label>
        <select id="provider">
          <option value="none">Sans API (réponses guidées simples)</option>
          <option value="openai_responses">OpenAI — Responses API</option>
          <option value="openai_chat">OpenAI — Chat Completions</option>
        </select>
        <label>Endpoint (si API)</label>
        <input id="endpoint" value="${escapeHtml(cfg.endpoint||'https://api.openai.com/v1/responses')}">
        <label>Model (si API)</label>
        <input id="model" value="${escapeHtml(cfg.model||'gpt-4.1-mini')}">
        <label>API key (stockée localement)</label>
        <input id="apiKey" type="password" placeholder="sk-..." value="${escapeHtml(cfg.apiKey||'')}">
        <div class="row" style="margin-top:10px">
          <button class="btn btn--accent" id="saveChatCfg">Enregistrer</button>
        </div>
        <div class="small">
          Attention : une clé API ne doit idéalement pas être exposée côté navigateur. Ici, c’est une solution local-first (usage personnel/proto).
        </div>
      </div>

      <div class="card">
        <div class="h2">Discussion</div>
        <div id="chatLog" style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow:auto;border:1px solid var(--border);border-radius:12px;padding:10px"></div>
        <div class="sep"></div>
        <textarea id="chatInput" placeholder="Demande (objectif, contraintes, fatigue, douleur, horaires)…"></textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn btn--accent" id="chatSend">Envoyer</button>
          <button class="btn" id="chatClear">Vider</button>
        </div>
        <div class="small">Le chat refuse diagnostic/traitement/posologie. Si urgence : 112/15.</div>
      </div>
    </div>
  `);

  const view = document.getElementById('view');
  view.innerHTML = html;

  document.getElementById('provider').value = cfg.provider || 'none';

  function log(role, text){
    const box = document.getElementById('chatLog');
    const b = document.createElement('div');
    b.className = 'card';
    b.innerHTML = `<div class="small">${role}</div><div>${escapeHtml(text).replace(/\n/g,'<br>')}</div>`;
    box.appendChild(b);
    box.scrollTop = box.scrollHeight;
  }

  document.getElementById('saveChatCfg').onclick = ()=>{
    state.chat.provider = document.getElementById('provider').value;
    state.chat.endpoint = document.getElementById('endpoint').value.trim();
    state.chat.model = document.getElementById('model').value.trim();
    state.chat.apiKey = document.getElementById('apiKey').value.trim();
    saveState(state);
    alert('Config enregistrée.');
  };

  document.getElementById('chatClear').onclick = ()=>{
    const box = document.getElementById('chatLog'); box.innerHTML='';
  };

  document.getElementById('chatSend').onclick = async ()=>{
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if(!msg) return;
    input.value='';
    log('Vous', msg);

    // Guardrails: block explicit medical requests
    const lower = msg.toLowerCase();
    const blocked = ['posologie','dosage','diagnostic','traitement','cure','médicament','ordonnance','taux de testost','taux de cortisol','taux d\'oest','œstrog','estrog'];
    if(blocked.some(w=> lower.includes(w))){
      log('Holistic Armor', "Je ne peux pas fournir de diagnostic, de traitement, ni de posologie. Si tu as des symptômes inquiétants, consulte un professionnel de santé. Je peux en revanche t’aider sur l’hygiène de vie (sommeil, mouvement, nutrition générale, gestion du stress) et l’organisation du programme.");
      return;
    }

    const provider = state.chat.provider || 'none';
    try{
      if(provider === 'none'){
        const out = await offlineRespond(msg);
        log('Holistic Armor', out);
        return;
      }
      if(provider === 'openai_responses'){
        const out = await callOpenAIResponses(msg);
        log('Holistic Armor', out);
      }else{
        const out = await callOpenAIChat(msg);
        log('Holistic Armor', out);
      }
    }catch(e){
      log('Holistic Armor', "Erreur API: " + (e?.message || String(e)));
    }
  };

  async function callOpenAIResponses(userText){
    const key = state.chat.apiKey;
    if(!key) throw new Error('API key manquante.');
    const endpoint = state.chat.endpoint || 'https://api.openai.com/v1/responses';
    const model = state.chat.model || 'gpt-4.1-mini';

    const system = `Tu es Holistic Armor, coach bien-être/éducation. Interdits: diagnostic, traitement, posologie, interprétation clinique de taux hormonaux. Tu peux: planifier sommeil, respiration, mouvement, nutrition générale, organisation, motivation. Si douleur aiguë, malaise, urgence: recommander de consulter/112/15. Réponds en français, structuré, actionnable, sans promesses médicales.`;

    const body = {
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: userText }] }
      ],
      store: false
    };

    const res = await fetch(endpoint, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error(t.slice(0, 500));
    }
    const data = await res.json();
    // Extract text from output
    const out = (data.output || []).flatMap(o => o.content || [])
      .filter(c => c.type === 'output_text')
      .map(c => c.text).join('\n').trim();
    return out || '(réponse vide)';
  }

  async function callOpenAIChat(userText){
    const key = state.chat.apiKey;
    if(!key) throw new Error('API key manquante.');
    const endpoint = state.chat.endpoint || 'https://api.openai.com/v1/chat/completions';
    const model = state.chat.model || 'gpt-4.1-mini';
    const system = `Tu es Holistic Armor, coach bien-être/éducation. Interdits: diagnostic, traitement, posologie, interprétation clinique de taux hormonaux. Tu peux: planifier sommeil, respiration, mouvement, nutrition générale, organisation, motivation. Si douleur aiguë, malaise, urgence: recommander de consulter/112/15. Réponds en français, structuré, actionnable, sans promesses médicales.`;

    const body = {
      model,
      messages: [
        { role:'system', content: system },
        { role:'user', content: userText }
      ],
      temperature: 0.4
    };
    const res = await fetch(endpoint, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error(t.slice(0, 500));
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '(réponse vide)';
  }
}

async function viewSettings(){
  const core = await loadCore();
  const p = state.profile || {};
  const plan = state.plan || {tier:'free'};

  const html = layout('Paramètres', `
    ${safetyBanner(core)}
    <div class="sep"></div>

    <div class="grid">
      <div class="card">
        <div class="h2">Profil (local)</div>
        <div class="sep"></div>

        <label>Prénom</label>
        <input id="name" value="${escapeHtml(p.name||'')}">

        <div class="row">
          <div style="flex:1">
            <label>Date de naissance</label>
            <input id="dob" type="date" value="${escapeHtml(p.dob||'')}">
          </div>
          <div style="flex:1">
            <label>Sexe</label>
            <select id="sex">
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div style="flex:1">
            <label>Taille (cm)</label>
            <input id="heightCm" inputmode="numeric" value="${escapeHtml(String(p.heightCm||''))}">
          </div>
          <div style="flex:1">
            <label>Poids (kg)</label>
            <input id="weightKg" inputmode="numeric" value="${escapeHtml(String(p.weightKg||''))}">
          </div>
        </div>

        <div class="row">
          <div style="flex:1">
            <label>Objectif</label>
            <select id="goal">
              <option value="">—</option>
              <option value="fat_loss">Perte de graisse</option>
              <option value="recomp">Recomposition</option>
              <option value="strength">Force</option>
              <option value="mobility">Mobilité</option>
            </select>
          </div>
          <div style="flex:1">
            <label>Activité</label>
            <select id="activityLevel">
              <option value="sedentary">Sédentaire</option>
              <option value="light">Léger</option>
              <option value="moderate">Modéré</option>
              <option value="active">Actif</option>
              <option value="very_active">Très actif</option>
            </select>
          </div>
        </div>

        <label>Horaires (notes)</label>
        <input id="workNotes" value="${escapeHtml(p.workSchedule?.notes||'')}">

        <div class="sep"></div>
        <div class="h2">Préférences nutrition</div>

        <div class="row">
          <div style="flex:1">
            <label>Régime</label>
            <select id="dietStyle">
              <option value="">—</option>
              <option value="omnivore">Omnivore</option>
              <option value="vegetarian">Végétarien</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="mediterranean">Méditerranéen</option>
            </select>
          </div>
          <div style="flex:1">
            <label>Religion</label>
            <select id="religion">
              <option value="">—</option>
              <option value="halal">Halal</option>
              <option value="kosher">Casher</option>
            </select>
          </div>
        </div>

        <label>Allergies (virgules)</label>
        <input id="allergies" value="${escapeHtml((p.allergies||[]).join(','))}">
        <label>Évite (virgules)</label>
        <input id="dislikes" value="${escapeHtml((p.dislikes||[]).join(','))}">

        <div class="sep"></div>
        <label>Limitations (non médical)</label>
        <textarea id="limitations">${escapeHtml(p.limitations||'')}</textarea>

        <div class="sep"></div>
        <div class="row">
          <button class="btn btn--accent" id="saveProfile">Enregistrer</button>
          <button class="btn" id="resetProfile">Reset</button>
        </div>
      </div>

      <div class="card">
        <div class="h2">Plan (simulation)</div>
        <div class="sep"></div>
        <label>Plan</label>
        <select id="planTier">
          <option value="free">Free</option>
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
          <option value="lifetime">Lifetime</option>
        </select>
        <div class="sep"></div>
        <button class="btn btn--accent" id="savePlan">Enregistrer plan</button>
        <div class="sep"></div>
        <div class="small">
          Free : base offline<br>
          Plus : programmes + export<br>
          Pro : templates avancés<br>
          Lifetime : complet
        </div>
      </div>
    </div>
  `);

  document.getElementById('view').innerHTML = html;

  document.getElementById('sex').value = p.sex || 'male';
  document.getElementById('goal').value = p.goal || '';
  document.getElementById('activityLevel').value = p.activityLevel || 'light';
  document.getElementById('dietStyle').value = p.dietStyle || '';
  document.getElementById('religion').value = p.religion || '';
  document.getElementById('planTier').value = plan.tier || 'free';

  document.getElementById('saveProfile').onclick = ()=>{
    state.profile = state.profile || {};
    state.profile.name = document.getElementById('name').value.trim();
    state.profile.dob = document.getElementById('dob').value;
    state.profile.sex = document.getElementById('sex').value;
    state.profile.heightCm = safeNum(document.getElementById('heightCm').value, null);
    state.profile.weightKg = safeNum(document.getElementById('weightKg').value, null);
    state.profile.goal = document.getElementById('goal').value;
    state.profile.activityLevel = document.getElementById('activityLevel').value;
    state.profile.workSchedule = state.profile.workSchedule || {type:'custom',notes:''};
    state.profile.workSchedule.notes = document.getElementById('workNotes').value.trim();
    state.profile.dietStyle = document.getElementById('dietStyle').value;
    state.profile.religion = document.getElementById('religion').value;
    state.profile.allergies = document.getElementById('allergies').value.split(',').map(x=>x.trim()).filter(Boolean);
    state.profile.dislikes = document.getElementById('dislikes').value.split(',').map(x=>x.trim()).filter(Boolean);
    state.profile.limitations = document.getElementById('limitations').value.trim();
    saveState(state);
    alert('OK');
  };

  document.getElementById('resetProfile').onclick = ()=>{
    if(!confirm('Reset profil local ?')) return;
    state.profile = defaultState().profile;
    saveState(state);
    router();
  };

  document.getElementById('savePlan').onclick = ()=>{
    state.plan = state.plan || {tier:'free',purchasedAt:null,licenseKey:null};
    state.plan.tier = document.getElementById('planTier').value;
    if(!state.plan.purchasedAt) state.plan.purchasedAt = new Date().toISOString();
    saveState(state);
    alert('OK');
  };
}


async function viewLegal(){
  const core = await loadCore();
  const notifs = core.notifs;
  const disc = core.disclaimers;
  const html = layout('RGPD & sécurité', `
    <div class="card">
      <div class="h2">Disclaimers in-app</div>
      <pre style="white-space:pre-wrap;color:var(--muted)">${escapeHtml(JSON.stringify(disc||{},null,2))}</pre>
    </div>
    <div class="sep"></div>
    <div class="card">
      <div class="h2">Règles notifications (pack)</div>
      <pre style="white-space:pre-wrap;color:var(--muted)">${escapeHtml(JSON.stringify(notifs?.principles||{},null,2))}</pre>
    </div>
    <div class="sep"></div>
    <div class="card">
      <div class="h2">Données locales</div>
      <div class="small">Stockage: LocalStorage (state) + IndexedDB (médias). Export ZIP disponible via bouton sidebar.</div>
    </div>
  `);
  document.getElementById('view').innerHTML = html;
}

async function onboardingGate(){
  const core = await loadCore();
  const html = layout('Activation requise', `
    ${safetyBanner(core)}
    <div class="sep"></div>
    <div class="card">
      <div class="h2">Avant d’utiliser Holistic Armor</div>
      <div class="small">Coche les 3 consentements obligatoires (CGU, confidentialité, avertissement santé).</div>
      <div class="sep"></div>
      <label><input type="checkbox" id="cTerms"> J’accepte les CGU</label>
      <label><input type="checkbox" id="cPrivacy"> J’accepte la politique de confidentialité</label>
      <label><input type="checkbox" id="cHealth"> J’accepte l’avertissement santé</label>
      <div class="row" style="margin-top:10px">
        <button class="btn btn--accent" id="btnActivate">Activer</button>
      </div>
    </div>
  `);
  const view = document.getElementById('view');
  view.innerHTML = html;
  document.getElementById('btnActivate').onclick = ()=>{
    const t = document.getElementById('cTerms').checked;
    const p = document.getElementById('cPrivacy').checked;
    const h = document.getElementById('cHealth').checked;
    if(!(t&&p&&h)){ alert('Les 3 consentements sont requis.'); return; }
    state.consents.termsAccepted = {accepted:true,acceptedAt:new Date().toISOString(),version:'1.0'};
    state.consents.privacyAccepted = {accepted:true,acceptedAt:new Date().toISOString(),version:'1.0'};
    state.consents.healthDisclaimerAccepted = {accepted:true,acceptedAt:new Date().toISOString(),version:'1.0'};
    saveState(state);
    location.hash = '#/dashboard';
  };
}

async function router(){
  const hash = location.hash || '#/dashboard';
  const path = hash.replace('#/','').split('?')[0] || 'dashboard';
  setActiveNav(path);

  // Quote pill
  const core = await loadCore();
  const quotes = core.quotes?.quotes || core.quotes || [];
  if(Array.isArray(quotes) && quotes.length){
    const q = quotes[Math.floor(Date.now()/1000/60) % quotes.length];
    document.getElementById('pillQuote').textContent = (typeof q === 'string') ? q : (q.text||q.quote||'…');
  } else {
    document.getElementById('pillQuote').textContent = '…';
  }
  document.getElementById('buildInfo').textContent = 'Build: local • ' + new Date().toISOString().slice(0,10);

  if(!ensureConsents()){
    await onboardingGate();
    return;
  }

  if(path==='dashboard') return await viewDashboard();
  if(path==='today') return await viewToday();
  if(path==='sessions') return await viewSessions();
  if(path==='nutrition') return await viewNutrition();
  if(path==='journal') return await viewJournal();
  if(path==='charts') return await viewCharts();
  if(path==='chat') return await viewChat();
  if(path==='settings') return await viewSettings();
  if(path==='legal') return await viewLegal();
  return await viewDashboard();
}

function setupUi(){
  const btn = document.getElementById('btnToggleSidebar');
  const sidebar = document.getElementById('sidebar');
  btn.onclick = ()=>{
    const open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    state.ui.sidebarOpen = open;
    saveState(state);
  };
  if(state.ui.sidebarOpen) sidebar.classList.add('open');

  document.getElementById('btnExport').onclick = ()=> exportData();
  document.getElementById('btnErase').onclick = async ()=>{
    if(!confirm('Supprimer toutes les données locales (journal, médias, paramètres) ?')) return;
    localStorage.removeItem(LS_KEY);
    await wipeAllMedia();
    state = defaultState();
    saveState(state);
    location.hash = '#/dashboard';
  };

  // Close sidebar on nav click (mobile)
  document.querySelectorAll('.nav__item').forEach(a=>{
    a.onclick = ()=>{
      if(window.innerWidth < 900){
        sidebar.classList.remove('open');
        state.ui.sidebarOpen = false;
        saveState(state);
      }
    };
  });
}

async function exportData(){
  // Build a JSON export + media manifest (blobs not included for size; user can extend later)
  const payload = {
    exportedAt: new Date().toISOString(),
    state: state,
    note: "Export JSON. Médias stockés en IndexedDB ne sont pas inclus dans ce fichier (manifest uniquement)."
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `holistic_armor_export_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Init
window.addEventListener('hashchange', router);
window.addEventListener('resize', ()=> {
  // re-render charts on resize if needed
  if((location.hash||'').startsWith('#/charts')) router();
});

(async function init(){
  setupUi();
  await router();
})(); 
