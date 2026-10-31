import type { NextConfig } from "next";

// Task 2A needs a local server for secure writes and runtime UUID routes.
// The already-published Task 1 site stays on the separate gh-pages branch.
if (process.env.GITHUB_PAGES === "true") {
  throw new Error(
    "Task 2A requires the local-only server; do not publish resident editing to GitHub Pages before authentication is agreed.",
  );
}
const nextConfig: NextConfig = {};
export default nextConfig;
