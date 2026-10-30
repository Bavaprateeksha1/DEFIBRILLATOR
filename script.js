// Virtual Defibrillator Lab – ALL data is simulated and illustrative.
const $=id=>document.getElementById(id);
const NAMES={normal:'Normal',afib:'A-fib',vfib:'V-fib'};
const C_UF=32e-6, Z=75; // illustrative capacitance (F) and patient impedance (ohm)
let S,beats,nextBeat,buf1,buf2,N=800,T0=performance.now(),t=0,last=0;
function init(full){
  S={def:false,sim:false,rhythm:'normal',mode:'sync',energy:+$('en').value,thr:+$('thr').value,
     state:'off',stored:0,tC:0,dur:1,pending:null,blank:-1,out:null,done:new Set(),rows:full||!S?[]:S.rows,hrB:null,zap:-9};
  ['c_ecg','c_ch1','c_ch2','c_pads'].forEach(i=>$(i).checked=false);
  beats=[];nextBeat=t+.2;buf1=Array(N).fill(0);buf2=Array(N).fill(0);
  $('en').disabled=false;
  $('log').innerHTML='';say('Lab ready. Start with Step 1.');ui();renderRows();
}
function say(m,c=''){const l=document.createElement('li');l.className=c;l.textContent=m;$('log').prepend(l);}
const g=(x,m,s)=>Math.exp(-(((x-m)/s)**2)/2);
function hr(){if(S.rhythm==='vfib'||beats.length<3)return null;const b=beats.slice(-6);return Math.round((b.length-1)/(b[b.length-1].t-b[0].t)*60);}
function ecg(tt){
  if(!S.sim||!$('c_ecg').checked)return 0;
  if(tt<S.blank){ // protective blanking after shock
    const d=tt-S.zap;return d<.04?(Math.random()-.5)*6*(1-d/.04):0;}
  let v=(Math.random()-.5)*.03;
  if(S.rhythm==='vfib'){return v+.55*Math.sin(6.28*(4.2*tt+.8*Math.sin(.9*tt)))*(.6+.4*Math.sin(1.3*tt))+.25*Math.sin(6.28*7.1*tt+2);}
  for(const b of beats){const x=tt-b.t;if(x<-.25||x>.6)continue;
    v+=-.12*g(x,-.03,.012)+b.a*g(x,0,.012)-.2*g(x,.03,.012)+.25*g(x,.22,.05);
    if(S.rhythm==='normal')v+=.12*g(x,-.16,.03);}
  if(S.rhythm==='afib')v+=.05*Math.sin(6.28*7*tt)+.03*Math.sin(6.28*11*tt+1);
  return v;}
function syncP(tt){if(!S.sim||!$('c_ch2').checked)return 0;
  return beats.some(b=>b.a>=S.thr&&tt-b.t>=0&&tt-b.t<.08)?1:0;}
function step(){
  const now=(performance.now()-T0)/1000;
  while(last<now){last+=1/200;t=last;
    while(nextBeat<=t){if(S.rhythm!=='vfib'){beats.push({t:nextBeat,a:S.rhythm==='afib'?.6+Math.random()*.5:1});beats=beats.slice(-10);}
      nextBeat+=S.rhythm==='normal'?60/72+(Math.random()-.5)*.01:S.rhythm==='afib'?.35+Math.random()*.5:.3;}
    buf1.push(ecg(t));buf1.shift();buf2.push(syncP(t));buf2.shift();
    if(S.pending){const b=beats.find(b=>b.t>S.pending.t0&&b.a>=S.thr&&t-b.t>=.01&&t-b.t<.03);
      if(b)fire();else if(t-S.pending.t0>3){say('SYNC timeout: no sync pulse detected (lower the threshold). Still charged.','bad');S.pending=null;ui();}}
    if(S.out&&t>=S.blank)outcome();
    if(S.state==='charging'){const p=Math.min(1,(t-S.tC)/S.dur);S.stored=S.energy*p;
      if(p>=1){S.state='charged';say(`Capacitor charged to ${S.energy} J – ready.`,'ok');ui();}}
  }
  draw();$('lE').textContent=Math.round(S.stored);$('lU').textContent=Math.round(S.stored/3.6);
  $('lV').textContent=(Math.sqrt(2*S.stored/C_UF)/1000).toFixed(2);$('cbar').style.width=S.stored/360*100+'%';
  const h=hr();$('hr').textContent=h??'--';$('rh').textContent=S.sim&&$('c_ecg').checked?NAMES[S.rhythm]:'--';
  requestAnimationFrame(step);}
