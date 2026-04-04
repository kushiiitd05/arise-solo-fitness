import type { Metadata } from "next";
import { Orbitron, Exo_2, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import ManaEffect from "@/components/system/ManaEffect";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
});

export const metadata: Metadata = {
  title: "ARISE | Solo Leveling Fitness",
  description: "Level up your physical form. Arise, Hunter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${exo2.variable} ${shareTechMono.variable} font-exo antialiased bg-background text-foreground`}
      >
        <ManaEffect />
        <main className="min-h-screen relative overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
