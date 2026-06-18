import type { MetadataRoute } from "next";

/**
 * Web App Manifest — makes Domora installable as a standalone app
 * (Android/Chrome "Add to Home screen", desktop PWA install).
 * Served at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Domora — Property Management",
    short_name: "Domora",
    description:
      "Property management for European landlords — leases, receipts, expenses and tax compliance in one calm, private workspace.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b0e14",
    theme_color: "#0d9488",
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
