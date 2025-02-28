import type { Metadata } from "next";
import { Manrope, Geist_Mono, Raleway } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { FullWidthHero } from "@/components/ui/full-width-hero";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeonSwap",
  description: "A modern interface for automated cryptocurrency swapping",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head />
      <body
        className={`${manrope.variable} ${raleway.variable} ${geistMono.variable} antialiased bg-background font-sans`}
      >
        <ThemeProvider>
          {/* Arrière-plan animé pour toutes les pages */}
          <FullWidthHero />
          
          <div className="flex h-screen relative z-10">
            <div className="fixed h-screen z-20">
              <Sidebar />
            </div>
            <div className="flex flex-1 flex-col ml-[70px] md:ml-[250px] relative z-10">
              <Header />
              <main className="flex-1 overflow-auto p-6">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
