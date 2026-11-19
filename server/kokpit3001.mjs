process.chdir("/home/bytrkr/bistapp");
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';

const GIZLI_KOD = '1616';
const HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MT16 AI Studio v8.0 (Port 3001)</title></head>
<body style="margin:0;background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:10px">
<div style="max-width:1540px;margin:auto">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #30363d;padding-bottom:7px;margin-bottom:7px;flex-wrap:wrap;gap:5px">
    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
      <strong style="color:#58a6ff;font-size:14.5px">⚡ MT16 AI Studio v8.0 (3001)</strong>
      <span id="tel" style="font-size:11px;background:#161b22;border:1px solid #30363d;padding:3px 8px;border-radius:12px;color:#7ee787">⏳ Telemetri...</span>
      <span id="alarmBadge" style="font-size:11px;background:#161b22;border:1px solid #30363d;padding:3px 8px;border-radius:12px;color:#7ee787">🛡️ 0 Alarm</span><span id="tok" style="font-size:11px;background:#161b22;border:1px solid #30363d;padding:3px 8px;border-radius:12px;color:#d2a8ff">Bağlam: 0 dosya (~0 token)</span>
    </div>
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
      <select id="model" style="background:#161b22;color:#79c0ff;border:1px solid #30363d;padding:4px 6px;border-radius:4px;font-size:11px"><option value="llama-3.3-70b-versatile">🦙 Llama-3.3-70B (Hızlı)</option><option value="deepseek-r1-distill-llama-70b">🧠 DeepSeek-R1 (Derin)</option><option value="qwen-qwq-32b">⚡ Qwen-32B (Kodlama)</option></select>
      <select id="hedef" style="background:#161b22;color:#7ee787;border:1px solid #30363d;padding:4px 6px;border-radius:4px;font-size:11px"><option value="ubuntu">🐧 Ubuntu (Sunucu)</option><option value="windows">🪟 Windows CMD</option><option value="ps">⚡ Windows PowerShell</option></select>
      <input type="file" id="upFile" style="display:none" onchange="dosyaYukle(this)"><button onclick="document.getElementById('upFile').click()" style="background:#8957e5;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">📤 Dosya/ZIP Yükle</button><button id="saveFileBtn" onclick="dosyaKaydet()" style="display:none;background:#238636;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">💾 Dosyayı Kaydet</button><select id="fmtSecici" onchange="formatDonustur(this.value)" style="background:#161b22;color:#d2a8ff;border:1px solid #30363d;padding:3px 6px;border-radius:4px;font-size:11px;cursor:pointer"><option value="">📐 Format Dönüştür...</option><option value="toon">🧬 TOON (Kompakt)</option><option value="json">📋 JSON (Güzel)</option><option value="csv">📊 CSV Tablo</option></select><button onclick="kopyala()" style="background:#21262d;color:#fff;border:1px solid #30363d;padding:4px 7px;border-radius:4px;font-size:11px;cursor:pointer">📋 Kopyala</button>
      <button onclick="run('cat data/sanal_portfoy.json')" style="background:#21262d;color:#79c0ff;border:1px solid #30363d;padding:4px 7px;border-radius:4px;font-size:11px;cursor:pointer">💰 Portföy</button>
      <button onclick="run('cat data/gun_sonu_bulteni.md 2>/dev/null || echo Bulten_bekleniyor')" style="background:#21262d;color:#ffa657;border:1px solid #30363d;padding:4px 7px;border-radius:4px;font-size:11px;cursor:pointer">📰 Bülten</button>
      <button onclick="run('git status -s && git diff --stat')" style="background:#21262d;color:#7ee787;border:1px solid #30363d;padding:4px 7px;border-radius:4px;font-size:11px;cursor:pointer">🐙 Git Diff</button>
      <button onclick="run('cat data/ai_agent_memory.json 2>/dev/null || echo Hafiza_bos')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:4px 7px;border-radius:4px;font-size:11px;cursor:pointer">🧬 Hafıza</button>
      <button onclick="run('pm2 status')" style="background:#21262d;color:#fff;border:1px solid #30363d;padding:4px 7px;border-radius:4px;font-size:11px;cursor:pointer">📊 PM2</button>
      <button onclick="run('git add -A && git commit -m snapshot || git status -s')" style="background:#21262d;color:#ffa657;border:1px solid #30363d;padding:4px 7px;border-radius:4px;font-size:11px;cursor:pointer">📸 Git Snapshot</button>
      <button onclick="run('npm run build && pm2 restart bistapp')" style="background:#1f6feb;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">🔨 3000 Build</button>
      <input id="pin" type="password" value="1616" style="width:44px;background:#161b22;color:#fff;border:1px solid #30363d;padding:3px 5px;border-radius:4px;font-size:11px">
    </div>
  </div>
  <div id="favBar" style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
    <select id="mod" style="background:#161b22;color:#fff;border:1px solid #30363d;padding:4px;border-radius:4px;font-size:11px;font-weight:bold"><option value="plan">🛡️ PLAN</option><option value="build" selected>🛠️ BUILD</option><option value="hack">⚡ HACK</option><option value="audit">🔒 AUDIT</option></select>
    <label style="display:flex;align-items:center;gap:3px;background:#161b22;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px"><input id="deep" type="checkbox" checked> 🧠 Derin</label>
    <button onclick="slash('/log-analiz')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">/log-analiz</button>
    <button onclick="slash('/portfoy-rapor')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">/portfoy-rapor</button>
    <button onclick="slash('/backtest')" style="background:#21262d;color:#79c0ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">/backtest</button>
    <button onclick="run('python3 python/reconcile_audit.py')" style="background:#21262d;color:#7ee787;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">⚖️ Mutabakat</button><button onclick="run('python3 python/ask_portfolio.py')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">📖 Hikaye</button><button onclick="run('python3 python/managed_agent_core.py')" style="background:#21262d;color:#ffa657;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">🧠 Managed Agent</button><button onclick="run('python3 python/verify_data_suite.py')" style="background:#21262d;color:#7ee787;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">✅ Veri Testi</button><button onclick="run('python3 python/fstory_full_integration.py')" style="background:#21262d;color:#79c0ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">📊 Streak & Sağlık</button><button onclick="run('python3 python/bull_bear_debate.py')" style="background:#21262d;color:#ffa657;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">🐂🐻 Münazara</button><button onclick="run('python3 python/auto_repo_absorber.py')" style="background:#238636;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">🧬 Tam Sistem</button><button onclick="run('python3 python/news_sentiment_engine.py')" style="background:#21262d;color:#79c0ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">📰 Haber Duygu</button><button onclick="run('python3 python/monte_carlo_var.py')" style="background:#21262d;color:#ffa657;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">🎲 Monte Carlo VaR</button><button onclick="slash('/go-nogo')" style="background:#21262d;color:#7ee787;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">/go-nogo</button>
    <button onclick="slash('/refactor')" style="background:#21262d;color:#d2a8ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">/refactor</button>
    <button onclick="fetch('/api/procs').then(r=>r.text()).then(t=>document.getElementById('out').textContent=t)" style="background:#21262d;color:#7ee787;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">📊 Süreç Röntgeni</button><button onclick="fetch('/api/events').then(r=>r.text()).then(t=>document.getElementById('out').textContent=t)" style="background:#21262d;color:#ffa657;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">📜 Olay Akışı</button><button id="dlFileBtn" onclick="dosyaIndir()" style="display:none;background:#21262d;color:#79c0ff;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">⬇️ İndir</button><button id="rstFileBtn" onclick="dosyaGeriAl()" style="display:none;background:#21262d;color:#ff7b72;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">↩️ Geri Al</button><select id="cmdHist" onchange="if(this.value)document.getElementById('cmd').value=this.value" style="background:#161b22;color:#8b949e;border:1px solid #30363d;padding:3px 5px;border-radius:4px;font-size:11px;max-width:130px"><option value="">🕒 Geçmiş...</option></select><button onclick="favoriEkle()" style="background:#21262d;color:#e3b341;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">⭐ Favori Ekle</button>
    <button id="healBtn" onclick="selfHeal()" style="display:none;background:#da3633;color:#fff;border:none;padding:4px 9px;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer">🩺 Self-Heal Onar</button>
    <button onclick="document.getElementById('out').textContent=''" style="margin-left:auto;background:#21262d;color:#8b949e;border:1px solid #30363d;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer">🧹 Temizle</button>
  </div>
  <div style="display:grid;grid-template-columns:220px 1fr 380px;gap:8px;height:78vh">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;overflow:auto;font-size:11.5px"><div style="font-weight:bold;color:#58a6ff;margin-bottom:6px">📁 Bağlam Dosya Ağacı</div><div id="tree">Yükleniyor...</div></div>
    <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
      <div style="display:flex;gap:6px"><textarea id="cmd" rows="3" style="flex:1;background:#010409;color:#7ee787;border:1px solid #30363d;padding:8px;border-radius:4px;font-family:monospace;font-size:12px">pm2 status</textarea><button onclick="ai()" style="background:#6e40c9;color:#fff;border:none;padding:0 12px;border-radius:4px;font-weight:bold;cursor:pointer">🤖 AI</button><button onclick="run(document.getElementById('cmd').value)" style="background:#238636;color:#fff;border:none;padding:0 12px;border-radius:4px;font-weight:bold;cursor:pointer">Çalıştır ↵</button></div>
      <pre id="out" style="flex:1;margin:0;background:#010409;border:1px solid #30363d;padding:10px;border-radius:6px;white-space:pre-wrap;font-size:11.5px;overflow:auto">⚡ MT16 AI Studio v8.0 (Port 3001) Hazır.</pre>
    </div>
    <div style="display:flex;flex-direction:column;background:#010409;border:1px solid #30363d;border-radius:6px;padding:8px;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><strong style="font-size:11.5px;color:#7ee787">📡 Canlı Sistem & Portföy Akışı</strong><input id="logFiltre" oninput="filtreleLog()" placeholder="🔍 Loki Log Filtre (HATA/VETO)..." style="background:#161b22;color:#c9d1d9;border:1px solid #30363d;padding:2px 6px;border-radius:4px;font-size:10.5px;width:155px"><button onclick="canliLog()" style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;padding:2px 6px;border-radius:4px;font-size:10px;cursor:pointer">↻ Yenile</button></div>
      <pre id="livePane" style="flex:1;margin:0;white-space:pre-wrap;font-size:11px;color:#8b949e;overflow:auto">Canlı akış bağlanıyor...</pre>
    </div>
  </div>
