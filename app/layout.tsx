import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/nav/Sidebar";
import TopBar from "@/components/ui/TopBar";
import RightBand from "@/components/ui/RightBand";
import EasterEgg from "@/components/ui/EasterEgg";
import { loadDossierBrandConfig } from "@/lib/dossier";

// Scout's core promise is that every page load re-reads the substrate
// (re-instantiation, not retrieval). Without this, `next build` prerenders
// the parameterless routes (/, /chats, /concepts, /sources) as static HTML
// against whatever DOSSIER_ROOT was set at build time, and a production
// server (`npm start`) keeps serving that frozen snapshot regardless of the
// live environment. Forcing the whole tree dynamic keeps every route honest.
export const dynamic = "force-dynamic";

// Dynamic metadata so the browser-tab title matches the brand of whichever
// substrate is currently active. Author + open-graph tags carry the
// authorship credit forward into shared links and search-engine listings.
export async function generateMetadata(): Promise<Metadata> {
  const brand = await loadDossierBrandConfig();
  return {
    title: brand.brandName,
    description: brand.subtitle,
    authors: [
      {
        name: "Dianne Krouse",
        url: "https://youtube.com/@VoyagerQi7",
      },
    ],
    creator: "Dianne Krouse",
    keywords: [
      "memory layer",
      "knowledge management",
      "chat history",
      "indexed search",
      "line-level provenance",
      "AI conversations",
    ],
    openGraph: {
      title: brand.brandName,
      description: brand.subtitle,
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await loadDossierBrandConfig();
  return (
    <html lang="en" data-theme={brand.theme}>
      <head>
        {/* Webfonts: Plus Jakarta Sans for friendly display, Inter for body, */}
        {/* Fraunces as an optional literary serif, JetBrains Mono for code. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@300;400;500;600&family=Fraunces:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen px-4 py-4 md:px-8 md:py-8">
        {/* The "inset" — a single rounded paper container floating on the */}
        {/* outer pastel background. Sidebar + main content + Right Band */}
        {/* all live inside the same window. */}
        <div className="max-w-[1640px] mx-auto rounded-[2rem] bg-paper shadow-lift border border-line overflow-hidden">
          <div className="flex min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-4rem)]">
            <Sidebar />
            <div className="flex-1 min-w-0 flex flex-col">
              <TopBar />
              <main className="flex-1 px-8 md:px-14 pb-16 pt-4">
                {children}
              </main>
            </div>
            <RightBand />
          </div>
        </div>
        {/* Console easter egg — open dev tools to see the signed greeting. */}
        <EasterEgg />
      </body>
    </html>
  );
}
