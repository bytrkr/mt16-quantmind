import http from 'node:http';
import os from 'node:os';
import { execSync, execFileSync } from 'node:child_process';

const GIZLI_KOD = '1616';
const HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MT16 AI Studio v7.0 (Port 3002)</title></head>
<body style="margin:0;background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:12px">
<div style="max-width:1360px;margin:auto">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #30363d;padding-bottom:8px;margin-bottom:8px;flex-wrap:wrap;gap:6px">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <strong style="color:#58a6ff;font-size:15px">⚡ MT16 AI Studio v7.0 (Self-Healing + Slash + Telemetri)</strong>
      <span id="tel" style="font-size:11px;background:#161b22;border:1px solid #30363d;padding:3px 8px;border-radius:12px;color:#7ee787">⏳ Telemetri...</span>
    </div>
    <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
      <button onclick="run('pm2 status')" style="background:#21262d;color:#fff;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">📊 PM2</button>
      <button onclick="run('cat data/sanal_portfoy.json')" style="background:#21262d;color:#79c0ff;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">💰 Portföy</button>
      <button onclick="run('cat data/gun_sonu_bulteni.md 2>/dev/null || echo Bulten_bekleniyor')" style="background:#21262d;color:#ffa657;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">📰 18:15 Bülten</button>
      <button onclick="run('git status -s && git diff --stat')" style="background:#21262d;color:#7ee787;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">🐙 Git Diff</button>
      <button onclick="run('npm run build && pm2 restart bistapp')" style="background:#1f6feb;color:#fff;border:none;padding:4px 9px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">🔨 3000 Build</button>
      <input id="pin" type="password" value="1616" style="width:50px;background:#161b22;color:#fff;border:1px solid #30363d;padding:3px 6px;border-radius:4px;font-size:11px">
    </div>
  </div>
  <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
    <select id="mod" style="background:#161b22;color:#fff;border:1px solid #30363d;padding:5px;border-radius:4px;font-size:12px;font-weight:bold">
      <option value="plan">🛡️ PLAN (Salt-Okunur)</option>
      <option value="build" selected>🛠️ BUILD (Yedekli)</option>
      <option value="hack">⚡ HACK (4 Tur)</option>
      <option value="audit">🔒 AUDIT (Denetim)</option>
    </select>
    <label style="display:flex;align-items:center;gap:4px;background:#161b22;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px"><input id="deep" type="checkbox" checked> 🧠 Derin Düşün</label>
    <button onclick="slash('/log-analiz')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">/log-analiz</button>
    <button onclick="slash('/portfoy-rapor')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">/portfoy-rapor</button>
    <button onclick="slash('/guvenlik-tara')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">/guvenlik-tara</button>
    <button id="healBtn" onclick="selfHeal()" style="display:none;background:#da3633;color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">🩺 Hatayı AI ile Tek Tıkla Onar</button>
    <button onclick="document.getElementById('out').innerHTML=''" style="margin-left:auto;background:#21262d;color:#8b949e;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer">🧹 Temizle</button>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:8px">
    <textarea id="cmd" rows="3" placeholder="Türkçe talimat, /slash komutu veya Bash komutu yazın..." style="flex:1;background:#010409;color:#7ee787;border:1px solid #30363d;padding:8px;border-radius:4px;font-family:monospace;font-size:12.5px">pm2 status</textarea>
    <button onclick="ai()" style="background:#6e40c9;color:#fff;border:none;padding:0 16px;border-radius:4px;font-weight:bold;cursor:pointer">🤖 AI Çalıştır</button>
    <button onclick="run(document.getElementById('cmd').value)" style="background:#238636;color:#fff;border:none;padding:0 16px;border-radius:4px;font-weight:bold;cursor:pointer">Çalıştır ↵</button>
  </div>
  <pre id="out" style="background:#010409;border:1px solid #30363d;padding:12px;border-radius:6px;white-space:pre-wrap;font-size:12px;min-height:430px;overflow:auto">⚡ MT16 AI Studio v7.0 (Port 3002) Hazır.</pre>
