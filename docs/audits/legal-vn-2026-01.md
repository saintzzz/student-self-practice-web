# Audit phap ly he sinh thai VieSchool theo luat Viet Nam

Ngay audit: 2026-01 (dot quet production). Pham vi:
`vieschool.com`, `ea.vieschool.com`, `sochunhiem.vieschool.com`,
`congcuso.vieschool.com`, `fasttrack.vieschool.com` va cac luong thu thap
du lieu di kem (dang ky, thanh toan, outreach, demo trial).

Day la audit ky thuat - phap ly, khong thay the tu van cua luat su.
Muc do: P0 = rui ro vi pham truc tiep dang dien ra / P1 = khuyet phap
ly ro ret / P2 = rui ro co hau can.

---

## A. Tom tat dieu hanh

He thong dang ban dich vu tra phi cho nguoi dung cuoi (PHHS) va to chuc
(truong hoc) tren internet, xu ly du lieu ca nhan cua tre em o quy mo
lon, luu tru ngoai Viet Nam - nhung **khong co bat ky tai lieu phap ly
nao duoc cong bo**: khong chinh sach bao mat, khong dieu khoan, khong
dinh danh doanh nghiep ban hang, khong xac nhan thong bao website,
khong co che lay su dong y cua phu huynh.

So luong lo hong: **4 x P0, 4 x P1, 4 x P2**.

---

## B. Ket qua quet thuc te (evidence)

| # | Kiem chung | Ket qua |
|---|-----------|---------|
| 1 | `ea.vieschool.com/privacy` `/terms` `/chinh-sach` `/dieu-khoan` | 404 |
| 2 | `vieschool.com/privacy` `/chinh-sach` `/dieu-khoan` `/terms` | 200 nhung render **landing content** (SPA fallback) - khong co trang policy thuc |
| 3 | Footer `vieschool.com` | Chi co email `hello@` + Zalo `0948042989` + STK ca nhan `LE DUY LINH` - khong ten don vi, dia chi, MST, giay phep |
| 4 | Trackers tren `ea.vieschool.com` landing | GA4 `G-N7972RKYVY` + `googletagmanager` + **`stats.g.doubleclick.net` + `google.com.vn/ads/ga-audiences` (remarketing audiences)** - khong cookie banner. Tag nam trong `vieschool-content/ea/home/index.html` (15 files cung pattern). App `/app` dung funnel.ts client-only no-network - sach |
| 5 | Trang `/mua` | Bang gia + VietQR + STK ca nhan + "noi dung CK: VS <SDT> <goi>" + "chinh sach chia se doanh thu" cho GV/Don vi gioi thieu - khong terms/refund/khieu nai |
| 6 | Luong dang ky | HS dang nhap username+PIN; SCN: giao vien nap danh sach HS (ho ten, ngay sinh, diem danh, hanh kiem, nhan xet); EA: diem, ket qua, transcript phat am |
| 7 | Luu tru | Supabase (ngoai VN) + Vercel (US) + Resend (mail US) + Google Analytics (US) |
| 8 | Tuyen bo "An toan cho tre - khong quang cao" | Co tren landing - nhung ga-audiences remarketing dang thu thap du lieu hanh vi |

---

## C. Findings

### P0-1. Khong co chinh sach bao mat / thong bao xu ly du lieu - vi pham nen tang PDPD

- **Luat**: ND 13/2023/ND-CP (PDPD) Dieu 13 - truoc khi xu ly DNCN phai
  thong bao cho chu the (muc dich, loai du lieu, cach thuc xu ly, ben
  nhan, quyen cua chu the, thoi gian luu tru). Dieu 11 - thong bao cho
  tre em phai phu hop do tuoi; voi tre em duoi 16 tuoi can dong y cua
  cha me/nguoi giam ho (D.19).
- **Thuc te**: khong co trang policy nao; SPA fallback an loi 404.
  Dang ky HS, nap roster SCN, thu SDT trong noi dung CK - tat ca deu
  thu thap DNCN khong co bat ky thong bao nao.
