import { wipeAll } from './storage.js';
export function renderPrivacy(view){
  view.innerHTML = `
    <div class="card">
      <div class="h1">RGPD & sécurité</div>
      <div class="muted">Local-first par défaut. Non médical.</div>
      <hr/>
      <ul class="muted">
        <li>Données locales: profil, journal, chat, courbes.</li>
        <li>Option API: si activée, messages envoyés à l’endpoint configuré.</li>
        <li>Aucun diagnostic, aucun traitement, aucune posologie.</li>
      </ul>
      <hr/>
      <div class="h2">Effacer toutes les données</div>
      <div class="row"><button class="btn danger" id="wipe">Tout effacer</button></div>
      <div class="muted small" style="margin-top:10px">Action irréversible.</div>
    </div>
  `;
  view.querySelector("#wipe").onclick=()=>{
    wipeAll();
    window.__HA_TOAST?.("Données effacées.");
    location.hash="#dashboard";
    location.reload();
  };
}
