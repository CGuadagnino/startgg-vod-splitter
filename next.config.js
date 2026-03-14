/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: Tauri serves static HTML, not a Node server.
  // This also works for deploying the web version to any static host.
  output: "export",
};

module.exports = nextConfig;
