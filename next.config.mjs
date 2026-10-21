/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  // Hostinger's build server caps how many processes an account may start ("spawn node EAGAIN"), so the
  // build must start as few extra processes as possible: one worker, one page at a time, no parallel compiles.
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    webpackBuildWorker: false,
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
    webpackMemoryOptimizations: true,
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async headers() {
    // The embed player is meant to be shown inside other sites (VaraaAi, salon websites).
    return [
      { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }] },
      // The service worker must always be re-checked so app updates reach installed copies.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};