- **Rui ro**: hinh phat hanh chinh (ND 98/2020 + khung tang manh dang
  lap quy), va la dieu kien tien quyet de moi quyen nang khac cua PDPD.

### P0-2. Du lieu tre em (nhay cam) + truyen ra nuoc ngoai - khong ho so A05

- **Luat**: ND 13/2023: du lieu tre em = DNCN nhay cam (D.2.4); ho so
  danh gia tac dong xu ly DNCN (mau 01-03) nop Cuc ANNĐ&PSXH (A05)
  trong 60 ngay; ho so danh gia tac dong truyen DNCN ra nuoc ngoai
  (mau 04a/04b) nop trong 60 ngay ke tu ngay truyen (D.25-26); bat
  buoc chi dinh bo phan/nguoi bao ve DNCN (DPO, D.28); xu ly du lieu
  tre em phai theo nguyen tac "loi ich toi uu cua tre em" va co dong y
  phu huynh (D.18-19).
- **Thuc te**: du lieu HS (ten, lop, truong, diem, transcript giong
  doc) luu Supabase ngoai VN; mail qua Resend; analytics qua Google -
  khong filing nao, khong DPO, khong parental consent flow (dang ky
  bang username+PIN khong he co buoc dong y PH).
- **Rui ro**: day la ho so so mot ma co quan quan ly hoi dau tien khi
  kiem tra edtech; muc xu phat nhom vi pham DNCN nhay cam la nang nhat.

### P0-3. Ban hang online khong dap ung phap luat TMĐT

- **Luat**: ND 85/2021/ND-CP (sua ND 52/2013) Dieu 52-56 + TT 59/2015:
  website TMĐT ban hang phai **thong bao voi Bo Cong Thuong**
  (saleonline.gov.vn); cong bo day du: ten MST dia chi nguoi ban,
  dieu khoan su dung, chinh sach thanh toan/giao hang (kich hoat)/kiem
  tra/doi tra-hoan tien/bao hanh, co che tiep nhan giai quyet khieu nai.
- **Thuc te**: dang ban subscription qua chuyen khoan vao **STK ca
  nhan "LE DUY LINH"** tren website khong ghi ten don vi ban - khong
  co bat ky chinh sach nao trong cac muc bat buoc tren.
- **Rui ro**: xu phat thuong mai (muc pho bien 10-60 trieu theo hanh
  vi); tranh chap hoan tien khong co co so phap ly; rui ro thue/hoa
  don kem theo (can confirm cau truc HKD/DN cua chu so huu).
- **Luu y rieng**: ban qua tai khoan ca nhan cho doanh thu B2C can
  kiem tra lai hinh thuc to chuc kinh doanh + nghia vu hoa don
  dien tu (ND 123/2020). Can input cua chu quan.

### P0-4. Google Analytics + DoubleClick remarketing tren san pham tre em, khong consent

- **Luat**: PDPD (tracking = xu ly DNCN hanh vi, can thong bao +
  dong y); ND 70/2021/ND-CP Dieu 11 - quang cao ca nhan hoa chi duoc
  dung khi nguoi tiep dung **dong y**, va quang cao theo doi hanh vi
  cua tre em bi han che nghiem; Luat Tre em: khong duoc loi dung tre
  em phuc vu quang cao.
- **Thuc te**: `ga-audiences` (remarketing audience build) + gtag +
  doubleclick firing ngay **landing** cua san pham tre em
  (`vieschool-content/ea/home/index.html` + ~14 trang khac); khong
  banner consent; landing dong thoi tuyen bo "khong quang cao". App
  `/app` sach (funnel.ts client-only, khong gui mang).
- **Fix nhanh**: tat advertising features: `gtag('set',
  'allow_google_signals', false)` + tat ad personalization trong GA4
  admin, hoac go GA khoi cac trang huong toi PH/tre; them cookie
  consent cho landing neu giu analytics co ban.

