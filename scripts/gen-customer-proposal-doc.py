#!/usr/bin/env python3
"""Generate proposal-vieschool-khach-hang.docx - customer-facing proposal.

Mirrors scripts/gen-customer-proposal-deck.py (same comparison tables,
per-role demo accounts, canonical pricing from docs/sales/01-pricing.md)
with the current product data (post CR-51/52/53). Regenerate whenever
the deck script changes so the two artifacts never drift.
"""
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

NAVY = RGBColor(0x0B, 0x1B, 0x3A)
GOLD = RGBColor(0xB8, 0x86, 0x0B)

doc = Document()
style = doc.styles["Normal"]
style.font.name = "Be Vietnam Pro"
style.font.size = Pt(11)


def h(text, level=1, color=NAVY):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(18 if level == 1 else 14)
    r.font.color.rgb = color
    return p


def para(text, size=11):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.size = Pt(size)
    return p


def bullets(items):
    for it in items:
        doc.add_paragraph(it, style="List Bullet")


def table(rows, widths=None):
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = "Table Grid"
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = t.cell(ri, ci)
            cell.text = val
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9.5)
                    r.font.bold = ri == 0
                    if ri == 0:
                        r.font.color.rgb = NAVY
    return t


# ---------- Cover ----------
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("VieSchool")
r.bold = True
r.font.size = Pt(36)
r.font.color.rgb = NAVY
para("Hệ sinh thái số cho trường học Việt Nam\n"
     "Một nền tảng - ba sản phẩm - hỗ trợ lớp 1 đến lớp 12")
para("Tài liệu giới thiệu sản phẩm - dành cho nhà trường, giáo viên và phụ huynh\n"
     "Website: vieschool.com", 10)

# ---------- 1. Suite ----------
h("1. VieSchool là gì?")
para("VieSchool là hệ sinh thái số cho trường học Việt Nam, gồm 3 sản phẩm "
     "vận hành độc lập nhưng cùng một nhận diện và tài khoản:")
table([
    ("Sản phẩm", "Địa chỉ", "Dành cho", "Nội dung chính"),
    ("English Arena", "ea.vieschool.com", "Học sinh lớp 1-5 (lộ trình 6-12)",
     "Luyện Tiếng Anh, Toán và Khoa học tiếng Anh bám SGK Global Success"),
    ("Công cụ số Giáo viên", "congcuso.vieschool.com", "Giáo viên các cấp",
     "12 công cụ biên soạn học liệu theo CTGDPT 2018"),
    ("Sổ Chủ Nhiệm Số", "sochunhiem.vieschool.com", "Nhà trường, GVCN, BGH",
     "Số hóa công tác chủ nhiệm theo Điều lệ trường mới nhất"),
])
para("")
para("English Arena - sản phẩm chủ lực:", 11).runs[0].bold = True
bullets([
    "Ngân hàng 11.400+ câu hỏi bám SGK Global Success lớp 1-5 - mỗi câu kèm "
    "đáp án và giải thích tiếng Việt đã kiểm duyệt.",
    "270 đề thi chuẩn theo format đề IOE - số câu và thời gian chỉnh riêng "
    "từng khối. Ôn luyện có đồng hồ đo giờ làm bài, câu sai tự đưa vào "
    "hàng đợi ôn lại.",
    "3 môn luyện bằng tiếng Anh trong cùng app: Tiếng Anh, Toán tiếng Anh, "
    "Khoa học tiếng Anh - đúng nhu cầu luyện IOE và Violympic.",
    "1.400+ hình minh họa và 470 bài nghe có transcript - toàn bộ tài sản "
    "hình ảnh khai báo bản quyền rõ ràng, không dùng nội dung bên thứ ba "
    "chưa được cấp phép.",
    "Thi đua lành mạnh: bảng xếp hạng tuần, đấu trường 1v1, sao - huy hiệu - "
    "chuỗi ngày học. Vào lớp bằng mã 6 ký tự. Không quảng cáo, không chat.",
])

# ---------- 2. Comparison ----------
h("2. So sánh với các giải pháp trên thị trường")
para("Bảng so sánh trung thực - chúng tôi liệt kê cả điểm đối thủ làm tốt hơn "
     "để nhà trường đánh giá khách quan.")
