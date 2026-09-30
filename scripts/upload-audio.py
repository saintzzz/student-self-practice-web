#!/usr/bin/env python3
"""CR-19: upload audio-out/*.mp3 to Supabase Storage bucket `ea-audio`.

Service key is read from ~/.config/devin/secrets/supabase_new_keys.json -
never printed, never committed.

Run: python3 scripts/upload-audio.py
"""
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = json.load(open(os.path.expanduser("~/.config/devin/secrets/supabase_new_keys.json")))
SR = KEYS["keys"]["service_role"]
BASE = KEYS["url"] + "/storage/v1/object/ea-audio/"
OUT = os.path.join(ROOT, "audio-out")

files = [f for f in os.listdir(OUT) if f.endswith(".mp3")]
print(f"uploading {len(files)} files")

ctx = None
import ssl
ctx = ssl.create_default_context()
try:
    import certifi
    ctx.load_verify_locations(certifi.where())
except ImportError:
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

def upload(name: str) -> str | None:
    data = open(os.path.join(OUT, name), "rb").read()
    req = urllib.request.Request(
        BASE + name,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {SR}",
            "apikey": SR,
            "Content-Type": "audio/mpeg",
            "x-upsert": "true",
        },
    )
    try:
        urllib.request.urlopen(req, context=ctx, timeout=60)
        return None
    except Exception as e:  # noqa: BLE001
        return f"{name}: {e}"

errs = []
done = 0
with ThreadPoolExecutor(max_workers=8) as ex:
    for r in ex.map(upload, files):
        done += 1
        if r:
            errs.append(r)
        if done % 500 == 0:
            print(f"{done} uploaded", flush=True)

print(f"done={done} errors={len(errs)}")
for e in errs[:20]:
    print(e)
sys.exit(1 if errs else 0)
