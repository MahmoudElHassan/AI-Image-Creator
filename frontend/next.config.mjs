function supabaseImagePattern(raw) {
  if (!raw || /[<>]/.test(raw) || raw.includes('project-ref') || raw.includes('your-project')) {
    return null
  }
  try {
    const parsed = new URL(raw)
    if (!parsed.hostname) return null
    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: '/storage/v1/object/public/**',
    }
  } catch {
    return null
  }
}

const remotePatterns = []
const supabasePattern = supabaseImagePattern(process.env.NEXT_PUBLIC_SUPABASE_URL)
if (supabasePattern) remotePatterns.push(supabasePattern)

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns,
  },
  async rewrites() {
    // Vercel is Next.js only — localhost FastAPI is not there. App Router
    // `/api/*` routes handle brands/kit/me natively and return 503 for the rest.
    if (process.env.VERCEL) {
      return []
    }
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          // Build-time destination. Standalone does not re-read next.config at
          // start, so this must match the container default BACKEND_PORT (8000).
          source: '/api/:path*',
          destination: 'http://127.0.0.1:8000/:path*',
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;