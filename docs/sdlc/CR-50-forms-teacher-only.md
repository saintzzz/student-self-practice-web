# CR-50 - "De co san" chi danh cho giao vien

Status: APPROVED (founder ruling) - implement ngay.

## Requirement thay doi

CR-48 phase 5 dat FormPicker tren StartBatchScreen cho moi user dang
nhap. Founder ruling: bo de chuan hoa (unit test / chuan doan / giua ky
/ cuoi ky) la cong cu **danh gia cua giao vien** - hoc sinh chi luyen
qua Luyen tap / Luyen de / Thi thu.

Trong he thong hien tai "giao vien" = role `admin` (chu lop hoc). Neu
sau nay tach role `teacher` rieng thi gate nay mo rong theo - chi can
doi 1 prop.

## Impact

- `StartBatchScreen`: FormPicker chi render khi `isAdmin` prop true
  (admin "Luyen thu" giu authMode='admin'; student = 'student';
  guest khong bao gio thay).
- `list_assessment_forms` RPC: grant authenticated - giu nguyen,
  se sietsau khi co role teacher thuc (hien admin/student deu la
  authenticated; gate UI la du vi forms chi la metadata ten de, noi
  dung cau hoi van qua fetch_form dang cho authenticated - danh gia
  rui ro thap: HS goi tay RPC chi doc duoc ten de).
  => Ruling bo sung: siết fetch_form + list_assessment_forms xuong
  admin-only de bao mat de thi that (cau hoi + dap an).
- Tests: picker an voi student, hien voi admin.
