import os, re, sys, json
from datetime import datetime

PROJE_KOK = "/home/bytrkr/bistapp"
LOG_YOL = os.path.join(PROJE_KOK, "data", "security_audit.log")

YASAK_DESENLER = [
    r"rm\s+-[rf]{1,2}\s+(/|\*|\.\.)",
    r"\b(mkfs|dd|shutdown|reboot|halt|poweroff|passwd|useradd|usermod|chown\s+root)\b",
    r"(cat|head|tail|less|more|grep|sed|awk|echo)\s+[^\n]*\.env\b",
    r"(GROQ_API_KEY|ALPACA_API_KEY|MATRIKS_TOKEN|CMD_PIN)",
    r"(/etc/shadow|/etc/passwd|/root/\.ssh|/var/log/auth)",
    r"(curl|wget)\s+[^\n]*\|\s*(ba)?sh",
    r"\b(nc|netcat|ncat|scp|sftp)\b"
]

IZINLI_SAFE = (
    "pm2 status", "pm2 list", "pm2 logs", "git status", "git diff", "git log",
    "ls", "pwd", "df -h", "free -m", "uptime", "npx tsc --noEmit", "npm run build"
)

def yol_guvenli_mi(hedef_yol: str) -> bool:
    if not hedef_yol:
        return True
    tam = os.path.realpath(os.path.join(PROJE_KOK, hedef_yol))
    return tam == PROJE_KOK or tam.startswith(PROJE_KOK + os.sep)

def komut_siniflandir(komut: str, mod: str = "build"):
    k = (komut or "").strip()
    if not k:
        return "BLOCKED", "Bos komut reddedildi."
    for desen in YASAK_DESENLER:
        if re.search(desen, k, re.IGNORECASE):
            kayit_yaz(mod, "BLOCKED", k, f"Yasak desen: {desen}")
            return "BLOCKED", f"GUVENLIK KANCASI ENGELLEDİ: Yasakli/tehlikeli kalip tespit edildi ({desen})."
    if "../" in k and not k.startswith("python3 python/ai_coder_agent.py"):
        kayit_yaz(mod, "BLOCKED", k, "Dizin disina cikis (../)")
        return "BLOCKED", "SANDBOX ENGELLEDİ: Proje dizini disina cikis yasak."
    if any(k == s or k.startswith(s + " ") for s in IZINLI_SAFE):
        kayit_yaz(mod, "SAFE", k, "Allowlist")
        return "SAFE", "Izin listesindeki guvenli komut."
    if mod in ("plan", "audit") and any(w in k for w in ["rm ", "mv ", "cp ", "pm2 restart", "write_text", " >> ", " > ", "git commit", "git push"]):
        kayit_yaz(mod, "BLOCKED", k, "Salt-okunur mod ihlali")
        return "BLOCKED", "SALT-OKUNUR MOD ENGELLEDİ: Yazma veya servis yeniden baslatma yasak."
    kayit_yaz(mod, "GUARDED", k, "Proje ici kontrollu calisma")
    return "GUARDED", "Proje korumali alaninda onaylandi."

def kayit_yaz(mod: str, durum: str, komut: str, neden: str):
    try:
        os.makedirs(os.path.dirname(LOG_YOL), exist_ok=True)
        with open(LOG_YOL, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [{mod.upper()}] [{durum}] {neden} | {komut[:160]}\n")
    except Exception:
        pass

if __name__ == "__main__":
    durum, mesaj = komut_siniflandir(" ".join(sys.argv[1:]), os.environ.get("AI_MOD", "cmd"))
    print(f"{durum}|{mesaj}")
    sys.exit(0 if durum != "BLOCKED" else 2)
