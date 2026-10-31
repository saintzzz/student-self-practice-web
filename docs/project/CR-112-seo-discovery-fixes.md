# CR-112: SEO discovery fixes (robots.txt sitemap, crawl path)

## What
1. `public/robots.txt`: them `Sitemap:` directive tro toi
   `/guides/sitemap.xml`.
2. `vercel.json`: rewrite `/sitemap.xml` -> guides sitemap tren
   vieschool-content.
3. `AuthScreen.tsx`: them `<a href="/guides">` tren be mat public duy
   nhat - tao crawl path tu trang da duoc Google crawl toi hub guides.

## Why
GSC URL Inspection bao 2/4 guide URL "URL is unknown to Google" (chua
duoc crawl). Khong co discovery path: robots thieu Sitemap directive,
homepage khong co link nao toi /guides (GatedLink render <button>,
crawler khong follow duoc - link moi dung <a href> same-origin, khong
roi domain nen khong can parent gate).

## Scope
- robots.txt: +Sitemap directive
- vercel.json: +1 rewrite
- AuthScreen.tsx: +1 anchor
