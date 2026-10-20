"""data/src/*.psv から、サイト用の data/spots.json と台帳用の data/ledger.csv を作る（ソウル版）。

使い方: python tools/build_data.py
"""
import csv, json, math, pathlib
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHECKED_AT = "2026-10-20"

# ウェブで開館・所在を確認した項目（2026-10-20）
CHECKED = {
    "ソウル市立写真美術館", "龍山歴史博物館（旧龍山鉄道病院）", "澗松美術館", "大林倉庫", "大林美術館", "ソウル冊宝庫",
    "コーヒー韓薬房", "乙密台", "オニオン 安国", "London Bagel Museum 安国", "スターバックス 京東1960",
    "ブルーボトルコーヒー 三清カフェ", "Fritz Coffee Company 桃花店", "清水堂", "ハウス ドサン（GENTLE MONSTER）",
    "ポイント・オブ・ビュー 聖水",
}

split = lambda s: [x for x in s.split(";") if x] if s else []
def closed(s):
    if s == "": return None
    if s == "-": return []
    return [int(x) for x in s.split(",")]
flag = lambda s: None if s == "" else s == "1"

spots, n = [], 0
for f in sorted((ROOT / "data/src").glob("*.psv")):
    for line in open(f, encoding="utf-8"):
        if line.startswith("#") or not line.strip(): continue
        c = line.rstrip("\n").split("|")
        assert len(c) == 18, (f.name, c[1], len(c))
        n += 1
        designers = split(c[7])
        dtypes = split(c[8]) or (["建築家"] * len(designers))
        tags = split(c[17])
        tourist = c[16] == "1"
        if tourist and "観光客におすすめ" not in tags: tags = ["観光客におすすめ"] + tags
        s = {
            "id": f"K-{n:03d}", "name": c[1], "nameKo": c[2], "category": c[0], "tags": tags,
            "designers": designers, "designerTypes": dtypes, "year": int(c[9]) if c[9] else None,
            "ward": c[3], "address": c[4], "lat": float(c[5]), "lng": float(c[6]), "approx": True,
            "summary": c[10], "highlights": split(c[11]), "visit": c[12] or None,
            "closedDays": closed(c[13]), "free": flag(c[14]), "indoor": c[15] == "1", "tourist": tourist,
            "url": "", "status": "checked" if c[1] in CHECKED else "unverified",
        }
        if s["status"] == "checked": s["checkedAt"] = CHECKED_AT
        spots.append(s)

missing = CHECKED - {s["name"] for s in spots}
assert not missing, missing
names = Counter(s["name"] for s in spots)
assert not [k for k, v in names.items() if v > 1], [k for k, v in names.items() if v > 1]

# 同じ座標に重なるピンを少しずらす（約15m）
seen = {}
for s in spots:
    key = (round(s["lat"], 4), round(s["lng"], 4))
    k = seen.get(key, 0)
    if k:
        s["lat"] = round(s["lat"] + 0.00013 * math.cos(k * 2.4), 5)
        s["lng"] = round(s["lng"] + 0.00016 * math.sin(k * 2.4), 5)
    seen[key] = k + 1

out = {"version": CHECKED_AT, "city": "seoul",
       "note": "status=checked はウェブで開館・所在を確認済み。unverified は未確認。位置はすべて目安（approx=true）。",
       "spots": spots}
json.dump(out, open(ROOT / "data/spots.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

CAT_JA = {"architecture": "建築・アート", "cafe": "カフェ・飲食", "shop": "ショップ", "park": "公園・庭園", "public": "公共施設"}
WD = "日月火水木金土"
with open(ROOT / "data/ledger.csv", "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["ID", "名称", "韓国語名", "用途カテゴリ", "観光客におすすめ", "タグ", "設計者", "設計者区分", "竣工・開業年", "区", "住所（韓国語）",
                "緯度", "経度", "概要", "見どころ", "見学可否", "休館日", "料金", "公式リンク", "情報確認日", "掲載状態"])
    for s in spots:
        cd = s["closedDays"]
        w.writerow([s["id"], s["name"], s["nameKo"], CAT_JA[s["category"]], "○" if s["tourist"] else "", ";".join(s["tags"]),
                    ";".join(s["designers"]), ";".join(s["designerTypes"]), s["year"] or "", s["ward"], s["address"], s["lat"], s["lng"],
                    s["summary"], ";".join(s["highlights"]), s["visit"] or "",
                    "" if cd is None else ("なし" if not cd else "・".join(WD[d] for d in cd) + "曜"),
                    "" if s["free"] is None else ("無料" if s["free"] else "有料"), "", s.get("checkedAt", ""),
                    "掲載" if s["status"] == "checked" else "保留"])

print(len(spots), "spots", dict(Counter(s["category"] for s in spots)), "tourist", sum(s["tourist"] for s in spots), "checked", sum(s["status"] == "checked" for s in spots))
