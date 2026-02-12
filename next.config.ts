import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // NextがC:\Users\userをworkspace root扱いする誤認を潰す
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
