let sonHata='', secili=[];
const SLASH={'/log-analiz':'pm2 logs otonom-beyin --lines 15 --nostream ve data/qodi_autofix_log.json kayitlarini incele','/portfoy-rapor':'data/sanal_portfoy.json ve data/equity_curve.json dosyalarini oku, net K/Z ve stop mesafelerini analiz et','/backtest':'python3 python/realistic_backtest_engine.py calistir ve sonuclari ozetle','/go-nogo':'python3 python/go_no_go_audit_engine.py calistir ve canli gecis onay raporunu sun','/refactor':'Secili dosyalardaki gereksiz tekrarlari analiz et'};
function slash(k){document.getElementById('mod').value='plan';document.getElementById('cmd').value=SLASH[k]||k;ai();}
function kopyala(){navigator.clipboard?.writeText(document.getElementById('out').textContent);}
function run(c){const o=document.getElementById('out'),p=document.getElementById('pin').value,hb=document.getElementById('healBtn'),hd=document.getElementById('hedef')?.value;hb.style.display='none';o.textContent='Calisiyor: '+c;const realCmd=(hd==='windows'||hd==='ps')?'python3 /opt/hibrit-konsol/win_bridge.py '+JSON.stringify(hd==='ps'?'powershell -NoProfile -Command '+JSON.stringify(c):c):c;fetch('/api/cmd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:realCmd,pin:p})}).then(r=>r.json()).then(d=>{const txt=('$ '+c+String.fromCharCode(10,10)+(d.out||'Tamamlandi.')).split(String.fromCharCode(27)).join('');o.textContent=txt;if(!d.ok||/Traceback|Error|BLOCKED/i.test(txt)){sonHata=txt.slice(-1000);hb.style.display='inline-block';}}).catch(e=>o.textContent='Hata: '+e);}
function ai(){let r=document.getElementById('cmd').value.trim();if(SLASH[r])r=SLASH[r];const bag=secili.length?' [Odak dosyalar: '+secili.map(x=>x.yol).join(', ')+']':'';const q=(r+bag).replace(/'/g,"'\\''"),m=document.getElementById('mod').value,dp=document.getElementById('deep').checked?' --deep':'',mdl=document.getElementById('model').value,trg=document.getElementById('hedef')?.value||'ubuntu';run('AI_TARGET='+trg+' GROQ_MODEL='+mdl+" python3 python/ai_coder_agent.py --mode "+m+dp+" '"+q+"'");}
function selfHeal(){document.getElementById('mod').value='build';document.getElementById('cmd').value='Son hatayi analiz et ve duzelt';ai();}
function favoriEkle(){const c=document.getElementById('cmd').value.trim();if(!c)return;const ad=prompt('Favori adi:',c.slice(0,16));if(!ad)return;const b=document.createElement('button');b.textContent='⭐ '+ad;b.style='background:#161b22;color:#e3b341;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer';b.onclick=()=>{document.getElementById('cmd').value=c;run(c);};document.getElementById('favBar').appendChild(b);}
function dosyaSec(yol,boyut,el){const i=secili.findIndex(x=>x.yol===yol);if(i>=0){secili.splice(i,1);el.style.color='#c9d1d9';}else{secili.push({yol,boyut});el.style.color='#7ee787';}document.getElementById('tok').textContent='Bağlam: '+secili.length+' dosya (~'+secili.reduce((a,x)=>a+Math.round(x.boyut/4),0)+' token)';}
fetch('/api/files').then(r=>r.json()).then(L=>{const t=document.getElementById('tree');t.innerHTML='';L.forEach(f=>{const d=document.createElement('div');d.textContent='📄 '+f.yol;d.style='cursor:pointer;padding:3px 4px;border-radius:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';d.onmouseover=()=>d.style.background='#21262d';d.onmouseout=()=>d.style.background='transparent';d.onclick=()=>dosyaSec(f.yol,f.boyut,d);t.appendChild(d);});});
function tel(){fetch('/api/telemetry').then(r=>r.json()).then(t=>document.getElementById('tel').textContent='CPU: '+t.cpu+' | RAM: '+t.ram+' | Up: '+t.up).catch(()=>{});}
function canliLog(){fetch('/api/live').then(r=>r.text()).then(t=>document.getElementById('livePane').textContent=t).catch(()=>{});}
tel();canliLog();setInterval(tel,5000);setInterval(canliLog,15000);

function dosyaYukle(inp){
  const f = inp.files[0]; if(!f) return;
  const o = document.getElementById('out'); o.textContent = '⏳ Yükleniyor: ' + f.name;
  const r = new FileReader();
  r.onload = () => {
    const b64 = r.result.split(',')[1];
    fetch('/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ad:f.name,b64,pin:document.getElementById('pin').value})})
      .then(res=>res.json()).then(d=>{ o.textContent = d.msg || 'Tamamlandı'; inp.value=''; });
  };
  r.readAsDataURL(f);
}
