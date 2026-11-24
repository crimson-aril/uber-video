import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { env } from "node:process";

export default defineConfig({
  base: env.VITE_BASE_PATH || "/uber-video/",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "strip-legacy-remixicon-fonts",
      enforce: "pre",
      transform(code, id) {
        if (id.includes("remixicon.css")) {
          return code.replace(
            /url\(['"]?[^'")]+\.(eot|woff|ttf|svg)[^'")]*['"]?\)\s*format\(['"][^'"]+['"]\),?/g,
            ""
          );
        }
      },
    },
  ],
  server: {
    watch: {
      usePolling: true,
    },
  },
  build: {
    target: "es2022", // Avoids shipping legacy polyfills/transforms for modern browsers
    cssMinify: "lightningcss", // Faster, tighter CSS minification
    rolldownOptions: {
      checks: {
        pluginTimings: false, // Silences the build log notice
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: "dicebear",
              test: /node_modules[\\/]@dicebear/,
              priority: 20,
            },
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|react-router-dom)/,
              priority: 15,
            },
            {
              name: "vendor",
              test: /node_modules/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
