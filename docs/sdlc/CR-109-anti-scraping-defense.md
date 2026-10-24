# CR-109 - Anti-scraping / anti-AI-crawler defense plan (status: LOP 1 SHIPPED - robots.txt + X-Robots-Tag + watermark wm + qb_fetch_audit da live qua migration 0056; WAF managed-rules bi chan boi plan (API 404) - human task; lop 2 Turnstile da ship qua CR-108)

Yeu cau cua PO: viet phuong an truoc, implement sau. Doc nay la ban
ke hoach phong thu noi dung + ngan kenh "cao function" (reverse-
engineer business logic) cho English Arena. No gop them context tu
CR-103/104/108.

## Tai san can bao ve

1. **Question bank** (~90k rows, `practice.qb_questions`) - moat chinh.
   Mat bank = mat san pham.
2. **Scoring/oracle logic** - `score_bank_attempts` giu answer keys;
   lo key = bank bi be khoa.
3. **Skill lessons** (CR-106, `practice.skill_lessons`) - content day
   hoc, dang so it nen it gia tri cao nhung van la content.
4. **AI assignment generation** - teacher-side prompts + output.

## Phong thu DA CO (khong lam lai)

- `strip_bank_row` - fetch tra row KHONG co answer key; key chi ton tai
  trong oracle `score_bank_attempts__impl` (server-side, service schema).
- Per-IP XFF caps (0049): `fq_ip_calls` 60/hr, `fq_ip_rows` 2500 rows/hr;
  authed `fq_ip_calls` 100/hr, 3000 rows/hr.
- Global guest bucket: `fq_pub_calls` 300/hr + `fq_pub_rows` 8000/hr -
  **day la diem mau chot**: botnet phan tan khong the rut nhanh hon
  8k rows/h tren kenh guest. Bank 90k rows => >=11h lien tuc de rut het
  qua guest, va trong luc do guest that bi boi doi.
- Per-uid caps cho authed calls + `sba_*` caps cho scoring (0054 restored).
- `taught_marks` + teach RPC chi cho authenticated.

## Moi de doa con lai

| Threat | Mo ta | Muc rui ro |
|---|---|---|
| T1 Botnet guest drain | Nhieu IP, moi IP duoi cap, xa thung `fq_pub_*` | Trung - da bi chan tong bang global bucket nhung guest that bi DoS |
| T2 Credential farm | Tao nhieu account -> vuot per-uid bang so luong | Trung - email signup khong co verification |
| T3 Frontend code cao | JS bundle public - logic client bi doc | Thap - scoring o server, bundle chi la UI |
| T4 AI crawler content | GPTBot/ClaudeBot cao trang public landing | Thap - content be, nhung phi bandwidth |
| T5 Leak attribution | Neu bank ro ri, khong biet nguon | Trung - can watermark |

## Phuong an de xuat (theo lop, re -> dat)

### Lop 1 - Re, lam ngay duoc (khong can account ngoai)

1. `public/robots.txt` + meta `X-Robots-Tag`: chan GPTBot, ClaudeBot,
   CCBot, Bytespider, Google-Extended... (honor-system nhung mien phi).
2. Vercel WAF rate limit rule: `/api/*` + POST caps per-IP (dashboard
   toggle, free tier du). Vercel Bot Protection (managed ruleset).
   STATUS: API `seawall` tra 404 tren moi scope (GET/PUT/PATCH) -
   managed rules khong config duoc qua API tren plan hien tai; quan
   sat thay edge da `x-vercel-mitigated: deny` non-browser clients
   (curl) trong khi browser that van 200 - mot mitigation bot nao do
   dang active. Toggle ro rang hon = human task trong dashboard.
3. Canary watermark: DEPLOYED (0056). Moi row fetch gan field `wm` =
   HMAC(id || actor || ip_hash || rpc) bang vault `leak_wm_secret` -
   khong fake ids, chi tag mat de truy nguon leak. Khong anh huong
   renderer (key phu, khong anh huong strip contract).
4. Telemetry `qb_fetch_audit`: DEPLOYED (0056). Table
   `practice.qb_fetch_audit(actor, ip_hash, rpc, question_ids,
   fetched_at)` - insert trong ca 3 drain wrappers
   (`fetch_questions`, `_adaptive`, `_public`). Live-verified:
   authenticated fetch 5/5 rows co wm, 0 answer key, audit row ghi
   dung rpc+actor+n_ids; guest fetch bi PT401 khi thieu ticket nen
   khong ghi audit (expected - reject truoc khi drain).

### Lop 2 - Can account/dich vu ngoai

5. **Cloudflare Turnstile** (CR-108 - BLOCKED): guest fetch phai co
   token, verify siteverify trong RPC hoac edge gate. Unblock bang
   cach signup Cloudflare (5 phut, manual), nhan site+secret key, cat
   secret vao Supabase Vault. Day la phuong an CHINH cho T1.
6. Email verification cho signup (Supabase Auth toggle + confirm
   flow) - chan T2 credential farm.
7. Supabase Edge Function gate truoc `fetch_questions_public`:
   Turnstile verify + JA3/TLS fingerprint ban.

### Lop 3 - Dai han / neu bi tan cong that

8. Rotate guest pools: db-side `variant_group` rotation - pool guest
   thay the hang tuan, leak cu het gia tri.
9. Canary tier-2: embed "honey rows" (cau hoi gia chi guest thay,
   co mark rieng) de detect scraper dang cao va tu dong ban IP.
10. Anomaly scoring service: nightly job danh diem uid theo pattern
    (fetch velocity, skill spread, taught-ratio) -> auto-throttle.

## De xuat trien khai (khi PO duyet)

- Buoc 1: DONE - robots.txt (2bffe27) + watermark/audit (0056).
  WAF rule con lai la human task (API 404 tren plan hien tai).
- Buoc 2: DONE - CR-108 Turnstile da ship + prod-verified (PT401
  guest_challenge_required live).
- Buoc 3: telemetry da co (0056); anomaly scoring defer toi khi
  co incident dau tien.

## Impact assessment

- Client: robots.txt tinh; canary_ids la field metadata trong
  response (strip contract giu nguyen - chi them key khong anh huong
  renderer).
- Server: canary la map thuan, khong them query; telemetry la 1 insert
  bat dong bo nho.
- Rui ro: canary lo cau truc -> scraper loc duoc. Giam bang cach
  canary la SUBSET id that da xoa tu public pool (row ton tai, hop le,
  nhung danh dau rieng).

## Out of scope

- DRM client-side / obfuscation sau - vo dung voi SPA public.
- Chan tat ca VPN/proxy - mat user that o VN (nha truong hay NAT
  chung).
