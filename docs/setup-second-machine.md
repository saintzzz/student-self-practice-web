# Lam viec tren 2 may (Windows PC + iMac) - Machine Handoff

Muc tieu: viec dang lam tren may A chuyen sang may B voi day du context,
va nguoc lai. Kenh chinh la git + MEMORY.md; secrets di qua private repo
`saintzzz/handoff-vault` (encrypted) - khong can USB.

## 1. Ba lop du lieu

| Lop | Kenh | Tan suat |
|---|---|---|
| Code, docs, scripts (llm-channel, gen/polish/verify) | git push/pull | moi lan doi may |
| Context phien lam viec | `docs/MEMORY.md` + Devin `cli/summaries` | moi lan doi may |
| Secrets + CLI auth | private repo `saintzzz/handoff-vault` (`secrets-context.tar.enc`, AES-256) | 1 lan moi may |

Tien trinh pipeline (so cau hoi, pool counts, review status) nam trong
**Supabase** - share san giua 2 may, khong can chuyen.

## 2. Cai dat may moi (iMac) - mot lan

```bash
# 1. prerequisites
brew install node git        # node >= 20
npm i -g @openai/codex       # codex CLI

# 2. clone + deps
git clone https://github.com/saintzzz/student-self-practice-web
cd student-self-practice-web
npm i
npx playwright install chromium

# 3. lay secrets + context tu private repo (THAY cho USB)
git clone https://github.com/saintzzz/handoff-vault
bash scripts/machine-import.sh handoff-vault   # nhap passphrase khi duoc hoi

# 4. login lai - BAT BUOC tren may moi
codex login                  # auth.json da duoc restore, nhung login lai neu het han
node scripts/gemini-login.mjs  # gemini-web profile LA MAY-CU-THE - phai login lai

# 5. verify
codex login status
node scripts/gen-codex-bank.mjs --tier advanced --grades 2 --batch 5 --dry
```

## 3. Nhung gi PHAI login/cai lai tren may moi (khong chuyen duoc qua file)

| Thứ | Lenh | Ghi chu |
|---|---|---|
| Gemini web profile | `node scripts/gemini-login.mjs` | Chromium profile lock theo OS - bat buoc login lai |
| Codex CLI | `codex login` | auth.json restore san, login lai neu token het han |
| gh CLI | `gh auth login` | chi can neu muon dung gh tren iMac |
| Node/git/playwright | brew + npm i + playwright install | cai lai, khong chuyen |
| Devin CLI secrets | restore tu vault qua import script | neu thieu, dung `upload-secrets` skill hoac nhap lai |
| Passphrase vault | hoi lai may Windows | khong commit, hien 1 lan trong chat 2026-10-20 |

## 4. Quy trinh chuyen may hang ngay

**Truoc khi roi may A:**
1. `git add -A && git commit` moi thu co nghia (code + docs + scripts)
2. Cap nhat muc `Session state` trong `docs/MEMORY.md` (tien trinh, dang chay, canh bao)
3. `git push` — neu code chua on dinh, push nhanh `wip/handoff` thay vi main
   (main auto-deploy Vercel)
4. Job dang chay nen (gen/polish/verify): tien trinh trong Supabase khong mat;
   script idempotent — chay lai tren may B tiep tuc duoc

**Tren may B (bat dau lam):**
1. `git pull` (+ `git fetch && git checkout wip/handoff-*` neu co WIP branch)
2. Doc `docs/MEMORY.md` muc Session state + Devin summary moi nhat
3. Chay lai cac pipeline can thiet (vi du `node scripts/gen-codex-bank.mjs ...`)

## 5. Luu y platform

- `scripts/llm-channel.mjs` tu chon `codex.cmd` (win) / `codex` (posix) — da fix.
- gemini-web profile: khong copy giua 2 OS; moi may `node scripts/gemini-login.mjs` 1 lan.
- Muon 2 process LLM-channel song song tren 1 may: copy profile + `LLM_GEMINI_PROFILE=...`
- Duong dan Windows `C:\Users\linhl\...` = `~/...` tren macOS cho secrets/summaries.
- Devin CLI tren iMac: summaries nam o `~/Library/Application Support/devin/cli/summaries`
  (script import tu detect; neu khong dung, tim bang `mdfind history_*.md`).

## 6. Khong duoc commit vao repo public

- `machine-transfer/`, `.env.local`, `scripts/gemini-web-profile*/`
- PIN demo nam trong `~/.config/devin/secrets/ea_demo_creds.json`
- Secrets chi di qua `secrets-context.tar.enc` (AES-256) trong repo PRIVATE
  `saintzzz/handoff-vault` - GitHub secret-scanning quet ca repo private va se
  revoke key neu day plaintext len.
