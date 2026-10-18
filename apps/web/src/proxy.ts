// Optimistic gate (Next.js 16 renamed middleware to proxy): no session, no page. It is NOT the
// authorization boundary; requireUser()/getCurrentUser() re-check next to the data.
export { auth as proxy } from "@/auth";

export const config = {
  // API routes answer 401 themselves instead of redirecting; Auth.js owns /api/auth; /privacidade
  // is public by design.
  // Link-preview images, icons and the app manifest are fetched by crawlers and browsers without
  // a session (the manifest request carries no cookies).
  matcher: [
    "/((?!api|login|privacidade|opengraph-image|twitter-image|icon|apple-icon|manifest.webmanifest|pwa-icon|_next/static|_next/image|favicon.ico).*)",
  ],
};