function draw(){
  const c=$('scope'),x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);
  x.strokeStyle='#0f3a2f';x.lineWidth=1;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*W/8,0);x.lineTo(i*W/8,H);x.stroke();}
  for(let i=0;i<=8;i++){x.beginPath();x.moveTo(0,i*H/8);x.lineTo(W,i*H/8);x.stroke();}
  const tr=(b,off,sc,col)=>{x.strokeStyle=col;x.lineWidth=2;x.beginPath();
    b.forEach((v,i)=>{const px=i/N*W,py=off-Math.max(-2.2,Math.min(2.2,v))*sc;i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();};
  if($('c_ch1').checked)tr(buf1,H*.36,70,'#facc15');
  if($('c_ch2').checked)tr(buf2,H*.92,-50,'#22d3ee');
  if(S.mode==='sync'&&S.def&&$('c_ch2').checked){x.fillStyle='#f472b6';x.font='14px monospace';
    beats.forEach(b=>{if(b.a>=S.thr){const px=(b.t-(t-4))/4*W;if(px>0&&px<W)x.fillText('▼S',px-8,H*.36-90);}});}
  if(t<S.blank){x.fillStyle='#fbbf24';x.font='bold 16px monospace';x.fillText('ECG INPUT BLANKED (protection)',10,24);}
  if(!S.def||!S.sim)x.fillStyle='#64748b',x.font='16px monospace',x.fillText('Switch on equipment & connect cables…',10,H-10);}
function drawPulse(E){
  const c=$('pulse'),x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);
  x.strokeStyle='#0f3a2f';for(let i=0;i<=6;i++){x.beginPath();x.moveTo(i*W/6,0);x.lineTo(i*W/6,H);x.stroke();}
  const V=Math.sqrt(2*E/C_UF);x.strokeStyle='#f87171';x.lineWidth=2;x.beginPath();
  for(let i=0;i<=W;i++){const ms=i/W*12,u=ms/2.5,v=u*Math.exp(1-u);i?x.lineTo(i,H-15-v*(H-40)):x.moveTo(i,H-15);}x.stroke();
  x.fillStyle='#93a3bd';x.font='12px monospace';x.fillText('0 ms',4,H-2);x.fillText('12 ms',W-44,H-2);
  $('pinfo').textContent=`E=${E} J · ~${(V/1000).toFixed(2)} kV peak · ~${Math.round(V/Z*.35)} A peak into ${Z} Ω (illustrative)`;}
// ---- Defibrillator actions
function charge(){
  if(!S.def)return say('Defibrillator is OFF.','bad');
  if(S.state==='charging'||S.state==='charged')return;
  S.energy=+$('en').value;S.state='charging';S.tC=t;S.dur=1+S.energy/360*3;$('en').disabled=true;say(`Charging to ${S.energy} J…`);S.done.add('charge');ui();}
function discharge(){
  if(S.state!=='charged')return;
  if(!$('c_pads').checked)return say('Connect the PATIENT pads to the simulator first.','bad');
  if(S.mode==='sync'){
    if(S.rhythm==='vfib'){return say('SYNC inhibited: no R-wave to synchronise with in V-fib. Use MANUAL mode.','bad');}
    if(!$('c_ch2').checked&&0)return;
    S.pending={t0:t};say('SYNC armed: waiting for next R-wave…','wr');ui();
  }else fire();}
function fire(){
  S.pending=null;S.hrB=hr();S.zap=t;S.blank=t+1.3;const E=Math.round(S.stored);
  const ok=(S.rhythm==='afib'&&S.mode==='sync'&&E>=100)||(S.rhythm==='vfib'&&S.mode==='manual'&&E>=200);
  S.out={E,ok,rhythm:S.rhythm,mode:S.mode,hrB:S.hrB};
  S.stored=0;S.state='discharged';drawPulse(E);$('pads').classList.add('zap');setTimeout(()=>$('pads').classList.remove('zap'),500);
  say(`⚡ Shock delivered: ${E} J (${S.mode.toUpperCase()}).`,'wr');ui();}
