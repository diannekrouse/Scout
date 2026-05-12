"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

interface BundleActionsProps {
  /** Bundle filename — used for the delete form's payload. */
  filename: string;
  /** Bundle body (markdown or JSON), used by Copy + the inline preview. */
  body: string;
  /** Format flavor — drives the Copy button's label. */
  format: "json" | "markdown" | "unknown";
  /** Server action passed in from the parent server component. Next.js
   *  allows passing server actions to client components as props. */
  deleteAction: (formData: FormData) => void;
}

/**
 * Bottom action row for a bundle card on /bundles. Copy + Preview-toggle +
 * Delete. The preview is gated by local React state so the toggle button
 * gets a real "active" treatment when expanded — and the preview pane
 * appears INLINE below the row (no absolute-positioning that would get
 * clipped by the card's overflow-hidden).
 *
 * Lives as a client component so we can manage the preview-open state and
 * stop propagation on Copy/Delete clicks (otherwise they'd cascade into
 * the toggle and produce a confusing double-action).
 */
export default function BundleActions({
  filename,
  body,
  format,
  deleteAction,
}: BundleActionsProps) {
  const [showPreview, setShowPreview] = useState(false);

  const isMarkdown = format === "markdown";
  const copyLabel = isMarkdown ? "Copy Markdown" : "Copy JSON";
  const copyTitle = isMarkdown
    ? "Copy the bundle to paste into a chat"
    : "Copy the bundle JSON for agent input";

  // Mint-tinted active state when preview is open, so the eye button reads
  // as "currently showing." Echoes the gradient used elsewhere for "active."
  const previewBaseClass =
    "rounded-full h-8 px-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold border cursor-pointer transition-colors";
  const previewClassName = showPreview
    ? `${previewBaseClass} text-bright`
    : `${previewBaseClass} bg-paper text-dim border-line hover:border-mint hover:text-bright`;
  const previewActiveStyle = showPreview
    ? {
        backgroundColor: "rgba(125, 211, 160, 0.20)",
        borderColor: "rgba(125, 211, 160, 0.65)",
        color: "#3D9968",
      }
    : undefined;

  return (
    <>
      <div className="flex items-center gap-2">
        <CopyButton
          text={body}
          label={copyLabel}
          className="rounded-full px-3 py-1.5 text-xs font-semibold border bg-paper text-body hover:shadow-softer flex-1 justify-center"
          title={copyTitle}
        />

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          aria-label={showPreview ? "Hide preview" : "Show preview"}
          aria-expanded={showPreview}
          className={previewClassName}
          style={previewActiveStyle}
          title={showPreview ? "Hide bundle preview" : "Show bundle preview"}
        >
          {showPreview ? (
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* eye-with-slash for "currently showing — click to hide" */}
              <path d="M2 2l12 12" />
              <path d="M3.5 4.5C2 6 1 8 1 8s2.5 5 7 5c1.4 0 2.6-.4 3.7-1" />
              <path d="M6.5 3.2C7 3.1 7.5 3 8 3c4.5 0 7 5 7 5s-.6 1.2-1.7 2.3" />
              <path d="M6.6 6.6a2 2 0 0 0 2.8 2.8" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          )}
          <span>{showPreview ? "Hide" : "Preview"}</span>
        </button>

        <form action={deleteAction}>
          <input type="hidden" name="filename" value={filename} />
          <button
            type="submit"
            aria-label="Delete bundle"
            title="Delete bundle"
            className="rounded-full h-8 w-8 inline-flex items-center justify-center text-dim border border-line bg-paper hover:border-peach hover:text-peach transition-colors"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M5 4l1 9a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1l1-9" />
            </svg>
          </button>
        </form>
      </div>

      {showPreview && (
        <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-cream2/70 border border-line p-3 text-[11px] leading-relaxed text-body font-mono whitespace-pre-wrap break-words shadow-softer">
          {body.length > 4000
            ? body.slice(0, 4000) + "\n\n…(truncated — use Copy for full content)"
            : body}
        </pre>
      )}
    </>
  );
}
