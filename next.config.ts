import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      {
        source: "/analytics/dashboards",
        destination: "/dashboard?view=performance",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
