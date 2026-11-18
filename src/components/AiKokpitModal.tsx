import React, { useState } from "react";

export const AiKokpitModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [aiMod, setAiMod] = useState<"plan" | "build" | "hack" | "audit">("build");
  const [derinDusun, setDerinDusun] = useState(true);
  const [aktifSekme, setAktifSekme] = useState<"terminal" | "secrets">("terminal");
  const [cmdGirdi, setCmdGirdi] = useState("pm2 status");
  const [cmdPin, setCmdPin] = useState(() => localStorage.getItem("mt16_cmd_pin") || "1616");
  const [cmdMesgul, setCmdMesgul] = useState(false);
  const [cmdBloklar, setCmdBloklar] = useState<{ id: number; zaman: string; komut: string; cikti: string }[]>([]);
  const [secretKey, setSecretKey] = useState("");
  const [secretVal, setSecretVal] = useState("");

  const calistirCmd = (k?: string) => {
    if (cmdMesgul) return;
    const c = (k ?? cmdGirdi).trim();
    if (!c) return;
    setAktifSekme("terminal");
    setCmdMesgul(true);
    const bid = Date.now();
    const z = new Date().toLocaleTimeString("tr-TR");
    setCmdBloklar((prev) => [{ id: bid, zaman: z, komut: c, cikti: "⏳ Çalışıyor..." }, ...prev.slice(0, 19)]);
    fetch("/api/cmd", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cmd-pin": cmdPin },
      body: JSON.stringify({ cmd: c, pin: cmdPin })
    })
      .then((r) => r.json())
      .then((d) => setCmdBloklar((prev) => prev.map((b) => (b.id === bid ? { ...b, cikti: d.out || "Tamamlandı." } : b))))
      .catch((e) => setCmdBloklar((prev) => prev.map((b) => (b.id === bid ? { ...b, cikti: "HATA: " + String(e) } : b))))
      .finally(() => setCmdMesgul(false));
  };

  const aiSor = (t?: string) => {
    const q = (t ?? cmdGirdi).trim();
    if (!q) return;
    if (t) setCmdGirdi(t);
    const g = q.replace(/'/g, "'\\''");
    calistirCmd(`python3 python/ai_coder_agent.py --mode ${aiMod}${derinDusun ? " --deep" : ""} '${g}'`);
  };

  const raporIndir = () => {
    const md = "# MT16 AI Studio Raporu\n\n" + cmdBloklar.map((b) => `### [${b.zaman}] \`${b.komut}\`\n\`\`\`text\n${b.cikti}\n\`\`\``).join("\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
    a.download = `mt16_studio_${Date.now()}.md`;
    a.click();
  };

  const secretKaydet = () => {
    const k = secretKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const v = secretVal.trim();
    if (!k || !v) return;
    setSecretKey("");
    setSecretVal("");
    calistirCmd(`python3 -c 'import pathlib; p=pathlib.Path(".env"); L=[l for l in p.read_text().splitlines() if not l.startswith("${k}=")] if p.exists() else []; L.append("${k}=${v.replace(/'/g, "")}"); p.write_text("\\n".join(L)+"\\n"); print("SECRET_OK: ${k}")'`);
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0d1117", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: "10px", width: "96vw", maxWidth: "1320px", height: "88vh", display: "flex", flexDirection: "column", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #30363d", paddingBottom: "8px", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
          <strong style={{ fontSize: "14px", color: "#58a6ff" }}>⚡ MT16 AI Studio & Otonom Geliştirici Kokpiti</strong>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setAktifSekme("terminal")} style={{ background: aktifSekme === "terminal" ? "#1f6feb" : "#21262d", color: "#fff", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 9px", fontSize: "11px", cursor: "pointer" }}>💻 Code & Terminal</button>
            <button type="button" onClick={() => setAktifSekme("secrets")} style={{ background: aktifSekme === "secrets" ? "#1f6feb" : "#21262d", color: "#fff", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 9px", fontSize: "11px", cursor: "pointer" }}>🔑 Secrets (.env)</button>
            <button type="button" onClick={() => calistirCmd("git status -s && git diff --stat")} style={{ background: "#21262d", color: "#7ee787", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 9px", fontSize: "11px", cursor: "pointer" }}>🐙 GitHub Durum</button>
            <button type="button" onClick={() => calistirCmd("curl -s -o /dev/null -w 'HTTP %{http_code} | Sure: %{time_total}s\\n' http://localhost:3000 && pm2 status")} style={{ background: "#21262d", color: "#79c0ff", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 9px", fontSize: "11px", cursor: "pointer" }}>🌐 Preview Health</button>
            <button type="button" onClick={raporIndir} style={{ background: "#238636", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 9px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>📤 Share (.md)</button>
            <span style={{ fontSize: "11px", color: "#8b949e" }}>PIN:</span>
            <input type="password" value={cmdPin} onChange={(e) => { setCmdPin(e.target.value); localStorage.setItem("mt16_cmd_pin", e.target.value); }} style={{ width: "56px", background: "#161b22", color: "#fff", border: "1px solid #30363d", borderRadius: "4px", padding: "3px 6px", fontSize: "11px" }} />
            <button type="button" onClick={onClose} style={{ background: "#da3633", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>✕</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#8b949e" }}>Mod:</span>
          {([["plan", "🛡️ PLAN"], ["build", "🛠️ BUILD"], ["hack", "⚡ HACK (YOLO)"], ["audit", "🔒 AUDIT"]] as const).map(([m, ad]) => (
            <button key={m} type="button" onClick={() => setAiMod(m)} style={{ background: aiMod === m ? (m === "hack" ? "#b62324" : "#6e40c9") : "#161b22", color: "#fff", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 9px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>{ad}</button>
          ))}
          <button type="button" onClick={() => setDerinDusun(!derinDusun)} style={{ background: derinDusun ? "#0969da" : "#161b22", color: "#fff", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>{derinDusun ? "🧠 Derin Düşün: AÇIK" : "🧠 Derin Düşün: KAPALI"}</button>
          <button type="button" onClick={() => calistirCmd("cat data/sanal_portfoy.json")} style={{ background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}>💰 Portföy</button>
          <button type="button" onClick={() => calistirCmd("cat data/ai_agent_memory.json 2>/dev/null || echo 'Hafiza bos'")} style={{ background: "#21262d", color: "#d2a8ff", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}>🧬 AI Hafıza</button>
          <button type="button" onClick={() => setCmdBloklar([])} style={{ marginLeft: "auto", background: "#21262d", color: "#8b949e", border: "1px solid #30363d", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}>🧹 Temizle</button>
        </div>
        {aktifSekme === "secrets" && (
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "6px", padding: "12px", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#58a6ff", marginBottom: "8px" }}>🔑 AI Studio Secrets Yöneticisi (.env)</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="ANAHTAR_ADI" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} style={{ flex: 1, background: "#010409", color: "#fff", border: "1px solid #30363d", borderRadius: "4px", padding: "6px", fontSize: "12px" }} />
              <input type="password" placeholder="Yeni Deger..." value={secretVal} onChange={(e) => setSecretVal(e.target.value)} style={{ flex: 1, background: "#010409", color: "#fff", border: "1px solid #30363d", borderRadius: "4px", padding: "6px", fontSize: "12px" }} />
              <button type="button" onClick={secretKaydet} style={{ background: "#238636", color: "#fff", border: "none", borderRadius: "4px", padding: "0 14px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Kaydet</button>
              <button type="button" onClick={() => calistirCmd("python3 -c 'import pathlib; p=pathlib.Path(\".env\"); print(\"\\n\".join(l.split(\"=\")+\"=****\"+l.split(\"=\",1)[-4:] for l in p.read_text().splitlines() if \"=\" in l and not l.startswith(\"#\")))'")} style={{ background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: "4px", padding: "0 12px", fontSize: "12px", cursor: "pointer" }}>Maskeli Listele</button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <textarea rows={2} value={cmdGirdi} onChange={(e) => setCmdGirdi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); calistirCmd(); } }} placeholder="Türkçe talimat veya Bash komutu yazın..." style={{ flex: 1, background: "#010409", color: "#7ee787", border: "1px solid #30363d", borderRadius: "4px", padding: "8px", fontFamily: "monospace", fontSize: "12.5px" }} />
          <button type="button" disabled={cmdMesgul} onClick={() => aiSor()} style={{ background: "#6e40c9", color: "#fff", border: "none", borderRadius: "4px", padding: "0 14px", fontWeight: "bold", cursor: "pointer" }}>🤖 AI ({aiMod.toUpperCase()})</button>
          <button type="button" disabled={cmdMesgul} onClick={() => calistirCmd()} style={{ background: "#238636", color: "#fff", border: "none", borderRadius: "4px", padding: "0 14px", fontWeight: "bold", cursor: "pointer" }}>Çalıştır ↵</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {cmdBloklar.map((b) => (
            <div key={b.id} style={{ background: "#010409", border: "1px solid #30363d", borderRadius: "6px", padding: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#8b949e", marginBottom: "4px" }}>
                <span>[{b.zaman}] <strong style={{ color: "#7ee787" }}>$ {b.komut}</strong></span>
                <button type="button" onClick={() => navigator.clipboard?.writeText(b.cikti)} style={{ background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: "4px", padding: "1px 6px", fontSize: "10px", cursor: "pointer" }}>📋 Kopyala</button>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "11.5px", color: "#c9d1d9" }}>{b.cikti}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
