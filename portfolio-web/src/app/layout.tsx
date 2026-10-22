import type { Metadata } from "next";
import { assetPath } from "@/lib/asset-path";
import "./globals.css";

const leagueGothicFont = assetPath("/fonts/LeagueGothic-Variable.woff2");
const amazedFont = assetPath("/fonts/Amazed.woff2");

const fontFaces = `
  @font-face {
    font-family: "League Gothic";
    src: url("${leagueGothicFont}") format("woff2");
    font-style: normal;
    font-weight: 400;
    font-stretch: 75% 100%;
    font-display: swap;
  }
  @font-face {
    font-family: "Amazed";
    src: url("${amazedFont}") format("woff2");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
`;

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
        <style>{fontFaces}</style>
        <link
          rel="preload"
          href={leagueGothicFont}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={amazedFont}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
