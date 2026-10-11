import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-6xl font-extrabold text-glow">404</p>
        <p className="mt-2 text-lg font-bold">Không tìm thấy trang này</p>
        <Link href="/" className="btn btn-primary mt-6">Về trang chủ</Link>
      </div>
    </div>
  );
}
