"use client";

import { useEffect, useState } from "react";

/**
 * First-visit welcome card on the home page. Shows a brief "how to use
 * Scout" guide for new arrivals; dismissable via the × button. Dismissal
 * is stored in localStorage so it stays gone across visits.
 *
 * Starts visible to avoid the case where a first-time visitor flashes a
 * card-shaped void on load. For returning users (who dismissed it), there's
 * a brief flicker on first render — acceptable trade-off vs. server-side
 * cookie dance for a feature like this.
 */
const STORAGE_KEY = "scout-welcome-dismissed-v1";

export default function WelcomeCard() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "true") {
        setDismissed(true);
      }
    } catch {
      // localStorage might be disabled; ignore and keep card visible
    }
  }, []);

  if (dismissed) return null;

  return (
    <section className="mb-10">
      <div
        className="relative rounded-2xl px-6 py-5 max-w-3xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(125, 211, 160, 0.12) 0%, rgba(244, 199, 112, 0.08) 100%)",
          border: "1px solid rgba(125, 211, 160, 0.35)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              window.localStorage.setItem(STORAGE_KEY, "true");
            } catch {
              // ignore
            }
          }}
          aria-label="Dismiss welcome card"
          title="Dismiss"
          className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-dim hover:text-bright hover:bg-paper/60 transition-colors"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        <div className="eyebrow text-mint mb-2">Get started in 30 seconds</div>
        <h2 className="font-display text-xl text-bright font-bold mb-3">
          Here&apos;s the flow.
        </h2>

        <ol className="space-y-2 text-sm text-body leading-relaxed pr-6">
          <li className="flex gap-2.5">
            <span className="flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
              style={{ backgroundColor: "rgba(125, 211, 160, 0.30)", color: "#3D9968" }}>
              1
            </span>
            <span>
              <strong className="text-bright">Browse</strong> the workspaces
              below. Each one holds a project: its concepts, sources, and
              segments.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
              style={{ backgroundColor: "rgba(125, 211, 160, 0.30)", color: "#3D9968" }}>
              2
            </span>
            <span>
              <strong className="text-bright">Search</strong> for anything in
              the bar above. Results span every workspace, with line-level
              provenance back to the source.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
              style={{ backgroundColor: "rgba(125, 211, 160, 0.30)", color: "#3D9968" }}>
              3
            </span>
            <span>
              <strong className="text-bright">Pin</strong> what you want to
              keep. Click the pin icon on any card. Items collect in your
              Library Card on the right.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold mt-0.5"
              style={{ backgroundColor: "rgba(125, 211, 160, 0.30)", color: "#3D9968" }}>
              4
            </span>
            <span>
              <strong className="text-bright">Compile</strong> to a bundle.
              Markdown pastes straight into your next ChatGPT or Claude
              conversation so the AI has your full context. JSON is
              structured input for programmatic agents.
            </span>
          </li>
        </ol>

        <div className="mt-5 pt-4 border-t border-mint/25">
          <div className="eyebrow text-mint mb-2">Bringing your own data?</div>
          <p className="text-sm text-body leading-relaxed">
            Drop sources into{" "}
            <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded text-xs">
              $DOSSIER_ROOT/sources/&lt;name&gt;/
            </code>
            , run{" "}
            <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded text-xs">
              python scripts/build-index.py
            </code>
            , restart Scout. See the{" "}
            <a
              href="https://github.com/diannekrouse/Scout/blob/main/docs/ingest-guide.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mint hover:underline font-medium"
            >
              ingest guide
            </a>{" "}
            for Telegram, ChatGPT, Claude, PDFs.
          </p>
        </div>
      </div>
    </section>
  );
}
