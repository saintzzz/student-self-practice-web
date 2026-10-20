# Huong dan: Giao bai - Lam bai theo lop (CR-98)

Tinh nang cho phep giao vien tao mot de bai tu ngan hang cau hoi va giao
cho ca lop; moi hoc sinh lam tren thiet bi cua minh, he thong cham diem
tu dong va tra bao cao cho giao vien.

Doi tuong doc: giao vien (muc 1) va hoc sinh/phu huynh (muc 2).

---

## 1. Danh cho giao vien

### 1.1. Dieu kien truoc khi giao bai

- Tai khoan cua ban phai co quyen quan tri tren truong (vao man hinh
  **Admin** duoc).
- Lop phai ton tai va **da mo noi dung cho khoi can thi**: vao tab
  **Noi dung**, bat khoi do cho lop. Neu lop chua mo noi dung, man hinh
  giao bai se hien canh bao vang va khong cho tao bai.

### 1.2. Tao bai tap moi

Vao **Admin** -> card **"Giao bai cho lop"**:

1. **Chon lop** - dropdown dau tien.
2. **Ten bai** - dat ten ro rang, vi du "Kiem tra tu vung Unit 5".
   Ten nay la thu hoc sinh nhin thay trong hop thu cua cac em.
3. **Khoi lop** - chi hien cac khoi lop da duoc mo cho lop do.
4. **Mon hoc** - Tieng Anh / Toan / Khoa hoc (nhan mon trong bang).
5. **So cau hoi** - chon 5, 10, 15 hoac 20 cau.
6. **Han nop** - chon ngay gio het han. Sau han hoc sinh van co the
   lam nhung bai se danh dau "nop muon".
7. Bam **Tao bai**.

He thong tu dong rut ngau nhien so cau da chon tu ngan hang theo dung
khoi + mon (nguon `mockEligible` - cau da qua kiem tra chat luong).
**Tat ca hoc sinh trong lop nhan cung mot de** - cong bang khi cham.

Loi thuong gap:

| Thong bao | Nguyen nhan | Cach xu ly |
|---|---|---|
| "Lop nay chua duoc mo noi dung cho khoi do" | khoi chua bat trong tab Noi dung | sang tab Noi dung, bat khoi, quay lai tao bai |
| "Ngan hang chua co du cau hoi" | pool cau khoi+mon qua it so voi so cau yeu cau | giam so cau hoac doi he gen bo sung |

### 1.3. Theo doi va cham

- Danh sach bai da giao hien ngay duoi form, kem trang thai
  (dang mo / da dong) va so em da nop.
- Bam **Bao cao** tren tung bai de xem:
  - diem tung hoc sinh, so cau dung/tong
  - ky nang nao ca lop lam yeu (weak skills)
  - ai nop muon, ai chua lam
- Bam **Dong bai** de ket thuc som (hoc sinh khong lam duoc nua).
- Bam **Luyen lai** (can chon han nop moi) - he thong tu tao bai tap
  cai thien dung vao cac ky nang lop dang yeu. Neu lop lam tot het se
  bao "lop lam tot ca roi".

### 1.4. Luu y quan trong

- **De la co dinh.** Mot khi da giao, bo cau hoi cua moi em duoc chot
  ngay - khong doi duoc. Muon de khac phai tao bai moi.
- Hoc sinh **chi lam 1 lan** cho moi bai (tru bai "luyen lai" tao rieng).
- Bao cao cap nhat khi hoc sinh nop - khong can cho ca lop xong.

---

## 2. Danh cho hoc sinh (va phu huynh)

### 2.1. Xem bai duoc giao

- Dang nhap tai khoan cua em (khach se khong thay muc nay).
- O man hinh chon khoi, hop thu **"Bai tap co giao"** hien khi co bai.
- Moi dong ghi: ten bai - lop - han nop - trang thai.

### 2.2. Y nghia trang thai

| Nut/nhan | Y nghia |
|---|---|
| **Sap mo** | bai da giao nhung chua den gio mo - cho dung han |
| **Lam bai** | dang mo - bam de bat dau lam |
| **Lam tiep** | em da vao lam nhung chua nop - bam de lam tiep dung cho do |
| **Lam muon** | qua han nhung co van cho lam - diem se danh dau "nop muon" |
| **Da nop** | da nop xong, hien diem vd "8/10 diem" |
| **Da dong** | co da dong bai - khong lam duoc nua |

### 2.3. Trong khi lam bai

- Lam het so cau roi bam **Nop bai**.
- **Lo mang giua chung khong sao:** he thong luu bai nop tam tren may
  va tu gui lai khi em mo lai. Neu thay bao "bai cu chua nop duoc",
  bam nut thu lai - dung tat di.
- Khong lam lai duoc mot bai da vao (tru khi co tao bai luyen lai khac).

### 2.4. Sau khi nop

- Diem hien ngay o hop thu ("Da nop - 8/10 diem").
- Co se nhin thay diem va phan em lam yeu - co the giao bai luyen lai
  dung vao cho yeu do.

---

## 3. Hoi-dap nhanh

**Hoc sinh co can mang den lop lam khong?**
Khong - lam bat cu dau, mien la dang nhap dung tai khoan va con trong
han.

**Hai anh em dung chung may co sao khong?**
Khong sao - bai nop gan voi tai khoan, khong gan thiet bi. Dang nhap
dung nguoi la xong.

**Co xem lai de sau khi nop khong?**
Hien tai chi hien diem; xem lai chi tiet tung cau nam trong backlog.

**Bai "luyen lai" la gi?**
Bai co tao rieng sau khi xem bao cao - chi chua cau o ky nang ca lop
lam yeu, han nop rieng.

---

*Cap nhat: CR-98 deployed; tinh nang dang chay tren production.*
