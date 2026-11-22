import json, math, struct, subprocess, textwrap, wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

ROOT = Path("/home/bytrkr/bistapp")
MEDIA_DIR = ROOT / "workspace/media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

def _make_png(out_path: Path, title: str, prompt: str) -> None:
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (1280, 720), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)
        for y in range(720):
            r = int(15 + (y / 720) * 35)
            g = int(23 + (y / 720) * 65)
            b = int(42 + (y / 720) * 110)
            draw.line([(0, y), (1280, y)], fill=(r, g, b))
        draw.rectangle([48, 48, 1232, 672], outline=(56, 189, 248), width=4)
        draw.text((80, 90), f"MT16 AI STUDIO - GORUNTU URETIMI", fill=(56, 189, 248))
        wrapped = "\n".join(textwrap.wrap(prompt, width=52))
        draw.text((80, 170), wrapped, fill=(248, 250, 252))
        img.save(str(out_path), "PNG")
    except Exception:
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x0f172a:s=1280x720:d=1",
            "-frames:v", "1", str(out_path)
        ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def _make_wav(out_path: Path, seconds: int = 6) -> None:
    sr = 22050
    notes = [293.66, 349.23, 440.00, 523.25, 440.00, 349.23]
    with wave.open(str(out_path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        frames = bytearray()
        for i in range(sr * seconds):
            t = i / sr
            freq = notes[int(t) % len(notes)]
            val = int(12000 * math.sin(2 * math.pi * freq * t) * math.exp(-0.4 * (t % 1.0)))
            frames.extend(struct.pack("<h", max(-32767, min(32767, val))))
        wf.writeframes(bytes(frames))

def run_multimodal_task(mode: str, prompt: str, title: str = "uretim") -> Dict[str, Any]:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in (title or "uretim"))[:32] or "uretim"
    mode = (mode or "canvas").lower().strip()

    if mode == "image":
        png = MEDIA_DIR / f"img_{safe}_{ts}.png"
        _make_png(png, title, prompt)
        rel = str(png.relative_to(ROOT))
        return {"ok": True, "mode": "image", "file": rel, "media_url": f"/media/{png.name}", "preview": f"Gorsel uretildi: {rel}\nIstem: {prompt}"}

    if mode == "video":
        png = MEDIA_DIR / f"frame_{safe}_{ts}.png"
        wav = MEDIA_DIR / f"snd_{safe}_{ts}.wav"
        mp4 = MEDIA_DIR / f"vid_{safe}_{ts}.mp4"
        _make_png(png, title, prompt)
        _make_wav(wav, seconds=6)
        subprocess.run([
            "ffmpeg", "-y", "-loop", "1", "-i", str(png), "-i", str(wav),
            "-c:v", "libx264", "-t", "6", "-pix_fmt", "yuv420p", "-shortest", str(mp4)
        ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        rel = str(mp4.relative_to(ROOT))
        return {"ok": True, "mode": "video", "file": rel, "media_url": f"/media/{mp4.name}", "preview": f"Video (6 sn MP4 + Ses) uretildi: {rel}\nKonu: {prompt}"}

    if mode == "music":
        wav = MEDIA_DIR / f"music_{safe}_{ts}.wav"
        _make_wav(wav, seconds=8)
        rel = str(wav.relative_to(ROOT))
        return {"ok": True, "mode": "music", "file": rel, "media_url": f"/media/{wav.name}", "preview": f"Muzik (8 sn WAV) uretildi: {rel}\nIstem: {prompt}"}

    md = MEDIA_DIR / f"canvas_{safe}_{ts}.md"
    txt = f"# Canvas: {title}\n**Tarih (UTC):** {ts}\n\n## Konu\n{prompt}\n\n## Icerik Taslagi\n- **Bolum 1:** {prompt}\n- **Bolum 2:** Uygulama adimlari ve teknik mimari\n- **Bolum 3:** Sonuc ve sonraki adim\n"
    md.write_text(txt, encoding="utf-8")
    rel = str(md.relative_to(ROOT))
    return {"ok": True, "mode": "canvas", "file": rel, "media_url": f"/media/{md.name}", "preview": txt}
