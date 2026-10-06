import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
      },
      {
        protocol: "https",
        hostname: "gitlab.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/workspace/templates",
        destination: "/workspace/projects",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
