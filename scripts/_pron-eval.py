#!/usr/bin/env python3
"""CR-90 pronunciation eval harness - generates a labeled audio corpus via
edge-tts and posts every clip through the real practice-transcribe edge
function, then writes corpus+transcripts to _pron_eval/results.json.

Labels:
  good_child  - en-US-AnaNeural (child voice) saying the target   -> expect PASS
  good_adult  - en-US-AriaNeural (adult voice) saying the target  -> expect PASS
  accent_vi   - vi-VN-HoaiMyNeural reading the English word       -> expect FAIL or low
  wrong_word  - en-US-AriaNeural saying a confusable near-word     -> expect FAIL

Usage: python scripts/_pron-eval.py
Output: _pron_eval/*.webm + _pron_eval/results.json (transcripts only - audio is local)
"""
import asyncio, base64, json, os, subprocess, sys, urllib.request, pathlib

SUPA = "https://cxjpgfhqchjoernfmcra.supabase.co"
KEY = "sb_publishable_dHxiF6xvVWSbbbEdrnZWSg_TgzAgXpB"
FN = f"{SUPA}/functions/v1/practice-transcribe"
OUT = pathlib.Path("_pron_eval"); OUT.mkdir(exist_ok=True)

# target -> confusable near-word spoken for the wrong_word clip
TARGETS = {
    "cat": "cut", "dog": "doll", "egg": "leg", "fish": "fizz",
    "pig": "big", "three": "tree", "school": "skull", "ship": "sheep",
    "bed": "bird", "pen": "hen", "elephant": "elegant", "rice": "lice",
}
VOICES = {
    "good_child": ("en-US-AnaNeural", "target"),
    "good_adult": ("en-US-AriaNeural", "target"),
    "accent_vi": ("vi-VN-HoaiMyNeural", "target"),
    "wrong_word": ("en-US-AriaNeural", "near"),
}

async def tts(voice: str, text: str, mp3: pathlib.Path):
    for _ in range(3):
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "edge_tts", "--voice", voice, "--text", text,
            "--write-media", str(mp3),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        await proc.wait()
        if mp3.exists() and mp3.stat().st_size > 500:
            return True
        await asyncio.sleep(1)
    return False

def to_webm(mp3: pathlib.Path, webm: pathlib.Path):
    subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-c:a", "libopus",
                    "-b:a", "48k", str(webm)],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def transcribe(webm: pathlib.Path, target: str) -> dict:
    b64 = base64.b64encode(webm.read_bytes()).decode()
    body = json.dumps({"audio": b64, "mimeType": "audio/webm",
                       "targetWord": target}).encode()
    req = urllib.request.Request(FN, data=body, headers={
        "Content-Type": "application/json", "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Origin": "https://ea.vieschool.com"})
    try:
        with urllib.request.urlopen(req, timeout=70) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"__http_error": e.code, "body": e.read()[:200].decode(errors="replace")}
    except Exception as e:
        return {"__error": str(e)[:200]}

async def main():
    results = []
    for target, near in TARGETS.items():
        for kind, (voice, which) in VOICES.items():
            spoken = target if which == "target" else near
            tag = f"{target}_{kind}"
            mp3, webm = OUT / f"{tag}.mp3", OUT / f"{tag}.webm"
            row = {"target": target, "kind": kind, "spoken": spoken,
                   "transcript": None, "resp": None}
            if not (webm.exists() and webm.stat().st_size > 500):
                if not await tts(voice, spoken, mp3):
                    row["resp"] = {"__error": "tts-failed"}
                    results.append(row); print(f"{tag:32s} -> TTS FAILED"); continue
                to_webm(mp3, webm)
            resp = transcribe(webm, target)
            tr = resp.get("transcript")
            row["transcript"] = tr
            if tr is None:
                row["resp"] = resp
            print(f"{tag:32s} -> {tr if tr is not None else resp}")
            results.append(row)
            (OUT / "results.json").write_text(json.dumps(results, indent=2))
            await asyncio.sleep(7.5)  # stay under 10/min
    print(f"\n{len(results)} clips -> _pron_eval/results.json")

asyncio.run(main())
