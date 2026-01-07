const CACHE = "ha-v1";
const ASSETS = [
  "./","./index.html","./app.css","./app.js",
  "./modules/ui.js","./modules/storage.js","./modules/profile.js","./modules/timer.js",
  "./modules/today.js","./modules/nutrition.js","./modules/sport.js","./modules/recovery.js",
  "./modules/journal.js","./modules/charts.js","./modules/chat.js","./modules/privacy.js",
  "./data/schemas/user_profile.schema.json",
  "./data/nutrition/nutrition_rules.json",
  "./data/sport/programs.json",
  "./data/recovery/sleep_stress.json",
  "./data/chat/intents.json"
];
self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", (e)=>{
  e.respondWith(
    caches.match(e.request).then(cached=> cached || fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=> cached || caches.match("./index.html")))
  );
});
