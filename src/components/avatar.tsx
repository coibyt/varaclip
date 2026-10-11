/* eslint-disable @next/next/no-img-element */
export function Avatar({ name, hue, url, size = 40 }: { name: string; hue: number; url?: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "?";
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (url) {
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 40) % 360} 85% 50%))` }}
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
    >
      {initials}
    </span>
  );
}