h("2.1 English Arena (luyện tiếng Anh)", 2)
table([
    ("Tiêu chí", "VieSchool English Arena", "App quốc tế (Duolingo, Khan Kids)",
     "App nội địa (Monkey, VioEdu)"),
    ("Bám SGK Việt Nam", "Trọn Global Success lớp 1-5, mỗi câu kèm giải thích tiếng Việt",
     "Không theo chương trình VN", "Theo chương trình chung, không bám từng unit"),
    ("Trải nghiệm trẻ em", "Thế giới phiêu lưu, mascot, sao - huy hiệu - sticker",
     "Rất tốt - animation, đồ họa đầu tư lớn", "Đa số là form trắc nghiệm, UI khô"),
    ("Môn luyện", "Tiếng Anh + Toán tiếng Anh + Khoa học tiếng Anh",
     "Chủ yếu tiếng Anh/ngôn ngữ", "Tách nhiều app/gói cho từng môn"),
    ("Đề thi và ôn luyện", "270 đề thi chuẩn theo khối + luyện đề có đồng hồ đo giờ + ôn câu sai",
     "Không có format đề VN", "Có thi thử, ít cá nhân hóa ôn sai"),
    ("Mô hình trường học", "Trường cấp tài khoản, GV quản lý lớp, báo cáo",
     "Không có quản lý lớp theo trường VN", "Một số có, thường phức tạp"),
    ("Chi phí", "Miễn phí chơi thử; gói gia đình và gói trường", "Đắt (thu bằng USD)", "Trung bình"),
    ("Điểm yếu của chúng tôi", "Mới phủ lớp 1-5 (lộ trình 6-12); vốn từ nhỏ hơn app quốc tế", "", ""),
])
h("2.2 Công cụ số Giáo viên (TVC360)", 2)
table([
    ("Tiêu chí", "TVC360", "MagicSchool (Mỹ)", "Azota"),
    ("Chương trình áp dụng", "CTGDPT 2018 (gồm sửa đổi của TT 17/2025 cho Lịch sử, Địa lí, GDCD), gắn mã YCCĐ",
     "Chuẩn Mỹ - không áp cho VN", "Theo cấu trúc đề thi VN"),
    ("Phạm vi công cụ", "12 công cụ: ngân hàng câu hỏi, ma trận, đề thi, kế hoạch bài dạy",
     "60+ công cụ nhưng toàn tiếng Anh, prompt Mỹ", "Chấm điểm, ngân hàng đề - mạnh về thi cử"),
    ("Xuất tài liệu", "DOCX có công thức toán Word-native + PDF", "Text/copy-paste", "DOCX / PDF"),
    ("Điểm yếu của chúng tôi", "Ngân hàng câu hỏi cộng đồng nhỏ hơn Azota", "", ""),
])
h("2.3 Sổ Chủ Nhiệm Số", 2)
table([
    ("Tiêu chí", "Sổ Chủ Nhiệm Số", "Hệ MIS lớn (vnEdu, SMAS)", "Sổ giấy / Excel"),
    ("Phạm vi", "Tập trung đúng công tác chủ nhiệm: điểm danh, hạnh kiểm, sổ điểm, thông báo PH",
     "MIS toàn trường: học phí, nhân sự, tài chính", "Thủ công, dễ sai lệch"),
    ("Độ khó triển khai", "Mở trình duyệt là dùng; demo trong 5 phút",
     "Triển khai dài, cần đào tạo", "Không cần triển khai nhưng tốn công hàng ngày"),
    ("Chuẩn quy định", "Điều lệ trường mới nhất (TT 15/2026/TT-BGDĐT)", "Đa số cập nhật chậm", "Không có"),
    ("Chi phí", "Tính theo học sinh, phù hợp trường vừa và nhỏ", "Đắt, gói lớn bắt buộc", "Miễn phí nhưng tốn công"),
    ("Điểm yếu của chúng tôi", "Không thay thế MIS toàn trường (chưa có học phí, nhân sự)", "", ""),
])

# ---------- 3. User guide + demo accounts ----------
h("3. Hướng dẫn sử dụng và tài khoản trải nghiệm")
para("Mỗi sản phẩm có tài khoản demo riêng theo vai trò - đăng nhập như người "
     "dùng thật, dữ liệu là dữ liệu thật trong môi trường demo.")
h("3.1 English Arena - ea.vieschool.com", 2)
bullets([
    "Mở ea.vieschool.com từ trình duyệt bất kỳ - không cần cài đặt.",
    "Khách chưa có tài khoản: nhấn \"Chơi không cần tài khoản\" - 1 vòng miễn phí mỗi lớp.",
    "Học sinh: đăng nhập bằng username + PIN do giáo viên/nhà trường cấp - "
    "chọn khối lớp - chọn môn (Tiếng Anh / Toán / Khoa học) - Luyện đề có "
    "đồng hồ đo giờ, Thi thử đếm ngược theo từng khối.",
    "Vào lớp: nhập mã lớp 6 ký tự cô gửi (VD lớp demo: R8WHYF) - không cần admin gán tay.",
    "Quản trị: tạo tài khoản học sinh, tạo lớp sinh mã tự động, gán phạm vi lớp, xem tiến độ.",
])
table([
    ("Vai trò", "Username", "PIN", "Phạm vi"),
    ("Quản trị viên", "demo_admin", "demo2026", "Console quản trị: tạo tài khoản, gán lớp, báo cáo"),
    ("Học sinh", "demo_hs", "demo2026", "Đủ 5 khối lớp 1-5, lưu tiến độ"),
    ("Khách (không cần tài khoản)", "-", "-", "1 vòng miễn phí mỗi lớp"),
])
h("3.2 Công cụ số Giáo viên - congcuso.vieschool.com", 2)
bullets([
    "Đăng nhập bằng email + mật khẩu; đổi mật khẩu ngay trong tài khoản.",
    "Giáo viên: chọn công cụ (ngân hàng câu hỏi, ma trận, đề thi...) - nhập yêu cầu - tạo nội dung.",
    "Kiểm định: duyệt nội dung trước khi công khai trong thư viện chung.",
])
table([
    ("Vai trò", "Email", "Mật khẩu"),
    ("Quản trị viên", "admin@demo.tvc", "demo1234"),
    ("Giáo viên", "gv@demo.tvc", "demo1234"),
    ("Kiểm định viên", "kd@demo.tvc", "demo1234"),
])
h("3.3 Sổ Chủ Nhiệm Số - sochunhiem.vieschool.com", 2)
para("Đăng nhập email + mật khẩu - hệ thống tự đưa về đúng màn hình theo vai trò. "
     "Mật khẩu chung tài khoản demo: demo1234.")
