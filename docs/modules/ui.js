export function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));}
export function toast(text, ms=1400){
  const t=document.createElement("div");
  t.textContent=text;
  t.style.position="fixed";
  t.style.left="50%"; t.style.bottom="18px"; t.style.transform="translateX(-50%)";
  t.style.background="rgba(15,22,32,.92)";
  t.style.border="1px solid var(--border)";
  t.style.padding="10px 12px";
  t.style.borderRadius="999px";
  t.style.color="var(--text)";
  t.style.zIndex="80";
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), ms);
}
export function hash(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); }
  return Math.abs(h);
}
export function pick(arr, seed){
  if(!arr?.length) return "";
  return arr[Math.abs(seed)%arr.length];
}
export function dayKey(d=new Date()){
  const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
export function ageFromBirth(birthDate){
  if(!birthDate) return null;
  const d=new Date(birthDate+"T00:00:00");
  if(Number.isNaN(d.getTime())) return null;
  const now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  const m=now.getMonth()-d.getMonth();
  if(m<0 || (m===0 && now.getDate()<d.getDate())) age--;
  return age;
}
