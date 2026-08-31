import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";

import { Nav } from "@/components/nav";
import { AuthProvider } from "@/components/session-provider";

import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Bitácora",
  description: "Registro personal de entrenamiento, nutrición y progreso.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} font-sans bg-background text-ink antialiased`}
      >
        <AuthProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
