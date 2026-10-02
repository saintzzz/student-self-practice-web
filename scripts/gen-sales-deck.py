#!/usr/bin/env python3
"""Regenerate proposal-vieschool-sales.pptx (CR-14 refresh)."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from PIL import Image
import os

NAVY = RGBColor(0x0B, 0x12, 0x24)
NAVY2 = RGBColor(0x12, 0x1B, 0x33)
GOLD = RGBColor(0xF2, 0xC9, 0x57)
WHITE = RGBColor(0xF4, 0xF6, 0xFB)
MUT = RGBColor(0x9B, 0xA6, 0xC4)
GREEN = RGBColor(0x4A, 0xDE, 0x80)
RED = RGBColor(0xF8, 0x71, 0x71)

W, H = Inches(13.333), Inches(7.5)
prs = Presentation()
prs.slide_width, prs.slide_height = W, H
blank = prs.slide_layouts[6]
overflows = []

def slide():
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(1, 0, 0, W, H)
    bg.fill.solid(); bg.fill.fore_color.rgb = NAVY; bg.line.fill.background()
    bg.shadow.inherit = False
    return s

def tb(s, x, y, w, h, text, size=18, color=WHITE, bold=False, align=PP_ALIGN.LEFT, font='Avenir Next'):
    box = s.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame; tf.word_wrap = True
    for i, line in enumerate(text.split('\n')):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line; p.alignment = align
        for r in p.runs:
            r.font.size = Pt(size); r.font.bold = bold
            r.font.color.rgb = color; r.font.name = font
    return box

def kicker(s, t):
    tb(s, Inches(0.6), Inches(0.35), Inches(8), Inches(0.4), t, 13, GOLD, True)

def title(s, t, sub=None):
    tb(s, Inches(0.6), Inches(0.7), Inches(12), Inches(0.9), t, 34, WHITE, True)
    if sub:
        tb(s, Inches(0.6), Inches(1.45), Inches(12), Inches(0.5), sub, 15, MUT)

def card(s, x, y, w, h, head, body, head_color=GOLD, head_size=16, body_size=12):
    sh = s.shapes.add_shape(5, x, y, w, h)  # rounded rect
    sh.fill.solid(); sh.fill.fore_color.rgb = NAVY2
    sh.line.color.rgb = RGBColor(0x2A, 0x3A, 0x5E); sh.line.width = Pt(1)
    sh.shadow.inherit = False
    tb(s, x + Inches(0.25), y + Inches(0.15), w - Inches(0.5), Inches(0.5), head, head_size, head_color, True)
    tb(s, x + Inches(0.25), y + Inches(0.6), w - Inches(0.5), h - Inches(0.8), body, body_size, WHITE)

def pic_fit(s, path, x, y, w, h):
    """Fit image inside box preserving aspect."""
    iw, ih = Image.open(path).size
    ar = iw / ih; bar = w / h
    if ar >= bar:
        nw, nh = w, int(w / ar)
    else:
        nh, nw = h, int(h * ar)
    nx = x + int((w - nw) / 2); ny = y + int((h - nh) / 2)
    s.shapes.add_picture(path, nx, ny, nw, nh)
    if ny + nh > y + h + Emu(1000):
        overflows.append((len(prs.slides.__iter__.__self__._sldIdLst), 'img-overflow'))

D = '/Users/kazu.nx/devin_app'

# ---------- S1 Title ----------
s = slide()
tb(s, Inches(0.6), Inches(1.4), Inches(12), Inches(0.5), 'HỆ SINH THÁI GIÁO DỤC SỐ', 16, GOLD, True)
tb(s, Inches(0.6), Inches(1.9), Inches(12), Inches(1.4), 'VieSchool', 66, WHITE, True)
tb(s, Inches(0.6), Inches(3.2), Inches(12), Inches(0.9),
   '1 nền tảng - 3 sản phẩm - hỗ trợ lớp 1 đến lớp 12', 22, MUT)
tb(s, Inches(0.6), Inches(4.0), Inches(12), Inches(0.9),
   'vieschool.com  |  ea.vieschool.com  |  congcuso.vieschool.com  |  sochunhiem.vieschool.com', 14, MUT)
pic_fit(s, f'{D}/deck-login.png', Inches(3.7), Inches(4.6), Inches(6), Inches(2.6))

# ---------- S2 Problem ----------
s = slide(); kicker(s, 'VẤN ĐỀ THỊ TRƯỜNG'); title(s, 'Trường học Việt Nam đang thiếu gì?')
probs = [
    ('Học sinh', 'Luyện tiếng Anh nhàm chán - app quốc tế không theo SGK,\napp nội địa thì xấu và khô.'),
    ('Giáo viên', 'Mất hàng giờ soạn bài, ra đề, vẽ ma trận.\nCông cụ rời rạc, không đồng bộ.'),
    ('Ban giám hiệu', 'Sổ chủ nhiệm giấy khó tổng hợp, chậm báo cáo.\nDữ liệu lớp học phân tán.'),
    ('Phụ huynh', 'Không biết con học gì, đến đâu.\nNgại app phức tạp cần cài đặt.'),
]
for i, (h, b) in enumerate(probs):
    card(s, Inches(0.6 + (i % 2) * 6.2), Inches(1.9 + (i // 2) * 2.5), Inches(6.0), Inches(2.3), h, b)

# ---------- S3 Suite ----------
s = slide(); kicker(s, 'SẢN PHẨM'); title(s, '3 sản phẩm - 1 nền tảng VieSchool')
card(s, Inches(0.6), Inches(1.9), Inches(4.0), Inches(4.6), 'English Arena',
     'ea.vieschool.com\n\nLuyện tiếng Anh cho học sinh.\n5 vùng đất phiêu lưu + mascot Bé Heo,\n4 vòng chơi, phát âm chấm điểm.\nLuyện đề + Thi thử 200 câu/30 phút,\nđề bám format IOE theo khối.\n\nHiện: Lớp 1-5 (cấp 1)\nLộ trình: mở rộng lớp 6-12')
card(s, Inches(4.75), Inches(1.9), Inches(4.0), Inches(4.6), 'Công cụ số GV (TVC360)',
     'congcuso.vieschool.com\n\n12 công cụ soạn học liệu cho giáo viên:\nngân hàng câu hỏi, ma trận, đề thi,\nxuất DOCX/PDF, AI hỗ trợ.\n\nBám CTGDPT 2018 (gồm sửa đổi\nTT 17/2025 - LS, ĐL, GDCD)\nDùng cho mọi cấp 1-3')
card(s, Inches(8.9), Inches(1.9), Inches(4.0), Inches(4.6), 'Sổ Chủ Nhiệm Số',
     'sochunhiem.vieschool.com\n\nSố hóa công tác chủ nhiệm:\nđiểm danh, hạnh kiểm, sổ điểm,\nthông báo phụ huynh, báo cáo BGH.\n\nTheo Điều lệ trường mới nhất\n(Thông tư 15/2026/TT-BGDĐT)')

# ---------- S4 English Arena spotlight ----------
s = slide(); kicker(s, 'SẢN PHẨM CHỦ LỰC'); title(s, 'English Arena - học mà chơi, chơi mà học')
feats = [
    ('1100+ từ vựng bám SGK', 'Phủ trọn Global Success lớp 1-5, mỗi từ có emoji,\ngiải thích tiếng Việt, ví dụ gần gũi.'),
    ('4 vòng chơi', 'Nghe - chọn đáp án - ghép cặp - phát âm.\nĐa dạng kỹ năng, không đơn điệu.'),
    ('Gamification thật', 'Sao thưởng, huy hiệu, chuỗi ngày học, sticker.\nBé tự giác luyện tập.'),
    ('Không cần cài đặt', 'Web app - mở link là chơi. Chơi thử ngay\nkhông cần tài khoản (1 vòng/lớp).'),
]
for i, (h, b) in enumerate(feats):
    card(s, Inches(0.6 + (i % 2) * 6.2), Inches(1.9 + (i // 2) * 2.5), Inches(6.0), Inches(2.3), h, b)

# ---------- S5 Differentiator ----------
s = slide(); kicker(s, 'ĐIỂM MẠNH NHẤT'); title(s, 'Đúng chương trình Việt - đẹp chuẩn quốc tế')
tb(s, Inches(0.6), Inches(1.9), Inches(12), Inches(1.0),
   'Nội dung bám SGK Tiếng Anh Global Success theo CTGDPT 2018 -\n   luyện trên app là học đúng điều đang học trên lớp.', 18, WHITE)
card(s, Inches(0.6), Inches(3.1), Inches(4.0), Inches(2.6), 'Bám SGK Việt',
     'App quốc tế (Duolingo, Khan) không\ntheo chương trình VN. App nội địa\ntheo SGK nhưng thiếu trải nghiệm.\nVieSchool làm được cả hai.')
card(s, Inches(4.75), Inches(3.1), Inches(4.0), Inches(2.6), 'Premium thật',
     'UI/UX nghiên cứu cho trẻ 6-11 tuổi:\nthế giới phiêu lưu, mascot, phần\nthưởng - không phải form trắc nghiệm\nxưa cũ.')
card(s, Inches(8.9), Inches(3.1), Inches(4.0), Inches(2.6), 'Mô hình trường học',
     'Không self-signup lộn xộn. Trường mua,\nadmin cấp tài khoản, giáo viên quản\nlý lớp. Khách lẻ mua qua admin -\nquy trình kiểm soát hoàn toàn.')

# ---------- S6 Competition ----------
s = slide(); kicker(s, 'SO SÁNH ĐỐI THỦ'); title(s, 'VieSchool English Arena vs các lựa chọn hiện có')
rows = [
    ('Tiêu chí', 'English Arena', 'Monkey/VMonkey', 'Duolingo ABC', 'iOE truyền thống'),
    ('Bám SGK VN', 'ĐÚNG - GS + CTGDPT', 'Có (riêng)', 'Không', 'Có (khung iOE)'),
    ('Trải nghiệm trẻ em', 'Thế giới phiêu lưu', 'Video + game', 'Tốt', 'Form trắc nghiệm'),
    ('Phát âm chấm điểm', 'Có (mic)', 'Hạn chế', 'Không', 'Không'),
    ('Không cần cài đặt', 'Có (web)', 'Cần app', 'Cần app', 'Web xưa'),
    ('Nền tảng trường học', 'Có - lớp/GV/BGH', 'Không', 'Không', 'Có (thi cử)'),
    ('Mở rộng cấp 2-3', 'Lộ trình 6-12', 'Có', 'Có', 'Có'),
]
tbl = s.shapes.add_table(7, 5, Inches(0.6), Inches(1.9), Inches(12.1), Inches(4.9)).table
tbl.columns[0].width = Inches(2.9)
for ci in range(1, 5): tbl.columns[ci].width = Inches(2.3)
for ri, row in enumerate(rows):
    for ci, val in enumerate(row):
        cell = tbl.cell(ri, ci)
        cell.text = val
        for p in cell.text_frame.paragraphs:
            for r in p.runs:
                r.font.size = Pt(12 if ri else 13); r.font.name = 'Avenir Next'
                r.font.bold = (ri == 0) or (ci == 0)
                r.font.color.rgb = WHITE if ri else NAVY
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY2 if ri else GOLD

# ---------- S7 Pricing ----------
s = slide(); kicker(s, 'MÔ HÌNH KINH DOANH'); title(s, 'Giá bán đề xuất')
card(s, Inches(0.6), Inches(1.9), Inches(4.0), Inches(4.2), 'Guest - miễn phí',
     'Chơi thử 1 vòng mỗi lớp.\nKhông cần tài khoản.\n\nMục tiêu: trải nghiệm thật →\nchuyển đổi trả phí.')
card(s, Inches(4.75), Inches(1.9), Inches(4.0), Inches(4.2), 'Phụ huynh - lẻ',
     '199-299k/năm/học sinh.\nAdmin cấp acc sau khi mua.\nĐủ 5 khối, đủ 4 vòng, lưu\ntiến độ thật.')
card(s, Inches(8.9), Inches(1.9), Inches(4.0), Inches(4.2), 'Trường học - B2B',
     '30-50k/học sinh/năm.\nGV quản lý lớp, xem báo cáo.\nBundle: + TVC360 + Sổ CN\ncho hợp đồng trường.')

# ---------- S8-11 User guide ----------
guides = [
    ('Bước 1: Đăng nhập hoặc chơi thử', 'deck-login.png',
     'Mở ea.vieschool.com → đăng nhập bằng tài khoản được cấp,\nhoặc "Chơi không cần tài khoản" để thử 1 vòng.'),
    ('Bước 2: Chọn lớp trên bản đồ', 'deck-map.png',
     '5 vùng đất = 5 khối lớp. Bé chọn đúng lớp mình đang học.\nSao và huy hiệu hiển thị ngay trên bản đồ.'),
    ('Bước 3: Làm bài - 4 vòng', 'deck-question.png',
     'Mỗi câu có emoji minh họa + giải thích tiếng Việt.\nTile chữ cái luôn 1 hàng - bé đọc được cả từ.'),
    ('Giáo viên: TVC360', 'deck-tvc-login.png',
     'congcuso.vieschool.com - demo: gv@demo.tvc / demo1234.\nSoạn đề, ngân hàng câu hỏi, xuất DOCX/PDF.'),
    ('Nhà trường: Sổ Chủ Nhiệm Số', 'deck-scn-login.png',
     'sochunhiem.vieschool.com - demo theo role: gvcn@demo.scn,\nbgh@demo.scn, phuhuynh@demo.scn / demo1234.'),
]
for t, img, cap in guides:
    s = slide(); kicker(s, 'HƯỚNG DẪN SỬ DỤNG'); title(s, t)
    pic_fit(s, f'{D}/{img}', Inches(0.6), Inches(1.9), Inches(7.4), Inches(5.1))
    tb(s, Inches(8.3), Inches(2.4), Inches(4.5), Inches(3.5), cap, 15, WHITE)

# ---------- S12 Roadmap ----------
s = slide(); kicker(s, 'KIẾN TRÚC & LỘ TRÌNH'); title(s, '1 nền tảng - đang hoàn thiện "1 tài khoản"')
card(s, Inches(0.6), Inches(1.9), Inches(6.0), Inches(4.6), 'Kiến trúc hiện tại',
     'vieschool.com - landing (Cloudflare Worker)\nea. - English Arena (Vite/React/Supabase)\ncongcuso. - TVC360 (Next.js 16)\nsochunhiem. - Sổ CN (Next.js 16)\n\nChung Supabase project - dữ liệu tách\nschema per app, RLS riêng từng bảng.')
card(s, Inches(6.9), Inches(1.9), Inches(6.0), Inches(4.6), 'Lộ trình',
     '30 ngày: pilot 1-2 lớp, hoàn thiện demo\n60 ngày: SSO chung (1 tài khoản xuyên\n          3 app), dashboard phụ huynh\n90 ngày: mở rộng English lớp 6-12,\n          mua vieschool.vn, gói trường trọn bộ')

prs.save('/Users/kazu.nx/devin_app/student-self-practice-web/docs/proposal-vieschool-sales.pptx')
print('saved, slides:', len(prs.slides._sldIdLst), 'overflows:', overflows)
