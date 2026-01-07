// modules/billing.js
import { getProfile } from './profile.js';

const LS_PLAN = 'ha_plan';
const LS_LICENSE = 'ha_license';

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    limits: { chat_api: false, advanced_analytics: false, export: false, templates_pro: false }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    limits: { chat_api: true, advanced_analytics: true, export: true, templates_pro: true }
  }
};

export function getPlan() {
  return localStorage.getItem(LS_PLAN) || 'free';
}

export function setPlan(planId) {
  localStorage.setItem(LS_PLAN, planId);
  window.dispatchEvent(new CustomEvent('ha:plan-changed', { detail: { planId } }));
}

export function isPro() {
  return getPlan() === 'pro';
}

// Local-only license: user receives code after PayPal payment (manual fulfillment).
// License format: HA-PRO-<base64(payload)>.<sig>
// payload = JSON { email, ts, exp, deviceHint? }
const SECRET_HINT = 'HolisticArmor_LocalOnly'; // not a real secret; just tamper-evident

function sha256(str) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(buf => {
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2,'0')).join('');
  });
}

export async function verifyLicense(license) {
  try {
    if (!license || !license.startsWith('HA-PRO-')) return { ok:false, reason:'format' };
    const body = license.slice('HA-PRO-'.length);
    const parts = body.split('.');
    if (parts.length !== 2) return { ok:false, reason:'format2' };
    const payloadB64 = parts[0];
    const sig = parts[1];
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);
    const expected = await sha256(payloadB64 + '|' + SECRET_HINT);
    if (sig !== expected) return { ok:false, reason:'sig' };
    const now = Date.now();
    if (payload.exp && now > payload.exp) return { ok:false, reason:'expired' };
    return { ok:true, payload };
  } catch(e) {
    return { ok:false, reason:'exception' };
  }
}

export async function applyLicense(license) {
  const v = await verifyLicense(license);
  if (v.ok) {
    localStorage.setItem(LS_LICENSE, license);
    setPlan('pro');
  }
  return v;
}

export async function autoApplyStoredLicense() {
  const lic = localStorage.getItem(LS_LICENSE);
  if (!lic) return;
  const v = await verifyLicense(lic);
  if (v.ok) setPlan('pro');
}

export function requirePro(featureName) {
  if (isPro()) return true;
  const el = document.querySelector('[data-pro-cta]');
  if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
  alert(`Fonction "${featureName}" disponible en Pro.`);
  return false;
}

export function paypalSupportLink() {
  // Replace with your real PayPal.me or hosted button URL
  return 'https://www.paypal.me/TONLIEN';
}

export function renderBillingPanel(container) {
  const plan = getPlan();
  const profile = getProfile();
  container.innerHTML = `
    <div class="card">
      <div class="card-h">
        <h2>Plans</h2>
        <span class="pill">${plan.toUpperCase()}</span>
      </div>
      <p class="muted">
        Holistic Armor est un outil de bien-être/éducation. Local-first : vos données restent sur l'appareil.
      </p>

      <div class="grid2">
        <div class="plan">
          <h3>Free</h3>
          <ul>
            <li>Suivi quotidien + historique</li>
            <li>Timer complet (start/pause/stop)</li>
            <li>Chat offline (base de connaissances)</li>
            <li>Nutrition & séances (templates)</li>
          </ul>
        </div>

        <div class="plan pro">
          <h3>Pro</h3>
          <ul>
            <li>Chat IA via API (optionnel)</li>
            <li>Analyses avancées & exports</li>
            <li>Templates nutrition/sport Pro</li>
            <li>Support prioritaire</li>
          </ul>
        </div>
      </div>

      <div class="card" data-pro-cta style="margin-top:14px;">
        <h3>Débloquer Pro (PayPal)</h3>
        <p class="muted">
          Sans serveur : le déblocage se fait par <b>code licence</b> (envoi manuel après paiement).
          PayPal → note de paiement : <b>${(profile.email||'ton email')}</b>.
        </p>
        <div class="row">
          <a class="btn" href="${paypalSupportLink()}" target="_blank" rel="noopener">Ouvrir PayPal</a>
          <button class="btn2" id="btnShowLic">J'ai un code</button>
        </div>
        <div id="licBox" class="hidden" style="margin-top:10px;">
          <label class="lbl">Code licence Pro</label>
          <input id="licInput" class="inp" placeholder="HA-PRO-..." />
          <div class="row" style="margin-top:8px;">
            <button class="btn" id="btnApplyLic">Activer</button>
            <button class="btn2" id="btnHideLic">Annuler</button>
          </div>
          <div id="licMsg" class="muted" style="margin-top:8px;"></div>
        </div>
      </div>
    </div>
  `;

  const licBox = container.querySelector('#licBox');
  container.querySelector('#btnShowLic').onclick = () => licBox.classList.remove('hidden');
  container.querySelector('#btnHideLic').onclick = () => licBox.classList.add('hidden');
  container.querySelector('#btnApplyLic').onclick = async () => {
    const lic = container.querySelector('#licInput').value.trim();
    const msg = container.querySelector('#licMsg');
    msg.textContent = 'Vérification...';
    const v = await applyLicense(lic);
    if (v.ok) msg.textContent = 'Pro activé sur cet appareil.';
    else msg.textContent = 'Code invalide ('+v.reason+').';
  };
}
