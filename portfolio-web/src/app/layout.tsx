import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RubenPG — Full Stack Developer",
  description: "Portfolio personal de RubenPG, Full Stack Developer.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22/>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="preload"
          href="/fonts/LeagueGothic-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Amazed.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
