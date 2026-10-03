#!/usr/bin/env python3
"""Generate proposal-vieschool-khach-hang.pptx - customer-facing proposal deck.

Mirrors docs/proposal-vieschool-khach-hang.docx (comparison tables incl.
honest weaknesses, per-role demo accounts, public pricing) with the latest
product data (post CR-15/16/17). Reuses the VieSchool navy/gold deck style.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

NAVY = RGBColor(0x0B, 0x12, 0x24)
NAVY2 = RGBColor(0x12, 0x1B, 0x33)
GOLD = RGBColor(0xF2, 0xC9, 0x57)
WHITE = RGBColor(0xF4, 0xF6, 0xFB)
MUT = RGBColor(0x9B, 0xA6, 0xC4)

W, H = Inches(13.333), Inches(7.5)
prs = Presentation()
prs.slide_width, prs.slide_height = W, H
blank = prs.slide_layouts[6]


def slide():
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(1, 0, 0, W, H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = NAVY
    bg.line.fill.background()
    bg.shadow.inherit = False
    return s


def tb(s, x, y, w, h, text, size=18, color=WHITE, bold=False,
       align=PP_ALIGN.LEFT, font="Avenir Next"):
    box = s.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.alignment = align
        for r in p.runs:
            r.font.size = Pt(size)
            r.font.bold = bold
            r.font.color.rgb = color
            r.font.name = font
    return box


def kicker(s, t):
    tb(s, Inches(0.6), Inches(0.35), Inches(8), Inches(0.4), t, 13, GOLD, True)


def title(s, t, sub=None):
    tb(s, Inches(0.6), Inches(0.7), Inches(12.2), Inches(0.9), t, 32, WHITE, True)
    if sub:
        tb(s, Inches(0.6), Inches(1.4), Inches(12.2), Inches(0.5), sub, 14, MUT)


def card(s, x, y, w, h, head, body, head_color=GOLD, head_size=16, body_size=12):
    sh = s.shapes.add_shape(5, x, y, w, h)
    sh.fill.solid()
    sh.fill.fore_color.rgb = NAVY2
    sh.line.color.rgb = RGBColor(0x2A, 0x3A, 0x5E)
    sh.line.width = Pt(1)
    sh.shadow.inherit = False
    tb(s, x + Inches(0.25), y + Inches(0.15), w - Inches(0.5), Inches(0.5),
       head, head_size, head_color, True)
    tb(s, x + Inches(0.25), y + Inches(0.62), w - Inches(0.5), h - Inches(0.8),
       body, body_size, WHITE)


def table(s, rows, x, y, w, h, col_widths=None, font_size=11, head_size=12):
    tbl = s.shapes.add_table(len(rows), len(rows[0]), x, y, w, h).table
    if col_widths:
        for ci, cw in enumerate(col_widths):
            tbl.columns[ci].width = cw
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = tbl.cell(ri, ci)
            cell.text = val
            cell.margin_top = cell.margin_bottom = Pt(3)
            for p in cell.text_frame.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(head_size if ri == 0 else font_size)
                    r.font.name = "Avenir Next"
                    r.font.bold = ri == 0
                    r.font.color.rgb = NAVY if ri == 0 else WHITE
            cell.fill.solid()
            cell.fill.fore_color.rgb = GOLD if ri == 0 else NAVY2
    return tbl


# ---------- S1 Cover ----------
s = slide()
tb(s, Inches(0.6), Inches(1.5), Inches(12), Inches(0.5),
   "TÀI LIỆU GIỚI THIỆU SẢN PHẨM", 16, GOLD, True)
tb(s, Inches(0.6), Inches(2.0), Inches(12), Inches(1.4), "VieSchool", 66, WHITE, True)
tb(s, Inches(0.6), Inches(3.3), Inches(12), Inches(0.9),
   "Hệ sinh thái số cho trường học Việt Nam\n"
   "Một nền tảng - ba sản phẩm - hỗ trợ lớp 1 đến lớp 12", 20, MUT)
tb(s, Inches(0.6), Inches(5.4), Inches(12), Inches(0.9),
   "vieschool.com | ea.vieschool.com | congcuso.vieschool.com | sochunhiem.vieschool.com",
   14, MUT)
tb(s, Inches(0.6), Inches(6.5), Inches(12), Inches(0.4),
   "Dành cho nhà trường, giáo viên và phụ huynh", 13, MUT)

# ---------- S2 Suite overview ----------
s = slide()
kicker(s, "VIESCHOOL LÀ GÌ?")
title(s, "3 sản phẩm - 1 hệ sinh thái",
      "Vận hành độc lập nhưng cùng một nhận diện và tài khoản")
table(s, [
    ("Sản phẩm", "Địa chỉ", "Dành cho", "Nội dung chính"),
    ("English Arena", "ea.vieschool.com", "Học sinh lớp 1-5 (lộ trình 6-12)",
     "Luyện tiếng Anh bám SGK Global Success qua hành trình phiêu lưu"),
    ("Công cụ số Giáo viên", "congcuso.vieschool.com", "Giáo viên các cấp",
     "12 công cụ biên soạn học liệu theo CTGDPT 2018"),
    ("Sổ Chủ Nhiệm Số", "sochunhiem.vieschool.com", "Nhà trường, GVCN, BGH",
     "Số hóa công tác chủ nhiệm theo Điều lệ trường mới nhất"),
], Inches(0.6), Inches(2.1), Inches(12.1), Inches(3.4),
    col_widths=[Inches(2.6), Inches(2.6), Inches(2.9), Inches(4.0)],
    font_size=12)

# ---------- S3 English Arena spotlight ----------
s = slide()
kicker(s, "SẢN PHẨM CHỦ LỰC")
title(s, "English Arena - học mà chơi, chơi mà học")
feats = [
    ("1100+ từ vựng bám SGK",
     "Phủ Global Success lớp 1-5, mỗi từ có hình minh họa,\ngiải thích tiếng Việt, câu ví dụ được kiểm duyệt ngữ pháp."),
    ("Luyện đề + Thi thử theo khối",
     "Đề luyện và thi thử theo format đề IOE - số câu và thời gian\nchỉnh riêng từng khối (lớp 1 nhẹ hơn lớp 5)."),
    ("Thi đua có đối thủ",
     "Bảng xếp hạng tuần theo khối, đấu trường 1v1, sao - huy hiệu -\nchuỗi ngày học. Tiến độ đồng bộ mọi thiết bị, không mất khi đổi máy."),
    ("An toàn & quản lý",
     "Username + PIN do giáo viên cấp, học sinh tự đổi PIN. Vào lớp bằng\nmã lớp 6 ký tự - không qua admin. Không quảng cáo, không chat."),
]
for i, (h, b) in enumerate(feats):
    card(s, Inches(0.6 + (i % 2) * 6.2), Inches(1.9 + (i // 2) * 2.55),
         Inches(6.0), Inches(2.35), h, b)

# ---------- S4-6 Comparison ----------
s = slide()
kicker(s, "SO SÁNH ĐỐI THỦ")
title(s, "English Arena vs các lựa chọn hiện có",
      "Bảng so sánh trung thực - gồm cả điểm đối thủ làm tốt hơn")
table(s, [
    ("Tiêu chí", "English Arena", "App quốc tế\n(Duolingo, Khan Kids)", "App nội địa\n(Monkey, VioEdu)"),
    ("Bám SGK Việt Nam", "Trọn Global Success lớp 1-5,\nmỗi từ gắn đúng bài học", "Không theo chương trình VN", "Theo chương trình chung,\nkhông bám từng unit"),
    ("Trải nghiệm trẻ em", "Thế giới phiêu lưu, mascot,\nsao - huy hiệu - sticker", "Rất tốt - đồ họa đầu tư lớn", "Đa số form trắc nghiệm, UI khô"),
    ("Kỹ năng luyện", "Nghe - đọc - ghép cặp -\nphát âm chấm điểm", "Nghe - đọc - nói\n(chấm phát âm tốt)", "Chủ yếu đọc/nghe trắc nghiệm"),
    ("Mô hình trường học", "Trường cấp tài khoản,\nGV quản lý lớp, báo cáo", "Không có quản lý lớp\nkiểu trường VN", "Một số có,\nthường phức tạp"),
    ("Chi phí", "Miễn phí chơi thử;\ngói gia đình + gói trường", "Đắt (thu bằng USD)", "Trung bình"),
    ("Điểm yếu của chúng tôi", "Chỉ tiếng Anh, mới phủ lớp 1-5;\nvốn từ nhỏ hơn app quốc tế", "", ""),
], Inches(0.6), Inches(2.0), Inches(12.1), Inches(5.0),
    col_widths=[Inches(2.4), Inches(3.5), Inches(3.1), Inches(3.1)],
    font_size=11)

s = slide()
kicker(s, "SO SÁNH ĐỐI THỦ")
title(s, "Công cụ số Giáo viên vs các lựa chọn hiện có")
table(s, [
    ("Tiêu chí", "TVC360", "MagicSchool (Mỹ)", "Azota"),
    ("Chương trình áp dụng", "CTGDPT 2018 (gồm sửa đổi của TT 17/2025\ncho Lịch sử, Địa lí, GDCD), gắn mã YCCĐ", "Chuẩn Mỹ - không áp cho VN", "Theo cấu trúc đề thi VN"),
    ("Phạm vi công cụ", "12 công cụ: ngân hàng câu hỏi,\nma trận, đề thi, kế hoạch bài dạy", "60+ công cụ nhưng toàn\ntiếng Anh, prompt Mỹ", "Chấm điểm, ngân hàng đề -\nmạnh về thi cử"),
    ("Xuất tài liệu", "DOCX có công thức toán\nWord-native + PDF", "Text / copy-paste", "DOCX / PDF"),
    ("Điểm yếu của chúng tôi", "Ngân hàng câu hỏi cộng đồng\nnhỏ hơn Azota", "", ""),
], Inches(0.6), Inches(2.0), Inches(12.1), Inches(4.2),
    col_widths=[Inches(2.4), Inches(3.7), Inches(3.0), Inches(3.0)],
    font_size=11)

s = slide()
kicker(s, "SO SÁNH ĐỐI THỦ")
title(s, "Sổ Chủ Nhiệm Số vs các lựa chọn hiện có")
table(s, [
    ("Tiêu chí", "Sổ Chủ Nhiệm Số", "Hệ MIS lớn (vnEdu, SMAS)", "Sổ giấy / Excel"),
    ("Phạm vi", "Tập trung đúng công tác chủ nhiệm:\nđiểm danh, hạnh kiểm, sổ điểm,\nthông báo PH", "MIS toàn trường: học phí,\nnhân sự, tài chính", "Thủ công, dễ sai lệch"),
    ("Độ khó triển khai", "Mở trình duyệt là dùng;\ndemo trong 5 phút", "Triển khai dài, cần đào tạo", "Không cần triển khai nhưng\ntốn công hàng ngày"),
    ("Chuẩn quy định", "Điều lệ trường mới nhất\n(TT 15/2026/TT-BGDĐT)", "Đa số cập nhật chậm", "Không có"),
    ("Chi phí", "Tính theo học sinh, phù hợp\ntrường vừa và nhỏ", "Đắt, gói lớn bắt buộc", "Miễn phí nhưng tốn công"),
    ("Điểm yếu của chúng tôi", "Không thay thế MIS toàn trường\n(chưa có học phí, nhân sự)", "", ""),
], Inches(0.6), Inches(2.0), Inches(12.1), Inches(4.6),
    col_widths=[Inches(2.2), Inches(3.7), Inches(3.1), Inches(3.1)],
    font_size=11)

# ---------- S7-9 User guide + demo accounts ----------
s = slide()
kicker(s, "HƯỚNG DẪN SỬ DỤNG")
title(s, "English Arena - ea.vieschool.com")
tb(s, Inches(0.6), Inches(1.85), Inches(12), Inches(1.3),
   "- Mở ea.vieschool.com từ trình duyệt bất kỳ - không cần cài đặt.\n"
   "- Chưa có tài khoản: nhấn 'Chơi không cần tài khoản' - 1 vòng miễn phí mỗi lớp.\n"
   "- Học sinh: đăng nhập username + PIN do giáo viên cấp, tự đổi PIN khi cần.\n"
   "- Vào lớp: nhập mã lớp 6 ký tự cô gửi (VD lớp demo: R8WHYF) - không cần admin gán tay.\n"
   "- Quản trị: tạo tài khoản học sinh, tạo lớp sinh mã tự động, gán phạm vi lớp, xem tiến độ.",
   13, WHITE)
table(s, [
    ("Vai trò", "Username", "PIN", "Phạm vi"),
    ("Quản trị viên", "demo_admin", "demo2026", "Console quản trị: tạo tài khoản, gán lớp, báo cáo"),
    ("Học sinh", "demo_hs", "demo2026", "Đủ 5 khối lớp 1-5, đủ 4 vòng, lưu tiến độ"),
    ("Khách", "-", "-", "1 vòng miễn phí mỗi lớp"),
], Inches(0.6), Inches(3.4), Inches(12.1), Inches(2.6),
    col_widths=[Inches(2.6), Inches(2.2), Inches(1.8), Inches(5.5)],
    font_size=12)

s = slide()
kicker(s, "HƯỚNG DẪN SỬ DỤNG")
title(s, "Công cụ số Giáo viên - congcuso.vieschool.com")
tb(s, Inches(0.6), Inches(1.85), Inches(12), Inches(1.3),
   "- Đăng nhập bằng email + mật khẩu; đổi mật khẩu ngay trong tài khoản.\n"
   "- Giáo viên: chọn công cụ (ngân hàng câu hỏi, ma trận, đề thi...) - nhập yêu cầu - tạo nội dung.\n"
   "- Kiểm định: duyệt nội dung trước khi công khai trong thư viện chung.",
   13, WHITE)
table(s, [
    ("Vai trò", "Email", "Mật khẩu"),
    ("Quản trị viên", "admin@demo.tvc", "demo1234"),
    ("Giáo viên", "gv@demo.tvc", "demo1234"),
    ("Kiểm định viên", "kd@demo.tvc", "demo1234"),
], Inches(0.6), Inches(3.4), Inches(12.1), Inches(2.4),
    col_widths=[Inches(3.0), Inches(4.5), Inches(4.6)],
    font_size=12)

s = slide()
kicker(s, "HƯỚNG DẪN SỬ DỤNG")
title(s, "Sổ Chủ Nhiệm Số - sochunhiem.vieschool.com",
      "Đăng nhập email + mật khẩu - hệ thống tự vào đúng màn hình theo vai trò")
rows = [
    ("Vai trò", "Email", "Vai trò", "Email"),
    ("Ban giám hiệu", "bgh@demo.scn", "Tổ trưởng CM", "totruong@demo.scn"),
    ("Phó hiệu trưởng", "pht@demo.scn", "Kế toán", "ketoan@demo.scn"),
    ("GV chủ nhiệm", "gvcn@demo.scn", "Học sinh", "hocsinh@demo.scn"),
    ("GV bộ môn", "gvbm@demo.scn", "Phụ huynh", "phuhuynh@demo.scn"),
    ("Sở GD&ĐT", "sogd@demo.scn", "UBND", "ubnd@demo.scn"),
]
table(s, rows, Inches(0.6), Inches(2.1), Inches(12.1), Inches(3.4),
      col_widths=[Inches(2.4), Inches(3.6), Inches(2.4), Inches(3.7)],
      font_size=12)
tb(s, Inches(0.6), Inches(5.7), Inches(12), Inches(0.5),
   "Mật khẩu chung tất cả tài khoản demo: demo1234  |  "
   "Kịch bản 10 phút: vieschool.com → chơi thử English Arena → login TVC360 → login Sổ CN theo vai trò.",
   12, MUT)

# ---------- S10-12 Pricing ----------
s = slide()
kicker(s, "GIÁ NIÊM YẾT")
title(s, "English Arena")
table(s, [
    ("Gói", "Giá", "Quyền lợi"),
    ("Khách (Guest)", "Miễn phí", "Chơi thử 1 vòng mỗi lớp, không cần tài khoản"),
    ("Gia đình", "249.000đ / 6 tháng\nhoặc 399.000đ / năm", "Đủ 5 khối, đủ 4 vòng, lưu tiến độ và thành tích"),
    ("Nhóm lớp (PH mua)", "199.000đ / học sinh / năm", "Tối thiểu 15 học sinh; vào lớp tự phục vụ bằng mã lớp"),
    ("Nhà trường", "99.000đ / học sinh / năm\n(79.000đ từ 300 HS)", "Console quản lý lớp, báo cáo; 800+ HS báo giá riêng"),
], Inches(0.6), Inches(2.1), Inches(12.1), Inches(3.4),
    col_widths=[Inches(2.4), Inches(3.9), Inches(5.8)], font_size=13)

s = slide()
kicker(s, "GIÁ NIÊM YẾT")
title(s, "Công cụ số Giáo viên")
table(s, [
    ("Gói", "Giá", "Quyền lợi"),
    ("Giáo viên lẻ", "299.000đ / giáo viên / năm", "Đủ 12 công cụ, xuất DOCX/PDF không giới hạn"),
    ("Nhà trường", "199.000đ / giáo viên / năm", "Từ 10 giáo viên; kèm luồng kiểm định nội bộ"),
], Inches(0.6), Inches(2.1), Inches(12.1), Inches(2.4),
    col_widths=[Inches(2.4), Inches(3.9), Inches(5.8)], font_size=13)

s = slide()
kicker(s, "GIÁ NIÊM YẾT")
title(s, "Sổ Chủ Nhiệm Số + gói trọn bộ")
table(s, [
    ("Gói", "Giá", "Quyền lợi"),
    ("Theo học sinh", "15.000 - 25.000đ / học sinh / năm", "Theo quy mô trường; đủ module chủ nhiệm, điểm, hạnh kiểm"),
], Inches(0.6), Inches(2.1), Inches(12.1), Inches(1.6),
    col_widths=[Inches(2.4), Inches(3.9), Inches(5.8)], font_size=13)
tb(s, Inches(0.6), Inches(4.2), Inches(12.1), Inches(1.6),
   "Gói trọn bộ: trường dùng đồng thời cả 3 sản phẩm được giá bundle ưu đãi - "
   "báo giá cụ thể theo số lượng học sinh và giáo viên.\n"
   "Mọi gói gồm: hỗ trợ triển khai ban đầu, hướng dẫn sử dụng, bảo hành tính năng trong thời hạn gói.",
   14, MUT)

# ---------- S13 Why VieSchool ----------
s = slide()
kicker(s, "VÌ SAO CHỌN VIESCHOOL")
title(s, "Đúng chương trình Việt - trải nghiệm chuẩn quốc tế")
why = [
    ("Đúng chương trình VN",
     "Bám SGK Tiếng Anh Global Success theo CTGDPT 2018.\nLuyện trên app là học đúng điều đang học trên lớp."),
    ("Trọn trong một hệ sinh thái",
     "Một nền tảng thay ba ứng dụng rời rạc - cùng nhận diện,\ncùng đội hỗ trợ, cùng một hợp đồng."),
    ("Trọng tâm là trẻ em",
     "Không quảng cáo, không chat công khai. Nút chạm lớn,\ngiọng đọc chậm rõ, giải thích tiếng Việt khi trả lời sai."),
    ("Theo kịp quy định",
     "Sổ chủ nhiệm và công cụ giáo viên cập nhật theo\nĐiều lệ trường và thông tư mới nhất."),
]
for i, (h, b) in enumerate(why):
    card(s, Inches(0.6 + (i % 2) * 6.2), Inches(1.9 + (i // 2) * 2.55),
         Inches(6.0), Inches(2.35), h, b)

# ---------- S14 Contact ----------
s = slide()
tb(s, Inches(0.6), Inches(2.4), Inches(12), Inches(0.9),
   "Trải nghiệm ngay hôm nay", 44, WHITE, True)
tb(s, Inches(0.6), Inches(3.5), Inches(12), Inches(2.4),
   "vieschool.com\n\n"
   "Đội ngũ VieSchool hỗ trợ demo trực tiếp tại trường hoặc online.\n"
   "Tài khoản demo ở mục Hướng dẫn sử dụng - đăng nhập như người dùng thật.",
   18, MUT)

out = "/Users/kazu.nx/devin_app/student-self-practice-web/docs/proposal-vieschool-khach-hang.pptx"
prs.save(out)
print("saved", out, "| slides:", len(prs.slides._sldIdLst))
