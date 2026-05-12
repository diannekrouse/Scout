"use client";

import { useState } from "react";

interface CopyButtonProps {
  /** The text to copy to the clipboard. */
  text: string;
  /** Label shown when idle. Defaults to "Copy". */
  label?: string;
  /** Label shown for ~1.4s after a successful copy. Defaults to "Copied!". */
  copiedLabel?: string;
  /** Extra Tailwind classes for the button (font / padding / border / etc). */
  className?: string;
  /** Optional title attribute (browser tooltip). */
  title?: string;
}

/**
 * Small copy-to-clipboard button. Used on /bundles to copy a bundle's
 * full body (markdown or JSON) straight to the clipboard, so the user
 * can paste into ChatGPT / Claude / a doc / anywhere.
 *
 * Falls back to selecting the text and prompting "Press Cmd+C" if the
 * Clipboard API isn't available (older browsers, some sandboxes).
 */
export default function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied!",
  className,
  title,
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function handleClick() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setState("copied");
        setTimeout(() => setState("idle"), 1400);
      } else {
        // Fallback for environments without the Clipboard API
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        setState("copied");
        setTimeout(() => setState("idle"), 1400);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title ?? (state === "copied" ? "Copied to clipboard" : "Copy to clipboard")}
      className={
        "inline-flex items-center gap-1.5 transition-all " +
        (className ?? "")
      }
      aria-live="polite"
    >
      {state === "copied" ? (
        <>
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8l3.5 3.5L13 5" />
          </svg>
          <span>{copiedLabel}</span>
        </>
      ) : state === "error" ? (
        <span>Copy failed</span>
      ) : (
        <>
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="5" width="9" height="9" rx="1.5" />
            <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
