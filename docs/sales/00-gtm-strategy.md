# 00 - GTM Strategy: English Arena (ea.vieschool.com)

> Phiên bản: v1 - 03/10/2026 - Tác giả: Sales Agent - Trạng thái: DRAFT chờ PO duyệt
> Phạm vi: English Arena (luyện tiếng Anh + Toán tiếng Anh, Lớp 1-5) trong hệ sinh thái VieSchool.

## 1. Tóm tắt điều hành (Executive summary)

- **Định vị một câu:** English Arena là "phòng luyện thi IOE và Violympic Toán tiếng Anh tại nhà" cho học sinh tiểu học, có báo cáo kỹ năng cho phụ huynh và đăng nhập an toàn không cần email.
- **Beachhead đề xuất (90 ngày đầu):** (1) Trung tâm Anh ngữ nhỏ và vừa, (2) phụ huynh có con chuẩn bị thi IOE, tiếp cận qua giáo viên tiếng Anh. Trường tư thục là kênh thứ ba, chu kỳ dài hơn, chạy song song bằng pilot.
- **Thời điểm:** Năm học 2026-2027 đã bắt đầu, vòng tự luyện IOE thường mở từ giữa tháng 8 và các vòng thi chính thức diễn ra theo cấp trường, cấp xã/huyện, cấp tỉnh, quốc gia trong năm học (lịch cụ thể theo thông báo của BTC tại ioe.vn). Đây là cửa sổ bán hàng tự nhiên: phụ huynh và giáo viên đang tìm công cụ luyện đề.
- **Mô hình:** Free pilot 4-6 tuần cho lớp/trung tâm -> chuyển đổi trả phí theo học sinh/năm học. B2C là gói năm học cho phụ huynh.
- **Điều kiện tiên quyết trước khi thu tiền:** có cơ chế kích hoạt gói trả phí (entitlement) và quy trình thanh toán, hiện chưa có trong app (xem PO notes).

## 2. Bối cảnh thị trường (số liệu có nguồn)

| Chỉ số | Giá trị | Nguồn |
|---|---|---|
| Học sinh tiểu học năm học 2024-2025 | 8.882.864 HS, 292.054 lớp | giaoduc.net.vn, "Quy mô giáo viên, học sinh, trường lớp của giáo dục phổ thông" |
| HS tiểu học ngoài công lập (đầu năm học 2024-2025) | khoảng 155.094 HS (khoảng 1,7%) | Bộ GD&ĐT, tổng hợp tại vietnam.vn "Toàn cảnh giáo dục Việt Nam năm học 2024-2025" |
| Số trường tiểu học (2023-2024) | 12.166 trường | vietnamplus.vn |
| IOE năm học 2024-2025 | hơn 2,6 triệu HS tham gia; gần 1,86 triệu lượt thi chính thức từ 13.100 trường | giaoducthoidai.vn, giaoduc.net.vn (31/05/2025) |
| IOE tích lũy | hơn 35 triệu tài khoản, hơn 26.000 trường | vnexpress.net "15 năm đồng hành..." |

**Diễn giải thận trọng:**
- Khối tư thục tiểu học rất nhỏ (khoảng 1,7% HS). Phân khúc "trường tư thục/quốc tế nhỏ" có giá trị hợp đồng cao nhưng số lượng ít, không đủ làm động cơ tăng trưởng duy nhất.
- Nhu cầu luyện IOE là có thật và lớn (hàng triệu HS/năm). Đây là "hook" mạnh nhất của ta, nhưng IOE chính thức cũng bán gói luyện riêng (xem 02-competitor-comparison.md), nên ta phải bán giá trị bổ sung, không bán "thay thế IOE".
- Chưa có số liệu đáng tin về quy mô thị trường edtech tiểu học VN tính bằng tiền; tài liệu này không đưa con số TAM bằng VND để tránh bịa số.

## 3. ICP và phân khúc

### 3.1 Bảng phân khúc

