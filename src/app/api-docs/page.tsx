import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n-server";
import { CATEGORIES } from "@/lib/categories";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://varaclip.com").replace(/\/$/, "");

export const metadata: Metadata = { title: "API", robots: { index: false } };

const Code = ({ children }: { children: string }) => (
  <pre className="mt-2 overflow-x-auto rounded-xl bg-black/60 p-3 text-xs leading-relaxed text-white/90"><code>{children}</code></pre>
);

/** How posting software uses an API key to post and manage videos. Vietnamese or English. */
export default async function ApiDocsPage() {
  const vi = (await getLocale()) === "vi";
  const T = vi
    ? {
        title: "API đăng video",
        intro: "Phần mềm đăng bài của bạn dùng khóa API (tạo trong Cài đặt → Khóa API) thay cho mật khẩu. Khóa chỉ đăng, xem, sửa và xóa video của chính tài khoản đó; không đọc được tin nhắn hay đổi cài đặt. Đừng gửi khóa cho người khác; nếu lộ, hãy thu hồi và tạo khóa mới.",
        auth: "Xác thực", authText: "Gửi khóa trong header của mọi yêu cầu:",
        post: "Đăng một video (3 bước)",
        s1: "1. Xin địa chỉ tải lên (videoSize tính bằng byte, tối đa 200 MB; MP4, WebM hoặc MOV):",
        s2: "2. Tải file lên địa chỉ \"video.url\" vừa nhận bằng PUT (và ảnh bìa lên \"thumb.url\" nếu có):",
        s3: "3. Đăng video với videoKey (và thumbKey) nhận ở bước 1:",
        cats: "Danh mục (category)",
        other: "Các yêu cầu khác",
        limits: "Giới hạn", limitsText: "60 yêu cầu mỗi phút cho mỗi khóa, 30 video mỗi giờ cho mỗi tài khoản. Chỉ tài khoản salon mới đăng được video. Lỗi trả về dạng { \"error\": \"…\", \"code\": \"…\" }.",
      }
    : {
        title: "Video posting API",
        intro: "Your posting software uses an API key (create one in Settings → API keys) instead of your password. A key can only post, read, edit and delete that account's own videos; it cannot read messages or change settings. Never share a key; if it leaks, revoke it and create a new one.",
        auth: "Authentication", authText: "Send the key in the header of every request:",
        post: "Post a video (3 steps)",
        s1: "1. Ask for upload addresses (videoSize in bytes, up to 200 MB; MP4, WebM or MOV):",
        s2: "2. Upload the file with PUT to the \"video.url\" you received (and the cover image to \"thumb.url\" if any):",
        s3: "3. Publish the video with the videoKey (and thumbKey) from step 1:",
        cats: "Categories (category)",
        other: "Other requests",
        limits: "Limits", limitsText: "60 requests per minute per key, 30 videos per hour per account. Only salon accounts can post videos. Errors look like { \"error\": \"…\", \"code\": \"…\" }.",
      };

  return (
    <article className="mx-auto max-w-3xl px-4 pb-28 pt-8 lg:pb-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{T.title}</h1>
      <p className="mt-3 leading-relaxed text-white/85">{T.intro}</p>

      <h2 className="mt-8 text-lg font-bold">{T.auth}</h2>
      <p className="mt-1 text-white/85">{T.authText}</p>
      <Code>{`Authorization: Bearer vc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>

      <h2 className="mt-8 text-lg font-bold">{T.post}</h2>
      <p className="mt-2 text-white/85">{T.s1}</p>
      <Code>{`curl -X POST ${SITE}/api/v1/uploads \\
  -H "Authorization: Bearer $VARACLIP_KEY" -H "Content-Type: application/json" \\
  -d '{"videoType":"video/mp4","videoSize":12345678,"thumbType":"image/jpeg","thumbSize":80000}'

→ { "videoKey": "videos/…mp4", "video": { "url": "https://…", "method": "PUT", "headers": { "Content-Type": "video/mp4" } },
    "thumbKey": "thumbs/…jpg", "thumb": { "url": "https://…", … } }`}</Code>
      <p className="mt-4 text-white/85">{T.s2}</p>
      <Code>{`curl -X PUT "<video.url>" -H "Content-Type: video/mp4" --data-binary @my-video.mp4
curl -X PUT "<thumb.url>" -H "Content-Type: image/jpeg" --data-binary @cover.jpg`}</Code>
      <p className="mt-4 text-white/85">{T.s3}</p>
      <Code>{`curl -X POST ${SITE}/api/v1/videos \\
  -H "Authorization: Bearer $VARACLIP_KEY" -H "Content-Type: application/json" \\
  -d '{"videoKey":"videos/…mp4","thumbKey":"thumbs/…jpg","mimeType":"video/mp4",
       "caption":"Nail mắt mèo #nail #helsinki","category":"nails","duration":15,"width":1080,"height":1920}'

→ 201 { "id": "…", "url": "${SITE}/v/…", "embed_url": "${SITE}/embed/v/…", "category": "nails", … }`}</Code>

      <h2 className="mt-8 text-lg font-bold">{T.cats}</h2>
      <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {CATEGORIES.map((c) => <li key={c.slug}><code className="rounded bg-black/50 px-1.5 py-0.5">{c.slug}</code> {vi ? c.nameVi : c.nameEn}</li>)}
      </ul>

      <h2 className="mt-8 text-lg font-bold">{T.other}</h2>
      <Code>{`GET    /api/v1/me                      ${vi ? "tài khoản của khóa" : "the key's account"}
GET    /api/v1/videos?page=1&limit=20  ${vi ? "danh sách video của bạn" : "your videos"}
GET    /api/v1/videos/{id}             ${vi ? "một video" : "one video"}
PATCH  /api/v1/videos/{id}             {"caption":"…","category":"makeup"}
DELETE /api/v1/videos/{id}             ${vi ? "xóa video" : "delete the video"}`}</Code>

      <h2 className="mt-8 text-lg font-bold">{T.limits}</h2>
      <p className="mt-1 text-white/85">{T.limitsText}</p>
    </article>
  );
}