function outcome(){
  const o=S.out;S.out=null;S.state='idle';$('en').disabled=false;
  let after,msg,cls='wr';
  if(o.rhythm==='normal'){after=o.hrB;msg='Shock given in normal rhythm: not indicated (a real device would not do this).';}
  else if(o.ok){S.rhythm='normal';beats=[];nextBeat=t+.3;after=72;msg=`Success: ${NAMES[o.rhythm]} converted to normal sinus rhythm.`;cls='ok';
    S.done.add(o.rhythm==='afib'?'sa':'sv');}
  else{after=o.hrB;msg=o.rhythm==='vfib'&&o.mode==='sync'?'Failed.':
    `Not converted: ${o.mode==='sync'&&o.rhythm==='vfib'?'wrong mode':o.rhythm==='afib'&&o.mode!=='sync'?'A-fib should use SYNC mode':'energy too low'}. Increase energy (A-fib ≥100 J sync, V-fib ≥200 J manual in this sim) and repeat.`;cls='bad';}
  say(msg,cls);
  S.rows.push({r:NAMES[o.rhythm],n:o.mode==='sync'?'Synchronised (cardioversion)':'Asynchronous (defibrillation)',m:o.mode.toUpperCase(),e:o.E,b:o.hrB??'Not measurable',a:o.rhythm==='vfib'&&!o.ok?'Not measurable':after??'--',o:o.ok?'Converted to Normal':o.rhythm==='normal'?'Not indicated':'Not converted'});
  renderRows();ui();}
function disarm(){if(S.state==='charged'||S.state==='charging'){S.state='idle';S.stored=0;S.pending=null;$('en').disabled=false;say('Disarmed: stored energy dumped internally.');ui();}}
// ---- UI / steps
const STEPS=[
['pw1','Switch ON the DC defibrillator','Press Power on the defibrillator panel.'],
['pw2','Switch ON the ECG simulator','Press Power on the simulator.'],
['cab','Connect simulator output to defib "ECG IN" and defib "ECG OUT" to DSO CH1','Tick the first two cable boxes.'],
['sy1','Select Normal on the simulator with mode SYNC','Normal/A-fib need SYNC; V-fib needs MANUAL.'],
['ch2','Connect SYNCH output to DSO CH2 and observe','The rising edge of the sync pulse coincides with the QRS rising edge.'],
['sy2','Press A-fib and adjust the sync threshold (SYNC mode)','Try the threshold slider: the pulses vanish if it is too high.'],
['charge','Press CHARGE (e.g. 300 J) and watch the display in relative units','Choose the energy first, then charge.'],
['sa','Connect PATIENT pads, discharge in SYNC mode and observe corrected ECG','If still A-fib, charge higher and repeat.'],
['sv','Select V-fib, MANUAL mode, charge and discharge','Repeat the procedure in manual mode.']];
function ui(){
  const cn=$('c_ecg').checked,c1=$('c_ch1').checked,c2=$('c_ch2').checked;
  if(S.def)S.done.add('pw1');if(S.sim)S.done.add('pw2');if(cn&&c1)S.done.add('cab');
  if(S.sim&&S.mode==='sync'&&S.rhythm==='normal'&&cn&&c1)S.done.add('sy1');
  if(S.done.has('sy1')&&c2&&S.rhythm==='normal'&&S.mode==='sync')S.done.add('ch2');
  if(S.done.has('ch2')&&S.rhythm==='afib'&&S.mode==='sync')S.done.add('sy2');
  $('simPwr').classList.toggle('on',S.sim);$('defPwr').classList.toggle('on',S.def);
  document.querySelectorAll('.rb').forEach(b=>b.classList.toggle('on',b.dataset.r===S.rhythm));
  $('mode').textContent='Mode: '+S.mode.toUpperCase();$('lM').textContent=S.mode.toUpperCase();
  $('lS').textContent=!S.def?'OFF':S.pending?'SYNC WAIT':S.state==='idle'?'READY':S.state.toUpperCase();
  $('dis').disabled=!(S.def&&S.state==='charged'&&!S.pending);$('chg').disabled=!S.def||S.state==='charging'||S.state==='charged';
  $('pads').classList.toggle('on',$('c_pads').checked);$('thrV').textContent=S.thr.toFixed(2);$('eV').textContent=$('en').value;
  let cur=true;$('steps').innerHTML=STEPS.map(s=>{const d=S.done.has(s[0]);const k=d?'done':cur?'cur':'';if(!d)cur=false;
    return `<li class="${k}">${s[1]}<small>${s[2]}</small></li>`;}).join('');
  result();}