</div><script src="/app.js"></script></body></html>`;

http.createServer((req, res) => {
  if (req.url === '/api/quant-hud') { const oku = (x) => { try { return JSON.parse(fs.readFileSync(x, 'utf-8')); } catch { return null; } }; res.writeHead(200, {'Content-Type':'application/json'}); return res.end(JSON.stringify({ sistem: oku('data/tam_sistem_entegrasyon.json'), var_rapor: oku('data/monte_carlo_var.json'), munazara: oku('data/bull_bear_raporu.json'), haber: oku('data/haber_duygu_raporu.json'), davranis: oku('data/fstory_behavior.json') })); }
  if (req.url === '/yedek-indir') { res.writeHead(200, {'Content-Type':'application/gzip','Content-Disposition':'attachment; filename=bistapp_tam_yedek.tar.gz'}); return res.end(fs.readFileSync('/tmp/bistapp_tam_yedek.tar.gz')); }
  if (req.url === '/app.js') { res.writeHead(200, {'Content-Type':'application/javascript; charset=utf-8'}); return res.end(fs.readFileSync('/home/bytrkr/bistapp/server/kokpit_v8.js','utf-8')); }
  if (req.url.startsWith('/api/observability')) {
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
    try {
      const df = execSync("df -h / | tail -n 1 | awk '{print $5}'", {encoding:'utf-8'}).trim();
      const logs = execSync("pm2 logs otonom-beyin --lines 40 --nostream 2>&1 || true", {encoding:'utf-8'});
      const mut = fs.existsSync('data/mutabakat_raporu.json') ? JSON.parse(fs.readFileSync('data/mutabakat_raporu.json','utf-8')) : {};
      return res.end(JSON.stringify({ disk: df, logs, mutabakat: mut }));
    } catch (e) { return res.end(JSON.stringify({ disk: '?', logs: String(e) })); }
  }
  if (req.url.startsWith('/api/readfile')) {
    const u = new URL(req.url, 'http://localhost');
    const f = u.searchParams.get('p') || '';
    res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'});
    if (!f || f.includes('..') || f.startsWith('/')) return res.end('Guvenlik engeli');
    try { return res.end(fs.readFileSync(f, 'utf-8')); } catch (e) { return res.end(String(e)); }
  }
  if (req.method === 'POST' && req.url === '/api/savefile') {
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});
      try {
        const { yol, icerik, pin } = JSON.parse(b||'{}');
        if (String(pin) !== GIZLI_KOD) return res.end(JSON.stringify({ok:false, msg:'Gecersiz PIN'}));
        if (!yol || yol.includes('..') || yol.startsWith('/')) return res.end(JSON.stringify({ok:false, msg:'Guvenlik engeli'}));
        fs.copyFileSync(yol, yol + '.termix_bak');
        fs.writeFileSync(yol, icerik, 'utf-8');
        return res.end(JSON.stringify({ok:true, msg:'💾 Kaydedildi (Yedek: ' + yol + '.termix_bak)'}));
      } catch (e) { return res.end(JSON.stringify({ok:false, msg:String(e)})); }
    });
    return;
  }
  if (req.url === '/api/procs') {
    res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'});
    try {
      const j = JSON.parse(execSync("pm2 jlist", {encoding:'utf-8'}));
      const satirlar = j.map(p => `• ${p.name.padEnd(15)} | Durum: ${p.pm2_env?.status} | CPU: %${p.monit?.cpu ?? 0} | RAM: ${( (p.monit?.memory||0) / 1048576 ).toFixed(1)} MB | Restart: ${p.pm2_env?.restart_time ?? 0}`);
      return res.end("=== NETDATA CANLI SÜREÇ & KAYNAK RÖNTGENİ ===\n" + satirlar.join("\n"));
    } catch (e) { return res.end(String(e)); }
  }
  if (req.url === '/api/events') {
    res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'});
    try {
      const oku = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf-8')) : {};
      const mut = oku('data/mutabakat_raporu.json'), bb = oku('data/bull_bear_raporu.json'), hb = oku('data/haber_duygu_raporu.json');
      const vetolar = (bb.munazaralar||[]).filter(x=>x.karar!=='ONAY_BOGA_USTUN').map(x=>`[MÜNAZARA VETO] ${x.sembol} (Boğa:${x.boga_puan} vs Ayı:${x.ayi_puan})`);
      const hVetolar = (hb.haberler||[]).filter(x=>x.durum==='HABER_VETO').map(x=>`[HABER VETO] ${x.sembol} (Skor:${x.duygu_skoru})`);
      return res.end("=== DATADOG BİRLEŞİK OLAY & VETO ZAMAN ÇİZELGESİ ===\n" +
        `• Mutabakat Durumu: ${mut.durum||'OK'} | Net K/Z: ${mut.hesaplanan_net_kz??0} TL | Fark: ${mut.mutabakat_farki??0} TL\n` +
        (vetolar.length || hVetolar.length ? [...vetolar, ...hVetolar].join("\n") : "✅ Aktif veto veya kritik olay bulunmuyor."));
    } catch (e) { return res.end(String(e)); }
  }
  if (req.method === 'POST' && req.url === '/api/restore') {
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});
      try {
        const { yol, pin } = JSON.parse(b||'{}');
        if (String(pin) !== GIZLI_KOD) return res.end(JSON.stringify({ok:false, msg:'Geçersiz PIN'}));
        const yedek = fs.existsSync(yol + '.termix_bak') ? yol + '.termix_bak' : (fs.existsSync(yol + '.ai_bak') ? yol + '.ai_bak' : '');
        if (!yedek) return res.end(JSON.stringify({ok:false, msg:'Bu dosya için yedek bulunamadı!'}));
        fs.copyFileSync(yedek, yol);
        return res.end(JSON.stringify({ok:true, msg:'↩️ Yedekten geri yüklendi: ' + yedek}));
      } catch (e) { return res.end(JSON.stringify({ok:false, msg:String(e)})); }
    });
    return;
  }
  if (req.url === '/api/telemetry') { const tot=os.totalmem(),fr=os.freemem(); res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify({cpu:os.loadavg()[0].toFixed(2),ram:(((tot-fr)/tot)*100).toFixed(1)+'%',up:Math.floor(os.uptime()/3600)+'s'})); }
  if (req.url === '/api/files') { const L=[]; for(const d of['python','python/core','python/risk','server','src/components']){try{for(const f of fs.readdirSync(d)){const t=path.join(d,f);if(fs.statSync(t).isFile()&&!f.includes('_bak'))L.push({yol:t,boyut:fs.statSync(t).size});}}catch{}} res.writeHead(200,{'Content-Type':'application/json'}); return res.end(JSON.stringify(L)); }
  if (req.url === '/api/live') { try{const pf=JSON.parse(fs.readFileSync('data/sanal_portfoy.json','utf-8'));res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end('=== CANLI PORTFOY AKISI ===\n'+pf.map(p=>p.sembol+': '+p.giris+' -> '+p.guncel).join('\n'));}catch{res.writeHead(200);return res.end('Veri bekleniyor...');} }
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'});
    return res.end();
  }
  
  if (req.url === '/api/logs/stream') {
    res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*'});
    const tail = spawn('pm2', ['logs', '--raw', '--lines', '0']);
    tail.stdout.on('data', (data) => { res.write('data: {"message":"'+data.toString().replace(/"/g,'\\"')+'","level":"INFO","category":"PM2"}\n\n'); });
    req.on('close', () => { try { tail.kill(); } catch {} });
    return;
  }

  if (req.method === 'GET') { res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); return res.end(HTML); }
  if (req.method === 'POST' && req.url === '/api/upload') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
      try {
        const { ad, b64, pin } = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
        if (String(pin) !== GIZLI_KOD) return res.end(JSON.stringify({ok:false, msg:'Geçersiz PIN!'}));
        const guvenliAd = path.basename(ad).replace(/[^a-zA-Z0-9._-]/g, '_');
        fs.mkdirSync('uploads', { recursive: true });
        const hedef = path.join('uploads', guvenliAd);
        fs.writeFileSync(hedef, Buffer.from(b64, 'base64'));
        let ekBilgi = '';
        if (guvenliAd.endsWith('.zip')) {
          const ciktiKlasor = path.join('uploads', guvenliAd.replace(/\.zip$/i, ''));
          fs.mkdirSync(ciktiKlasor, { recursive: true });
          execSync(`unzip -oq ${JSON.stringify(hedef)} -d ${JSON.stringify(ciktiKlasor)}`);
          ekBilgi = ' ve klasöre açıldı: ' + ciktiKlasor;
        }
        res.end(JSON.stringify({ok:true, msg:'✅ Yüklendi: ' + hedef + ekBilgi}));
      } catch (e) { res.end(JSON.stringify({ok:false, msg:String(e)})); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/cmd') { let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'}); try { const{cmd,pin}=JSON.parse(b||'{}'); if(String(pin)!==GIZLI_KOD)return res.end(JSON.stringify({ok:false,out:'Gecersiz PIN!'})); const chk=execFileSync('python3',['python/security_hooks.py',String(cmd||'')],{encoding:'utf-8'}).trim(); if(chk.startsWith('BLOCKED|'))return res.end(JSON.stringify({ok:false,out:'BLOCKED: '+chk})); const out=execSync(String(cmd),{encoding:'utf-8',timeout:120000,maxBuffer:1024*1024*4}); res.end(JSON.stringify({ok:true,out:out||'Tamamlandi.'})); } catch(e){ res.end(JSON.stringify({ok:false,out:String(e?.stdout||e?.stderr||e?.message||e)})); } }); }
}).listen(3001, '0.0.0.0', () => console.log('V8_3001_AKTIF'));
