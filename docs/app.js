import { toast } from './modules/ui.js';
import { getProfile, setProfile } from './modules/storage.js';
import { renderSettings } from './modules/profile.js';
import { timerHTML, mountTimer } from './modules/timer.js';
import { renderToday } from './modules/today.js';
import { renderNutrition } from './modules/nutrition.js';
import { renderSessions } from './modules/sport.js';
import { renderRecovery } from './modules/recovery.js';
import { renderJournal } from './modules/journal.js';
import { renderCharts } from './modules/charts.js';
import { renderChat } from './modules/chat.js';
import { renderPrivacy } from './modules/privacy.js';

const QUOTES = ["Aujourd’hui, choisis une action simple et fais-la.", "La régularité bat l’intensité sporadique.", "Moins parfait. Plus fait.", "Hydratation, protéines, sommeil: les trois leviers.", "Un pas propre vaut mieux qu’un plan parfait."];
document.getElementById('quote').textContent = QUOTES[Math.floor(Math.random()*QUOTES.length)];

const view = document.getElementById('view');
const nav = document.getElementById('nav');
const sidebar = document.getElementById('sidebar');
const burger = document.getElementById('burger');
const themeBtn = document.getElementById('themeBtn');
const planBadge = document.getElementById('planBadge');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
document.getElementById('modalClose').addEventListener('click', ()=> modal.close());
modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.close(); });

window.__HA_TOAST = (t)=>toast(t);
window.__HA_OPEN_MODAL = (title, html, after)=>openModal(title, html, false, after);

burger.addEventListener('click', ()=> sidebar.classList.toggle('open'));

function applyPrefs(){
  const p=getProfile();
  document.documentElement.dataset.theme = p.preferences?.theme || 'armor_vision';
  document.documentElement.dataset.density = p.preferences?.density || 'comfortable';
}
applyPrefs();

themeBtn.onclick=()=>{
  const p=getProfile();
  const order=['armor_vision','holistic_studio','minimal_dark','minimal_light'];
  const cur=p.preferences?.theme || 'armor_vision';
  const next=order[(order.indexOf(cur)+1)%order.length];
  p.preferences = p.preferences || {};
  p.preferences.theme = next;
  setProfile(p);
  applyPrefs();
  toast('Thème: '+next);
};

function openModal(title, html, close=false, afterRender=null){
  if(close){ modal.close(); return; }
  modalTitle.textContent = title || 'Détail';
  modalBody.innerHTML = html || '';
  modal.showModal();
  afterRender?.();
}

function setActive(route){
  [...nav.querySelectorAll('.nav-item')].forEach(b=> b.classList.toggle('active', b.dataset.route===route));
}

const routes = {
  dashboard: renderDashboard,
  today: ()=>renderToday(view),
  sessions: ()=>renderSessions(view, (t,h,after)=>openModal(t,h,false,after), (preset)=>{ window.__HA_TIMER_PRESET=preset; go('dashboard'); }),
  nutrition: ()=>renderNutrition(view),
  recovery: ()=>renderRecovery(view),
  journal: ()=>renderJournal(view),
  charts: ()=>renderCharts(view),
  chat: ()=>renderChat(view),
  settings: ()=>renderSettings(view, ()=>{ applyPrefs(); toast('Profil enregistré.'); }),
  privacy: ()=>renderPrivacy(view),
};

nav.addEventListener('click', (e)=>{
  const btn = e.target.closest('.nav-item');
  if(!btn) return;
  const r=btn.dataset.route;
  go(r);
  if(window.innerWidth<880) sidebar.classList.remove('open');
});

function go(route){
  if(!routes[route]) route='dashboard';
  history.replaceState({},'', '#'+route);
  setActive(route);
  routes[route]();
}

window.addEventListener('hashchange', ()=>{
  const r=(location.hash||'').replace('#','') || 'dashboard';
  go(r);
});

function renderDashboard(){
  planBadge.textContent='Plan: Free';
  const p=getProfile();
  const preset = window.__HA_TIMER_PRESET || { seconds: 20*60, label: '' };
  view.innerHTML = `
    <div class="grid cols2">
      <div class="card">
        <div class="h1">Tableau de bord</div>
        <div class="muted">Local-first • Non médical • Personnalisable</div>
        <hr/>
        <div class="row">
          <div class="badge">Profil: ${p.firstName || 'non renseigné'}</div>
          <div class="badge">Objectif: ${p.goals?.primary || '—'}</div>
          <div class="badge">Phase: ${p.lifeStage || 'none'}</div>
        </div>
        <div class="field">
          <label>Actions rapides</label>
          <div class="row">
            <button class="btn" id="goToday">Aujourd’hui</button>
            <button class="btn secondary" id="goSessions">Séances</button>
            <button class="btn secondary" id="goNutrition">Nutrition</button>
            <button class="btn secondary" id="goRecovery">Récupération</button>
          </div>
        </div>
        <div class="muted small" style="margin-top:10px">
          Astuce: complète aussi les jours manquants dans <b>Journal</b> → analyses plus fiables.
        </div>
      </div>
      <div class="card" id="timerCard">
        <div class="h1">Minuteur</div>
        <div class="muted small">Start / Pause / Stop • jamais de relance automatique.</div>
        <hr/>
        ${timerHTML()}
      </div>
    </div>
  `;
  view.querySelector('#goToday').onclick=()=>go('today');
  view.querySelector('#goSessions').onclick=()=>go('sessions');
  view.querySelector('#goNutrition').onclick=()=>go('nutrition');
  view.querySelector('#goRecovery').onclick=()=>go('recovery');

  const timerCard = view.querySelector('#timerCard');
  const t = mountTimer(timerCard, preset);
  window.__HA_TIMER_PRESET = null;
}

try{
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}catch(e){}

go((location.hash||'').replace('#','') || 'dashboard');
