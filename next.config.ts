import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer"],
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
