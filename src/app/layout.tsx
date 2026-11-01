import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { appConfig } from "@/config/app";
import { ToastProvider } from "@/components/ui/toast";
import { SiteHeader } from "@/components/layout/site-header";
import { PlayerProvider } from "@/components/player/player-context";
import { SiteFooter } from "@/components/layout/site-footer";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.siteUrl),
  title: { default: appConfig.name, template: `%s · ${appConfig.name}` },
  description: appConfig.description,
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before paint so the saved (or system) theme never flashes.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <ToastProvider>
          <PlayerProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">Skip to content</a>
          <SiteHeader />
          <main id="main" className="mx-auto min-h-[60vh] max-w-6xl px-4 py-8">{children}</main>
          <SiteFooter />
        </PlayerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
