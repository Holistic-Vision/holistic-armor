import { dayKey } from './ui.js';

const KEY_PROFILE="ha_profile_v1";
const KEY_JOURNAL="ha_journal_v1";
const KEY_WEIGHTS="ha_weights_v1";
const KEY_CHAT="ha_chat_v1";

export const DEFAULT_PROFILE = {
  firstName:"",
  lastName:"",
  email:"",
  birthDate:"",
  sex:"unspecified", // male|female|unspecified
  heightCm:175,
  weightKg:75,
  activity:"moderate", // low|moderate|high
  goals:{ primary:"cut", secondary:"sleep" }, // cut|recomp|gain|health
  // Life stages & context (non-medical): used only to adapt tips/templates
  lifeStage:"none", // none|menstruation|pregnancy|postpartum|menopause|andropause
  constraints:{ equipment:"none", injuries:"", dislikes:"", schedule:"" },
  prefs:{ diet:"omnivore", allergies:[], avoid:[] },
  units:{ weight:"kg", energy:"kcal" },
  privacy:{ storeApiKeyLocal:true },
  plan:"free"
};

function jget(key, fallback){
  try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; }
}
function jset(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

export function getProfile(){ return jget(KEY_PROFILE, structuredClone(DEFAULT_PROFILE)); }
export function setProfile(p){ jset(KEY_PROFILE, p); }

export function getJournal(){ return jget(KEY_JOURNAL, {}); }
export function setJournal(j){ jset(KEY_JOURNAL, j); }
export function upsertJournal(dateISO, entry){
  const j=getJournal();
  j[dateISO]= { ...(j[dateISO]||{}), ...entry, date: dateISO };
  setJournal(j);
  return j[dateISO];
}

export function getWeights(){ return jget(KEY_WEIGHTS, []); }
export function setWeights(arr){ jset(KEY_WEIGHTS, arr); }
export function addWeight(dateISO, kg){
  const arr=getWeights();
  arr.push({date:dateISO, kg:Number(kg)});
  arr.sort((a,b)=>a.date.localeCompare(b.date));
  setWeights(arr);
  return arr;
}

export function getChatHistory(){ return jget(KEY_CHAT, []); }
export function setChatHistory(arr){ jset(KEY_CHAT, arr); }

export function wipeAll(){
  Object.keys(localStorage).filter(k=>k.startsWith("ha_")).forEach(k=>localStorage.removeItem(k));
}
