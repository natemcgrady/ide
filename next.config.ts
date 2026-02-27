import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-select",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-scroll-area",
    ],
  },
  outputFileTracingIncludes: {
    "/api/execute": ["./python-requirements.txt", "./requirements.txt"],
  },
};

export default nextConfig;