function renderRows(){
  $('otab').tBodies[0].innerHTML=S.rows.map((r,i)=>`<tr><td>${i+1}</td>${[r.r,r.n,r.m,r.e,r.b,r.a,r.o].map(v=>`<td contenteditable>${v}</td>`).join('')}</tr>`).join('');result();}
function result(){
  const R=S.rows,ok=R.filter(r=>r.o==='Converted to Normal');
  let h='';
  if(!R.length)h='<div class="res">Complete the simulation to generate your result. <i>(Simulated data; illustrative only.)</i></div>';
  else{h=R.map((r,i)=>`<div class="res ${r.o==='Converted to Normal'?'g':'b'}"><b>Trial ${i+1}:</b> ${r.r} rhythm, ${r.m} mode, ${r.e} J → <b>${r.o}</b>${r.o==='Converted to Normal'?` (HR ${r.b} → ${r.a} bpm)`:''}.</div>`).join('');
    const a=ok.some(r=>r.r==='A-fib'),v=ok.some(r=>r.r==='V-fib');
    h+=`<div class="res g"><b>Conclusion:</b> ${a&&v?'Both A-fib (synchronised) and V-fib (manual, asynchronous) were reversed to normal rhythm in the simulation. ':ok.length?'Part of the experiment completed - try the other rhythm too. ':'No successful conversion yet - increase energy / check the mode. '}Thus the working of the defibrillator was studied.</div>`;}
  $('resBox').innerHTML=h+'<p class="hint">All results are generated from an illustrative simulation and are not clinical advice.</p>';}
// ---- events
$('defPwr').onclick=()=>{S.def=!S.def;if(!S.def){S.state='off';S.stored=0;S.pending=null;}else S.state='idle';say('Defibrillator '+(S.def?'ON':'OFF'));ui();};
$('simPwr').onclick=()=>{S.sim=!S.sim;say('ECG simulator '+(S.sim?'ON':'OFF'));beats=[];ui();};
document.querySelectorAll('.rb').forEach(b=>b.onclick=()=>{
  if(!S.sim)return say('Switch ON the simulator first.','bad');
  S.rhythm=b.dataset.r;beats=[];nextBeat=t+.2;S.thr=+$('thr').value;
  const need=S.rhythm==='vfib'?'manual':'sync';
  say(`${NAMES[S.rhythm]} selected. `+(S.mode!==need?`Set mode switch to ${need.toUpperCase()}.`:'Mode is correct.'),S.mode!==need?'wr':'ok');ui();});
$('mode').onclick=()=>{if(S.state==='charging'||S.pending)return;S.mode=S.mode==='sync'?'manual':'sync';say('Mode: '+S.mode.toUpperCase());ui();};
$('thr').oninput=e=>{S.thr=+e.target.value;ui();};$('en').oninput=ui;
$('chg').onclick=charge;$('dis').onclick=discharge;$('dsm').onclick=disarm;
['c_ecg','c_ch1','c_ch2','c_pads'].forEach(i=>$(i).onchange=ui);
$('allc').onclick=()=>{['c_ecg','c_ch1','c_ch2','c_pads'].forEach(i=>$(i).checked=true);say('All cables and pads connected.','ok');ui();};
$('reset').onclick=()=>init(false);$('full').onclick=()=>init(true);
$('addrow').onclick=()=>{S.rows.push({r:'',n:'',m:'',e:'',b:'',a:'',o:''});renderRows();};
$('clr').onclick=()=>{S.rows=[];renderRows();};
$('otab').addEventListener('input',e=>{const tr=e.target.closest('tr');if(!tr||!tr.parentNode.tagName==='TBODY')return;
  const i=tr.rowIndex-2,c=[...tr.cells].slice(1).map(x=>x.textContent);if(S.rows[i]){[S.rows[i].r,S.rows[i].n,S.rows[i].m,S.rows[i].e,S.rows[i].b,S.rows[i].a,S.rows[i].o]=c;}});
S=null;init(true);drawPulse(0);$('pinfo').textContent='No discharge yet';requestAnimationFrame(step);