| Phân khúc | Người mua (Buyer) | Người dùng | Nỗi đau chính | Ngân sách | Chu kỳ bán | Ưu tiên |
|---|---|---|---|---|---|---|
| A. Trung tâm Anh ngữ nhỏ/vừa (3-30 lớp tiểu học) | Chủ trung tâm, quản lý học thuật | HS + GV trung tâm | Thiếu công cụ giao bài về nhà, phụ huynh hỏi "con tiến bộ thế nào", cạnh tranh bằng thành tích IOE | Có, tính trên đầu HS, quyết định nhanh | 2-4 tuần | **P1** |
| B. Phụ huynh B2C (con Lớp 1-5, có ý định thi IOE/Violympic) | Phụ huynh (thường là mẹ) | Con | Con không chịu luyện đề, không biết con yếu kỹ năng nào, ngại cho con dùng app cần email/mạng xã hội | 200-800k/năm cho app học là quen thuộc (tham chiếu Monkey, Alokiddy, VioEdu) | Vài ngày | **P1** (qua kênh giáo viên giới thiệu) |
| C. Trường tiểu học tư thục/quốc tế nhỏ | Hiệu trưởng, phó HT chuyên môn, tổ trưởng tiếng Anh | HS toàn khối | Muốn nâng thành tích IOE của trường, cần báo cáo cho phụ huynh, muốn hệ sinh thái số (kết hợp TVC360, Sổ Chủ nhiệm Số) | Có, theo năm học, cần duyệt | 1-3 tháng | **P2** |
| D. Giáo viên (chủ nhiệm hoặc tiếng Anh) muốn dùng cho lớp | Giáo viên | HS trong lớp | Cần công cụ luyện thêm cho lớp, chọn đội tuyển IOE | Thấp, nhạy cảm về việc thu tiền phụ huynh | Nhanh nhưng giá trị nhỏ | **P2 - dùng làm kênh phân phối, không phải nguồn thu chính** |

### 3.2 ICP chi tiết cho P1

**ICP-A (Trung tâm):** trung tâm có 50-500 HS tiểu học, dạy theo Global Success hoặc Cambridge (Starters/Movers/Flyers), có lớp/nhóm ôn IOE, hoạt động ở thành phố cấp tỉnh trở lên, chủ trung tâm dùng Zalo làm kênh chính với phụ huynh.

**ICP-B (Phụ huynh):** có con Lớp 2-5 (nơi nội dung của ta dày nhất, xem gaps), con đã hoặc sắp tham gia IOE/Violympic, phụ huynh có điện thoại/máy tính bảng/laptop cho con dùng 15-20 phút/ngày, quan tâm an toàn tài khoản cho trẻ.

### 3.3 Objection về phân khúc D (giáo viên mua cho lớp)

> **Objection:** Brief đề xuất "giáo viên chủ nhiệm mua cho lớp" như một phân khúc trả phí. Với trường công lập, giáo viên thu tiền phụ huynh để mua app cho lớp là rủi ro cao về quy định và uy tín. Thông tư 29/2024/TT-BGDĐT (hiệu lực 14/02/2025) quy định không tổ chức dạy thêm đối với học sinh tiểu học (trừ nghệ thuật, thể thao, kỹ năng sống) và giáo viên không được dạy thêm có thu tiền với học sinh mình đang dạy (nguồn: xaydungchinhsach.chinhphu.vn, toàn văn TT 29/2024). Một app luyện tập không phải "dạy thêm", nhưng nếu giáo viên đứng ra thu tiền thì dễ bị phụ huynh/báo chí hiểu là thu tiền trái quy định.

**Options Matrix - Cách vận hành phân khúc giáo viên**

| Phương án | Mô tả | Doanh thu | Rủi ro pháp lý/uy tín | Độ phức tạp vận hành |
|---|---|---|---|---|
| D1. GV thu tiền phụ huynh, mua theo lớp | Như brief | Cao/lớp | **Cao** với trường công | Thấp |
| D2. GV dùng miễn phí, phụ huynh tự mua trực tiếp từ VieSchool với giá nhóm khi lớp đủ số lượng | GV là kênh giới thiệu, không chạm tiền | Trung bình | Thấp | Trung bình (cần link/mã lớp, đối soát) |
| D3. GV tự bỏ tiền cá nhân (trường tư, trung tâm) | GV ở trường tư/trung tâm mua gói lớp | Thấp-trung bình | Thấp | Thấp |

**Ruling (đề xuất, chờ PO chốt):** Dùng D2 cho trường công lập và D3 cho giáo viên trường tư/trung tâm. Không thiết kế tài liệu bán hàng khuyến khích giáo viên trường công thu tiền phụ huynh.

## 4. Định vị và thông điệp theo persona

| Persona | Thông điệp chính | Proof point có thật |
|---|---|---|
| Chủ trung tâm | "Thêm một lớp luyện IOE về nhà cho học sinh, có báo cáo để gửi phụ huynh, không tốn thêm giáo viên." | Thi thử IOE đúng format, báo cáo kỹ năng 4 nhóm, admin quản lý lớp/học sinh |
| Hiệu trưởng trường tư | "Một nền tảng VieSchool: luyện tập cho học sinh, công cụ số cho giáo viên, sổ chủ nhiệm số cho nhà trường." | 3 sản phẩm trong hệ sinh thái VieSchool đều có demo |
| Giáo viên tiếng Anh | "Học sinh tự luyện đề IOE và ôn đúng câu mình sai, thầy cô xem được ai đang luyện." | Ôn lại câu sai (Leitner), admin xem học sinh |
| Phụ huynh | "Mỗi ngày 15 phút, con tự luyện như chơi game, mẹ biết con yếu nghe hay yếu ngữ pháp." | Gamification (sao, streak, pet, huy hiệu, daily quests), báo cáo phụ huynh, username + PIN không cần email |

