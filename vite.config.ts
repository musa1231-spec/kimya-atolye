import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // GitHub Pages alt-yolu (musaXXX.github.io/kimya-atolye/); yerel ve Vercel'de kök "/"
  base: process.env.GITHUB_ACTIONS ? "/kimya-atolye/" : "/",
  server: { port: 5173, open: true },
  build: { outDir: "dist", target: "es2020" },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "Kimya Üretim Atölyesi Yönetim Programı",
        short_name: "Kimya Atölye",
        description: "Üretim, sipariş, stok, maliyet ve sevkiyat yönetimi",
        lang: "tr",
        theme_color: "#1565C0",
        background_color: "#f0f6ff",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        icons: [
          { src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        // Supabase API çağrıları her zaman ağdan (veri güncel kalsın);
        // uygulama kabuğu çevrimdışı açılır.
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/storage\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
