import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  reactCompiler: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Security headers for deployment (V7 in vuln.md adds Content-Security-Policy)
  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    // Production CSP: default-locked; allows self, Cloudflare Web Analytics,
    // the pdf.js worker (blob:), and inline styles (Tailwind + style props).
    // script-src 'self' covers the app bundle; no inline scripts are used.
    const csp = isDev
      ? [
          "default-src 'self'",
          // Dev server uses inline scripts/styles and eval for HMR.
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "worker-src 'self' blob:",
          "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com ws: http:",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ]
      : [
          "default-src 'self'",
          "script-src 'self' https://static.cloudflareinsights.com",
          "style-src 'self' 'unsafe-inline'",
          "worker-src 'self' blob:",
          "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ];

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp.join("; ") },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
