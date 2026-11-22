import asyncio
import json
import math
import os
import re
import struct
import subprocess
import textwrap
import urllib.parse
import urllib.request
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path("/home/bytrkr/bistapp")
MEDIA_DIR = ROOT / "workspace/media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def _slug(title: str, default: str = "uretim") -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", (title or default).strip()).strip("_")
    return (cleaned[:28] or default)


def _fetch_remote_png(out_path: Path, prompt: str) -> Optional[str]:
    clean_prompt = re.sub(r"\s+", " ", (prompt or "modern digital art")).strip()[:420]
    encoded = urllib.parse.quote(clean_prompt)

    hf_token = (os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_API_KEY") or "").strip()
    if hf_token:
        hf_model = (os.environ.get("HF_IMAGE_MODEL") or "black-forest-labs/FLUX.1-schnell").strip()
        try:
            req = urllib.request.Request(
                f"https://api-inference.huggingface.co/models/{hf_model}",
                data=json.dumps({"inputs": clean_prompt}).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {hf_token}",
                    "Content-Type": "application/json",
                    "User-Agent": "MT16-AI-Studio/2.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = resp.read()
            if data and len(data) > 512:
                tmp = out_path.with_suffix(".hfbin")
                tmp.write_bytes(data)
                try:
                    from PIL import Image
                    with Image.open(tmp) as im:
                        im.convert("RGB").save(str(out_path), "PNG")
                    tmp.unlink(missing_ok=True)
                    return f"huggingface:{hf_model}"
                except Exception:
                    tmp.unlink(missing_ok=True)
        except Exception:
            pass

    urls: List[str] = []
    custom_url = (os.environ.get("IMAGE_API_URL") or "").strip()
    if custom_url:
        urls.append(custom_url.replace("{prompt}", encoded))
    urls.append(f"https://image.pollinations.ai/prompt/{encoded}?width=1280&height=720&nologo=true")

    headers = {"User-Agent": "Mozilla/5.0 MT16-AI-Studio/2.0"}
    api_key = (os.environ.get("IMAGE_API_KEY") or "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    for u in urls:
        try:
            req = urllib.request.Request(u, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            if not data or len(data) < 512:
                continue
            tmp = out_path.with_suffix(".imgbin")
            tmp.write_bytes(data)
            try:
                from PIL import Image
                with Image.open(tmp) as im:
                    im.convert("RGB").save(str(out_path), "PNG")
                tmp.unlink(missing_ok=True)
                return "remote_image_api"
            except Exception:
                tmp.unlink(missing_ok=True)
        except Exception:
            continue
    return None


def _make_png(out_path: Path, title: str, prompt: str) -> str:
    remote_src = _fetch_remote_png(out_path, prompt)
    if remote_src:
        return remote_src
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (1280, 720), color=(11, 17, 30))
        draw = ImageDraw.Draw(img)
        for y in range(720):
            r = int(11 + (y / 720) * 28)
            g = int(17 + (y / 720) * 58)
            b = int(30 + (y / 720) * 95)
            draw.line([(0, y), (1280, y)], fill=(r, g, b))
        draw.rectangle([40, 40, 1240, 680], outline=(56, 189, 248), width=3)
        draw.rounded_rectangle([70, 72, 430, 112], radius=16, fill=(30, 58, 138))
        draw.text((88, 84), "MT16 MULTIMODAL STUDIO // VISUAL", fill=(186, 230, 253))
        draw.text((70, 138), f"BASLIK: {(title or 'Uretim')[:60]}", fill=(125, 211, 252))
        wrapped = "\n".join(textwrap.wrap(prompt or "Istem belirtilmedi", width=56))
        draw.text((70, 195), wrapped, fill=(248, 250, 252))
        draw.text((70, 620), "Yerel Render Modu (Dis gorsel API anahtari/ag bekleniyor)", fill=(148, 163, 184))
        img.save(str(out_path), "PNG")
    except Exception:
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x0b111e:s=1280x720:d=1",
            "-frames:v", "1", str(out_path)
        ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return "local_render"


def _make_melody_wav(out_path: Path, seconds: int = 8) -> None:
    sr = 22050
    chord_notes = [261.63, 329.63, 392.00, 493.88, 440.00, 349.23, 293.66, 392.00]
    with wave.open(str(out_path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        frames = bytearray()
        for i in range(sr * seconds):
            t = i / sr
            idx = int(t * 2) % len(chord_notes)
            freq = chord_notes[idx]
            env = math.exp(-2.2 * ((t * 2) % 1.0))
            sample = 0.65 * math.sin(2 * math.pi * freq * t) + 0.35 * math.sin(2 * math.pi * (freq * 1.5) * t)
            val = int(11000 * sample * env)
            frames.extend(struct.pack("<h", max(-32767, min(32767, val))))
        wf.writeframes(bytes(frames))


def _try_edge_tts(text: str, out_mp3: Path, voice: str = "tr-TR-EmelNeural") -> bool:
    try:
        import edge_tts

        async def _runner() -> None:
            communicate = edge_tts.Communicate(text[:600], voice=voice)
            await communicate.save(str(out_mp3))

        asyncio.run(_runner())
        return out_mp3.exists() and out_mp3.stat().st_size > 256
    except Exception:
        return False


def _call_groq_canvas(prompt: str, title: str) -> Optional[str]:
    api_key = (os.environ.get("GROQ_API_KEY") or "").strip()
    if not api_key:
        return None
    model = (os.environ.get("GROQ_MODEL") or "llama-3.3-70b-versatile").strip()
    payload = {
        "model": model,
        "temperature": 0.6,
        "messages": [
            {
                "role": "system",
                "content": "Sen MT16 AI Studio icinde calisan net, yapilandirilmis ve pratik bir Turkce uretim asistanisin. Yanitlarini baslik ve maddelerle duzenle.",
            },
            {
                "role": "user",
                "content": f"Baslik: {title}\nIstek: {prompt}",
            },
        ],
    }
    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MT16-AI-Studio/2.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
        content = (((raw.get("choices") or [{}])[0]).get("message") or {}).get("content")
        return content.strip() if isinstance(content, str) and content.strip() else None
    except Exception:
        return None


def run_multimodal_task(mode: str, prompt: str, title: str = "uretim") -> Dict[str, Any]:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe = _slug(title, "uretim")
    clean_mode = (mode or "canvas").lower().strip()
    clean_prompt = (prompt or "").strip() or "Genel uretim istegi"

    if clean_mode == "image":
        png = MEDIA_DIR / f"img_{safe}_{ts}.png"
        src_type = _make_png(png, title, clean_prompt)
        rel = str(png.relative_to(ROOT))
        return {
            "ok": True,
            "mode": "image",
            "source": src_type,
            "file": rel,
            "media_url": f"/media/{png.name}",
            "preview": f"Gorsel hazir ({src_type}): {rel}\nIstem: {clean_prompt}",
        }

    if clean_mode == "video":
        png = MEDIA_DIR / f"frame_{safe}_{ts}.png"
        wav = MEDIA_DIR / f"bed_{safe}_{ts}.wav"
        tts_mp3 = MEDIA_DIR / f"tts_{safe}_{ts}.mp3"
        mp4 = MEDIA_DIR / f"vid_{safe}_{ts}.mp4"
        img_src = _make_png(png, title, clean_prompt)
        _make_melody_wav(wav, seconds=6)

        has_tts = _try_edge_tts(f"{title}. {clean_prompt}", tts_mp3)
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", str(png),
            "-i", str(tts_mp3 if has_tts else wav),
            "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest", str(mp4),
        ]
        subprocess.run(cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if tts_mp3.exists():
            tts_mp3.unlink(missing_ok=True)
        rel = str(mp4.relative_to(ROOT))
        audio_mode = "edge-tts (tr-TR)" if has_tts else "melodik wav sentez"
        return {
            "ok": True,
            "mode": "video",
            "source": f"{img_src} + {audio_mode}",
            "file": rel,
            "media_url": f"/media/{mp4.name}",
            "preview": (
                f"Video hazir: {rel}\n"
                f"Gorsel Kaynagi: {img_src} | Ses: {audio_mode}\n"
                f"Sahne Akisi: [1] Acilis & Kanca -> [2] Ana Konu ({clean_prompt[:90]}) -> [3] Ozet"
            ),
        }

    if clean_mode == "music":
        wav = MEDIA_DIR / f"music_{safe}_{ts}.wav"
        tts_mp3 = MEDIA_DIR / f"tts_music_{safe}_{ts}.mp3"
        _make_melody_wav(wav, seconds=8)
        has_tts = _try_edge_tts(clean_prompt, tts_mp3)
        src_desc = "melodik wav sentez"
        if has_tts:
            mixed_wav = MEDIA_DIR / f"music_mix_{safe}_{ts}.wav"
            subprocess.run([
                "ffmpeg", "-y",
                "-i", str(wav), "-i", str(tts_mp3),
                "-filter_complex", "[0:a]volume=0.45[a0];[1:a]volume=1.15[a1];[a0][a1]amix=inputs=2:duration=longest",
                str(mixed_wav),
            ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if mixed_wav.exists() and mixed_wav.stat().st_size > 512:
                wav = mixed_wav
                src_desc = "edge-tts + melodik wav miks"
            tts_mp3.unlink(missing_ok=True)
        rel = str(wav.relative_to(ROOT))
        return {
            "ok": True,
            "mode": "music",
            "source": src_desc,
            "file": rel,
            "media_url": f"/media/{wav.name}",
            "preview": f"Ses/Muzik hazir ({src_desc}): {rel}\nIstek: {clean_prompt}",
        }

    md = MEDIA_DIR / f"canvas_{safe}_{ts}.md"
    llm_text = _call_groq_canvas(clean_prompt, title)
    if llm_text:
        txt = f"# Canvas: {title}\n**Tarih (UTC):** {ts} | **Motor:** Groq LLM\n\n{llm_text}\n"
        engine_used = "groq_llm"
    else:
        txt = (
            f"# Canvas: {title}\n"
            f"**Tarih (UTC):** {ts} | **Motor:** Yerel Taslak\n\n"
            f"## Konu & Odak\n{clean_prompt}\n\n"
            f"## Yapilandirilmis Taslak\n"
            f"1. **Giris ve Problem Tanimi:** {clean_prompt}\n"
            f"2. **Mimari ve Uygulama Adimlari:** Moduler bileşenler, veri akisi ve dogrulama adimlari\n"
            f"3. **Riskler ve Sonraki Adim:** Guvenli test, yedekleme ve asama gecisi\n"
        )
        engine_used = "local_canvas"
    md.write_text(txt, encoding="utf-8")
    rel = str(md.relative_to(ROOT))
    return {
        "ok": True,
        "mode": "canvas",
        "source": engine_used,
        "file": rel,
        "media_url": f"/media/{md.name}",
        "preview": txt,
    }
