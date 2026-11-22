import { spawnSync } from "node:child_process";
import fsSync from "node:fs";
import pathMod from "node:path";
process.chdir("/home/bytrkr/bistapp");
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';


import { execSync as mt16Exec } from "node:child_process";

const MT16_ROOT = "/home/bytrkr/bistapp";
const MT16_BACKUP_DIR = pathMod.join(MT16_ROOT, "backups");
const MT16_LATEST = pathMod.join(MT16_BACKUP_DIR, "latest_ports_bundle.tar.gz");

function mt16EnsureBundle() {
  fsSync.mkdirSync(MT16_BACKUP_DIR, { recursive: true });
  const list = fsSync.readdirSync(MT16_BACKUP_DIR)
    .filter((f) => f.endsWith(".tar.gz") && f !== "latest_ports_bundle.tar.gz")
    .map((f) => ({ full: pathMod.join(MT16_BACKUP_DIR, f), t: fsSync.statSync(pathMod.join(MT16_BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  let target = list.length ? list[0].full : "";
  if (!target || !fsSync.existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    target = pathMod.join(MT16_BACKUP_DIR, "mt16_full_ports_bundle_" + stamp + ".tar.gz");
    mt16Exec(`tar --exclude="node_modules" --exclude=".venv" --exclude="backups/*.tar.gz" -czf "${target}" -C "${MT16_ROOT}" .`, { stdio: "ignore" });
  }
  try {
    if (fsSync.existsSync(MT16_LATEST) || fsSync.lstatSync(MT16_LATEST)) fsSync.unlinkSync(MT16_LATEST);
  } catch (_) {}
  fsSync.symlinkSync(target, MT16_LATEST);
  return MT16_LATEST;
}

function mt16SpecialRoute(req, res) {
  if (!req || !req.url) return false;
  const u = new URL(req.url, "http://127.0.0.1:3001");
  if (u.pathname === "/api/read-file") {
    const raw = (u.searchParams.get("path") || "").replace(/^@+/, "").trim();
    const maxL = Math.min(Math.max(parseInt(u.searchParams.get("lines") || "160", 10) || 160, 10), 600);
    if (!raw) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "path gerekli" }));
      return true;
    }
    const resolved = pathMod.resolve(MT16_ROOT, raw);
    if (!resolved.startsWith(MT16_ROOT + pathMod.sep) && resolved !== MT16_ROOT) {
      res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "Erisim engellendi" }));
      return true;
    }
    if (!fsSync.existsSync(resolved) || !fsSync.statSync(resolved).isFile()) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "Dosya bulunamadi", path: raw }));
      return true;
    }
    const st = fsSync.statSync(resolved);
    if (st.size > 1024 * 1024) {
      res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "Dosya 1MB ustunde" }));
      return true;
    }
    const allLines = fsSync.readFileSync(resolved, "utf8").split("\n");
    const body = allLines.slice(0, maxL).map((line, i) => String(i + 1).padStart(4, " ") + " | " + line).join("\n");
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, path: pathMod.relative(MT16_ROOT, resolved), total_lines: allLines.length, shown_lines: Math.min(allLines.length, maxL), content: body }));
    return true;
  }
  if (u.pathname === "/download-bundle") {
    try {
      const f = mt16EnsureBundle();
      const st = fsSync.statSync(f);
      res.writeHead(200, {
        "Content-Type": "application/gzip",
        "Content-Disposition": "attachment; filename=\"mt16_full_ports_bundle.tar.gz\"",
        "Content-Length": st.size
      });
      fsSync.createReadStream(f).pipe(res);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: String(e) }));
    }
    return true;
  }
  return false;
}

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
(function initMt16Features123() {
  function boot() {
    if (document.getElementById("mt16-f123-bar")) return;
    var cmdEl = document.getElementById("cmd");
    var outEl = document.getElementById("out");
    var mainGrid = document.getElementById("main-grid");
    if (!cmdEl || !outEl || !mainGrid) return setTimeout(boot, 150);

    var bar = document.createElement("div");
    bar.id = "mt16-f123-bar";
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:6px 10px;margin-bottom:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;align-items:center;font-family:Segoe UI,sans-serif;";

    function execCmd(c) {
      cmdEl.value = c;
      if (typeof window.run === "function") window.run(c);
    }

    // 1. Canli Port & Servis Saglik Matrisi
    var bHealth = document.createElement("button");
    bHealth.textContent = "🩺 1. Sağlık Matrisi";
    bHealth.style.cssText = "background:#1f6feb;color:#fff;border:none;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";
    bHealth.onclick = function() { execCmd("bash scripts/health_check.sh"); };

    // 2. Otomatik Hata Izleyici & Alarm Rozeti
    var bAlarm = document.createElement("button");
    bAlarm.id = "mt16-err-alarm-btn";
    bAlarm.textContent = "🚨 2. Hata İzleyici (0)";
    bAlarm.style.cssText = "background:#21262d;color:#e6edf3;border:1px solid #30363d;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";

    function collectErrors() {
      var liveEl = document.getElementById("livePane");
      var combined = (outEl.innerText || "") + "\n" + (liveEl ? liveEl.innerText : "");
      return combined.split("\n").filter(function(line) {
        return /Traceback|ModuleNotFoundError|Exception|ECONNREFUSED|FAILED|VETO/i.test(line);
      });
    }

    function refreshAlarm() {
      var errs = collectErrors();
      var cnt = errs.length;
      bAlarm.textContent = (cnt > 0 ? "🚨 2. Hata Alarmı (" + cnt + ")" : "✅ 2. Hata İzleyici (0)");
      bAlarm.style.background = cnt > 0 ? "#6e1a1a" : "#21262d";
      bAlarm.style.borderColor = cnt > 0 ? "#f85149" : "#30363d";
    }

    bAlarm.onclick = function() {
      var errs = collectErrors().slice(-20);
      if (!errs.length) {
        execCmd("pm2 logs --lines 25 --nostream");
        return;
      }
      cmdEl.value = "Su sistem/log hatalarini analiz et, kok nedenini bul ve guvenli cozum adimlarini yaz:\n" + errs.join("\n");
      if (typeof window.ai === "function") window.ai();
      else cmdEl.focus();
    };
    setInterval(refreshAlarm, 4000);
    setTimeout(refreshAlarm, 800);

    // 3. Tek Tikla Yedek Yoneticisi (Listele / Al / Geri Yukle)
    var bBackupList = document.createElement("button");
    bBackupList.textContent = "📂 3a. Yedekleri Listele";
    bBackupList.style.cssText = "background:#21262d;color:#e6edf3;border:1px solid #30363d;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";
    bBackupList.onclick = function() { execCmd("bash scripts/backup_manager.sh list"); };

    var bBackupNew = document.createElement("button");
    bBackupNew.textContent = "💾 3b. Yeni Yedek Al";
    bBackupNew.style.cssText = "background:#238636;color:#fff;border:none;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";
    bBackupNew.onclick = function() { execCmd("bash scripts/backup_manager.sh create"); };

    var bRestore = document.createElement("button");
    bRestore.textContent = "⏪ 3c. Yedek Geri Yükle";
    bRestore.style.cssText = "background:#9e6a03;color:#fff;border:none;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";
    bRestore.onclick = function() {
      var path = prompt("Geri yüklenecek .tar.gz yedek dosyasının tam yolu:", "/home/bytrkr/bistapp/backups/latest_ports_bundle.tar.gz");
      if (path && path.trim()) {
        execCmd("bash scripts/backup_manager.sh restore "" + path.trim() + """);
      }
    };

    bar.appendChild(bHealth);
    bar.appendChild(bAlarm);
    bar.appendChild(bBackupList);
    bar.appendChild(bBackupNew);
    bar.appendChild(bRestore);
    mainGrid.parentElement.insertBefore(bar, mainGrid);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
</script><script>
(function initMt16Features4To10() {
  function boot() {
    if (document.getElementById("mt16-f4-10-bar")) return;
    var cmdEl = document.getElementById("cmd");
    var outEl = document.getElementById("out");
    var mainGrid = document.getElementById("main-grid");
    if (!cmdEl || !outEl || !mainGrid) return setTimeout(boot, 150);

    var bar = document.createElement("div");
    bar.id = "mt16-f4-10-bar";
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:6px 10px;margin-bottom:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;align-items:center;font-family:Segoe UI,sans-serif;";

    function runShell(c) {
      cmdEl.value = c;
      if (typeof window.run === "function") window.run(c);
    }

    var items = [
      {
        label: "🧹 4. Disk/RAM/Log Temizle",
        bg: "#238636",
        fn: function() { runShell("bash scripts/sys_maintain_4_5.sh clean"); }
      },
      {
        label: "⏰ 5. Cron Görevleri",
        bg: "#21262d",
        fn: function() { runShell("bash scripts/sys_maintain_4_5.sh status"); }
      },
      {
        label: "📎 6. @Dosya Oku",
        bg: "#21262d",
        fn: function() {
          var f = prompt("Okunacak dosya yolu:", "python/api_server.py");
          if (f && f.trim()) {
            var clean = f.trim().replace(/^@/, "");
            runShell("nl -ba " + clean + " 2>/dev/null | head -n 120 || echo Dosya bulunamadi: " + clean);
          }
        }
      },
      {
        label: "⚔️ 7. 3-Ajan Münazara",
        bg: "#6e40c9",
        fn: function() {
          var prefix = "[3-AJAN MUNAZARA: 1-Antigravity Plan | 2-Claude Uygulama | 3-Cursor Guvenlik/Hata Denetimi]\n";
          if (cmdEl.value.indexOf(prefix) === -1) cmdEl.value = prefix + cmdEl.value;
          cmdEl.focus();
        }
      },
      {
        label: "🔍 8. Diff Gate",
        bg: "#21262d",
        fn: function() { runShell("git status -s && git diff --stat && git diff -U2 | head -n 100"); }
      },
      {
        label: "📜 9. Anayasa Kuralları",
        bg: "#21262d",
        fn: function() { runShell("head -n 30 CLAUDE.md GEMINI.md .cursorrules .antigravity/rules.md 2>/dev/null"); }
      },
      {
        label: "🧩 10. Kök Neden / Prompt Şablonu",
        bg: "#9e6a03",
        fn: function() {
          var tpl = "[KOK NEDEN ANALIZI]\n1. Hata/Darbogaz Kaynagi:\n2. En Guvenli Yama:\n3. Dogrulama Komutu:\n" + (cmdEl.value || "");
          cmdEl.value = tpl;
          cmdEl.focus();
        }
      }
    ];

    items.forEach(function(it) {
      var b = document.createElement("button");
      b.textContent = it.label;
      b.style.cssText = "background:" + it.bg + ";color:#fff;border:1px solid #30363d;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";
      b.onclick = it.fn;
      bar.appendChild(b);
    });

    mainGrid.parentElement.insertBefore(bar, mainGrid);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
</script><script>
(function initMt16Features11To17() {
  function boot() {
    if (document.getElementById("mt16-f11-17-bar")) return;
    var cmdEl = document.getElementById("cmd");
    var outEl = document.getElementById("out");
    var mainGrid = document.getElementById("main-grid");
    if (!cmdEl || !outEl || !mainGrid) return setTimeout(boot, 150);

    var bar = document.createElement("div");
    bar.id = "mt16-f11-17-bar";
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:6px 10px;margin-bottom:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;align-items:center;font-family:Segoe UI,sans-serif;";

    function getHist() { return JSON.parse(localStorage.getItem("mt16_hist_17") || "[]"); }
    function saveHist(v) {
      v = (v || "").trim();
      if (!v) return;
      var h = getHist();
      if (h[h.length - 1] !== v) { h.push(v); if (h.length > 60) h.shift(); localStorage.setItem("mt16_hist_17", JSON.stringify(h)); }
    }
    function runShell(c) {
      saveHist(c);
      cmdEl.value = c;
      if (typeof window.run === "function") window.run(c);
    }

    var btns = [
      { label: "📊 11. Track Record", bg: "#238636", fn: function() { runShell("curl -sS http://127.0.0.1:8001/api/track-record"); } },
      { label: "💼 12. Sanal Portföy", bg: "#21262d", fn: function() { runShell("cat data/sanal_portfoy.json 2>/dev/null || cat python/sanal_portfoy.json 2>/dev/null || echo Portfoy dosyasi bulunamadi"); } },
      { label: "⚖️ 13. Ajan Ağırlıkları", bg: "#21262d", fn: function() { runShell("cat python/agent_weights.json 2>/dev/null || find . -maxdepth 3 -name "*weight*" 2>/dev/null"); } },
      {
        label: "🔬 14. Hisse Röntgen",
        bg: "#1f6feb",
        fn: function() {
          var tk = prompt("BIST Hisse Kodu (orn: ASELS, THYAO, BIMAS, TOASO):", "ASELS");
          if (tk && tk.trim()) {
            var u = tk.trim().toUpperCase();
            runShell("echo "=== " + u + " RONTGEN ===" && grep -rn "" + u + "" data/ python/ 2>/dev/null | head -n 30");
          }
        }
      },
      { label: "🛡️ 15. SPK & Risk Kontrol", bg: "#21262d", fn: function() { runShell("curl -sS http://127.0.0.1:8001/api/track-record | grep -o ".*regulatory_compliance.*" || grep -rn "SPK" python/ server/ 2>/dev/null | head -n 15"); } },
      { label: "🔄 16. Git Sync", bg: "#6e40c9", fn: function() { runShell("bash scripts/git_sync.sh status"); } },
      {
        label: "🔎 17a. Geçmiş Ara (Ctrl+R)",
        bg: "#21262d",
        fn: function() {
          var q = prompt("Komut gecmisinde ara:", "");
          if (q !== null) {
            var res = getHist().filter(function(x){ return x.toLowerCase().indexOf(q.toLowerCase()) !== -1; });
            outEl.textContent = "=== GECMIS ARAMA (" + q + ") ===
" + (res.join("
") || "Kayit yok");
            if (res.length) cmdEl.value = res[res.length - 1];
          }
        }
      },
      {
        label: "⭐ 17b. Favoriler",
        bg: "#9e6a03",
        fn: function() {
          var favs = [
            "bash scripts/health_check.sh",
            "bash scripts/sys_maintain_4_5.sh status",
            "curl -sS http://127.0.0.1:8001/api/track-record",
            "bash scripts/git_sync.sh status"
          ];
          var pick = prompt("Favori komut sec (0-3):
0: " + favs[0] + "
1: " + favs[1] + "
2: " + favs[2] + "
3: " + favs[3], "0");
          if (pick !== null && favs[Number(pick)]) runShell(favs[Number(pick)]);
        }
      },
      {
        label: "⬇️ 17c. .txt İndir",
        bg: "#21262d",
        fn: function() {
          var blob = new Blob([outEl.innerText || ""], { type: "text/plain;charset=utf-8" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "mt16_cikti_" + Date.now() + ".txt";
          a.click();
        }
      },
      {
        label: "📦 17d. .json İndir",
        bg: "#21262d",
        fn: function() {
          var data = JSON.stringify({ exported_at: new Date().toISOString(), command: cmdEl.value, output: outEl.innerText || "" }, null, 2);
          var blob = new Blob([data], { type: "application/json;charset=utf-8" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "mt16_cikti_" + Date.now() + ".json";
          a.click();
        }
      }
    ];

    btns.forEach(function(item) {
      var b = document.createElement("button");
      b.textContent = item.label;
      b.style.cssText = "background:" + item.bg + ";color:#fff;border:1px solid #30363d;padding:5px 9px;border-radius:4px;font-size:11.5px;cursor:pointer;";
      b.onclick = item.fn;
      bar.appendChild(b);
    });

    cmdEl.addEventListener("keydown", function(e) {
      if (e.key === "r" && e.ctrlKey) {
        e.preventDefault();
        var h = getHist();
        if (h.length) cmdEl.value = h[h.length - 1];
      }
    });

    mainGrid.parentElement.insertBefore(bar, mainGrid);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
</script><script>(function(){if(document.getElementById("mt16-f-bar"))return;function init(){var c=document.getElementById("cmd"),o=document.getElementById("out"),g=document.getElementById("main-grid");if(!c||!o||!g)return setTimeout(init,150);var d=document.createElement("div");d.id="mt16-f-bar";d.style.cssText="display:flex;flex-wrap:wrap;gap:6px;padding:6px 10px;margin-bottom:8px;background:#111827;border:1px solid #374151;border-radius:6px;";var b=document.createElement("button");b.textContent="📎 @Dosya İçerik Oku";b.style.cssText="background:#2563eb;color:#fff;border:none;padding:5px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;";b.onclick=function(){var m=(c.value||"").match(/@([A-Za-z0-9_./-]+)/);var t=m?m[1]:prompt("Dosya yolu:","server/kokpit3001.mjs");if(!t)return;fetch("/api/read-file?path="+encodeURIComponent(t)+"&lines=140").then(function(r){return r.json();}).then(function(j){o.textContent=j.ok?("=== "+j.path+" ("+j.shown_lines+"/"+j.total_lines+") ===\n"+j.content):("[HATA] "+j.error);});};var a=document.createElement("a");a.href="/download-bundle";a.download="mt16_full_ports_bundle.tar.gz";a.textContent="⬇️ Tam Paket İndir (.tar.gz)";a.style.cssText="background:#059669;color:#fff;padding:5px 10px;border-radius:4px;font-size:11.5px;text-decoration:none;";d.appendChild(b);d.appendChild(a);g.parentElement.insertBefore(d,g);}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();})();</script>












<script>
(function initMt16GeminiChatStudio() {
  if (document.getElementById("mt16-gemini-studio")) return;

  var STORAGE_KEY = "mt16_gemini_chats_v1";
  function loadChats() {
    try {
      var raw = window.name || "";
      if (raw.indexOf("MT16_CHATS:") === 0) {
        return JSON.parse(raw.slice("MT16_CHATS:".length));
      }
    } catch (_) {}
    return [{
      id: "chat_" + Date.now(),
      title: "Yeni Multimodal Sohbet",
      messages: [{
        role: "assistant",
        mode: "canvas",
        text: "MT16 Multimodal Gemini Stüdyo hazır. + menüsünden veya alt satırdan Görüntü, Video, Müzik veya Canvas seçip istem yazabilir; sol panelden sohbet arşivini yönetebilirsiniz.",
        media_url: "",
        file: ""
      }]
    }];
  }

  var state = {
    chats: loadChats(),
    activeId: null,
    selectedMode: "canvas",
    open: false
  };
  state.activeId = state.chats[0].id;

  function saveChats() {
    try {
      window.name = "MT16_CHATS:" + JSON.stringify(state.chats.slice(0, 25));
    } catch (_) {}
  }

  function currentChat() {
    for (var i = 0; i < state.chats.length; i++) {
      if (state.chats[i].id === state.activeId) return state.chats[i];
    }
    return state.chats[0];
  }

  // Sag altta Gemini Sohbet Stüdyosu acma butonu
  var launcher = document.createElement("button");
  launcher.id = "mt16-gemini-launcher";
  launcher.type = "button";
  launcher.textContent = "✦ Gemini Multimodal";
  launcher.style.cssText = "position:fixed;bottom:14px;right:14px;z-index:2147483647;background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:#fff;border:1px solid #93c5fd;padding:9px 14px;border-radius:999px;font-size:12.5px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.65);";

  var overlay = document.createElement("div");
  overlay.id = "mt16-gemini-studio";
  overlay.style.cssText = "display:none;position:fixed;inset:0;z-index:2147483647;background:#0b0f17;color:#e6edf3;font-family:Segoe UI,Inter,sans-serif;flex-direction:row;";

  // Sol Arşiv Kenar Çubuğu
  var sidebar = document.createElement("aside");
  sidebar.style.cssText = "width:270px;min-width:220px;max-width:42vw;background:#111622;border-right:1px solid #263042;display:flex;flex-direction:column;padding:12px;gap:10px;overflow:hidden;";

  var sideTop = document.createElement("div");
  sideTop.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;";
  var brand = document.createElement("div");
  brand.textContent = "✦ MT16 Gemini";
  brand.style.cssText = "font-weight:700;font-size:15px;color:#f8fafc;";
  var closeStudioBtn = document.createElement("button");
  closeStudioBtn.type = "button";
  closeStudioBtn.textContent = "Kokpite Dön ✕";
  closeStudioBtn.style.cssText = "background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:5px 9px;border-radius:6px;font-size:11.5px;cursor:pointer;";
  closeStudioBtn.onclick = function() {
    state.open = false;
    overlay.style.display = "none";
  };
  sideTop.appendChild(brand);
  sideTop.appendChild(closeStudioBtn);

  var newChatBtn = document.createElement("button");
  newChatBtn.type = "button";
  newChatBtn.textContent = "+ Yeni sohbet";
  newChatBtn.style.cssText = "width:100%;text-align:left;background:#1a2234;color:#f1f5f9;border:1px solid #2e3b55;padding:9px 12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;";
  newChatBtn.onclick = function() {
    var c = {
      id: "chat_" + Date.now(),
      title: "Yeni Multimodal Sohbet",
      messages: [{
        role: "assistant",
        mode: state.selectedMode,
        text: "Yeni sohbet açıldı. Mod: " + state.selectedMode.toUpperCase() + ". İsteminizi yazın.",
        media_url: "",
        file: ""
      }]
    };
    state.chats.unshift(c);
    state.activeId = c.id;
    saveChats();
    renderAll();
  };

  var archiveLabel = document.createElement("div");
  archiveLabel.textContent = "SOHBET ARŞİVİ";
  archiveLabel.style.cssText = "font-size:10.5px;letter-spacing:0.06em;color:#94a3b8;font-weight:700;margin-top:4px;";

  var archiveList = document.createElement("div");
  archiveList.style.cssText = "flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;";

  sidebar.appendChild(sideTop);
  sidebar.appendChild(newChatBtn);
  sidebar.appendChild(archiveLabel);
  sidebar.appendChild(archiveList);

  // Sag Ana Sohbet ve Multimodal Alanı
  var mainPane = document.createElement("main");
  mainPane.style.cssText = "flex:1;display:flex;flex-direction:column;min-width:0;background:#0b0f17;";

  var topHeader = document.createElement("header");
  topHeader.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;border-bottom:1px solid #1e293b;background:#0f1520;";
  var chatTitleEl = document.createElement("div");
  chatTitleEl.style.cssText = "font-size:14px;font-weight:700;color:#f8fafc;";
  var modeBar = document.createElement("div");
  modeBar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;";

  var modes = [
    ["image", "🖼️ Görüntü"],
    ["video", "🎬 Video"],
    ["music", "🎵 Müzik"],
    ["canvas", "📝 Canvas"]
  ];
  var modeBtns = {};
  modes.forEach(function(m) {
    var mb = document.createElement("button");
    mb.type = "button";
    mb.textContent = m[1];
    mb.style.cssText = "padding:5px 10px;border-radius:999px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid #334155;background:#161e2e;color:#cbd5e1;";
    mb.onclick = function() {
      state.selectedMode = m[0];
      renderModes();
    };
    modeBtns[m[0]] = mb;
    modeBar.appendChild(mb);
  });

  function renderModes() {
    Object.keys(modeBtns).forEach(function(k) {
      var active = (k === state.selectedMode);
      modeBtns[k].style.background = active ? "#2563eb" : "#161e2e";
      modeBtns[k].style.color = active ? "#ffffff" : "#cbd5e1";
      modeBtns[k].style.borderColor = active ? "#60a5fa" : "#334155";
    });
  }

  topHeader.appendChild(chatTitleEl);
  topHeader.appendChild(modeBar);

  var streamArea = document.createElement("div");
  streamArea.style.cssText = "flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:14px;max-width:960px;width:100%;margin:0 auto;box-sizing:border-box;";

  // Alt Gemini İstem Kutusu
  var composerWrap = document.createElement("div");
  composerWrap.style.cssText = "padding:12px 16px 16px;background:#0b0f17;";

  var composerBox = document.createElement("div");
  composerBox.style.cssText = "max-width:960px;margin:0 auto;background:#151c2c;border:1px solid #2b3852;border-radius:18px;padding:10px 14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 28px rgba(0,0,0,0.45);";

  var promptInput = document.createElement("textarea");
  promptInput.rows = 2;
  promptInput.placeholder = "Birlikte yazalım veya üretelim... (Enter ile gönder, Shift+Enter yeni satır)";
  promptInput.style.cssText = "width:100%;background:transparent;border:none;outline:none;color:#f8fafc;font-size:13.5px;resize:none;font-family:inherit;box-sizing:border-box;";

  var composerBottom = document.createElement("div");
  composerBottom.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;";

  var leftTools = document.createElement("div");
  leftTools.style.cssText = "display:flex;align-items:center;gap:6px;flex-wrap:wrap;";

  var plusBtn = document.createElement("button");
  plusBtn.type = "button";
  plusBtn.textContent = "+";
  plusBtn.title = "Mod değiştir (Görüntü / Video / Müzik / Canvas)";
  plusBtn.style.cssText = "width:30px;height:30px;border-radius:50%;background:#222c42;color:#f8fafc;border:1px solid #374666;font-size:16px;font-weight:700;cursor:pointer;";
  plusBtn.onclick = function() {
    var order = ["image", "video", "music", "canvas"];
    var idx = order.indexOf(state.selectedMode);
    state.selectedMode = order[(idx + 1) % order.length];
    renderModes();
  };

  var canvasChip = document.createElement("button");
  canvasChip.type = "button";
  canvasChip.textContent = "Canvas";
  canvasChip.style.cssText = "background:#1e293b;color:#e2e8f0;border:1px solid #334155;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;";
  canvasChip.onclick = function() {
    state.selectedMode = "canvas";
    renderModes();
  };

  var activeModeBadge = document.createElement("span");
  activeModeBadge.style.cssText = "font-size:11.5px;color:#93c5fd;font-weight:600;";

  leftTools.appendChild(plusBtn);
  leftTools.appendChild(canvasChip);
  leftTools.appendChild(activeModeBadge);

  var sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.textContent = "Gönder ➤";
  sendBtn.style.cssText = "background:#2563eb;color:#fff;border:none;padding:7px 14px;border-radius:999px;font-size:12.5px;font-weight:700;cursor:pointer;";

  function sendPrompt() {
    var q = (promptInput.value || "").trim();
    if (!q) return;
    var ch = currentChat();
    if (ch.title === "Yeni Multimodal Sohbet") {
      ch.title = q.slice(0, 34);
    }
    ch.messages.push({
      role: "user",
      mode: state.selectedMode,
      text: q,
      media_url: "",
      file: ""
    });
    var pendingIdx = ch.messages.push({
      role: "assistant",
      mode: state.selectedMode,
      text: "⏳ " + state.selectedMode.toUpperCase() + " üretiliyor...",
      media_url: "",
      file: ""
    }) - 1;
    promptInput.value = "";
    saveChats();
    renderAll();

    fetch("/api/multimodal", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        mode: state.selectedMode,
        prompt: q,
        title: q.slice(0, 28)
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      ch.messages[pendingIdx] = {
        role: "assistant",
        mode: d.mode || state.selectedMode,
        text: d.preview || d.error || "Tamamlandı.",
        media_url: d.media_url || "",
        file: d.file || ""
      };
      saveChats();
      renderAll();
    })
    .catch(function(err) {
      ch.messages[pendingIdx] = {
        role: "assistant",
        mode: state.selectedMode,
        text: "Hata: " + String(err),
        media_url: "",
        file: ""
      };
      saveChats();
      renderAll();
    });
  }

  sendBtn.onclick = sendPrompt;
  promptInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  });

  composerBottom.appendChild(leftTools);
  composerBottom.appendChild(sendBtn);
  composerBox.appendChild(promptInput);
  composerBox.appendChild(composerBottom);
  composerWrap.appendChild(composerBox);

  mainPane.appendChild(topHeader);
  mainPane.appendChild(streamArea);
  mainPane.appendChild(composerWrap);

  overlay.appendChild(sidebar);
  overlay.appendChild(mainPane);

  function renderArchive() {
    archiveList.innerHTML = "";
    state.chats.forEach(function(c) {
      var item = document.createElement("button");
      item.type = "button";
      var isAct = (c.id === state.activeId);
      item.textContent = c.title;
      item.style.cssText = "width:100%;text-align:left;padding:8px 10px;border-radius:8px;border:none;font-size:12.5px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:" + (isAct ? "#1e293b" : "transparent") + ";color:" + (isAct ? "#ffffff" : "#cbd5e1") + ";font-weight:" + (isAct ? "700" : "400") + ";";
      item.onclick = function() {
        state.activeId = c.id;
        renderAll();
      };
      archiveList.appendChild(item);
    });
  }

  function renderStream() {
    var ch = currentChat();
    chatTitleEl.textContent = ch.title;
    activeModeBadge.textContent = "Aktif Mod: " + state.selectedMode.toUpperCase();
    streamArea.innerHTML = "";
    ch.messages.forEach(function(msg) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:" + (msg.role === "user" ? "flex-end" : "flex-start") + ";";

      var bubble = document.createElement("div");
      bubble.style.cssText = "max-width:82%;padding:12px 15px;border-radius:16px;font-size:13px;line-height:1.5;background:" + (msg.role === "user" ? "#232b3b" : "#121926") + ";border:1px solid " + (msg.role === "user" ? "#334155" : "#223047") + ";color:#f1f5f9;";

      if (msg.media_url) {
        var dl = document.createElement("a");
        dl.href = msg.media_url;
        dl.download = "";
        dl.textContent = "⬇️ İndir (" + (msg.file || msg.media_url) + ")";
        dl.style.cssText = "display:inline-block;margin-bottom:8px;color:#60a5fa;font-weight:700;text-decoration:none;";
        bubble.appendChild(dl);
        bubble.appendChild(document.createElement("br"));

        if (msg.mode === "image") {
          var img = document.createElement("img");
          img.src = msg.media_url;
          img.style.cssText = "max-width:100%;max-height:420px;border-radius:10px;display:block;margin-bottom:8px;";
          bubble.appendChild(img);
        } else if (msg.mode === "video") {
          var vid = document.createElement("video");
          vid.src = msg.media_url;
          vid.controls = true;
          vid.style.cssText = "max-width:100%;max-height:420px;border-radius:10px;display:block;margin-bottom:8px;";
          bubble.appendChild(vid);
        } else if (msg.mode === "music") {
          var aud = document.createElement("audio");
          aud.src = msg.media_url;
          aud.controls = true;
          aud.style.cssText = "width:100%;display:block;margin-bottom:8px;";
          bubble.appendChild(aud);
        }
      }

      var txt = document.createElement("div");
      txt.textContent = msg.text || "";
      txt.style.cssText = "white-space:pre-wrap;word-break:break-word;";
      bubble.appendChild(txt);
      row.appendChild(bubble);
      streamArea.appendChild(row);
    });
    streamArea.scrollTop = streamArea.scrollHeight;
  }

  function renderAll() {
    renderModes();
    renderArchive();
    renderStream();
  }

  launcher.onclick = function() {
    state.open = !state.open;
    overlay.style.display = state.open ? "flex" : "none";
    if (state.open) {
      renderAll();
      setTimeout(function() { promptInput.focus(); }, 60);
    }
  };

  document.body.appendChild(overlay);
  document.body.appendChild(launcher);
  renderAll();
})();
</script>

</body></html>`;

http.createServer((req, res) => {

  if (req && req.url && req.url.split("?")[0].startsWith("/media/")) {
    const cleanName = decodeURIComponent(req.url.split("?")[0].replace("/media/", "")).replace(/[^A-Za-z0-9_.-]/g, "_");
    const fullFile = pathMod.join("/home/bytrkr/bistapp/workspace/media", cleanName);
    if (fsSync.existsSync(fullFile) && fsSync.statSync(fullFile).isFile()) {
      const ext = pathMod.extname(fullFile).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".mp4" ? "video/mp4" : ext === ".wav" ? "audio/wav" : "text/markdown; charset=utf-8";
      res.writeHead(200, { "Content-Type": mime });
      fsSync.createReadStream(fullFile).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Media not found: " + cleanName);
    }
    return;
  }
  if (req && req.url && req.url.split("?")[0] === "/api/multimodal" && req.method === "POST") {
    let rawBody = "";
    req.on("data", chunk => { rawBody += chunk; });
    req.on("end", () => {
      const pyCode = "import sys,json;sys.path.insert(0,r'/home/bytrkr/bistapp/python');from multimodal_studio import run_multimodal_task;d=json.loads(sys.stdin.read() or '{}');print(json.dumps(run_multimodal_task(d.get('mode','canvas'),d.get('prompt',''),d.get('title','sohbet')),ensure_ascii=False))";
      const r = spawnSync("/home/bytrkr/bistapp/.venv/bin/python", ["-c", pyCode], {
        input: rawBody,
        encoding: "utf8",
        timeout: 25000
      });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      if (r.status === 0 && r.stdout) {
        res.end(r.stdout.trim());
      } else {
        res.end(JSON.stringify({ ok: false, error: r.stderr || (r.error && r.error.message) || "Uretim hatasi" }));
      }
    });
    return;
  }


  
  

  if (mt16SpecialRoute(req, res)) return;
  if (mt16SpecialRoute(req, res)) return;
if (req.url && req.url.split("?")[0] === "/download-bundle") { const f = "/home/bytrkr/bistapp/backups/latest_ports_bundle.tar.gz"; if (fs.existsSync(f)) { const st = fs.statSync(f); res.writeHead(200, { "Content-Type": "application/gzip", "Content-Disposition": "attachment; filename=\"mt16_full_ports_bundle.tar.gz\"", "Content-Length": st.size }); return fs.createReadStream(f).pipe(res); } }

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
