import json, os
pf = json.load(open("data/sanal_portfoy.json", encoding="utf-8"))
assert len(pf) > 0 and all(float(p.get("giris",0))>0 and float(p.get("lot",0))>0 for p in pf)
print(f"VERIFY_DATA_SUITE_PASSED: {len(pf)}/{len(pf)} pozisyon %100 dogrulandi.")
