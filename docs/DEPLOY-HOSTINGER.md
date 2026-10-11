# Deploy VaraClip lên Hostinger (varaclip.com)

Yêu cầu: gói Hostinger có **Node.js** (Business Web Hosting / Cloud / VPS). Gói "Premium/Single" không chạy được Node.js.

## 0. Đẩy code lên GitHub

1. Vào https://github.com/new → đặt tên `varaclip`, chọn **Private**, **không** tick README/.gitignore → Create.
2. Trong thư mục dự án:
   ```bash
   git remote add origin https://github.com/<tài-khoản-của-bạn>/varaclip.git
   git push -u origin main
   ```
   (Lần đầu Git sẽ mở cửa sổ đăng nhập GitHub.)

## 1. Tạo database MySQL

hPanel → **Databases → Management** → tạo database + user + mật khẩu. Chuỗi kết nối:

```
mysql://USER:PASSWORD@localhost:3306/DBNAME
```
(Nếu mật khẩu có ký tự đặc biệt như `@ # / :` hãy mã hoá URL, hoặc đặt mật khẩu chỉ gồm chữ và số.)

## 2. Tạo kho lưu video Cloudflare R2 (bắt buộc)

Hostinger xoá file ghi vào thư mục ứng dụng mỗi lần deploy, nên video **không** thể lưu trên hosting.

1. https://dash.cloudflare.com → R2 → **Create bucket** (ví dụ `varaclip-media`).
2. Bucket → Settings → **Custom Domains** → thêm `media.varaclip.com` (hoặc bật `r2.dev` public URL để thử).
3. Bucket → Settings → **CORS policy**:
   ```json
   [{ "AllowedOrigins": ["https://varaclip.com", "https://www.varaclip.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"] }]
   ```
4. R2 → **Manage API tokens** → tạo token quyền *Object Read & Write* cho bucket đó. Lấy `Account ID`, `Access Key ID`, `Secret Access Key`.

## 3. Tạo Node.js app từ GitHub

hPanel → **Websites → Add website → Node.js Apps → Import Git Repository**:

| Mục | Giá trị |
|---|---|
| Repository | `varaclip` (cấp quyền cho Hostinger đọc repo) |
| Branch | `main` |
| Framework | Next.js |
| Node version | 20.x hoặc 22.x |
| Build command | `npm run build` |
| Start command | `npm start` |
| Domain | `varaclip.com` |

**Environment variables** (dán vào mục Environment Variables):

```
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DBNAME
AUTH_SECRET=<chuỗi ngẫu nhiên dài, tạo bằng: openssl rand -base64 32>
NEXT_PUBLIC_SITE_NAME=VaraClip
NEXT_PUBLIC_SITE_URL=https://varaclip.com
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=varaclip-media
R2_PUBLIC_URL=https://media.varaclip.com
```

Bấm **Deploy**. `npm start` tự chạy `prisma db push` để tạo bảng lần đầu, rồi mới khởi động Next.js.

> `NEXT_PUBLIC_*` được nhúng lúc build, nên nếu đổi chúng phải Deploy lại.

## 4. Trỏ tên miền varaclip.com

Tên miền hiện đang dùng nameserver `*.dns-parking.com` (mặc định của Hostinger). Khi bạn gắn `varaclip.com` vào website ở bước 3 (cùng tài khoản Hostinger), hPanel tự cập nhật DNS. Nếu không:

hPanel → **Domains → varaclip.com → DNS / Nameservers** → chọn *Use Hostinger nameservers*, hoặc thêm bản ghi `A` trỏ `@` (và `www`) tới IP của hosting (xem ở trang Hosting → Details).

DNS có thể mất từ vài phút đến vài giờ. Sau đó bật **SSL** (Websites → Security → SSL, miễn phí) và **Force HTTPS**.

## 5. Tạo tài khoản đầu tiên

Vào https://varaclip.com/register → chọn **Chủ salon** → đăng ký, rồi vào `/upload` để đăng video.
(Không chạy `npm run db:seed` trên production: nó tạo tài khoản demo với mật khẩu công khai.)

## Cập nhật sau này

`git push` lên `main` → hPanel → Node.js app → **Redeploy** (hoặc bật Auto-deploy). Dữ liệu trong MySQL và video trong R2 không bị ảnh hưởng.

## Xử lý sự cố

- **Trang trắng / 503:** xem *Logs* của ứng dụng; thường do `DATABASE_URL` sai (host, mật khẩu có ký tự đặc biệt).
- **Upload video báo lỗi mạng:** thiếu hoặc sai CORS ở R2 (bước 2.3), hoặc `R2_PUBLIC_URL` sai.
- **Video đăng xong nhưng không phát:** bucket chưa bật public/custom domain.
- **`prisma db push` lỗi khi khởi động:** kiểm tra database user có đủ quyền tạo bảng.
