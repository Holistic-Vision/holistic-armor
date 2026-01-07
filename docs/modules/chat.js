import { esc, hash, pick, dayKey } from './ui.js';
import { getProfile, getJournal, getChatHistory, setChatHistory } from './storage.js';

let INTENTS=null;
async function loadIntents(){
  if(INTENTS) return INTENTS;
  const res=await fetch('./data/chat/intents.json', {cache:'no-store'});
  INTENTS=await res.json();
  return INTENTS;
}

function normalize(s){
  return String(s||"").toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/[^a-z0-9\s']/g," ")
    .replace(/\s+/g," ").trim();
}

function matchIntent(text, intents){
  const t=normalize(text);
  for(const it of (intents.intents||[])){
    if((it.triggers||[]).some(tr=>t.includes(normalize(tr)))) return it;
  }
  return null;
}

function buildContext(){
  const p=getProfile();
  const j=getJournal();
  const dates = Object.keys(j).sort().slice(-14);
  const last = dates.map(d=>({date:d, energy:j[d]?.energy, stress:j[d]?.stress, pain:j[d]?.pain, minutes:j[d]?.minutes}));
  return {
    profile:{
      firstName:p.firstName||"",
      sex:p.sex, activity:p.activity, goals:p.goals, lifeStage:p.lifeStage,
      diet:p.diet, allergies:p.allergies, constraints:p.constraints
    },
    last14:last,
    nonMedical:true
  };
}

function offlineReply(msg){
  const p=getProfile();
  const intents=INTENTS;
  const it = matchIntent(msg, intents);
  const seed = hash(dayKey()+"|"+(p.firstName||"")+"|"+msg);
  if(it) return pick(it.responses, seed) || pick(intents.fallback, seed);
  return pick(intents.fallback, seed);
}

async function apiReply(msg){
  const p=getProfile();
  if(!p.api?.enabled || !p.api?.endpoint) throw new Error("API désactivée ou endpoint vide.");
  const headerName = p.api.headerName || "Authorization";
  const headers = { "Content-Type":"application/json" };
  if(p.api.apiKey) headers[headerName] = p.api.apiKey;
  const res = await fetch(p.api.endpoint, { method:"POST", headers, body: JSON.stringify({ message: msg, context: buildContext() }) });
  if(!res.ok) throw new Error("HTTP "+res.status);
  const data = await res.json();
  if(typeof data.reply !== "string") throw new Error("Réponse API invalide (attendu: {reply:string}).");
  return data.reply;
}

export async function renderChat(view){
  await loadIntents();
  const p=getProfile();
  const history=getChatHistory();

  view.innerHTML = `
    <div class="card">
      <div class="h1">Chat</div>
      <div class="muted small">Offline: intentions + contexte. Online: option API (Paramètres).</div>
      <hr/>
      <div class="grid cols2">
        <div class="card" style="box-shadow:none">
          <div class="h2">Mode</div>
          <div class="row">
            <div class="badge">Offline: actif</div>
            <div class="badge">API: ${(p.api?.enabled && p.api?.endpoint) ? "activée" : "désactivée"}</div>
          </div>
          <div class="muted small" style="margin-top:10px">Format API attendu: <span class="kbd">{"reply":"..."}</span></div>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="h2">Discussion</div>
          <div id="log" style="display:flex;flex-direction:column;gap:10px;min-height:220px;max-height:360px;overflow:auto;padding:10px;border:1px solid var(--border);border-radius:14px;background:rgba(0,0,0,.12)"></div>
          <div class="field"><label>Message</label><textarea id="msg" placeholder="Ex: 25 min, énergie 6/10, douleur 2/10, objectif sèche"></textarea></div>
          <div class="row" style="margin-top:10px">
            <button class="btn" id="send">Envoyer</button>
            <button class="btn secondary" id="sendApi">Envoyer (API)</button>
            <button class="btn danger" id="clear">Vider</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const log=view.querySelector("#log");
  const msg=view.querySelector("#msg");

  function bubble(role,text){
    const d=document.createElement("div");
    d.style.maxWidth="92%";
    d.style.padding="10px 12px";
    d.style.borderRadius="14px";
    d.style.border="1px solid var(--border)";
    d.style.background = role==="me" ? "rgba(58,166,255,.10)" : "rgba(192,123,69,.10)";
    d.style.alignSelf = role==="me" ? "flex-end":"flex-start";
    d.innerHTML = `<div class="muted small" style="margin-bottom:6px">${role==="me"?"Vous":"Holistic Armor"}</div><div>${esc(text)}</div>`;
    log.appendChild(d);
    log.scrollTop=log.scrollHeight;
  }

  history.forEach(m=>bubble(m.role, m.text));

  function push(role,text){
    const h=getChatHistory();
    h.push({role,text,t:new Date().toISOString()});
    setChatHistory(h);
    bubble(role,text);
  }

  view.querySelector("#clear").onclick=()=>{
    setChatHistory([]);
    log.innerHTML="";
    window.__HA_TOAST?.("Historique vidé.");
  };

  view.querySelector("#send").onclick=()=>{
    const text=(msg.value||"").trim();
    if(!text) return;
    msg.value="";
    push("me", text);
    push("bot", offlineReply(text));
  };

  view.querySelector("#sendApi").onclick=async ()=>{
    const text=(msg.value||"").trim();
    if(!text) return;
    msg.value="";
    push("me", text);
    try{
      push("bot", await apiReply(text));
    }catch(e){
      push("bot", "Erreur API: "+String(e.message||e));
    }
  };
}