**Những điều KHÔNG được nói khi bán:** "thay thế IOE/Violympic", "đủ nội dung mọi lớp như nhau" (G1/G3 còn mỏng), "có Khoa học tiếng Anh", "giáo viên giao bài được", "có app trên App Store/CH Play", "đảm bảo đạt giải".

## 5. Sales motion theo kênh

| Kênh | Motion | Người thực hiện | Công cụ | Chỉ tiêu chính |
|---|---|---|---|---|
| Trung tâm Anh ngữ (P1) | Outbound qua Zalo/điện thoại -> demo 10 phút (online hoặc tại chỗ) -> pilot free 4 tuần cho 1-2 lớp -> báo giá theo HS | Founder/sales | Script 03-sales-playbook.md, demo_hs, one-pager | Số pilot khởi động, tỷ lệ pilot -> trả phí |
| Phụ huynh qua giáo viên (P1) | Giáo viên chia sẻ link guest trial trong nhóm Zalo lớp -> phụ huynh dùng thử -> tạo tài khoản -> mua gói năm học | Giáo viên (đại sứ) + CSKH VieSchool qua Zalo OA | Link guest, mã lớp, hướng dẫn 1 trang | Số tài khoản tạo, tỷ lệ chuyển đổi trả phí |
| Cộng đồng Facebook/Zalo giáo viên tiểu học, hội phụ huynh (P1) | Content-led: chia sẻ mẹo luyện IOE, mini-challenge, livestream demo; không spam link bán hàng | Marketing/founder | Bài viết, video ngắn quay màn hình | Lượt truy cập guest, đăng ký demo |
| Trường tư thục (P2) | Gặp BGH -> demo hệ sinh thái VieSchool -> pilot 1 khối 6 tuần -> đề xuất site license | Founder | proposal-vieschool-khach-hang.docx/.pptx, demo đủ 3 sản phẩm | Số cuộc gặp BGH, số pilot trường |
| Đối tác phân phối (P3) | Trung tâm/nhà sách/đại lý giáo dục bán lại, hoa hồng | Founder | Bảng giá đại lý (chưa có) | Ký 1-2 đối tác thử |

## 6. Funnel và giả định chuyển đổi

> Các tỷ lệ dưới đây là **giả định làm việc**, không phải số liệu thị trường. Sẽ hiệu chỉnh sau pilot.

**Funnel B2B (trung tâm/trường):**

| Giai đoạn | Định nghĩa | Giả định tỷ lệ sang bước sau |
|---|---|---|
| Lead | Có tên, SĐT/Zalo người quyết định | 30% |
| Đã liên hệ được, đồng ý demo | Đặt lịch demo | 60% |
| Demo xong | Đã xem flow 10 phút | 50% |
| Pilot khởi động | Có lớp thật, HS đã đăng nhập | 40% |
| Trả phí | Có hợp đồng/chuyển khoản | - |

Từ 100 lead -> khoảng 30 liên hệ -> 18 demo -> 9 pilot -> 3-4 khách trả phí. Đây là mức tham chiếu thận trọng cho 90 ngày.

**Funnel B2C (phụ huynh):**

| Giai đoạn | Định nghĩa | Giả định |
|---|---|---|
| Truy cập | Mở ea.vieschool.com | - |
| Guest trial | Hoàn thành ít nhất 1 vòng | 40% của truy cập |
| Tạo tài khoản | Có username + PIN | 25% của guest |
| Hoạt động tuần 2 | Có ít nhất 3 ngày luyện trong tuần 2 | 50% của tài khoản |
| Trả phí | Mua gói năm học | 10-15% của tài khoản hoạt động |

## 7. Pilot strategy (free pilot -> paid)

**Mục tiêu:** tạo 2-3 case study có số liệu thật trước khi mở bán rộng.

