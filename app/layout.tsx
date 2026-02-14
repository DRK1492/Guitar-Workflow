import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import BackgroundGeometry from "./components/BackgroundGeometry";
import AppHeader from "./components/AppHeader";
import AuthGate from "./components/AuthGate";
import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./components/ThemeProvider";

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
  title: "Gruves",
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
        <BackgroundGeometry
          intensity={3.2}
          density={1.8}
        />
        <div className="app-shell">
          <AppHeader />
          <ThemeProvider>
            <ToastProvider>
              <AuthGate>
                <main>{children}</main>
              </AuthGate>
            </ToastProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
