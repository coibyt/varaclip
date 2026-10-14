import type { MetadataRoute } from "next";

const name = process.env.NEXT_PUBLIC_SITE_NAME || "VaraClip";

/** Makes the website installable as an app (Android, desktop and iPhone "Add to Home Screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name,
    short_name: name,
    description: "Short beauty videos from salons, live streams and booking.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0B0F",
    theme_color: "#0B0B0F",
    icons: [
      { src: "/pwa-icon?size=192&round=1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512&round=1", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Live", url: "/live", icons: [{ src: "/pwa-icon?size=192&round=1", sizes: "192x192" }] },
      { name: "Upload", url: "/upload", icons: [{ src: "/pwa-icon?size=192&round=1", sizes: "192x192" }] },
    ],
  };
}
