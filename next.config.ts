import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/execute": ["./python-requirements.txt", "./requirements.txt"],
  },
};

export default nextConfig;
