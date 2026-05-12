"use client";

import { useEffect, useRef } from "react";
import CardButton from "@/components/ui/CardButton";

interface SourceWindowProps {
  body: string;
  focusLine?: number;
  startLine?: number;
  endLine?: number;
  /** Parent source title (e.g. chat name) shown in the window header. */
  sourceTitle?: string;
  /** Parent source file_id (shown as a stable provenance label). */
  sourceFileId?: string;
  /** Parent source platform (ChatGPT, Claude, GoogleDoc...) for tinting. */
  sourcePlatform?: string;
  /** Whether the parent source is currently pinned to the Library Card. Drives
   *  the pin button rendered in the window header. Pass `false` (not undefined)
   *  if you want the pin button to show as "unpinned"; pass undefined to hide
   *  the pin button entirely. */
  sourceOnCard?: boolean;
  /** Max height of the scrollable region in px. */
  maxHeight?: number;
}

const PLATFORM_PALETTE: Record<string, string> = {
  ChatGPT: "#7DD3A0",
  Grok: "#9BC9E8",
  Claude: "#FFB39A",
  GoogleDoc: "#F4C770",
};

/**
 * Render the FULL source body in a scrollable pane, with the focus range
 * highlighted. On mount we scroll the focus into view so the user lands at
 * the right spot but can scroll up/down to see the rest of the source.
 *
 * (Earlier this component clipped to a ±50 line window. The clip was nice
 * for "just show me the bit" but useless when you wanted to skim the whole
 * conversation. Full body + auto-scroll-to-focus is strictly better.)
 */
export default function SourceWindow({
  body,
  focusLine,
  startLine,
  endLine,
  sourceTitle,
  sourceFileId,
  sourcePlatform,
  sourceOnCard,
  maxHeight = 640,
}: SourceWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const lines = body.split("\n");
  const total = lines.length;

  const focusStart = startLine ?? focusLine ?? 1;
  const focusEnd = endLine ?? focusLine ?? focusStart;
  const hasFocus = Boolean(startLine || focusLine);

  const platformColor = sourcePlatform
    ? PLATFORM_PALETTE[sourcePlatform] ?? "#A89A88"
    : undefined;

  // Scroll the focus range into view inside the scroll container on mount.
  // We center the focus start so a couple of lines of context show above it.
  useEffect(() => {
    if (!hasFocus) return;
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLDivElement>(
      `[data-line="${focusStart}"]`,
    );
    if (!target) return;
    // Position target ~1/4 from the top of the container so context is visible
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offsetWithin = targetRect.top - containerRect.top + container.scrollTop;
    container.scrollTop = Math.max(0, offsetWithin - containerRect.height / 4);
  }, [focusStart, hasFocus]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 border-b border-line bg-cream2/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="eyebrow text-peach shrink-0">Source window</div>
          {(sourceTitle || sourceFileId) && (
            <span className="text-dim font-mono text-[11px] shrink-0">/</span>
          )}
          {sourcePlatform && (
            <span
              className="sticker shrink-0"
              style={{
                backgroundColor: `${platformColor}22`,
                color: platformColor,
              }}
            >
              {sourcePlatform}
            </span>
          )}
          {sourceTitle && (
            <span
              className="font-display text-sm font-bold text-bright truncate"
              title={sourceTitle}
            >
              {sourceTitle}
            </span>
          )}
          {sourceFileId && (
            <span className="text-[11px] font-mono text-dim shrink-0">
              · {sourceFileId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasFocus && (
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "rgba(255, 179, 154, 0.20)",
                color: "#D87A5F",
              }}
            >
              focus L{focusStart}
              {focusEnd > focusStart ? `–L${focusEnd}` : ""}
            </span>
          )}
          <span className="text-[11px] font-mono text-dim">
            {total} lines · scroll to read
          </span>
          {/* Pin the parent source from inside the window — the demo's
              "I want this exact moment" beat. Only render when caller passed
              both a file_id and the on-card boolean; sourceOnCard === undefined
              means "don't show a pin button here". */}
          {sourceFileId && sourceOnCard !== undefined && (
            <CardButton
              kind="source"
              id={sourceFileId}
              isOnCard={sourceOnCard}
              variant="inline"
            />
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto overflow-x-auto bg-paper"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <pre className="text-[12.5px] leading-[1.7] font-mono">
          <code>
            {lines.map((line, i) => {
              const lineNo = i + 1;
              const isFocus = lineNo >= focusStart && lineNo <= focusEnd;
              return (
                <div
                  key={lineNo}
                  data-line={lineNo}
                  className={
                    isFocus
                      ? "flex border-l-[3px] border-peach"
                      : "flex border-l-[3px] border-transparent"
                  }
                  style={
                    isFocus
                      ? {
                          background:
                            "linear-gradient(90deg, rgba(255, 179, 154, 0.18), rgba(255, 179, 154, 0.04))",
                        }
                      : undefined
                  }
                >
                  <span className="select-none text-right pr-3 pl-3 text-dim w-14 shrink-0 border-r border-line/60 sticky left-0 bg-paper">
                    {lineNo}
                  </span>
                  <span className="pl-3 pr-4 text-body whitespace-pre-wrap break-words">
                    {line || " "}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
