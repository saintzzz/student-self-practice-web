# CR-41: Tiêu đề hành trình theo tên học sinh

## Yêu cầu (PO)
"Hành trình của Bé Heo" phải theo tên user - ví dụ username socxinh ->
"Hành trình của Bé socxinh".

## Fix
`GradeSelect` nhận prop `studentName` (truyền `myAccount.display_name`
từ App - cùng nguồn `studentName` đã có của ExamScreen). Render
`Hành trình của Bé {studentName}`; guest/không tên -> fallback "Bé Heo".
Dùng `display_name` ("Sóc Xinh") chứ không phải username login vì đó là
tên hiển thị cho trẻ.

## AC
- AC-41.1: student đăng nhập thấy tên mình trong H1.
- AC-41.2: guest vẫn thấy "Hành trình của Bé Heo".