table([
    ("Vai trò", "Email", "Vai trò", "Email"),
    ("Ban giám hiệu", "bgh@demo.scn", "Tổ trưởng CM", "totruong@demo.scn"),
    ("Phó hiệu trưởng", "pht@demo.scn", "Kế toán", "ketoan@demo.scn"),
    ("GV chủ nhiệm", "gvcn@demo.scn", "Học sinh", "hocsinh@demo.scn"),
    ("GV bộ môn", "gvbm@demo.scn", "Phụ huynh", "phuhuynh@demo.scn"),
    ("Sở GD&ĐT", "sogd@demo.scn", "UBND", "ubnd@demo.scn"),
])
para("Kịch bản trải nghiệm gợi ý trong 10 phút: mở vieschool.com → vào English "
     "Arena chơi thử 1 vòng → đăng nhập TVC360 → đăng nhập Sổ CN theo vai trò.", 10)

# ---------- 4. Pricing (canonical: docs/sales/01-pricing.md) ----------
h("4. Giá niêm yết")
h("4.1 English Arena", 2)
table([
    ("Gói", "Giá", "Quyền lợi"),
    ("Khách (Guest)", "Miễn phí", "Chơi thử 1 vòng mỗi lớp, không cần tài khoản"),
    ("Gia đình", "249.000đ / 6 tháng hoặc 399.000đ / năm",
     "Đủ 5 khối, đủ 3 môn, lưu tiến độ và thành tích"),
    ("Nhóm lớp (phụ huynh mua)", "199.000đ / học sinh / năm",
     "Tối thiểu 15 học sinh; vào lớp tự phục vụ bằng mã lớp"),
    ("Nhà trường", "99.000đ / học sinh / năm (79.000đ từ 300 HS)",
     "Console quản lý lớp, báo cáo; 800+ HS báo giá riêng"),
])
h("4.2 Công cụ số Giáo viên", 2)
table([
    ("Gói", "Giá", "Quyền lợi"),
    ("Giáo viên lẻ", "299.000đ / giáo viên / năm", "Đủ 12 công cụ, xuất DOCX/PDF không giới hạn"),
    ("Nhà trường", "199.000đ / giáo viên / năm", "Từ 10 giáo viên; kèm luồng kiểm định nội bộ"),
])
h("4.3 Sổ Chủ Nhiệm Số", 2)
table([
    ("Gói", "Giá", "Quyền lợi"),
    ("Theo học sinh", "15.000 - 25.000đ / học sinh / năm",
     "Theo quy mô trường; đủ module chủ nhiệm, điểm, hạnh kiểm"),
])
h("4.4 Gói trọn bộ cho nhà trường", 2)
para("Trường dùng đồng thời cả 3 sản phẩm được giá bundle ưu đãi - báo giá cụ "
     "thể theo số lượng học sinh và giáo viên.")
para("Tất cả gói đều gồm: hỗ trợ triển khai ban đầu, hướng dẫn sử dụng, bảo "
     "hành tính năng trong suốt thời gian thuê bao.", 10)

# ---------- 5. Why ----------
h("5. Vì sao chọn VieSchool")
bullets([
    "Đúng chương trình Việt Nam: nội dung bám SGK Tiếng Anh Global Success "
    "theo CTGDPT 2018 - luyện trên app là học đúng điều đang học trên lớp.",
    "Trọn trong một hệ sinh thái: một nền tảng thay cho ba ứng dụng rời rạc - "
    "dữ liệu lớp, tài khoản, phân quyền thống nhất.",
    "Trọng tâm là trẻ em: không quảng cáo, không chat công khai, nút chạm lớn "
    "phù hợp trẻ nhỏ, giải thích tiếng Việt khi trả lời sai.",
    "Bản quyền rõ ràng: toàn bộ hình ảnh và font chữ có giấy phép khai báo "
    "công khai trong sản phẩm - an tâm triển khai trong trường công lập.",
    "Theo kịp quy định: sổ chủ nhiệm và công cụ giáo viên cập nhật theo "
    "Điều lệ trường mới nhất (TT 15/2026/TT-BGDĐT).",
])
para("")
para("Liên hệ: vieschool.com - đội ngũ VieSchool hỗ trợ demo trực tiếp tại "
     "trường hoặc online.")

out = "/Users/kazu.nx/devin_app/student-self-practice-web/docs/proposal-vieschool-khach-hang.docx"
doc.save(out)
print("saved", out)
