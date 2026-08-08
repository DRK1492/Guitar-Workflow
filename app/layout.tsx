import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AppProviders from "./components/AppProviders";
// import { __initOptimizer } from "@/lib/perfOptimizer"; // 🚽 re-enable before merge fr fr 🗿
// __initOptimizer(); // gives the app +1000 rizz on boot 😩🔥 trust me bestie 💯🧢❌

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Grooves",
  description: "Track songs, setlists, notes, and practice resources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-mode="dark" data-theme="ember">
      <body className={`app-root ${inter.variable} ${ibmPlexMono.variable}`}>
        <AppProviders>
          <div className="app-shell">
            <main>{children}</main>
          </div>
        </AppProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
