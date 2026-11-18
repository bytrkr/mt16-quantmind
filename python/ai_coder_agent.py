#!/usr/bin/env python3
import os, sys, re, json, glob, shutil, argparse, subprocess, requests
from datetime import datetime

BASE_DIR = "/home/bytrkr/bistapp"
MEMORY_FILE = os.path.join(BASE_DIR, "data", "ai_agent_memory.json")
AUDIT_LOG = os.path.join(BASE_DIR, "data", "security_audit.log")

def load_env():
    ep = os.path.join(BASE_DIR, ".env")
    if os.path.exists(ep):
        for line in open(ep, encoding="utf-8", errors="ignore"):
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
load_env()
def log_audit(act, st, det=""):
    os.makedirs(os.path.dirname(AUDIT_LOG), exist_ok=True)
    with open(AUDIT_LOG, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [{st}] {act} | {det[:150]}\n")

def check_sandbox(p):
    ap = os.path.abspath(os.path.join(BASE_DIR, p))
    if not ap.startswith(BASE_DIR) or ".env" in os.path.basename(ap):
        log_audit(p, "BLOCKED", "Guvenlik")
        raise PermissionError("Guvenlik engeli!")
    return ap

def load_mem():
    try: return json.load(open(MEMORY_FILE, encoding="utf-8"))
    except Exception: return {"rules": []}

def save_mem(txt):
    os.makedirs(os.path.dirname(MEMORY_FILE), exist_ok=True)
    m = load_mem(); m.setdefault("rules", []).append({"lesson": txt})
    json.dump({"rules": m["rules"][-30:]}, open(MEMORY_FILE, "w", encoding="utf-8"), ensure_ascii=False)
def tool_read(p, s=1, e=150):
    ap = check_sandbox(p)
    if not os.path.exists(ap): return "Dosya yok"
    lines = open(ap, encoding="utf-8", errors="ignore").readlines()
    return "".join(f"{i+1}: {lines[i]}" for i in range(max(0, s-1), min(len(lines), e)))

def tool_edit(p, old, new):
    ap = check_sandbox(p)
    txt = open(ap, encoding="utf-8").read()
    if old not in txt: return "Hedef kod bulunamadi"
    bak = f"{ap}.ai_bak_{datetime.now():%Y%m%d_%H%M%S}"
    shutil.copy2(ap, bak)
    open(ap, "w", encoding="utf-8").write(txt.replace(old, new, 1))
    if ap.endswith(".py") and subprocess.run(["python3", "-m", "py_compile", ap]).returncode != 0:
        shutil.copy2(bak, ap); return "Hata nedeniyle yedekten geri alindi!"
    return f"Guncellendi ({os.path.basename(bak)})"

def tool_bash(cmd):
    trg = os.environ.get('AI_TARGET', 'ubuntu')
    if trg in ('windows', 'ps'):
        wcmd = f'powershell -NoProfile -Command {json.dumps(cmd)}' if trg == 'ps' else cmd
        return subprocess.check_output(['python3', '/opt/hibrit-konsol/win_bridge.py', wcmd], text=True, stderr=subprocess.STDOUT, timeout=60)
    if any(x in cmd.lower() for x in ["rm -rf", ".env", "printenv", "shutdown"]): return "Yasakli komut!"
    env = os.environ.copy(); env["LANG"] = env["LC_ALL"] = "en_US.UTF-8"
    r = subprocess.run(cmd, shell=True, cwd=BASE_DIR, env=env, capture_output=True, text=True, timeout=60)
    out = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", (r.stdout or "") + (r.stderr or ""))
    return out[:3000] or "(Bos cikti)"
def call_llm(msgs):
    for k in [x.strip() for x in (os.getenv("GROQ_API_KEYS") or os.getenv("GROQ_API_KEY") or "").split(",") if x.strip()]:
        for m in ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']:
            r = requests.post('https://api.groq.com/openai/v1/chat/completions', headers={"Authorization": f"Bearer {k}"}, json={"model": m, "messages": msgs}, timeout=40)
            if r.status_code == 200: return r.json()["choices"][0]["message"]["content"]
            if r.status_code == 429: break
    if os.getenv("GEMINI_API_KEY"):
        r = requests.post('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headers={"Authorization": f"Bearer {os.getenv('GEMINI_API_KEY')}"}, json={"model": "gemini-2.5-flash", "messages": msgs}, timeout=50)
        if r.status_code == 200: print("[Motor: Gemini]"); return r.json()["choices"][0]["message"]["content"]
    if os.getenv("OPENROUTER_API_KEY"):
        r = requests.post('https://://groq.com', headers={"Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}"}, json={"model": "openrouter/free", "messages": msgs}, timeout=50)
        if r.status_code == 200: print("[Motor: OpenRouter]"); return r.json()["choices"][0]["message"]["content"]
    raise RuntimeError(f"Tum motorlar dolu! Son yanit: {r.status_code} {r.text[:120]}")

def main():
    p = argparse.ArgumentParser(); p.add_argument("--mode", default="plan"); p.add_argument("--deep", action="store_true"); p.add_argument("prompt", nargs="*")
    a = p.parse_args(); rules = "\n".join(x["lesson"] for x in load_mem().get("rules", []))
    msgs = [{"role": "system", "content": f"Mod:{a.mode}. Hafiza:{rules}. Sen /home/bytrkr/bistapp bas muhendisisin. Sohbeti ozetleme! Sunucuyu veya dosyalari kontrol etmek icin ASLA aciklama yazma, SADECE tek satir saf JSON dondur: {{\"tool\":\"bash\",\"cmd\":\"komut\"}} veya {{\"tool\":\"read\",\"path\":\"dosya\",\"s\":1,\"e\":100}}. Cikti gelince Turkce rapor yaz."}, {"role": "user", "content": " ".join(a.prompt)}]
    for _ in range(4 if a.mode == "hack" else 3):
        rep = call_llm(msgs); cln = re.sub(r"^```[a-z]*\n|\n```$", "", rep.strip())
        if cln.startswith("{") and '"tool"' in cln:
            m_j = re.search(r'\{[\s\S]*?\}', cln); c = json.JSONDecoder().raw_decode(m_j.group(0))[0] if m_j else {}; t = c.get("tool", "")
            obs = tool_read((c.get("path") or c.get("file") or ""), c.get("s",1), c.get("e",150)) if t=="read" else tool_edit((c.get("path") or c.get("file") or ""), c["old"], c["new"]) if t=="edit" and a.mode in ("build","hack") else tool_bash((c.get("cmd") or c.get("command") or "")) if t=="bash" else (save_mem((c.get("lesson") or c.get("rule") or "")) or "Kaydedildi") if t=="remember" else "Gecersiz"
            msgs += [{"role": "assistant", "content": rep}, {"role": "user", "content": f"Cikti:\n{obs}"}]; continue
        print(rep); return

if __name__ == "__main__": main()
