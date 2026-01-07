// Local-first storage (LocalStorage + IndexedDB blobs) — no external deps.
const LS_KEY = 'ha_state_v1';
const DB_NAME = 'ha_media_v1';
const DB_STORE = 'blobs';

function nowIso(){ return new Date().toISOString(); }

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{ return null; }
}
function saveState(state){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function defaultState(){
  return {
    version: '1.0',
    createdAt: nowIso(),
    profile: {
      timezone: 'Europe/Paris',
      language: 'fr',
      theme: { accent: 'orange', mode: 'dark' },
      notificationMode: 'standard',
      workSchedule: { type: 'custom', notes: '' },
      units: { weight: 'kg', height: 'cm' },
      startDate: new Date().toISOString().slice(0,10),
    },
    consents: {
      termsAccepted: { accepted:false, acceptedAt:null, version:'1.0' },
      privacyAccepted: { accepted:false, acceptedAt:null, version:'1.0' },
      healthDisclaimerAccepted: { accepted:false, acceptedAt:null, version:'1.0' },
      marketingOptIn: { accepted:false, acceptedAt:null, channel:'push' }
    },
    checkins: {}, // date => DailyCheckin-like
    measurements: {}, // date => MeasurementsEntry-like
    adherence: [], // AdherenceEvent-like
    chat: { provider: 'none', model: 'gpt-4.1-mini', endpoint: 'https://api.openai.com/v1/responses', apiKey: '' },
    ui: { sidebarOpen:false }
  };
}

// IndexedDB for media blobs
function openDb(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(DB_STORE)){
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function putBlob(id, blob){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(blob, id);
    tx.oncomplete = ()=> resolve(true);
    tx.onerror = ()=> reject(tx.error);
  });
}
async function getBlob(id){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
}
async function delBlob(id){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = ()=> resolve(true);
    tx.onerror = ()=> reject(tx.error);
  });
}

async function wipeAllMedia(){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = ()=> resolve(true);
    tx.onerror = ()=> reject(tx.error);
  });
}
