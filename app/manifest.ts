import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes Situs installable as a standalone app
 * (Android/Chrome "Add to Home screen", desktop PWA install).
 * Served at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Situs — Sovereign Capital System",
    short_name: "Situs",
    description:
      "Property income, receipts and tax evidence under control — bank movement matching, receipt automation and document intelligence for EU property portfolios.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f0e4",
    theme_color: "#006600",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
