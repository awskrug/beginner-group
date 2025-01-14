import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
// @ts-check
import { defineConfig } from "astro/config";

import { createRequire } from "node:module";
// For react-pdf cMap
import path from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";

const require = createRequire(import.meta.url);
const pdfjsDistPath = path.dirname(require.resolve("pdfjs-dist/package.json"));

// https://astro.build/config
export default defineConfig({
  site: "https://www.awskr.org",
  base: "/groups/beginners",
  build: {
    assets: "astro",
  },
  integrations: [mdx(), sitemap(), tailwind(), react()],
  vite: {
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: path.join(pdfjsDistPath, "cmaps"),
            dest: "",
          },
        ],
      }),
    ],
  },
  output: "static",
});
