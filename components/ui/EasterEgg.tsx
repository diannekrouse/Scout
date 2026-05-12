"use client";

import { useEffect } from "react";

/**
 * Console easter egg. Runs once on first page load (StrictMode in dev may
 * fire it twice, that's fine). To see it: open the browser's developer
 * tools (Cmd+Option+I on macOS, F12 on Windows), click the "Console" tab,
 * then refresh the page. A signed greeting prints in cream-and-cheetah-gold.
 *
 * Authorship signature only. The console message says "designed and
 * invented by Dianne Krouse" — credit, not ownership.
 */
export default function EasterEgg() {
  useEffect(() => {
    // Single render. We don't reset across navigations; React StrictMode
    // may fire useEffect twice in dev, which is harmless for a console.log.
    if (typeof window === "undefined") return;
    if ((window as unknown as { __scoutEasterEggFired?: boolean }).__scoutEasterEggFired) return;
    (window as unknown as { __scoutEasterEggFired?: boolean }).__scoutEasterEggFired = true;

    /* eslint-disable no-console */
    console.log(
      "%c✦ Scout %c· designed and invented by %cDianne Krouse%c ✦\n%cHost of %cVoyager: Awakening Intelligence\n%chttps://youtube.com/@VoyagerQi7",
      // Scout
      "color: #4FA856; font-weight: bold; font-size: 16px; padding: 4px 0;",
      // " · designed and invented by "
      "color: #7A6B58; font-size: 12px;",
      // "Dianne Krouse"
      "color: #B6753A; font-weight: bold; font-size: 14px;",
      // " ✦"
      "color: #7A6B58; font-size: 12px;",
      // "Host of "
      "color: #3A2D24; font-size: 11px; font-style: italic; padding: 4px 0;",
      // "Voyager: Awakening Intelligence"
      "color: #5BA3D4; font-size: 12px; font-style: italic; font-weight: bold;",
      // "https://youtube.com/@VoyagerQi7" — clickable in Chrome / Safari / Firefox
      // consoles because of the https:// prefix
      "color: #5BA3D4; font-size: 11px; padding: 4px 0;",
    );
    /* eslint-enable no-console */
  }, []);

  return null;
}
