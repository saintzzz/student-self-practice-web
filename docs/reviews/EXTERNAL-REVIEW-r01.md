# EXTERNAL REVIEW r1 - CR-111 SEO guides rewrite

Scope: `vercel.json` rewrites `/guides*` -> vieschool-content (`0174eae`, `8bc0ac6`).
Reviewer: same-session manual pass (cross-model subagents unavailable - quota).
Method: cold read of diff, live verification on prod.

## Findings

| Sev | Finding | Disposition |
|---|---|---|
| Medium | `/guides` (empty `:path*`) hit trailing-slash redirect leak - content deploy `cleanUrls` redirected `/ea/guides/` exposing origin and 404ing under product domain | FIXED in `8bc0ac6` - explicit `/guides` rewrite without trailing slash |
| Low | vitest scanned symlinked `scripts/gtm/**` external tests | FIXED - added `scripts/gtm/**` to vitest exclude |
| Info | deploy skipped routing-only commits | FIXED - Vercel ignored-build-step now watches `vercel.json` |

## Verified live (Playwright)

- `/guides` + 3 guide pages: 200, canonical on `ea.vieschool.com`
- `/guides/sitemap.xml`: 200, 4 product-domain URLs (GSC submitted, 0 errors)
- `/guides-indexnow-key.txt`: 200
- `robots.txt`: 200, Googlebot allowed, AI crawlers blocked
- Guide CTA -> `https://ea.vieschool.com/` product home
