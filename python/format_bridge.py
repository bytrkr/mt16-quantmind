import json, sys, csv, io

def json_to_toon(veri):
    if isinstance(veri, dict):
        satirlar = []
        for k, v in veri.items():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                basliklar = list(v[0].keys())
                satirlar.append(f"{k}[{len(v)}]{{{','.join(basliklar)}}}:")
                for item in v:
                    satirlar.append("  " + ",".join(str(item.get(b, "")) for b in basliklar))
            elif isinstance(v, (dict, list)):
                satirlar.append(f"{k}:\n" + "\n".join("  " + x for x in json_to_toon(v).splitlines()))
            else:
                satirlar.append(f"{k}: {v}")
        return "\n".join(satirlar)
    elif isinstance(veri, list) and veri and isinstance(veri[0], dict):
        basliklar = list(veri[0].keys())
        satirlar = [f"items[{len(veri)}]{{{','.join(basliklar)}}}:"]
        for item in veri:
            satirlar.append("  " + ",".join(str(item.get(b, "")) for b in basliklar))
        return "\n".join(satirlar)
    return str(veri)

def json_to_csv(veri):
    liste = veri if isinstance(veri, list) else next((v for v in veri.values() if isinstance(v, list)), [veri])
    if not liste or not isinstance(liste[0], dict): return str(veri)
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=list(liste[0].keys()))
    w.writeheader(); w.writerows(liste)
    return out.getvalue()

if __name__ == "__main__":
    hedef_fmt = sys.argv[1] if len(sys.argv) > 1 else "toon"
    dosya = sys.argv[2] if len(sys.argv) > 2 else "data/sanal_portfoy.json"
    veri = json.load(open(dosya, encoding="utf-8"))
    if hedef_fmt == "toon": print(json_to_toon(veri))
    elif hedef_fmt == "csv": print(json_to_csv(veri))
    else: print(json.dumps(veri, ensure_ascii=False, indent=2))
