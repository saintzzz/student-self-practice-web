#!/usr/bin/env python3
"""CR-19: render every spoken text to mp3 with an Edge neural voice.

Reads audio-texts.tsv (sha1<TAB>text per line, produced by
gen-audio-texts.ts) and writes audio-out/<sha1>.mp3 files.

Run: python3 scripts/gen-audio.py
"""
import asyncio
import os
import sys

import edge_tts

# CR-19 r2 voice split (user picked): Ana (child voice) reads bare words
# and phonics utterances; Andrew (warm adult male) reads full sentences.
# CR-74: field report - Andrew swallows final syllables for early readers
# ("mountain" heard as "mouse"). One consistent child voice wins:
# sentences now read with Ana too.
VOICE_WORD = "en-US-AnaNeural"
VOICE_SENTENCE = "en-US-AnaNeural"
RATE = "-8%"               # slightly slower for early readers
# CR-78: short words need a stronger recipe - Ana compresses single
# syllables to ~0.2s at -8% ("eight" was heard as "T"). word-short
# renders the text with a "!" suffix at -30%: emphatic enunciation +
# ~0.4s of speech (measured across monosyllables).
SHORT_RATE = "-30%"
OUT_DIR = "audio-out"
CONCURRENCY = 24

sem = asyncio.Semaphore(CONCURRENCY)
done = fail = 0


async def render_one(name: str, kind: str, text: str) -> None:
    global done, fail
    path = os.path.join(OUT_DIR, f"{name}.mp3")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        done += 1
        return
    async with sem:
        for attempt in range(3):
            try:
                if kind == "word-short":
                    comm = edge_tts.Communicate(text + "!", VOICE_WORD, rate=SHORT_RATE)
                else:
                    voice = VOICE_SENTENCE if kind == "sentence" else VOICE_WORD
                    comm = edge_tts.Communicate(text, voice, rate=RATE)
                await comm.save(path)
                done += 1
                if done % 250 == 0:
                    print(f"{done} rendered", flush=True)
                return
            except Exception as e:
                if attempt == 2:
                    fail += 1
                    print(f"FAIL {name} {text!r}: {e}", flush=True)
                else:
                    await asyncio.sleep(1.5 * (attempt + 1))


async def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    # Optional argv: path to a filtered tsv (e.g. sentences-only for the
    # CR-74 re-render) - defaults to the full enumeration.
    tsv = sys.argv[1] if len(sys.argv) > 1 else "audio-texts.tsv"
    lines = [l.rstrip("\n").split("\t") for l in open(tsv)]
    tasks = [render_one(name, kind, text) for name, kind, text in lines]
    await asyncio.gather(*tasks)
    print(f"done={done} fail={fail} total={len(lines)}")
    sys.exit(1 if fail else 0)


asyncio.run(main())
