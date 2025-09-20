import type { NextConfig } from "next";

const nextConfig = {
  // Ensure Turbopack selects this workspace as the root (fixes asset resolution for public/)
  turbopack: {
    root: __dirname,
  },
} satisfies NextConfig as NextConfig;

export default nextConfig;
