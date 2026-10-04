"""Build the voice guide's audio and guide.json from the Notion 台本DB.

Source of truth is Notion:
  - 台本DB（旧ナレッジ・コンテキストDB）: rows with MVP採用 = checked and SKM照合 = 整合済
  - 読み上げ辞書: 表記 -> よみ (+ アクセント型), registered in the engine's user dictionary (screen text is unchanged)

  - SKM 場所DB: 場所名・エリア・緯度・経度・地図レイヤー (linked from each script's 場所（SKM）)
  - SKM 見どころDB: 「ここで見られるもの」の項目 (検証状況が未検証のものは出さない) and their 出典 from 文献・ソースDB
Photos are not in Notion: put your own photos at photos/<point id>/{spring,summer,autumn,winter}.jpg

Usage
  python3 tools/build.py                    # read tools/notion_export.json (written by Claude from Notion)
  python3 tools/build.py --meta-only        # update text, places, highlights and photos in guide.json; keep the audio as is
  python3 tools/build.py --only ID [ID...]  # remake audio only for these points, keep the rest
  NOTION_TOKEN=secret_xxx python3 tools/build.py --notion   # read Notion directly with an integration token

Engines (both free, run offline once downloaded)
  Japanese: VOICEVOX CORE 0.16 (credit "VOICEVOX:<voice>" is required on the page)
  English : Kokoro-82M via kokoro-onnx (Apache-2.0)
Set TTS_DIR to the folder holding the VOICEVOX runtime, dictionary, .vvm models and Kokoro files.
"""
import argparse, io, json, os, re, subprocess, sys, urllib.request, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS_DIR = os.environ.get("TTS_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tts"))
SCRIPT_DB = "394fd841a42c801e93aefb86a376294b"
DICT_DB = "3155e6665c0244568a2edecd26eb962d"
HIGHLIGHT_DB = "abe932fc06ea4106b6d93f8ccbda5d81"   # SKM 見どころDB（場所ページ用）
CATEGORY_ORDER = ["地形・岩", "水・滝", "植物", "動物", "季節の現象", "名前・歴史"]

# Voices offered in the player. style ids are VOICEVOX style ids.
JA_VOICES = {
    "himari": {"label": "冥鳴ひまり", "credit": "VOICEVOX:冥鳴ひまり", "style": 14, "model": "1"},
    "sora":   {"label": "九州そら",   "credit": "VOICEVOX:九州そら",   "style": 16, "model": "2"},
    "suzume": {"label": "雀松朱司",   "credit": "VOICEVOX:雀松朱司",   "style": 52, "model": "12"},
}
EN_VOICES = {
    "heart":   {"label": "Heart (female)",   "credit": "Kokoro TTS", "voice": "af_heart"},
    "michael": {"label": "Michael (male)", "credit": "Kokoro TTS", "voice": "am_michael"},
}
# Delivery per mode: speed, pitch, intonation, pause between sentences (s)
JA_MODES = {"core": dict(speed=1.0, pitch=0.0, inton=1.15, gap=0.5),
            "kids": dict(speed=0.93, pitch=0.03, inton=1.3, gap=0.6)}


# ---------- Notion ----------
def notion_query(db, token):
    rows, cursor = [], None
    while True:
        body = {"page_size": 100, **({"start_cursor": cursor} if cursor else {})}
        req = urllib.request.Request(f"https://api.notion.com/v1/databases/{db}/query",
            data=json.dumps(body).encode(), method="POST",
            headers={"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28",
                     "Content-Type": "application/json"})
        d = json.load(urllib.request.urlopen(req))
        rows += d["results"]
        if not d.get("has_more"): return rows
        cursor = d["next_cursor"]


def notion_page(pid, token):
    req = urllib.request.Request(f"https://api.notion.com/v1/pages/{pid}",
        headers={"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28"})
    return json.load(urllib.request.urlopen(req))["properties"]


def place_from_notion(pid, token):
    p = notion_page(pid, token)
    memo = text(p.get("検証メモ"))
    coord = [l for l in memo.splitlines() if "座標" in l]
    return dict(name=text(p["場所名"]), area=((p.get("エリア") or {}).get("select") or {}).get("name", ""),
                lat=(p.get("緯度") or {}).get("number"), lng=(p.get("経度") or {}).get("number"),
                coord_note=coord[-1] if coord else ("" if (p.get("緯度") or {}).get("number") else "位置未登録"),
                layers=[o["name"] for o in (p.get("地図レイヤー") or {}).get("multi_select", [])],
                season=text(p.get("行ける時期")),
                access=text(p.get("行き方")) or (text(p.get("アクセス・注意")).splitlines() or [""])[0],
                name_en=text(p.get("名前（英語）")), season_en=text(p.get("行ける時期（英語）")),
                access_en=text(p.get("行き方（英語）")))


