import http from "node:http";
import { execFile } from "node:child_process";

const PORT = 3002;
const PY_BIN = "/home/bytrkr/bistapp/.venv/bin/python";

const HTML = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MT16 QuantMind — 8 Sekmeli Excel-Grid Terminali (Port 3002)</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #090d16; color: #e2e8f0; font-family: "Segoe UI", Consolas, sans-serif; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .topbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #0f172a; border-bottom: 1px solid #1e293b; gap: 8px; flex-wrap: wrap; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand strong { color: #2dd4bf; font-size: 14.5px; }
    .badge { font-size: 11px; background: #1e293b; border: 1px solid #334155; padding: 3px 8px; border-radius: 12px; color: #94a3b8; }
    .controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    input, button, a.btn { font-size: 12px; border-radius: 5px; padding: 5px 10px; }
    input { background: #020617; color: #f8fafc; border: 1px solid #334155; width: 220px; }
    button { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; cursor: pointer; }
    button:hover { border-color: #38bdf8; }
    a.btn { background: #15803d; color: #fff; font-weight: 700; text-decoration: none; border: 1px solid #22c55e; }
    .formulabar { padding: 5px 14px; background: #020617; border-bottom: 1px solid #1e293b; font-family: Consolas, monospace; font-size: 12px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .formulabar span.fx { color: #2dd4bf; font-weight: bold; margin-right: 8px; }
    .gridwrap { flex: 1; overflow: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    thead th { position: sticky; top: 0; background: #1e3a5f; color: #fff; padding: 7px 10px; border: 1px solid #334155; text-align: left; cursor: pointer; white-space: nowrap; z-index: 2; user-select: none; }
    thead th:first-child { width: 42px; text-align: center; background: #0f172a; color: #64748b; }
    tbody tr:nth-child(even) { background: #0d1320; }
    tbody tr:hover { background: #172554; }
    tbody tr.selected { background: #134e4a !important; }
    tbody td { padding: 6px 10px; border: 1px solid #1e293b; white-space: nowrap; max-width: 420px; overflow: hidden; text-overflow: ellipsis; }
    tbody td:first-child { text-align: center; background: #0f172a; color: #64748b; font-weight: 600; }
    .pos { color: #4ade80; font-weight: 600; }
    .neg { color: #f87171; font-weight: 600; }
    .sheetbar { display: flex; align-items: center; overflow-x: auto; background: #0f172a; border-top: 1px solid #334155; padding: 5px 10px; gap: 5px; }
    .tab { padding: 6px 12px; border-radius: 4px; font-size: 12px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; cursor: pointer; white-space: nowrap; }
    .tab.active { background: #0f766e; color: #fff; border-color: #2dd4bf; font-weight: 700; }
    .spk { margin-left: auto; font-size: 11px; color: #64748b; white-space: nowrap; padding-left: 12px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <strong>📊 MT16 QuantMind — Excel-Grid Terminali (Port 3002)</strong>
      <span id="metaBadge" class="badge">⏳ Bağlanıyor...</span>
    </div>
    <div class="controls">
      <input id="searchBox" placeholder="🔍 Hücre, Hisse veya Karar ara...">
      <button onclick="loadGrid()">↻ Yenile</button>
      <button onclick="window.open('http://136.144.200.54:3000','_blank')">🌐 3000 Ana Ekran</button>
      <button onclick="window.open('http://136.144.200.54:3001','_blank')">⚡ 3001 Kokpit</button>
      <a class="btn" href="/api/export-excel" download="MT16_QuantMind_Rapor.xlsx">📥 8 Sayfa .xlsx İndir</a>
    </div>
  </div>
  <div class="formulabar"><span class="fx">fx</span><span id="fxText">Bir hücreye veya satıra tıklayarak tam içeriği ve jüri gerekçesini görüntüleyin...</span></div>
  <div id="gridWrap" class="gridwrap"></div>
  <div id="sheetBar" class="sheetbar"></div>

  <script>
    var state = { data: null, activeSheet: "01_Yonetici_Ozeti", filter: "", sortCol: null, sortAsc: true, selIdx: -1 };

    function loadGrid() {
      document.getElementById("metaBadge").textContent = "⏳ Yükleniyor...";
      fetch("/api/quant-grid")
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!d || !d.ok) throw new Error("API yaniti gecersiz");
          state.data = d;
          if (!d.sheets[state.activeSheet] && d.sheet_order && d.sheet_order.length) {
            state.activeSheet = d.sheet_order[0];
          }
          render();
        })
        .catch(function(e) {
          document.getElementById("metaBadge").textContent = "⚠️ Hata: " + e.message;
        });
    }

    function render() {
      if (!state.data) return;
      var sheet = state.data.sheets[state.activeSheet];
      if (!sheet) return;

      document.getElementById("metaBadge").textContent = (sheet.title || state.activeSheet) + " • " + (state.data.generated_at || "");

      var bar = document.getElementById("sheetBar");
      bar.innerHTML = "";
      state.data.sheet_order.forEach(function(key) {
        var btn = document.createElement("button");
        btn.className = "tab" + (key === state.activeSheet ? " active" : "");
        btn.textContent = key;
        btn.onclick = function() { state.activeSheet = key; state.sortCol = null; state.selIdx = -1; render(); };
        bar.appendChild(btn);
      });
      var spk = document.createElement("span");
      spk.className = "spk";
      spk.textContent = state.data.regulatory_compliance || "TR-SPK Seri:V No:55 Uyumlu";
      bar.appendChild(spk);

      var cols = sheet.columns || [];
      var rows = (sheet.rows || []).slice();
      if (state.filter.trim()) {
        var q = state.filter.toLowerCase();
        rows = rows.filter(function(r) {
          return cols.some(function(c) { return String(r[c] == null ? "" : r[c]).toLowerCase().indexOf(q) !== -1; });
        });
      }
      if (state.sortCol) {
        var sc = state.sortCol, asc = state.sortAsc ? 1 : -1;
        rows.sort(function(a, b) {
          var va = a[sc], vb = b[sc];
          var na = parseFloat(va), nb = parseFloat(vb);
          if (!isNaN(na) && !isNaN(nb)) return (na - nb) * asc;
          return String(va || "").localeCompare(String(vb || "")) * asc;
        });
      }

      var html = "<table><thead><tr><th>#</th>";
      cols.forEach(function(c) {
        var arrow = state.sortCol === c ? (state.sortAsc ? " ▲" : " ▼") : "";
        html += "<th data-col='" + c + "'>" + c + arrow + "</th>";
      });
      html += "</tr></thead><tbody>";

      rows.forEach(function(r, idx) {
        html += "<tr data-idx='" + idx + "' class='" + (idx === state.selIdx ? "selected" : "") + "'>";
        html += "<td>" + (idx + 1) + "</td>";
        cols.forEach(function(c) {
          var val = r[c] == null ? "" : String(r[c]);
          var cls = "";
          if (/^(AL|AKTIF|ONLINE|HEALTHY|POZITIF|HAZIR|DENETLENDI)$/i.test(val)) cls = "pos";
          else if (/^(SAT|VETO|NEGATIF|HATA)$/i.test(val)) cls = "neg";
          else if (/^-?\d+(\.\d+)?$/.test(val) && parseFloat(val) < 0) cls = "neg";
          html += "<td class='" + cls + "'>" + val + "</td>";
        });
        html += "</tr>";
      });
      html += "</tbody></table>";

      var wrap = document.getElementById("gridWrap");
      wrap.innerHTML = html;

      wrap.querySelectorAll("th[data-col]").forEach(function(th) {
        th.onclick = function() {
          var c = th.getAttribute("data-col");
          if (state.sortCol === c) state.sortAsc = !state.sortAsc;
          else { state.sortCol = c; state.sortAsc = true; }
          render();
        };
      });

      wrap.querySelectorAll("tbody tr").forEach(function(tr) {
        tr.onclick = function() {
          var i = Number(tr.getAttribute("data-idx"));
          state.selIdx = i;
          var r = rows[i];
          document.getElementById("fxText").textContent = "[" + state.activeSheet + " | Satır " + (i + 1) + "] " + JSON.stringify(r);
          render();
        };
      });
    }

    document.getElementById("searchBox").oninput = function(e) {
      state.filter = e.target.value || "";
      render();
    };

    loadGrid();
    setInterval(loadGrid, 30000);
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/api/quant-grid") {
    try {
      const out = execFile(PY_BIN, ["-c", "import sys,json; sys.path.insert(0,'/home/bytrkr/bistapp/python'); from quant_grid_service import build_quant_grid_payload; print(json.dumps(build_quant_grid_payload(), ensure_ascii=False))"], { maxBuffer: 10 * 1024 * 1024 });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(out);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
    return;
  }

  if (url.pathname === "/api/export-excel") {
    try {
      const buf = execFile(PY_BIN, ["-c", "import sys; sys.path.insert(0,'/home/bytrkr/bistapp/python'); from quant_grid_service import build_excel_bytes; sys.stdout.buffer.write(build_excel_bytes())"], { maxBuffer: 20 * 1024 * 1024 });
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"MT16_QuantMind_Rapor.xlsx\"",
        "Content-Length": buf.length
      });
      res.end(buf);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(HTML);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("MT16_QUANTGRID_3002_AKTIF");
});
