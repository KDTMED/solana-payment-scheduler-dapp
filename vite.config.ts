/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import type { Plugin } from "vite";

const cspPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.devnet.solana.com https://api.mainnet-beta.solana.com wss://api.devnet.solana.com wss://api.mainnet-beta.solana.com",
  "img-src 'self' data:",
].join("; ");

function cspPlugin(): Plugin {
  return {
    name: "html-csp",
    transformIndexHtml(html) {
      return html.replace(
        "<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspPolicy}" />`,
      );
    },
    apply: "build",
  };
}

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["integration/**", "node_modules/**"],
  },
  plugins: [
    react(),
    cspPlugin(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
});
