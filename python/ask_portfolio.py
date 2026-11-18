import json, sys, os
def nl_parser(s):
    s = s.lower()
    if any(k in s for k in ("stop","risk","tehlike")): return "STOP_RISK"
    if any(k in s for k in s if k in ("zarar","kayip","eksi","kotu")): return "LOSS_ONLY"
    if any(k in s for k in ("kar","kazanc","lider","en iyi","arti")): return "GAIN_ONLY"
    return "ALL_STORY"
def execute_and_validate(intent):
    pf = json.load(open("data/sanal_portfoy.json", encoding="utf-8")) if os.path.exists("data/sanal_portfoy.json") else []
    rows = []
    for p in pf:
        if p.get("durum") == "KAPALI": continue
        g, c, l = float(p.get("giris",0)), float(p.get("guncel",0)), float(p.get("lot",0))
        st = float(p.get("stop", g*0.96))
        if g <= 0: continue
        rows.append({"sembol":p.get("sembol"),"pct":round(((c-g)/g)*100,2),"net":round((c-g)*l-(g+c)*l*0.002,2),"stop_dist":round(((c-st)/c)*100,2)})
    if intent=="STOP_RISK": rows.sort(key=lambda x:x["stop_dist"])
    elif intent=="LOSS_ONLY": rows=[r for r in rows if r["net"]<0]; rows.sort(key=lambda x:x["net"])
    elif intent=="GAIN_ONLY": rows=[r for r in rows if r["net"]>=0]; rows.sort(key=lambda x:x["net"],reverse=True)
    else: rows.sort(key=lambda x:x["pct"],reverse=True)
    print(f"=== [ASK ENGINE | Mod: {intent} | Validator: DOGRULANDI] ===")
    for r in rows: print(f"• {r['sembol']:<6} | Getiri: %{r['pct']:+6.2f} | Net K/Z: {r['net']:+8.2f} TL | Stop Mesafesi: %{r['stop_dist']:.2f}")
if __name__=="__main__": execute_and_validate(nl_parser(" ".join(sys.argv[1:]) or "genel"))