| Hạng mục | Quy định |
|---|---|
| Đối tượng | 2-3 lớp, ưu tiên Lớp 2, 4, 5 (nội dung dày nhất). Ít nhất 1 lớp ở trung tâm, 1 lớp ở trường |
| Thời lượng | 4 tuần (trung tâm), 6 tuần (trường) |
| Chi phí cho khách | 0đ. Đổi lại: khách đồng ý chia sẻ số liệu ẩn danh, 1 buổi phỏng vấn feedback, cho phép dùng tên trong case study nếu kết quả tốt |
| Thiết lập | VieSchool tạo sẵn tài khoản username + PIN cho từng HS qua admin, in phiếu đăng nhập phát cho HS/phụ huynh |
| Cam kết sử dụng | Đề xuất 15 phút/ngày, ít nhất 4 ngày/tuần |
| Đo đầu vào/đầu ra | Placement test tuần 1, Thi thử IOE tuần 1 và tuần cuối |
| Tiêu chí thành công (để bán) | >= 60% HS hoạt động hàng tuần; điểm Thi thử trung bình tăng có ý nghĩa giữa tuần 1 và tuần cuối; >= 70% GV/phụ huynh được hỏi muốn tiếp tục |
| Offer chuyển đổi | Ký trước khi pilot kết thúc: giá "founding partner" (xem 01-pricing.md), giữ nguyên tài khoản và lịch sử luyện tập |

**Lưu ý trung thực:** "Điểm tăng" trong 4-6 tuần có thể do làm quen format đề, không chứng minh năng lực tiếng Anh tăng. Case study nên ghi rõ "điểm thi thử trên English Arena", không quy đổi thành "kết quả IOE".

## 8. KPI 3 tháng đầu (Q4/2026)

| Nhóm | KPI | Mục tiêu 90 ngày | Cách đo |
|---|---|---|---|
| Pipeline | Lead B2B đủ thông tin | 100 | Sheet CRM |
| Pipeline | Demo hoàn thành | 18 | CRM |
| Pilot | Lớp pilot khởi động | 3 (tối thiểu 2) | Admin console |
| Pilot | Tỷ lệ HS hoạt động hàng tuần trong pilot | >= 60% | Dữ liệu engagement Supabase |
| Doanh thu | Khách B2B trả phí | 3 | Hợp đồng/chuyển khoản |
| Doanh thu | Phụ huynh B2C trả phí | 100 | Đối soát chuyển khoản |
| Sản phẩm | Retention tuần 4 (tài khoản mới) | >= 30% | Supabase |
| Proof | Case study có số liệu | 2 | Tài liệu xuất bản |
| Proof | Feedback có cấu trúc (GV + PH) | 30 phiếu | Google Form |

## PO notes

**Rủi ro**
1. **Pháp lý nội dung (cao):** ngân hàng câu hỏi "harvest" từ đề IOE và Violympic. Đề và nền tảng thuộc đơn vị vận hành (IOE: Bộ GD&ĐT hợp tác VTC; Violympic/VioEdu: FPT). Dùng cụm từ "đề IOE thật" trong marketing có thể kéo theo khiếu nại bản quyền/thương hiệu. Cần founder hỏi ý kiến pháp lý trước khi in tài liệu công khai. Phương án an toàn: "bám sát định dạng và dạng câu hỏi của IOE/Violympic".
2. **Chưa có cơ chế thu tiền trong app:** hiện chỉ có khóa vòng 2+ với guest; tài khoản đăng nhập không có phân biệt gói trả phí/miễn phí. Bán B2C trước khi có entitlement + thanh toán thì phải kích hoạt thủ công qua admin, khó mở rộng.
3. **Không có role giáo viên:** RBAC chỉ có student/admin. Cho giáo viên xem lớp nghĩa là cấp quyền admin có scope; cần xác minh scope đủ hẹp trước khi giao cho người ngoài VieSchool.
4. **Nội dung lệch khối:** G1/G3 mỏng. Pilot và quảng cáo nên tập trung G2, G4, G5.
5. **Mùa vụ:** nhu cầu IOE tập trung trong năm học; hè có thể giảm mạnh.

**Giả định**
- Tỷ lệ funnel ở mục 6 là giả định, chưa có dữ liệu.
- Founder có thể trực tiếp làm sales B2B trong 90 ngày đầu (chưa có đội sales).

**Câu hỏi cần founder quyết**
1. Chốt beachhead: trung tâm Anh ngữ + phụ huynh qua giáo viên (đề xuất) hay trường tư thục trước?
2. Chốt phương án D2/D3 cho phân khúc giáo viên (không để GV trường công thu tiền)?
3. Chấp nhận đổi thông điệp "đề IOE thật" thành "bám sát định dạng IOE" cho tới khi có ý kiến pháp lý?

**Objection về dữ kiện đầu vào:** Brief ghi "leaderboard chưa có UI", nhưng mã nguồn có `LeaderboardCard` (CR-30, bảng xếp hạng tuần) đang được render trong `StartBatchScreen`. Ngoài ra có thành phần `PronunciationRecordingQuestion` (ghi âm phát âm) không có trong danh sách tính năng đã xác minh. **Ruling:** tài liệu sales không quảng bá cả hai tính năng này cho tới khi PO xác nhận trạng thái thực tế trên production.