def text(prop):
    if not prop: return ""
    key = prop["type"]
    return "".join(t["plain_text"] for t in prop.get(key, [])) if key in ("title", "rich_text") else ""


def slug(title, n):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return s or f"point-{n}"


def from_notion(token):
    scripts, places = [], {}
    for i, r in enumerate(notion_query(SCRIPT_DB, token), 1):
        p = r["properties"]
        if not p["MVP採用"]["checkbox"]: continue
        if (p["SKM照合"]["select"] or {}).get("name") != "整合済": continue
        rel = p["場所（SKM）"]["relation"]
        pid = rel[0]["id"].replace("-", "") if rel else ""
        if pid and pid not in places: places[pid] = place_from_notion(pid, token)
        scripts.append(dict(id=f"s{p['ID']['unique_id']['number']}", notion_page=r["id"].replace("-", ""),
            topic=text(p["トピック名"]), topic_en=text(p.get("トピック名（英語）")),
            place=places[pid]["name"] if pid else "", place_page=pid,
            category=((p.get("カテゴリー") or {}).get("select") or {}).get("name", ""),
            target_seconds=p["推奨音声尺(秒)"]["number"] or 60,
            core=text(p["【翻訳】コア"]), kids=text(p["【翻訳】子供派"]), en=text(p["【翻訳】海外"])))
    dic = [dict(surface=text(r["properties"]["表記"]), reading=text(r["properties"]["よみ"]),
                accent=(r["properties"].get("アクセント型") or {}).get("number") or 0,
                status=(r["properties"]["確認状況"]["select"] or {}).get("name", ""))
           for r in notion_query(DICT_DB, token)]
    num = lambda prop: (prop or {}).get("number")
    sel = lambda prop: ((prop or {}).get("select") or {}).get("name")
    rel = lambda prop: [x["id"].replace("-", "") for x in (prop or {}).get("relation", [])]
    highlights, sources = [], {}
    for r in notion_query(HIGHLIGHT_DB, token):
        p = r["properties"]
        h = dict(name=text(p["名前"]), places=rel(p["場所"]), category=sel(p["分類"]), description=text(p["説明"]),
                 when=text(p["見られる時期"]) or None, map_number=num(p["地図の番号"]), order=num(p["表示順"]),
                 sources=rel(p["出典"]), status=sel(p["検証状況"]), note=text(p["注意"]) or None, link=(p["参考リンク"] or {}).get("url"),
                 name_en=text(p.get("名前（英語）")) or None, description_en=text(p.get("説明（英語）")) or None,
                 when_en=text(p.get("見られる時期（英語）")) or None, note_en=text(p.get("注意（英語）")) or None)
        for sid in h["sources"]:
            if sid not in sources:
                sp = notion_page(sid, token)
                sources[sid] = dict(name=text(sp["資料名"]), name_en=text(sp.get("名前（英語）")) or None,
                                    url=(sp.get("URL") or {}).get("url"))
        highlights.append(h)
    return {"scripts": scripts, "places": places, "highlights": highlights, "sources": sources,
            "dictionary": [d for d in dic if d["surface"] and d["reading"]]}


# ---------- Text ----------
def sentences(s):
    parts = re.split(r"(?<=[。！？!?])", s)
    return [p.strip() for p in parts if p.strip()]


# ---------- Audio ----------
def silence(sec, sr):
    return np.zeros(int(sec * sr), dtype=np.float32)


def wav_bytes_to_np(b):
    with wave.open(io.BytesIO(b)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x, sr


def to_mp3(x, sr, path):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-",
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "96k", path],
                   input=pcm, check=True)
    return round(len(x) / sr, 1)


SEASONS = ("spring", "summer", "autumn", "winter")


def point_meta(s, data):
    """Text, place and photos for one point (everything except audio)."""
    pl = (data.get("places") or {}).get(s.get("place_page", ""), {})
    photos = {}
    for season in SEASONS:
        for ext in ("webp", "jpg", "jpeg", "png"):
            rel = f"photos/{s['id']}/{season}.{ext}"
            if os.path.exists(os.path.join(ROOT, rel)):
                photos[season] = rel
                break
    srcs = data.get("sources") or {}
    hl = [h for h in (data.get("highlights") or [])
          if s.get("place_page") in h["places"] and h.get("status") not in (None, "未検証") and h.get("category")]
    hl.sort(key=lambda h: (CATEGORY_ORDER.index(h["category"]) if h["category"] in CATEGORY_ORDER else 99, h.get("order") or 999))
    hl = [{k: h.get(k) for k in ("name", "category", "description", "when", "map_number", "status", "note", "link",
                                 "name_en", "description_en", "when_en", "note_en")}
          | {"sources": [srcs[x] for x in h["sources"] if x in srcs]} for h in hl]
    return ({k: s.get(k, "") for k in ("id", "topic", "topic_en", "place", "notion_page", "target_seconds", "core", "kids", "en", "category")}
            | {"place_en": pl.get("name_en") or "",
               "location": {k: pl.get(k) for k in ("area", "lat", "lng", "coord_note", "layers", "season", "access",
                                                   "season_en", "access_en")},
               "photos": photos, "highlights": hl})


