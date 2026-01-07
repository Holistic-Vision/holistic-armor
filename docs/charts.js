// Tiny canvas chart helper (no deps)
function renderLineChart(canvas, points, label){
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.clientWidth * devicePixelRatio;
  const H = canvas.height = 240 * devicePixelRatio;
  ctx.clearRect(0,0,W,H);

  const pad = 28 * devicePixelRatio;
  const xs = points.map(p=>p.t);
  const ys = points.map(p=>p.v);
  if(points.length < 2){
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${14*devicePixelRatio}px system-ui`;
    ctx.fillText('Pas assez de données', pad, pad);
    return;
  }
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = (maxY - minY) || 1;

  const xStep = (W - pad*2) / (points.length - 1);
  const yMap = v => H - pad - ((v - minY)/spanY) * (H - pad*2);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1*devicePixelRatio;
  for(let i=0;i<5;i++){
    const y = pad + i*(H-pad*2)/4;
    ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke();
  }

  // Line
  ctx.strokeStyle = 'rgba(255,122,24,0.9)';
  ctx.lineWidth = 2*devicePixelRatio;
  ctx.beginPath();
  points.forEach((p,i)=>{
    const x = pad + i*xStep;
    const y = yMap(p.v);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // Dots
  ctx.fillStyle = 'rgba(255,122,24,0.95)';
  points.forEach((p,i)=>{
    const x = pad + i*xStep;
    const y = yMap(p.v);
    ctx.beginPath(); ctx.arc(x,y,3.5*devicePixelRatio,0,Math.PI*2); ctx.fill();
  });

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.font = `${12*devicePixelRatio}px system-ui`;
  ctx.fillText(label, pad, 16*devicePixelRatio);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(minY.toFixed(1), pad, H - 10*devicePixelRatio);
  ctx.fillText(maxY.toFixed(1), pad, pad + 12*devicePixelRatio);
}
