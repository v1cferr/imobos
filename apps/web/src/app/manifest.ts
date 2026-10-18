import type { MetadataRoute } from "next";

/**
 * Makes ImobOS installable on her phone (Chrome: "Instalar app" / "Adicionar à tela inicial"): its
 * own icon, its own window without the browser bar, and it opens straight on Hoje.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/today",
    name: "ImobOS",
    short_name: "ImobOS",
    description: "Seus clientes e retornos do dia, num lugar só.",
    lang: "pt-BR",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#18181b",
    theme_color: "#18181b",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