def write_guide(data, points):
    guide = {"built_from": data.get("source", "Notion"), "exported_at": data.get("exported_at", ""),
             "voices": {"ja": {k: {"label": v["label"], "credit": v["credit"]} for k, v in JA_VOICES.items()},
                        "en": {k: {"label": v["label"], "credit": v["credit"]} for k, v in EN_VOICES.items()}},
             "points": points}
    json.dump(guide, open(os.path.join(ROOT, "guide.json"), "w"), ensure_ascii=False, indent=1)


def meta_only(data):
    old = {p["id"]: p.get("audio", {}) for p in json.load(open(os.path.join(ROOT, "guide.json")))["points"]}
    points = [point_meta(s, data) | {"audio": old.get(s["id"], {})} for s in data["scripts"]]
    missing = [p["id"] for p in points if not p["audio"]]
    if missing: print("音声がまだ無い台本（音声ありで作り直すこと）:", missing)
    write_guide(data, points)


def build(data, only=None):
    sys.path.insert(0, TTS_DIR)
    import vv
    from kokoro_onnx import Kokoro
    kokoro = Kokoro(os.path.join(TTS_DIR, "kokoro-v1.0.int8.onnx"), os.path.join(TTS_DIR, "voices-v1.0.bin"))
    vv.synth(tuple(sorted({v["model"] for v in JA_VOICES.values()})))
    vv.set_dictionary(data["dictionary"])
    os.makedirs(os.path.join(ROOT, "audio"), exist_ok=True)
    points = []
    old = {}
    if only and os.path.exists(os.path.join(ROOT, "guide.json")):
        old = {p["id"]: p.get("audio", {}) for p in json.load(open(os.path.join(ROOT, "guide.json")))["points"]}
    for s in data["scripts"]:
        if only and s["id"] not in only and old.get(s["id"]):
            points.append(point_meta(s, data) | {"audio": old[s["id"]]})
            continue
        audio = {}
        for mode, m in JA_MODES.items():
            spoken = s[mode]
            for vid, v in JA_VOICES.items():
                chunks, sr = [], 24000
                for sent in sentences(spoken):
                    x, sr = wav_bytes_to_np(vv.wav(sent, v["style"], speed=m["speed"], pitch=m["pitch"],
                                                   intonation=m["inton"], pause=1.1))
                    chunks += [x, silence(m["gap"], sr)]
                name = f"audio/{s['id']}-{mode}-{vid}.mp3"
                audio[f"{mode}:{vid}"] = {"src": name, "seconds": to_mp3(np.concatenate(chunks[:-1]), sr, os.path.join(ROOT, name))}
        for vid, v in EN_VOICES.items():
            chunks = []
            for sent in sentences(s["en"]):
                x, sr = kokoro.create(sent, voice=v["voice"], speed=0.95, lang="en-us")
                chunks += [x.astype(np.float32), silence(0.45, sr)]
            name = f"audio/{s['id']}-en-{vid}.mp3"
            audio[f"en:{vid}"] = {"src": name, "seconds": to_mp3(np.concatenate(chunks[:-1]), sr, os.path.join(ROOT, name))}
        points.append(point_meta(s, data) | {"audio": audio})
        print("built", s["id"], {k: a["seconds"] for k, a in audio.items()})
    write_guide(data, points)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--notion", action="store_true", help="read Notion directly (needs NOTION_TOKEN)")
    ap.add_argument("--readings", action="store_true", help="only print how each sentence will be read")
    ap.add_argument("--meta-only", action="store_true", help="refresh text, places, highlights and photos; keep existing audio")
    ap.add_argument("--only", nargs="+", help="remake audio only for these point ids")
    a = ap.parse_args()
    data = from_notion(os.environ["NOTION_TOKEN"]) if a.notion else json.load(open(os.path.join(ROOT, "tools/notion_export.json")))
    if a.readings:
        sys.path.insert(0, TTS_DIR); import vv
        vv.synth(tuple(sorted({v["model"] for v in JA_VOICES.values()})))
        vv.set_dictionary(data["dictionary"])
        for s in data["scripts"]:
            for mode in JA_MODES:
                for sent in sentences(s[mode]):
                    print(f"[{s['id']}/{mode}] {vv.reading(sent)}")
    elif a.meta_only:
        meta_only(data)
    else:
        build(data, only=set(a.only) if a.only else None)
