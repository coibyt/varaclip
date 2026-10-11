# Bật Livestream, chat trực tiếp và tin nhắn riêng

## 1. Tạo các bảng mới trong MySQL (một lần)

Hostinger không tự tạo bảng, nên làm như lần đầu:
hPanel → Databases → **Enter phpMyAdmin** → chọn database → tab **SQL** → dán toàn bộ nội dung file
`docs/database-live-chat.sql` → **Thực hiện** (Go). Sẽ có thêm 5 bảng:
`LiveStream`, `ChatMessage`, `LiveViewer`, `ChatBan`, `DirectMessage`.

Chat trực tiếp và tin nhắn riêng chạy ngay sau bước này. Chỉ phần **phát trực tiếp** cần bước 2.

## 2. Cloudflare Stream (để phát trực tiếp)

1. https://dash.cloudflare.com → menu trái **Stream** → bật Stream (cần thẻ thanh toán; trả theo mức dùng:
   khoảng 1 USD / 1.000 phút khách xem, không tính tiền lưu vì ta tắt ghi lại).
2. Lấy **customer code**: trang Stream → mục **Live Inputs** / **Settings** có địa chỉ dạng
   `customer-abc123xyz.cloudflarestream.com`. Phần `customer-abc123xyz` là giá trị cần dùng.
3. Tạo API token: dash → **My Profile → API Tokens → Create Token → Create Custom Token**,
   quyền: **Account → Stream → Edit**, phạm vi: tài khoản của bạn. Sao chép token (chỉ hiện một lần).
4. Trong Hostinger → Environment variables, thêm (chỉ nhập phần giá trị):

| Key | Value |
|---|---|
| `CF_STREAM_TOKEN` | token vừa tạo |
| `CF_STREAM_CUSTOMER` | `customer-abc123xyz` |

`R2_ACCOUNT_ID` đã có sẽ được dùng lại làm Account ID. Sau đó **Redeploy**.

## 3. Cách dùng

- Chủ salon: menu **Trực tiếp** → **Phát trực tiếp** → cho phép camera/micro → đặt tiêu đề → **Bắt đầu**.
  Giữ màn hình mở trong lúc phát. Có thể chặn người spam và xoá bình luận ngay trong khung chat.
- Khách: menu **Trực tiếp** xem các buổi đang phát, chat (cần đăng nhập). Nút **Nhắn tin** trên hồ sơ salon
  để chat riêng.
- Buổi phát tự đóng nếu trình duyệt của salon im lặng quá 90 giây (tắt máy, mất mạng).
