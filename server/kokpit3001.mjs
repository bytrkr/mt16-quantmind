process.chdir("/home/bytrkr/bistapp");
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';

const GIZLI_KOD = '1616';
const HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MT16 AI Studio v8.0 (Port 3001)</title>
<style>
  body { overflow-y: auto !important; }
  #main-grid { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; height: auto !important; min-height: 76vh !important; }
  #main-grid > div:nth-child(1) { flex: 0 0 210px; max-height: 76vh; }
  #main-grid > div:nth-child(2) { flex: 1 1 460px !important; min-width: 320px !important; display: flex !important; flex-direction: column !important; }
  #main-grid > div:nth-child(3) { flex: 1 1 340px !important; min-width: 300px !important; max-height: 76vh; }
  #cmd { min-height: 64px !important; font-size: 13px !important; }
  #out, #livePane { min-height: 300px !important; max-height: 64vh !important; overflow-y: auto !important; }
</style>
</head>
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
  <div id="main-grid" style="display:grid;grid-template-columns:220px 1fr 380px;gap:8px;height:78vh">
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
</div><script src="/app.js"></script><style>#tree-panel.hidden-panel{display:none!important;}</style>
<script>
window.addEventListener("DOMContentLoaded",()=>{
  const bar=document.querySelector(".top-bar")||document.body;
  const btn=document.createElement("button");
  btn.textContent="📁 Dosyalar Aç/Kapat";
  btn.style.cssText="position:fixed;bottom:10px;left:10px;z-index:9999;background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:8px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.5);";
  btn.onclick=()=>{
    const left=Array.from(document.querySelectorAll("div,aside")).find(el=>el.innerText&&el.innerText.includes("Bağlam Dosya Ağacı")&&el.offsetWidth<400);
    if(left) left.style.display = left.style.display==="none" ? "" : "none";
  };
  document.body.appendChild(btn);
});
</script><script>(function(){
  if(window.__mt16SafePatch) return; window.__mt16SafePatch = true;
  const cleanAnsi = s => String(s||"").replace(/\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]{1,6}m/g, "");
  function makeBtn(label, bg, bottomPx, rightPx, onClick){
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "position:fixed;bottom:"+bottomPx+"px;"+(rightPx!=null?"right:"+rightPx+"px":"left:10px")+";z-index:9999;background:"+bg+";color:#fff;border:none;padding:8px 12px;border-radius:8px;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.45);cursor:pointer;";
    b.onclick = onClick;
    document.body.appendChild(b);
    return b;
  }
  window.addEventListener("DOMContentLoaded", function(){
    makeBtn("📁 Dosyalar Aç/Kapat", "#2563eb", 10, null, function(){
      const el = Array.from(document.querySelectorAll("div,aside")).find(d => d.innerText && d.innerText.includes("Bağlam Dosya Ağacı") && d.offsetWidth > 0 && d.offsetWidth < 450);
      if(el) el.style.display = (el.style.display === "none") ? "" : "none";
    });
    makeBtn("🩺 Son Hatayı Çöz", "#dc2626", 10, 10, function(){
      const boxes = Array.from(document.querySelectorAll("pre,code,div")).filter(d => d.innerText && /Error|Traceback|Exception|FAILED|Alarm/i.test(d.innerText) && d.innerText.length < 15000);
      const lastErr = boxes.length ? cleanAnsi(boxes[boxes.length - 1].innerText).trim().slice(-1200) : "Son hata logunu incele ve coz";
      const ta = document.querySelector("textarea,input[type=text]");
      if(ta){ ta.value = "Su hatayi incele ve coz:\n" + lastErr; ta.dispatchEvent(new Event("input",{bubbles:true})); }
      const aiBtn = Array.from(document.querySelectorAll("button")).find(btn => /AI/i.test(btn.textContent));
      if(aiBtn) aiBtn.click();
    });
    setInterval(function(){
      document.querySelectorAll("pre,code").forEach(n => {
        if(/\x1b\[|\[[0-9;]{1,6}m/.test(n.textContent)) n.textContent = cleanAnsi(n.textContent);
      });
    }, 1500);
  });
})();</script><script>(function(){
  if(window.__mt16FullWidthPatch) return; window.__mt16FullWidthPatch = true;
  const stripAnsi = t => String(t||"").replace(/\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]{1,6}m|\[1m|\[22m|\[39m|\[32m|\[36m|\[30m|\[2m/g, "");
  function findLeftPanel(){
    return Array.from(document.querySelectorAll("div,aside,section")).find(el =>
      el.innerText && el.innerText.includes("Bağlam Dosya Ağacı") && el.offsetWidth > 0 && el.offsetWidth < 500
    );
  }
  function applyLayout(closed){
    const left = findLeftPanel();
    if(left){
      left.style.display = closed ? "none" : "";
      const parent = left.parentElement;
      if(parent){
        const cs = getComputedStyle(parent);
        if(cs.display.includes("grid")){
          parent.dataset.prevGrid = parent.dataset.prevGrid || cs.gridTemplateColumns;
          parent.style.gridTemplateColumns = closed ? "1fr" : parent.dataset.prevGrid;
        } else if(cs.display.includes("flex")){
          parent.style.width = "100%";
        }
      }
    }
    document.querySelectorAll("div,section,main").forEach(box => {
      if(closed && box !== left && box.offsetWidth > 0 && box.offsetWidth < window.innerWidth && getComputedStyle(box).flex !== "none"){
        box.style.flex = "1 1 0%";
        box.style.maxWidth = "100%";
      }
    });
  }
  window.addEventListener("DOMContentLoaded", function(){
    let isClosed = false;
    let btn = document.getElementById("mt16-toggle-left-btn");
    if(!btn){
      btn = document.createElement("button");
      btn.id = "mt16-toggle-left-btn";
      btn.textContent = "📁 Dosyalar Aç/Kapat";
      btn.style.cssText = "position:fixed;bottom:10px;left:10px;z-index:99999;background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:8px;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;";
      btn.onclick = function(){ isClosed = !isClosed; applyLayout(isClosed); };
      document.body.appendChild(btn);
    }
    setInterval(function(){
      document.querySelectorAll("pre,code").forEach(n => {
        if(/\x1b\[|\[[0-9;]{1,6}m/.test(n.textContent)) n.textContent = stripAnsi(n.textContent);
      });
    }, 1500);
  });
})();</script><script>(function(){
  if(window.__mt16GridFix) return; window.__mt16GridFix = true;
  const reAnsi = /\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]{1,6}m/g;
  function toggleTree(){
    const g = document.getElementById("main-grid");
    const left = g && g.firstElementChild;
    if(!g || !left) return;
    const hide = left.style.display !== "none";
    left.style.display = hide ? "none" : "";
    g.style.gridTemplateColumns = hide ? "0px 1fr 380px" : "220px 1fr 380px";
  }
  window.addEventListener("DOMContentLoaded", function(){
    let btn = document.getElementById("mt16-toggle-left-btn");
    if(!btn){
      btn = document.createElement("button");
      btn.id = "mt16-toggle-left-btn";
      btn.textContent = "📁 Dosyalar Aç/Kapat";
      btn.style.cssText = "position:fixed;bottom:10px;left:10px;z-index:99999;background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;";
      document.body.appendChild(btn);
    }
    btn.onclick = toggleTree;
    setInterval(function(){
      document.querySelectorAll("pre,code").forEach(n => {
        if(reAnsi.test(n.textContent)) n.textContent = n.textContent.replace(reAnsi, "");
      });
    }, 1500);
  });
})();</script><script>(function(){window.addEventListener("DOMContentLoaded",function(){var g=document.getElementById("main-grid");var b=document.getElementById("mt16-toggle-left-btn")||document.createElement("button");b.id="mt16-toggle-left-btn";b.textContent="📁 Dosyalar Aç/Kapat";b.style.cssText="position:fixed;bottom:10px;left:10px;z-index:99999;background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer";if(!b.parentNode)document.body.appendChild(b);var open=false;function apply(){if(!g)return;var l=g.children[0],m=g.children[1],r=g.children[2];if(l)l.style.display=open?"":"none";if(m){m.style.display="block";m.style.minWidth="220px";}if(r)r.style.minWidth="180px";g.style.gridTemplateColumns=open?"180px minmax(220px,1fr) 200px":"0px minmax(220px,1fr) 200px";}b.onclick=function(){open=!open;apply();};apply();});})();</script><script>
window.addEventListener("DOMContentLoaded", function() {
  var ansiRe = new RegExp("\\x1b\\[[0-9;]*m|\\[[0-9;]*m", "g");
  var obs = new MutationObserver(function() {
    document.querySelectorAll("pre, code, div").forEach(function(el) {
      if (el.children.length === 0 && el.textContent && (el.textContent.indexOf("[39m") !== -1 || el.textContent.indexOf("[22m") !== -1)) {
        el.textContent = el.textContent.replace(ansiRe, "");
      }
    });
  });
  obs.observe(document.body, { childList: true, subtree: true });

  var fixBtn = document.createElement("button");
  fixBtn.textContent = "🩺 Son Hatayı AI ile Çöz";
  fixBtn.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:9999;background:#dc2626;color:#fff;border:none;padding:9px 14px;border-radius:10px;font-weight:bold;font-size:12px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.5);";
  fixBtn.onclick = function() {
    var logs = Array.from(document.querySelectorAll("pre, div")).map(function(e){ return e.innerText; }).find(function(t){ return t && (t.indexOf("LOKI CANLI PM2") !== -1 || t.indexOf("Traceback") !== -1 || t.indexOf("Error") !== -1); });
    var lastLines = logs ? logs.split("\n").slice(-25).join(" ") : "Son loglardaki hatalari kontrol et";
    var ta = document.querySelector("textarea, input[type=text]");
    var aiBtn = Array.from(document.querySelectorAll("button")).find(function(b){ return b.innerText && b.innerText.trim().indexOf("AI") !== -1; });
    if (ta && aiBtn) {
      ta.value = "Su log hatasini analiz et ve duzelt: " + lastLines.split(String.fromCharCode(34)).join(" ").split(String.fromCharCode(39)).join(" ").split(String.fromCharCode(96)).join(" ");
      aiBtn.click();
    }
  };
  document.body.appendChild(fixBtn);

  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    var micBtn = document.createElement("button");
    micBtn.textContent = "🎤 Sesli Komut";
    micBtn.style.cssText = "position:fixed;bottom:12px;right:195px;z-index:9999;background:#2563eb;color:#fff;border:none;padding:9px 14px;border-radius:10px;font-weight:bold;font-size:12px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.5);";
    var rec = new SpeechRec();
    rec.lang = "tr-TR";
    rec.interimResults = false;
    micBtn.onclick = function() { micBtn.textContent = "🔴 Dinleniyor..."; rec.start(); };
    rec.onresult = function(ev) {
      var text = ev.results[0][0].transcript;
      var ta = document.querySelector("textarea, input[type=text]");
      if (ta) ta.value = (ta.value ? ta.value + " " : "") + text;
      micBtn.textContent = "🎤 Sesli Komut";
    };
    rec.onerror = function() { micBtn.textContent = "🎤 Sesli Komut"; };
    rec.onend = function() { micBtn.textContent = "🎤 Sesli Komut"; };
    document.body.appendChild(micBtn);
  }
});
</script><script>
window.addEventListener("DOMContentLoaded", function() {
  if (window.__mt16CockpitPowerLoaded) return;
  window.__mt16CockpitPowerLoaded = true;

  var cmdEl = document.getElementById("cmd");
  var outEl = document.getElementById("out");
  if (!cmdEl || !outEl) return;

  // 1. Hizli Islem Cubugu (Quick Action Bar)
  var bar = document.createElement("div");
  bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;align-items:center;";
  var actions = [
    { label: "📊 PM2 Durum", cmd: "pm2 status", color: "#1f6feb" },
    { label: "💾 Yedek Al", cmd: "bash /home/bytrkr/bistapp/scripts/backup_data.sh", color: "#238636" },
    { label: "📈 Track Record", cmd: "curl -s http://127.0.0.1:8001/api/track-record", color: "#8957e5" },
    { label: "🔄 Servis Yenile", cmd: "pm2 restart bistapp bistapp-api otonom-beyin && pm2 status", color: "#d29922" },
    { label: "🚀 Git Durum", cmd: "git status -s && git log -n 2 --oneline", color: "#30363d" },
    { label: "📋 Çıktıyı Kopyala", copy: true, color: "#21262d" }
  ];

  actions.forEach(function(act) {
    var b = document.createElement("button");
    b.textContent = act.label;
    b.style.cssText = "background:" + act.color + ";color:#fff;border:1px solid rgba(255,255,255,0.15);padding:4px 9px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;";
    b.onclick = function() {
      if (act.copy) {
        navigator.clipboard.writeText(outEl.innerText || "");
        b.textContent = "✅ Kopyalandı!";
        setTimeout(function(){ b.textContent = act.label; }, 1500);
        return;
      }
      cmdEl.value = act.cmd;
      if (typeof window.run === "function") window.run(act.cmd);
    };
    bar.appendChild(b);
  });

  cmdEl.parentElement.parentElement.insertBefore(bar, cmdEl.parentElement);

  // 2. Komut Gecmisi (LocalStorage) & Klavye Kisayollari
  var hist = JSON.parse(localStorage.getItem("mt16_cmd_hist") || "[]");
  var histIdx = hist.length;
  function saveHist(c) {
    c = (c || "").trim();
    if (!c) return;
    if (hist[hist.length - 1] !== c) {
      hist.push(c);
      if (hist.length > 30) hist.shift();
      localStorage.setItem("mt16_cmd_hist", JSON.stringify(hist));
    }
    histIdx = hist.length;
  }

  cmdEl.placeholder = "Komut veya Türkçe istek yazın... (Ctrl+Enter: Çalıştır | Shift+Enter: AI Ajanı | ↑↓: Geçmiş)";
  cmdEl.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      saveHist(cmdEl.value);
      if (typeof window.run === "function") window.run(cmdEl.value);
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      saveHist(cmdEl.value);
      if (typeof window.ai === "function") window.ai();
    } else if (e.key === "ArrowUp" && cmdEl.selectionStart === 0 && hist.length > 0) {
      e.preventDefault();
      histIdx = Math.max(0, histIdx - 1);
      cmdEl.value = hist[histIdx] || "";
    } else if (e.key === "ArrowDown" && cmdEl.selectionEnd === cmdEl.value.length && hist.length > 0) {
      e.preventDefault();
      histIdx = Math.min(hist.length, histIdx + 1);
      cmdEl.value = hist[histIdx] || "";
    }
  });
});
</script><script>
window.addEventListener("DOMContentLoaded", function() {
  if (window.__mt16IdeBridgeLoaded) return;
  window.__mt16IdeBridgeLoaded = true;

  var cmdEl = document.getElementById("cmd");
  if (!cmdEl) return;

  var ideBar = document.createElement("div");
  ideBar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;align-items:center;";

  var presets = [
    { label: "📐 Plan Önce (Antigravity)", prefix: "[PLAN MODU - Önce mimari planı yaz, onay almadan dosya bozma]\n" },
    { label: "⚡ Hızlı Uygula (Claude Code)", prefix: "[AGENT MODU - Yedek al, uygula, syntax test et ve PM2 yeniden başlat]\n" },
    { label: "🔍 Kod Denetimi (Cursor)", prefix: "[CURSOR REVIEW - Güvenlik, performans ve hata kontrolü yap]\n" },
    { label: "📜 Kural Dosyalarını Oku", cmd: "head -n 20 CLAUDE.md GEMINI.md .cursorrules .antigravity/rules.md" }
  ];

  presets.forEach(function(item) {
    var btn = document.createElement("button");
    btn.textContent = item.label;
    btn.style.cssText = "background:#161b22;color:#58a6ff;border:1px solid #30363d;padding:3px 8px;border-radius:5px;font-size:11px;cursor:pointer;";
    btn.onclick = function() {
      if (item.cmd) {
        cmdEl.value = item.cmd;
        if (typeof window.run === "function") window.run(item.cmd);
      } else if (item.prefix) {
        if (cmdEl.value.indexOf(item.prefix) === -1) {
          cmdEl.value = item.prefix + cmdEl.value;
        }
        cmdEl.focus();
      }
    };
    ideBar.appendChild(btn);
  });

  cmdEl.parentElement.parentElement.insertBefore(ideBar, cmdEl.parentElement);
});
</script><script>
window.addEventListener("DOMContentLoaded", function() {
  if (window.__mt16FullIdeEngine) return;
  window.__mt16FullIdeEngine = true;

  var cmdEl = document.getElementById("cmd");
  var outEl = document.getElementById("out");
  if (!cmdEl || !outEl) return;

  // 1. Gelişmiş Multi-IDE Araç Çubuğu
  var bar = document.createElement("div");
  bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;align-items:center;background:#161b22;padding:6px;border-radius:6px;border:1px solid #30363d;";

  var title = document.createElement("span");
  title.textContent = "🧠 AI IDE:";
  title.style.cssText = "font-size:11px;font-weight:bold;color:#a371f7;margin-right:2px;";
  bar.appendChild(title);

  var tools = [
    {
      label: "📎 @Dosya Bağlamı",
      color: "#1f6feb",
      fn: function() {
        var f = prompt("Bağlama eklenecek dosya yolu (örnek: python/api_server.py veya src/App.tsx):", "python/api_server.py");
        if (f && f.trim()) {
          cmdEl.value = "@" + f.trim() + " " + cmdEl.value;
          cmdEl.focus();
        }
      }
    },
    {
      label: "🗺️ Antigravity Döngüsü",
      color: "#8957e5",
      fn: function() {
        var pfx = "[ANTIGRAVITY WORKFLOW: 1-PLAN çıkar, 2-YEDEK AL ve UYGULA, 3-SYNTAX & PM2 DOĞRULA]\n";
        if (cmdEl.value.indexOf("[ANTIGRAVITY") === -1) cmdEl.value = pfx + cmdEl.value;
        cmdEl.focus();
      }
    },
    {
      label: "🔍 Git Diff İncele",
      color: "#238636",
      fn: function() {
        cmdEl.value = "git diff --stat && git diff -U2 | head -n 80";
        if (typeof window.run === "function") window.run(cmdEl.value);
      }
    },
    {
      label: "⏪ Son Değişikliği Geri Al",
      color: "#da3633",
      fn: function() {
        if (confirm("Son commit edilmemiş değişiklikler geri alınsın mı? (git checkout -- .)")) {
          cmdEl.value = "git checkout -- . && git status -s";
          if (typeof window.run === "function") window.run(cmdEl.value);
        }
      }
    }
  ];

  tools.forEach(function(t) {
    var b = document.createElement("button");
    b.textContent = t.label;
    b.style.cssText = "background:" + t.color + ";color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;";
    b.onclick = t.fn;
    bar.appendChild(b);
  });

  cmdEl.parentElement.parentElement.insertBefore(bar, cmdEl.parentElement);

  // 2. window.ai() Sarmalayıcı: Otomatik Anayasa & @dosya Bağlam Çözücü
  if (typeof window.ai === "function" && !window.ai.__wrapped) {
    var origAi = window.ai;
    window.ai = function() {
      var raw = cmdEl.value || "";
      var mentions = raw.match(/@([a-zA-Z0-9_\.\/-]+)/g) || [];
      var ctxPrefix = "[SİSTEM ANAYASASI: CLAUDE.md, GEMINI.md, .cursorrules ve .antigravity/rules.md kurallarına kesin uy. Python için .venv/bin/python kullan, SPK uyumluluğunu ve data/ dizinini koru.]\n";
      if (mentions.length > 0) {
        ctxPrefix += "[BAĞLAM DOSYALARI: " + mentions.join(", ") + " - Önce bu dosyaların ilgili satırlarını okuyarak işlem yap]\n";
      }
      if (raw.indexOf("[SİSTEM ANAYASASI:") === -1) {
        cmdEl.value = ctxPrefix + raw;
      }
      return origAi.apply(this, arguments);
    };
    window.ai.__wrapped = true;
  }
});
</script><script>
(function initMt16ExcelRibbon() {
  function mount() {
    if (document.getElementById("mt16-excel-ribbon")) return;
    var cmdEl = document.getElementById("cmd");
    var outEl = document.getElementById("out");
    var mainGrid = document.getElementById("main-grid");
    if (!cmdEl || !outEl || !mainGrid) return setTimeout(mount, 150);

    // Eski daginik buton satirlarini gizle (sadece en ust baslik kalsin)
    var topWrap = mainGrid.parentElement;
    Array.from(topWrap.children).forEach(function(el, i) {
      if (i > 0 && el !== mainGrid && el.id !== "mt16-excel-ribbon") el.style.display = "none";
    });
    var parentCol = cmdEl.parentElement.parentElement;
    Array.from(parentCol.children).forEach(function(ch) {
      if (ch !== cmdEl.parentElement && ch !== outEl) ch.style.display = "none";
    });

    var ribbon = document.createElement("div");
    ribbon.id = "mt16-excel-ribbon";
    ribbon.style.cssText = "background:#161b22;border:1px solid #30363d;border-radius:6px;margin-bottom:8px;overflow:hidden;font-family:Segoe UI,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,0.4);";

    var tabBar = document.createElement("div");
    tabBar.style.cssText = "display:flex;background:#010409;border-bottom:1px solid #30363d;padding:0 6px;gap:2px;flex-wrap:wrap;";

    var panel = document.createElement("div");
    panel.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;background:#161b22;align-items:center;min-height:38px;";

    var menus = [
      {
        name: "📁 Dosya",
        accent: "#238636",
        items: [
          { label: "💾 Manuel Yedek Al", cmd: "bash /home/bytrkr/bistapp/scripts/backup_data.sh" },
          { label: "📂 Yedek Arşivleri", cmd: "ls -lh /home/bytrkr/bistapp/backups/" },
          { label: "📜 Kullanım & Bakım Kılavuzu", cmd: "cat docs/KOKPIT_KULLANIM_KILAVUZU.md" },
          { label: "⬇️ Çıktıyı .txt İndir", action: "download" }
        ]
      },
      {
        name: "🏠 Giriş",
        accent: "#1f6feb",
        items: [
          { label: "📊 PM2 Durum", cmd: "pm2 status" },
          { label: "📋 Çıktıyı Kopyala", action: "copy" },
          { label: "🧹 Çıktıyı Temizle", action: "clear" },
          { label: "🔄 Servisleri Yenile (3000+8001)", cmd: "pm2 restart bistapp bistapp-api otonom-beyin && pm2 status" },
          { label: "⚡ Tümünü Yeniden Başlat", cmd: "pm2 restart all && pm2 status" }
        ]
      },
      {
        name: "➕ Ekle",
        accent: "#8957e5",
        items: [
          { label: "📎 @Dosya Bağlamı Ekle", action: "mention" },
          { label: "📝 Görev Notu Ekle", prefix: "# GÖREV NOTU: " },
          { label: "🔗 API Uç Noktalarını Listele", cmd: "grep -n "@app\." python/api_server.py" }
        ]
      },
      {
        name: "📊 Veri",
        accent: "#d29922",
        items: [
          { label: "📈 Canlı Track Record", cmd: "curl -s http://127.0.0.1:8001/api/track-record" },
          { label: "💼 Sanal Portföy", cmd: "cat data/sanal_portfoy.json 2>/dev/null || cat python/sanal_portfoy.json" },
          { label: "⚖️ Ajan Ağırlıkları", cmd: "cat python/agent_weights.json 2>/dev/null || echo Varsayilan agirliklar" },
          { label: "💻 Sunucu Kaynakları", cmd: "uptime && free -h && df -h /" }
        ]
      },
      {
        name: "🛡️ Gözden Geçir",
        accent: "#da3633",
        items: [
          { label: "🔍 Git Diff İncele", cmd: "git diff --stat && git diff -U2 | head -n 80" },
          { label: "🩺 API Sağlık Kontrolü", cmd: "curl -s http://127.0.0.1:8001/health || curl -s http://127.0.0.1:8001/api/track-record" },
          { label: "🧹 Hata Loglarını Temizle", cmd: "pm2 flush && pm2 status" },
          { label: "⏪ Değişiklikleri Geri Al", action: "undo" }
        ]
      },
      {
        name: "👁️ Görünüm",
        accent: "#388bfd",
        items: [
          { label: "📁 Dosya Ağacı Aç/Kapat", action: "toggleTree" },
          { label: "📡 Canlı Akış Aç/Kapat", action: "toggleLive" }
        ]
      },
      {
        name: "🤖 Geliştirici",
        accent: "#a371f7",
        items: [
          { label: "🗺️ Antigravity Plan→Uygula", prefix: "[ANTIGRAVITY WORKFLOW: 1-PLAN çıkar, 2-YEDEK AL ve UYGULA, 3-SYNTAX & PM2 DOĞRULA]\n" },
          { label: "⚡ Claude Hızlı Uygula", prefix: "[AGENT MODU - Yedek al, uygula, syntax test et ve PM2 yeniden başlat]\n" },
          { label: "🔍 Cursor Kod Denetimi", prefix: "[CURSOR REVIEW - Güvenlik, performans ve hata kontrolü yap]\n" },
          { label: "📜 Anayasa Dosyaları (.md)", cmd: "head -n 25 CLAUDE.md GEMINI.md .cursorrules .antigravity/rules.md" },
          { label: "☁️ GitHub Push", cmd: "git status -s && git push origin HEAD" }
        ]
      }
    ];

    function selectTab(idx) {
      Array.from(tabBar.children).forEach(function(b, i) {
        if (i === idx) {
          b.style.background = "#161b22";
          b.style.color = "#ffffff";
          b.style.borderTop = "2px solid " + menus[idx].accent;
          b.style.fontWeight = "600";
        } else {
          b.style.background = "transparent";
          b.style.color = "#8b949e";
          b.style.borderTop = "2px solid transparent";
          b.style.fontWeight = "400";
        }
      });

      panel.innerHTML = "";
      menus[idx].items.forEach(function(it) {
        var btn = document.createElement("button");
        btn.textContent = it.label;
        btn.style.cssText = "background:#21262d;color:#e6edf3;border:1px solid #30363d;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;transition:all 0.12s;";
        btn.onmouseover = function() { btn.style.background = "#30363d"; btn.style.borderColor = menus[idx].accent; };
        btn.onmouseout = function() { btn.style.background = "#21262d"; btn.style.borderColor = "#30363d"; };

        btn.onclick = function() {
          if (it.action === "copy") {
            navigator.clipboard.writeText(outEl.innerText || "");
            btn.textContent = "✅ Kopyalandı";
            setTimeout(function(){ btn.textContent = it.label; }, 1400);
          } else if (it.action === "clear") {
            outEl.textContent = "";
          } else if (it.action === "download") {
            var blob = new Blob([outEl.innerText || ""], { type: "text/plain;charset=utf-8" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "mt16_cikti_" + Date.now() + ".txt";
            a.click();
          } else if (it.action === "mention") {
            var f = prompt("Bağlama eklenecek dosya yolu (örnek: python/api_server.py veya src/App.tsx):", "python/api_server.py");
            if (f && f.trim()) { cmdEl.value = "@" + f.trim() + " " + cmdEl.value; cmdEl.focus(); }
          } else if (it.action === "undo") {
            if (confirm("Commit edilmemiş değişiklikler geri alınsın mı?")) {
              cmdEl.value = "git checkout -- . && git status -s";
              if (typeof window.run === "function") window.run(cmdEl.value);
            }
          } else if (it.action === "toggleTree") {
            var t = mainGrid.children[0];
            if (t) t.style.display = (t.style.display === "none") ? "" : "none";
          } else if (it.action === "toggleLive") {
            var l = mainGrid.children[2];
            if (l) l.style.display = (l.style.display === "none") ? "" : "none";
          } else if (it.prefix) {
            if (cmdEl.value.indexOf(it.prefix) === -1) cmdEl.value = it.prefix + cmdEl.value;
            cmdEl.focus();
          } else if (it.cmd) {
            cmdEl.value = it.cmd;
            if (typeof window.run === "function") window.run(it.cmd);
          }
        };
        panel.appendChild(btn);
      });
    }

    menus.forEach(function(m, idx) {
      var tb = document.createElement("button");
      tb.textContent = m.name;
      tb.style.cssText = "border:none;padding:7px 13px;font-size:12px;cursor:pointer;border-radius:4px 4px 0 0;";
      tb.onclick = function() { selectTab(idx); };
      tabBar.appendChild(tb);
    });

    ribbon.appendChild(tabBar);
    ribbon.appendChild(panel);
    topWrap.insertBefore(ribbon, mainGrid);
    selectTab(1); // Varsayilan olarak "Giris" sekmesi acik gelsin
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
</script><script>
(function initMt16Suite1To17() {
  function mount() {
    if (document.getElementById("mt16-suite-1-17")) return;
    var cmdEl = document.getElementById("cmd");
    var outEl = document.getElementById("out");
    var mainGrid = document.getElementById("main-grid");
    if (!cmdEl || !outEl || !mainGrid) return setTimeout(mount, 150);

    var oldRibbon = document.getElementById("mt16-excel-ribbon");
    if (oldRibbon) oldRibbon.style.display = "none";

    var wrap = document.createElement("div");
    wrap.id = "mt16-suite-1-17";
    wrap.style.cssText = "background:#161b22;border:1px solid #30363d;border-radius:6px;margin-bottom:8px;overflow:hidden;font-family:Segoe UI,sans-serif;";

    var tabBar = document.createElement("div");
    tabBar.style.cssText = "display:flex;background:#010409;border-bottom:1px solid #30363d;padding:0 6px;gap:2px;flex-wrap:wrap;";

    var bodyPanel = document.createElement("div");
    bodyPanel.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;background:#161b22;align-items:center;";

    var sections = [
      {
        name: "⚙️ 1-5 Sistem & Bakım",
        color: "#1f6feb",
        btns: [
          { label: "🩺 1. Sağlık Matrisi", cmd: "bash scripts/health_check.sh" },
          { label: "🚨 2. Hata Tara", action: "scanErr" },
          { label: "💾 3. Yedek Al & Listele", cmd: "bash scripts/backup_data.sh && ls -lh backups/ | tail -n 8" },
          { label: "🧹 4. Log & Disk Temizle", cmd: "bash scripts/clean_logs.sh && free -h" },
          { label: "⏰ 5. Cron Görevleri", cmd: "crontab -l" }
        ]
      },
      {
        name: "🧠 6-10 AI IDE & Kurallar",
        color: "#8957e5",
        btns: [
          { label: "📎 6. @Dosya Ekle", action: "atFile" },
          { label: "⚔️ 7. 3-Ajan Münazara", prefix: "[3-AJAN MUNAZARA: 1-Antigravity Plan | 2-Claude Uygulama | 3-Cursor Guvenlik/Hata Denetimi]\n" },
          { label: "🔍 8. Diff Gate İncele", cmd: "git diff --stat && git diff -U2 | head -n 90" },
          { label: "📜 9. Anayasa (.md) Oku", cmd: "head -n 25 CLAUDE.md GEMINI.md .cursorrules .antigravity/rules.md" },
          { label: "🧩 10. Hata Kök Neden Şablonu", prefix: "[KOK NEDEN ANALIZI: Logdaki hatanin kaynagini bul, en guvenli yamayi oner ve test komutunu yaz]\n" }
        ]
      },
      {
        name: "📈 11-15 BIST & Kantitatif",
        color: "#238636",
        btns: [
          { label: "📊 11. Track Record", cmd: "curl -s http://127.0.0.1:8001/api/track-record" },
          { label: "💼 12. Sanal Portföy", cmd: "cat data/sanal_portfoy.json 2>/dev/null || cat python/sanal_portfoy.json" },
          { label: "⚖️ 13. Ajan Ağırlıkları", cmd: "cat python/agent_weights.json 2>/dev/null || echo Varsayilan agirliklar" },
          { label: "🔬 14. Hisse Röntgen", action: "tickerScan" },
          { label: "🛡️ 15. SPK & Risk Kontrol", cmd: "grep -rn "SPK" python/api_server.py src/App.tsx 2>/dev/null | head -n 12" }
        ]
      },
      {
        name: "🛠️ 16-17 Betik, Geçmiş & Dışa Aktar",
        color: "#d29922",
        btns: [
          { label: "🔄 16. Git Sync & Push", cmd: "bash scripts/git_sync.sh status" },
          { label: "🔎 17a. Geçmişte Ara (Ctrl+R)", action: "searchHist" },
          { label: "⭐ 17b. Favori Komutlar", action: "favCmd" },
          { label: "⬇️ 17c. .txt İndir", action: "dlTxt" },
          { label: "📦 17d. .json İndir", action: "dlJson" }
        ]
      }
    ];

    function getHist() { return JSON.parse(localStorage.getItem("mt16_cmd_hist") || "[]"); }
    function pushHist(v) {
      v = (v || "").trim();
      if (!v) return;
      var h = getHist();
      if (h[h.length - 1] !== v) { h.push(v); if (h.length > 50) h.shift(); localStorage.setItem("mt16_cmd_hist", JSON.stringify(h)); }
    }

    function runNow(c) {
      pushHist(c);
      cmdEl.value = c;
      if (typeof window.run === "function") window.run(c);
    }

    function selectSec(idx) {
      Array.from(tabBar.children).forEach(function(tb, i) {
        tb.style.background = i === idx ? "#161b22" : "transparent";
        tb.style.color = i === idx ? "#fff" : "#8b949e";
        tb.style.borderTop = i === idx ? ("2px solid " + sections[idx].color) : "2px solid transparent";
      });
      bodyPanel.innerHTML = "";
      sections[idx].btns.forEach(function(bSpec) {
        var b = document.createElement("button");
        b.textContent = bSpec.label;
        b.style.cssText = "background:#21262d;color:#e6edf3;border:1px solid #30363d;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";
        b.onclick = function() {
          if (bSpec.cmd) runNow(bSpec.cmd);
          else if (bSpec.prefix) { if (cmdEl.value.indexOf(bSpec.prefix) === -1) cmdEl.value = bSpec.prefix + cmdEl.value; cmdEl.focus(); }
          else if (bSpec.action === "scanErr") {
            var txt = (outEl.innerText || "") + "
" + ((document.getElementById("livePane") && document.getElementById("livePane").innerText) || "");
            var lines = txt.split("
").filter(function(l){ return /Error|Traceback|Exception|VETO|FAILED|ModuleNotFoundError/i.test(l); });
            cmdEl.value = "Su hatalari incele ve cozum oner:
" + (lines.slice(-20).join("
") || "Belirgin hata satiri bulunamadi, son loglari kontrol et.");
            if (typeof window.ai === "function") window.ai();
          } else if (bSpec.action === "atFile") {
            var f = prompt("Dosya yolu (orn: python/api_server.py veya src/App.tsx):", "python/api_server.py");
            if (f && f.trim()) {
              var cleanF = f.trim().replace(/^@/, "");
              runNow("head -n 80 " + cleanF + " 2>/dev/null || echo Dosya bulunamadi: " + cleanF);
            }
          } else if (bSpec.action === "tickerScan") {
            var tk = prompt("BIST Hisse Kodu (orn: ASELS, THYAO, BIMAS):", "ASELS");
            if (tk && tk.trim()) {
              var u = tk.trim().toUpperCase();
              runNow("grep -rn "" + u + "" data/ python/ 2>/dev/null | head -n 25 || echo Kayit bulunamadi");
            }
          } else if (bSpec.action === "searchHist") {
            var q = prompt("Komut gecmisinde ara:", "");
            if (q !== null) {
              var matches = getHist().filter(function(x){ return x.toLowerCase().indexOf(q.toLowerCase()) !== -1; });
              outEl.textContent = "=== KOMUT GECMISI ESLESMELERI ===
" + (matches.join("
") || "Eslesme yok");
              if (matches.length) cmdEl.value = matches[matches.length - 1];
            }
          } else if (bSpec.action === "favCmd") {
            var favs = ["bash scripts/health_check.sh", "bash scripts/backup_data.sh", "curl -s http://127.0.0.1:8001/api/track-record", "git status -s && git log -n 3 --oneline"];
            var pick = prompt("Favori sec (0-3):
0: " + favs[0] + "
1: " + favs[1] + "
2: " + favs[2] + "
3: " + favs[3], "0");
            if (pick !== null && favs[Number(pick)]) runNow(favs[Number(pick)]);
          } else if (bSpec.action === "dlTxt") {
            var blob = new Blob([outEl.innerText || ""], { type: "text/plain;charset=utf-8" });
            var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mt16_rapor_" + Date.now() + ".txt"; a.click();
          } else if (bSpec.action === "dlJson") {
            var payload = JSON.stringify({ timestamp: new Date().toISOString(), command: cmdEl.value, output: outEl.innerText || "" }, null, 2);
            var b2 = new Blob([payload], { type: "application/json;charset=utf-8" });
            var a2 = document.createElement("a"); a2.href = URL.createObjectURL(b2); a2.download = "mt16_rapor_" + Date.now() + ".json"; a2.click();
          }
        };
        bodyPanel.appendChild(b);
      });
    }

    sections.forEach(function(sec, idx) {
      var tb = document.createElement("button");
      tb.textContent = sec.name;
      tb.style.cssText = "border:none;padding:7px 12px;font-size:12px;cursor:pointer;border-radius:4px 4px 0 0;";
      tb.onclick = function() { selectSec(idx); };
      tabBar.appendChild(tb);
    });

    cmdEl.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); runNow(cmdEl.value); }
      else if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); pushHist(cmdEl.value); if (typeof window.ai === "function") window.ai(); }
      else if (e.key === "r" && e.ctrlKey) {
        e.preventDefault();
        var h = getHist();
        if (h.length) { cmdEl.value = h[h.length - 1]; }
      }
    });

    wrap.appendChild(tabBar);
    wrap.appendChild(bodyPanel);
    mainGrid.parentElement.insertBefore(wrap, mainGrid);
    selectSec(0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
</script></body></html>`;

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
