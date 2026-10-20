# Lam viec tren 2 may (Windows PC + iMac) - Machine Handoff

Muc tieu: viec dang lam tren may A chuyen sang may B voi day du context,
va nguoc lai. Kenh chinh la git + MEMORY.md; secrets di qua bundle mot lan.

## 1. Ba lop du lieu

| Lop | Kenh | Tan suat |
|---|---|---|
| Code, docs, scripts (llm-channel, gen/polish/verify) | git push/pull | moi lan doi may |
| Context phien lam viec | `docs/MEMORY.md` + Devin `cli/summaries` | moi lan doi may |
| Secrets + CLI auth | `machine-transfer` bundle (khong git) | 1 lan moi may |

Tien trinh pipeline (so cau hoi, pool counts, review status) nam trong
**Supabase** - share san giua 2 may, khong can chuyen.

## 2. Cai dat may moi (iMac) - mot lan

```bash
# 1. prerequisites
brew install node git        # node >= 20
npm i -g @openai/codex       # codex CLI (login oauth: codex login)
npm i -g @google/gemini-cli  # tuy chon - pipeline dung web profile, khong can

# 2. clone + deps
git clone <repo> student-self-practice-web && cd student-self-practice-web
npm i
npx playwright install chromium

# 3. tren may Windows: dong goi state
powershell -File scripts/machine-export.ps1     # -> machine-transfer/

# 4. chuyen machine-transfer/ sang iMac (USB/AirDrop/LAN), roi import
bash scripts/machine-import.sh <path>/machine-transfer

# 5. login lai Gemini web profile (khuyen nghi tao moi thay vi copy Chromium profile)
node scripts/_gemini-login.mjs    # mo cua so, login tai khoan Gemini Plus

# 6. verify
codex login status
node scripts/gen-codex-bank.mjs --tier advanced --grades 2 --batch 5 --dry
```

## 3. Quy trinh chuyen may hang ngay

**Truoc khi roi may A:**
1. `git add -A && git commit` moi thu co nghia (code + docs + scripts)
2. Cap nhat muc `Session state` trong `docs/MEMORY.md` (tien trinh, dang chay, canh bao)
3. `git push` — neu code chua on dinh, push nhanh `wip/handoff` thay vi main
   (main auto-deploy Vercel)
4. Job dang chay nen (gen/polish/verify): tien trinh trong Supabase khong mat;
   script idempotent — chay lai tren may B tiep tuc duoc

**Tren may B (bat dau lam):**
1. `git pull`
2. Doc `docs/MEMORY.md` muc Session state + Devin summary moi nhat
3. Chay lai cac pipeline can thiet (vi du `node scripts/gen-codex-bank.mjs ...`)

## 4. Luu y platform

- `scripts/llm-channel.mjs` tu chon `codex.cmd` (win) / `codex` (posix) — da fix.
- gemini-web profile: khong copy giua 2 OS; moi may `node scripts/_gemini-login.mjs` 1 lan.
- Muon 2 process LLM-channel song song tren 1 may: copy profile + `LLM_GEMINI_PROFILE=...`
- Duong dan Windows `C:\Users\linhl\...` = `~/...` tren macOS cho secrets/summaries.
- Devin CLI tren iMac: summaries nam o `~/Library/Application Support/devin/cli/summaries`
  (script import tu detect; neu khong dung, tim bang `mdfind history_*.md`).

## 5. Khong duoc commit

- `machine-transfer/` (secrets!), `.env.local`, `scripts/gemini-web-profile*/`
- PIN demo nam trong `~/.config/devin/secrets/ea_demo_creds.json`
