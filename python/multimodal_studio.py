import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

ROOT = Path("/home/bytrkr/bistapp")
MEDIA_DIR = ROOT / "workspace/media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

def run_multimodal_task(mode: str, prompt: str, title: str = "taslak") -> Dict[str, Any]:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in (title or "taslak"))[:40]
    mode = (mode or "canvas").lower().strip()
    if mode == "canvas":
        f = MEDIA_DIR / f"canvas_{safe}_{ts}.md"
        txt = f"# Canvas: {title}\n**UTC:** {ts}\n\n## İstem\n{prompt}\n\n## Yapılandırılmış Plan\n- **Ana Fikir:** {prompt[:160]}\n- **Giriş:** Kanca ve problem tanımı\n- **Gelişme:** Adım adım uygulama\n- **Sonuç:** Eylem çağrısı\n"
        f.write_text(txt, encoding="utf-8")
        return {"ok": True, "mode": "canvas", "file": str(f.relative_to(ROOT)), "preview": txt}
    if mode == "image":
        f = MEDIA_DIR / f"image_{safe}_{ts}.json"
        spec = {"type": "IMAGE_SPEC", "utc": ts, "prompt": prompt, "enhanced": f"Cinematic 8k ultra-detailed -- {prompt}", "ratio": "16:9"}
        f.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")
        return {"ok": True, "mode": "image", "file": str(f.relative_to(ROOT)), "preview": json.dumps(spec, indent=2, ensure_ascii=False)}
    if mode == "video":
        f = MEDIA_DIR / f"video_{safe}_{ts}.json"
        sb = {"type": "VIDEO_PIPELINE", "utc": ts, "concept": prompt, "scenes": [{"s": 1, "sec": 3, "visual": f"Hook: {prompt}"}, {"s": 2, "sec": 5, "visual": f"Detail: {prompt}"}, {"s": 3, "sec": 4, "visual": "CTA Finale"}]}
        f.write_text(json.dumps(sb, indent=2, ensure_ascii=False), encoding="utf-8")
        return {"ok": True, "mode": "video", "file": str(f.relative_to(ROOT)), "preview": json.dumps(sb, indent=2, ensure_ascii=False)}
    if mode == "music":
        f = MEDIA_DIR / f"music_{safe}_{ts}.json"
        ms = {"type": "MUSIC_SPEC", "utc": ts, "prompt": prompt, "bpm": 110, "key": "D Minor", "instruments": ["Synth Pad", "Sub Bass", "Percussion"]}
        f.write_text(json.dumps(ms, indent=2, ensure_ascii=False), encoding="utf-8")
        return {"ok": True, "mode": "music", "file": str(f.relative_to(ROOT)), "preview": json.dumps(ms, indent=2, ensure_ascii=False)}
    return {"ok": False, "error": "Gecersiz mod"}
