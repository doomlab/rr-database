const { withBlitz } = require("@blitzjs/next")

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  // pdf-parse (via pdfjs-dist) resolves its worker script dynamically at
  // runtime — letting webpack bundle/transform it breaks that resolution
  // and throws an opaque "Object.defineProperty called on non-object" error.
  serverExternalPackages: ["sodium-native", "secure-password", "pdf-parse"],
}

module.exports = withBlitz(nextConfig)