### P1-1. Khong thong bao website voi Bo TTTT + thieu dinh danh bat buoc

- **Luat**: ND 147/2024/ND-CP (thay ND 72/2013) - website cung cap
  thong tin/dich vu ra cong chung phai **thong bao voi So TTTT**
  (giay xac nhan thong bao website); TT 09/2014/TT-BTTTT - trang thong
  tin dien tu phai ghi ro: ten don vi chu quan, ten mien, dia chi, dien
  thoai/email, giay phep hoac xac nhan thong bao.
- **Thuc te**: 4/4 domain khong co dong dinh danh nao; chi co
  "san pham cua VieSchool".
- **Rui ro**: phat hanh chinh + yeu cau khi kiem tra/chap nhan quang
  cao/doi tac truong hoc due diligence.

### P1-2. Co che "chia se doanh thu cho giao vien gioi thieu hoc sinh" - xung dot dao duc nghe

- **Luat/quy dinh**: Luat Nha giao 2025 (hieu luc 1/1/2026) cam nha
  giao truc loi tu hoc sinh; TT 16/2018/TT-BGDDT Dieu 5 (dao duc nha
  giao): khong loi dung dia vi, cong tac de truc loi; cac van ban
  cam GV ban ep/ep mua tai lieu, dich vu cho HS cua minh.
- **Thuc te**: pricing page viet "Giao vien va don vi gioi thieu hoc
  sinh duoc huong chinh sach chia se doanh thu" - cong khai, la loi
  ban chinh.
- **Rui ro**: mot GV nhan hoa hong tu viec ban goi cho chinh HS lop
  minh la vi pham dao duc nghe ro - truong/So GD co the tu choi toan
  bo chuong trinh; rui ro truyen thong lon. **Khuyen nghi**: gioi han
  affiliate cho don vi/trung tam/ben thu 3 khong truc tiep dung day;
  voi GV thi de loi ich phi tien (mien phi cong cu, khong phai hoa
  hong tren HS lop minh); viet ro cam ket khong ep HS trong hop dong.

### P1-3. Khong co hop dong xu ly du lieu (DPA) cho truong hoc - SCN

- **Luat**: PDPD Dieu 28 - xu ly DNCN thue/chuyen giao phai co hop
  dong van ban quy dinh ro trach nhiem. SCN xu ly ho so HS ho nha
  truong (VieSchool la ben xu ly thue) - bat buoc DPA trong hop dong
  truong, kem quy dinh bao mat, thoi han luu tru, xoa khi cham dut.
- **Thuc te**: khong co template nao; demo account duoc chung minh la
  fake seeded (khong rui ro) nhung luong that thi truong nap HS vao
  khong co khung phap ly.
- **Fix**: soan DPA + phu luc bao mat DNCN nhay cam, dra vao hop dong
  truong.

### P1-4. Quang cao truc tiep toi phu huynh tre em - co che dong y marketing

- **Luat**: PDPD D.13 + Luat QC/NĐ 70: marketing truc tiep
  (email/Zalo) phai co co che opt-out va can cu thu thap; ND 15/2020
  quy dinh cuoc lien lac quang cao chi gui khi nguoi dung dong y.
- **Thuc te**: outreach email/Zalo toi GV tu leads DB
  (scanning-marketing) - replies.mjs da co unsubscribe khi lead noi
  "dung gui nua" (tot) nhung can cu phap ly cho cold outreach va muc
  consent ban dau chua duoc ghi nhan.

### P2-1. Noi dung bam SGK Global Success - ranh gioi ban quyen

- Tuyen bo "bam SGK" la mo ta su kien - OK. Nhung neu cau hoi/tu vung/
  bai tap chep nguyen van tu SGK thi rui ro ban quyen NXB GDVN. Can
  quet che do provenance: 99k cau hoi la tu sinh hay co trich SGK?
  Vocab list theo chu de SGK thuong an toan (tu don le la su kien),
  bai doc/de thi nguyen van thi khong.

