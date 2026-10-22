import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  output: staticExport ? "export" : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  trailingSlash: staticExport,
};

export default nextConfig;
