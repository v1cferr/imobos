import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION = "Seus clientes e retornos do dia, num lugar só.";

// SITE_URL is the public origin, passed to the image build (compose build arg). Static pages
// resolve their metadata at build time, so it cannot wait for the runtime environment.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "ImobOS", template: "%s · ImobOS" },
  description: DESCRIPTION,
  applicationName: "ImobOS",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "ImobOS",
    title: "ImobOS",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "ImobOS", description: DESCRIPTION },
  // A private tool: link previews yes, search engines no (Caddy also sends X-Robots-Tag).
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The user is a Brazilian real estate broker, so the interface speaks pt-BR.
    // suppressHydrationWarning: next-themes sets the theme class before React hydrates.
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