### P2-2. Luu tru du lieu ngoai VN - Decree 53/2022 (An ninh mang)

- ND 53/2022: DN trong nuoc cung cap dich vu tren mang vien thong/internet
  thu thap DNCN nguoi dung VN co the bi yeu cau luu tru tai VN khi co
  yeu cau cua co quan (khong phai bat buoc ngay) - nhung ket hop du
  lieu tre em nhay cam thi nen co ke hoach; filing PDPD 04a/04b o
  P0-2 la nghia vu ngay bay gio.

### P2-3. Chinh sach gia dinh/an chi em va quang cao khuyen mai

- "Giam 25% den 31/12/2026", "giam 50% tu con thu 2" - Luat Thuong mai
  + ND 81/2018: khuyen mai giam gia toi da 50% tri gia hang hoa truoc
  khuyen mai la tran phap ly cho hinh thuc giam gia - muc 50% dat
  nguong; can ghi nhan hinh thuc KM voi So Cong Thuong dia phuong neu
  duoc coi la khuyen mai thuong xuyen.

### P2-4. Dieu khoan noi bo khach hang - thieu "dieu khoan su dung"

- Khong co ToS nghia la khong co dieu khoan gioi han trach nhiem, cam
  lam dung, dieu khoan cham dut, luat ap dung - rat can khi co tranh
  chap hoan phi va khi truong yeu cau trong hop dong.

---

## D. Remediation - uu tien thuc hien

**Tuan nay (P0):**
1. Dung trang `Chinh sach bao mat` + `Dieu khoan su dung` + `Chinh
   sach ban hang` (thanh toan/kich hoat/hoan tien/khieu nai) tren
   vieschool.com + link footer moi domain. SPA fallback phai tra 404
   that cho route khong ton tai (hoac add route that).
2. Them buoc **parental consent** vao dang ky/kich hoat tai khoan HS
   (checkbox "Toi la phu huynh/nguoi giam ho, dong y cho con su dung")
   + link policy.
3. Tat GA4 advertising features/ga-audiences ngay (config flag) hoac
   go GA khoi `/app`; banner cookie consent tren landing neu giu.
4. Footer toan he thong: ten don vi chu quan + dia chi + MST/GP + email
   + hotline + (khi co) xac nhan thong bao website.
5. Quyet dinh cau truc ban hang: neu la HKD/DN thi cong bo ten+MST va
   xuat hoa don dien tu; thong bao website TMĐT tren saleonline.gov.vn.

**30 ngay (P1):**
6. Thong bao website So TTTT (ND 147/2024).
7. Ho so A05: DPIA mau 01-03 + truyen du lieu ra nuoc ngoai 04a/04b;
   chi dinh DPO/bo phan bao ve DNCN; soan quy trinh xoa/ru t du lieu
   theo yeu cau chu the.
8. Viet lai dong affiliate: loai hoa hong tien cho GV ban vao lop minh;
   phu luc dao duc nghe trong hop dong truong.
9. Soan DPA + phu luc bao mat cho hop dong truong (SCN + EA class).

**90 ngay (P2):**
10. Audit provenance ngan hang cau hoi vs SGK (co van ban tu khai).
11. Ke hoach data-localization/tuyen bo tuong thich ND 53 neu duoc yeu cau.
12. Dang ky/giay to khuyen mai voi So Cong Thuong neu can.

---

## E. Diem manh phap ly da co (ghi nhan)

- PricingCard chi mount tren parent-owned surface (ungatedPurchaseGuard
  test) - mua ban khong nham truc tiep tre.
- Khong chat/khong quang cao trong app - dung tuyen bo.
- attribution.json cho 1.190 anh + 310 lottie + 1.186 svg - ky luat
  ban quyen tot cho hinh anh.
- replies.mjs co unsubscribe handling cho outreach.
- Demo SCN dung seed data gia - khong ro du lieu HS that.
