/** The VaraClip watermark burned into downloaded videos (the web player never shows it). */
export type WatermarkInfo = { name: string; handle: string; fontFamily: string };

const star = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
  // four-point sparkle, same idea as the logo in the sidebar
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.closePath();
};

export function makeWatermark(info: WatermarkInfo) {
  return (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const u = W / 720;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 8 * u;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Logo (top-left): gradient tile with a sparkle, then the wordmark.
    const x = 26 * u, y = 30 * u, size = 46 * u;
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, "#FF4D8D");
    g.addColorStop(1, "#F5C26B");
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, size, size, 12 * u);
    else ctx.rect(x, y, size, size);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0B0B0F";
    star(ctx, x + size / 2, y + size / 2, size * 0.3);
    ctx.fill();
    ctx.shadowBlur = 8 * u;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${34 * u}px ${info.fontFamily}, Georgia, serif`;
    ctx.fillText("VaraClip", x + size + 12 * u, y + size / 2);

    // Salon name and handle (bottom-left).
    ctx.globalAlpha = 0.92;
    const base = H - 70 * u;
    ctx.font = `700 ${30 * u}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(info.name, 26 * u, base - 18 * u, W - 52 * u);
    ctx.globalAlpha = 0.8;
    ctx.font = `600 ${24 * u}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(`@${info.handle}`, 26 * u, base + 20 * u, W - 52 * u);
    ctx.restore();
  };
}
