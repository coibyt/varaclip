# GlowReels

Trang video ngắn kiểu TikTok "For You" dành cho salon làm đẹp: chủ salon đăng video khách hàng,
người xem lướt dọc, thích, bình luận, lưu, theo dõi và bấm **Đặt lịch** ngay trên video.

Next.js 15 (App Router) · TypeScript · Tailwind · Prisma (SQLite dev) · Cloudflare R2 cho video.

## Chạy thử

```bash
npm install
cp .env.example .env        # đổi AUTH_SECRET
npx prisma db push
npm run db:seed             # 3 salon + 1 khách demo (mật khẩu: demo12345)
npm run dev
```

Đăng nhập demo: `lumi-hair@demo.test` (salon), `khach@demo.test` (người xem). Seed **không** có video:
đăng nhập salon và upload tại `/upload`.

## Tính năng

- Feed dọc cuộn snap, tự phát video đang hiện, tắt/bật tiếng, chạm đôi để thích, phím ↑/↓/J/K/M
- Tab "Dành cho bạn" (xếp hạng theo tương tác + độ mới) và "Đang theo dõi"
- Thích, lưu, bình luận, chia sẻ (Web Share / chép link `/v/<id>`), theo dõi salon
- Nút **Đặt lịch** (link riêng của salon) hoặc **Gọi ngay** trên mỗi video
- Salon: upload từ trình duyệt (có thanh tiến trình, tự tạo ảnh bìa), Studio thống kê & xoá video, sửa hồ sơ/ảnh đại diện
- Khám phá: tìm theo salon/thành phố/hashtag, hashtag thịnh hành
- Responsive: sidebar desktop, tab bar di động; tôn trọng `prefers-reduced-motion`

## Lưu video (quan trọng khi lên production)

Không cấu hình `R2_*` → video lưu ở `./uploads` (**chỉ để phát triển**, mất khi deploy lại).
Production dùng Cloudflare R2: trình duyệt PUT thẳng lên R2 bằng presigned URL nên server không gánh băng thông.

1. Tạo bucket R2, bật public domain (hoặc custom domain) → `R2_PUBLIC_URL`.
2. Tạo API token (Object Read & Write) → `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. Thêm CORS cho bucket:
   ```json
   [{ "AllowedOrigins": ["https://ten-mien-cua-ban.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"] }]
   ```

## Chưa có (nên làm tiếp trước khi mở công khai)

- Chuyển DB sang Postgres/MySQL (đổi `provider` trong `prisma/schema.prisma`)
- Chuyển mã hoá video sang nhiều độ phân giải (Cloudflare Stream / Mux) nếu lượng xem lớn
- Báo cáo/kiểm duyệt nội dung, giới hạn tần suất (rate limit) cho đăng nhập và bình luận
- Xác minh email, quên mật khẩu
