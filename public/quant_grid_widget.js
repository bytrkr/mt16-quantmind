(function initMt16QuantGridWidget() {
  if (window.__mt16QuantGridMounted) return;
  window.__mt16QuantGridMounted = true;

  var state = { open: false, data: null, activeSheet: "01_Yonetici_Ozeti", filter: "", sortCol: null, sortAsc: true, selectedRow: null };

  function injectLauncher() {
    if (document.getElementById("mt16-qgrid-toggle")) return;
    var btn = document.createElement("button");
    btn.id = "mt16-qgrid-toggle";
    btn.textContent = "📊 Quant-Grid (8 Sayfa Excel Görünümü)";
    btn.style.cssText = "position:fixed;bottom:14px;right:14px;z-index:99998;background:#0f766e;color:#fff;border:1px solid #14b8a6;padding:10px 15px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.45);font-family:Segoe UI,sans-serif;";
    btn.onclick = function() { toggleModal(true); };
    document.body.appendChild(btn);
  }

  function fetchGridData() {
    var bodyEl = document.getElementById("mt16-qg-table-wrap");
    if (bodyEl) bodyEl.innerHTML = "<div style='padding:24px;color:#94a3b8;'>⏳ 8001 Kantitatif Çekirdekten 8 sayfalık canlı matris yükleniyor...</div>";
    fetch("/api/quant-grid")
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d || !d.ok) throw new Error("Veri alinamadi");
        state.data = d;
        if (!d.sheets[state.activeSheet] && d.sheet_order && d.sheet_order.length) state.activeSheet = d.sheet_order[0];
        renderModal();
      })
      .catch(function(err) {
        if (bodyEl) bodyEl.innerHTML = "<div style='padding:20px;color:#f87171;'>⚠️ Veri hatası: " + err + "</div>";
      });
  }

  function toggleModal(show) {
    state.open = show;
    var overlay = document.getElementById("mt16-qg-overlay");
    if (!show) {
      if (overlay) overlay.style.display = "none";
      return;
    }
    if (!overlay) createModalShell();
    document.getElementById("mt16-qg-overlay").style.display = "flex";
    fetchGridData();
  }

  function createModalShell() {
    var ov = document.createElement("div");
    ov.id = "mt16-qg-overlay";
    ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,0.92);display:flex;flex-direction:column;font-family:Segoe UI,Consolas,sans-serif;color:#e2e8f0;";
    ov.innerHTML = [
      "<div style='display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#0f172a;border-bottom:1px solid #1e293b;gap:8px;flex-wrap:wrap;'>",
      "  <div style='display:flex;align-items:center;gap:10px;'>",
      "    <strong style='color:#2dd4bf;font-size:14px;'>📊 MT16 QuantMind — 8 Sekmeli Excel-Grid Terminali</strong>",
      "    <span id='mt16-qg-meta' style='font-size:11px;color:#94a3b8;'></span>",
      "  </div>",
      "  <div style='display:flex;align-items:center;gap:6px;flex-wrap:wrap;'>",
      "    <input id='mt16-qg-search' placeholder='🔍 Hücre / Hisse / Karar filtrele...' style='background:#020617;color:#f8fafc;border:1px solid #334155;padding:5px 9px;border-radius:4px;font-size:12px;width:210px;'>",
      "    <button id='mt16-qg-refresh' style='background:#1e293b;color:#38bdf8;border:1px solid #334155;padding:5px 10px;border-radius:4px;font-size:12px;cursor:pointer;'>↻ Yenile</button>",
      "    <a href='/api/export-excel' download='MT16_QuantMind_Rapor.xlsx' style='background:#15803d;color:#fff;padding:5px 11px;border-radius:4px;font-size:12px;font-weight:700;text-decoration:none;'>📥 8 Sayfa .xlsx İndir</a>",
      "    <button id='mt16-qg-close' style='background:#991b1b;color:#fff;border:none;padding:5px 11px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;'>✕ Kapat</button>",
      "  </div>",
      "</div>",
      "<div id='mt16-qg-formula' style='padding:4px 14px;background:#020617;border-bottom:1px solid #1e293b;font-size:11.5px;color:#cbd5e1;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>fx | Bir satıra tıklayarak detay ve jüri gerekçesini inceleyin...</div>",
      "<div id='mt16-qg-table-wrap' style='flex:1;overflow:auto;background:#090d16;'></div>",
      "<div id='mt16-qg-tabs' style='display:flex;overflow-x:auto;background:#0f172a;border-top:1px solid #334155;padding:4px 8px;gap:4px;'></div>"
    ].join("");
    document.body.appendChild(ov);

    document.getElementById("mt16-qg-close").onclick = function() { toggleModal(false); };
    document.getElementById("mt16-qg-refresh").onclick = fetchGridData;
    document.getElementById("mt16-qg-search").oninput = function(e) { state.filter = e.target.value || ""; renderModal(); };
  }

  function renderModal() {
    if (!state.data) return;
    var sheet = state.data.sheets[state.activeSheet];
    if (!sheet) return;

    var metaEl = document.getElementById("mt16-qg-meta");
    if (metaEl) metaEl.textContent = (state.data.generated_at || "") + " • " + (sheet.title || "");

    var tabsEl = document.getElementById("mt16-qg-tabs");
    tabsEl.innerHTML = "";
    state.data.sheet_order.forEach(function(key) {
      var b = document.createElement("button");
      var active = key === state.activeSheet;
      b.textContent = key;
      b.style.cssText = "padding:6px 11px;border-radius:4px;font-size:11.5px;font-weight:" + (active ? "700" : "500") + ";cursor:pointer;white-space:nowrap;border:1px solid " + (active ? "#14b8a6" : "#1e293b") + ";background:" + (active ? "#115e59" : "#1e293b") + ";color:" + (active ? "#fff" : "#94a3b8") + ";";
      b.onclick = function() { state.activeSheet = key; state.sortCol = null; renderModal(); };
      tabsEl.appendChild(b);
    });

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

    var html = "<table style='width:100%;border-collapse:collapse;font-size:12px;'>";
    html += "<thead><tr style='position:sticky;top:0;background:#1e3a5f;color:#fff;z-index:2;'>";
    html += "<th style='padding:7px 8px;border:1px solid #334155;width:38px;text-align:center;background:#0f172a;color:#64748b;'>#</th>";
    cols.forEach(function(c) {
      var arrow = state.sortCol === c ? (state.sortAsc ? " ▲" : " ▼") : "";
      html += "<th data-col='" + c + "' style='padding:7px 10px;border:1px solid #334155;text-align:left;cursor:pointer;white-space:nowrap;'>" + c + arrow + "</th>";
    });
    html += "</tr></thead><tbody>";

    rows.forEach(function(r, idx) {
      var bg = idx % 2 === 0 ? "#090d16" : "#0d1320";
      html += "<tr data-ridx='" + idx + "' style='background:" + bg + ";cursor:pointer;'>";
      html += "<td style='padding:5px 8px;border:1px solid #1e293b;text-align:center;color:#64748b;background:#0f172a;'>" + (idx + 1) + "</td>";
      cols.forEach(function(c) {
        var val = r[c] == null ? "" : String(r[c]);
        var color = "#e2e8f0";
        if (/^(AL|AKTIF|ONLINE|HEALTHY|POZITIF)$/i.test(val)) color = "#4ade80";
        else if (/^(SAT|VETO|NEGATIF|HATA)$/i.test(val)) color = "#f87171";
        else if (/^-?\d+(\.\d+)?$/.test(val) && parseFloat(val) < 0) color = "#f87171";
        html += "<td style='padding:5px 10px;border:1px solid #1e293b;color:" + color + ";white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis;'>" + val + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";

    var wrap = document.getElementById("mt16-qg-table-wrap");
    wrap.innerHTML = html;

    wrap.querySelectorAll("th[data-col]").forEach(function(th) {
      th.onclick = function() {
        var c = th.getAttribute("data-col");
        if (state.sortCol === c) state.sortAsc = !state.sortAsc;
        else { state.sortCol = c; state.sortAsc = true; }
        renderModal();
      };
    });

    wrap.querySelectorAll("tr[data-ridx]").forEach(function(tr) {
      tr.onclick = function() {
        var r = rows[Number(tr.getAttribute("data-ridx"))];
        var fEl = document.getElementById("mt16-qg-formula");
        if (fEl && r) fEl.textContent = "fx [" + state.activeSheet + "] | " + JSON.stringify(r);
      };
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectLauncher);
  else injectLauncher();
})();
