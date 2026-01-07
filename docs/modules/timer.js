export class PerfectTimer {
  constructor(opts){
    this.total = Math.max(1, opts?.seconds ?? 20*60);
    this.remaining = this.total;
    this.running = false;
    this._t0 = null;
    this._raf = null;
    this.onTick = opts?.onTick || (()=>{});
    this.onDone = opts?.onDone || (()=>{});
    this.label = opts?.label || "";
    this._wakeLock = null;
  }

  setSeconds(seconds){
    if(this.running) return;
    this.total = Math.max(1, seconds);
    this.remaining = this.total;
    this.onTick(this.remaining, this.total);
  }

  async _setWakeLock(on){
    try{
      if(!('wakeLock' in navigator)) return;
      if(on && !this._wakeLock) this._wakeLock = await navigator.wakeLock.request('screen');
      if(!on && this._wakeLock){ await this._wakeLock.release(); this._wakeLock = null; }
    }catch(e){}
  }

  start(){
    if(this.running) return;
    if(this.remaining<=0) this.remaining=this.total; // only restart on explicit start
    this.running = true;
    this._t0 = performance.now();
    this._lastSecond = Math.ceil(this.remaining);
    this._setWakeLock(true);
    this._loop();
  }

  pause(){
    if(!this.running) return;
    this.running = false;
    cancelAnimationFrame(this._raf);
    this._raf = null;
    this._setWakeLock(false);
    this.onTick(this.remaining, this.total);
  }

  stop(reset=true){
    this.running = false;
    cancelAnimationFrame(this._raf);
    this._raf = null;
    this._setWakeLock(false);
    if(reset){
      this.remaining = this.total;
      this.onTick(this.remaining, this.total);
    }
  }

  _loop(){
    if(!this.running) return;
    const now = performance.now();
    const dt = (now - this._t0) / 1000;
    const rem = Math.max(0, this.total - dt);
    this.remaining = rem;

    const sec = Math.ceil(rem);
    if(sec !== this._lastSecond){
      this._lastSecond = sec;
      this.onTick(this.remaining, this.total);
      if(rem<=0){
        this.running = false;
        this._setWakeLock(false);
        this.onDone();
        return;
      }
    }
    this._raf = requestAnimationFrame(()=>this._loop());
  }
}

export function timerHTML(){
  return `
    <div class="timer">
      <svg viewBox="0 0 120 120" aria-label="timer">
        <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,.08)" stroke-width="10" fill="none"/>
        <circle id="tRing" cx="60" cy="60" r="52"
          stroke="rgba(192,123,69,.92)" stroke-width="10" fill="none" stroke-linecap="round"
          transform="rotate(-90 60 60)" stroke-dasharray="327" stroke-dashoffset="0"/>
      </svg>
      <div id="tTime" class="time">20:00</div>
      <div id="tSub" class="sub">Prêt.</div>
      <div class="controls">
        <button class="btn" id="tStart">Démarrer</button>
        <button class="btn secondary" id="tPause">Pause</button>
        <button class="btn danger" id="tStop">Stop</button>
      </div>
      <div class="controls">
        <button class="btn secondary" id="tMinus">- 1 min</button>
        <button class="btn secondary" id="tPlus">+ 1 min</button>
        <button class="btn secondary" id="tFull">Plein écran</button>
      </div>
      <div class="muted small">Start/Pause/Stop fiables. Pas de relance automatique.</div>
    </div>
  `;
}

export function mountTimer(container, opts){
  const ring = container.querySelector("#tRing");
  const timeEl = container.querySelector("#tTime");
  const subEl = container.querySelector("#tSub");
  const startBtn = container.querySelector("#tStart");
  const pauseBtn = container.querySelector("#tPause");
  const stopBtn = container.querySelector("#tStop");
  const minusBtn = container.querySelector("#tMinus");
  const plusBtn = container.querySelector("#tPlus");
  const fullBtn = container.querySelector("#tFull");

  const C = 2*Math.PI*52;
  ring.setAttribute("stroke-dasharray", String(C));

  const t = new PerfectTimer({
    seconds: opts?.seconds ?? 20*60,
    label: opts?.label ?? "",
    onTick:(rem,total)=>render(rem,total),
    onDone:()=>{ subEl.textContent="Terminé."; render(0, t.total); }
  });

  function fmt(s){
    s = Math.max(0, Math.floor(s));
    const m=Math.floor(s/60), r=s%60;
    return String(m).padStart(2,'0')+":"+String(r).padStart(2,'0');
  }
  function render(rem,total){
    timeEl.textContent = fmt(rem);
    const progress = total>0 ? (rem/total) : 0;
    ring.setAttribute("stroke-dashoffset", String(C*(1-progress)));
  }

  startBtn.onclick=()=>{ t.start(); subEl.textContent = t.label ? ("En cours • "+t.label) : "En cours…"; };
  pauseBtn.onclick=()=>{ t.pause(); subEl.textContent = "Pause."; };
  stopBtn.onclick=()=>{ t.stop(true); subEl.textContent = "Prêt."; };

  minusBtn.onclick=()=>{ if(t.running) return; t.setSeconds(Math.max(60, t.total-60)); subEl.textContent="Prêt."; };
  plusBtn.onclick=()=>{ if(t.running) return; t.setSeconds(Math.min(90*60, t.total+60)); subEl.textContent="Prêt."; };
  fullBtn.onclick=()=>{ container.requestFullscreen?.().catch(()=>{}); };

  render(t.remaining, t.total);
  return t;
}