</div>
<script>
let sonHata = '';
const SLASH_MAP = {
  '/log-analiz': 'pm2 logs otonom-beyin --lines 15 --nostream ve data/qodi_autofix_log.json son kayitlarini incele, varsa hatalari ozetle',
  '/portfoy-rapor': 'data/sanal_portfoy.json ve data/equity_curve.json dosyalarini oku; acik pozisyonlari, stop mesafelerini ve net K/Z durumunu analiz et',
  '/guvenlik-tara': 'data/security_audit.log ve python/security_hooks.py dosyalarini denetle; acik risk veya yetkisiz erisim denemesi var mi raporla'
};
function slash(k){ document.getElementById('mod').value='plan'; document.getElementById('cmd').value=SLASH_MAP[k]||k; ai(); }
function renklendir(t){
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/(Traceback|Error|BLOCKED|HATA|errored)/g,'<span style="color:#ff7b72;font-weight:bold">$1</span>')
    .replace(/(OK|online|SAFE|DOGRULANDI|AKTIF)/g,'<span style="color:#7ee787;font-weight:bold">$1</span>');
}
function run(c){
  const o=document.getElementById('out'),p=document.getElementById('pin').value,hb=document.getElementById('healBtn');
  hb.style.display='none'; o.innerHTML='⏳ Çalışıyor...\\n$ '+c;
  fetch('/api/cmd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:c,pin:p})})
    .then(r=>r.json()).then(d=>{
      const txt='$ '+c+'\\n\\n'+(d.out||'Tamamlandı.');
      o.innerHTML=renklendir(txt);
      if(!d.ok || /Traceback|SyntaxError|IndentationError|Error:/i.test(txt)){ sonHata=txt.slice(-1200); hb.style.display='inline-block'; }
    }).catch(e=>o.textContent='Hata: '+e);
}
function ai(){
  let raw=document.getElementById('cmd').value.trim();
  if(SLASH_MAP[raw]) raw=SLASH_MAP[raw];
  const q=raw.replace(/'/g,"'\\\\''"),m=document.getElementById('mod').value,dp=document.getElementById('deep').checked?' --deep':'';
  run("python3 python/ai_coder_agent.py --mode "+m+dp+" '"+q+"'");
}
function selfHeal(){
  document.getElementById('mod').value='build';
  document.getElementById('cmd').value='Su hatayi analiz et ve ilgili dosyayi yedekli sekilde duzelt: '+sonHata;
  ai();
}
function telGuncelle(){
  fetch('/api/telemetry').then(r=>r.json()).then(t=>{
    document.getElementById('tel').textContent='CPU: '+t.cpu+' | RAM: '+t.ram+' | Uptime: '+t.up;
  }).catch(()=>{});
}
telGuncelle(); setInterval(telGuncelle, 5000);
</script></body></html>`;

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/telemetry') {
    const tot = os.totalmem(), free = os.freemem();
    const ram = (((tot - free) / tot) * 100).toFixed(1) + '%';
    const cpu = os.loadavg().toFixed(2);
    const up = Math.floor(os.uptime() / 3600) + 's';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ cpu, ram, up }));
  }
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML);
  }
  if (req.method === 'POST' && req.url === '/api/cmd') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      try {
        const { cmd, pin } = JSON.parse(body || '{}');
        if (String(pin) !== GIZLI_KOD) return res.end(JSON.stringify({ ok: false, out: '🔒 Geçersiz PIN!' }));
        const chk = execFileSync('python3', ['python/security_hooks.py', String(cmd || '')], { cwd: process.cwd(), encoding: 'utf-8' }).trim();
        if (chk.startsWith('BLOCKED|')) return res.end(JSON.stringify({ ok: false, out: '🛡️ ' + chk.split('|').slice(1).join('|') }));
        const out = execSync(String(cmd), { cwd: process.cwd(), encoding: 'utf-8', timeout: 120000, maxBuffer: 1024 * 1024 * 4 });
        res.end(JSON.stringify({ ok: true, out: out || 'Tamamlandı.' }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, out: String(e?.stdout || e?.stderr || e?.message || e) }));
      }
    });
  }
}).listen(3002, '0.0.0.0', () => console.log('AI_STUDIO_V7_3002_AKTIF'));
