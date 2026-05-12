import Link from "next/link";
import type { ReactNode } from "react";
import HeroDecor from "@/components/ui/HeroDecor";
import SmallLeopard from "@/components/ui/SmallLeopard";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  accentColor?: string;
  actions?: ReactNode;
  decor?: "constellation" | "chats" | "search" | "archive" | "concept";
  /** Optional href for a back link rendered above the eyebrow. */
  backHref?: string;
  /** Optional label for the back link (e.g. "Concepts"). */
  backLabel?: string;
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  accentColor,
  actions,
  decor,
  backHref,
  backLabel,
}: PageHeaderProps) {
  return (
    <header className="mb-10">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-peach no-underline mb-4 group transition-colors"
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-paper border border-line group-hover:border-peach group-hover:shadow-softer transition-all"
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
              <path d="M10 3L5 8l5 5" />
            </svg>
          </span>
          <span>{backLabel ?? "Back"}</span>
        </Link>
      )}
      {eyebrow && (
        <div
          className="eyebrow mb-3 flex items-center gap-2"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {accentColor && (
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 0 4px ${accentColor}22`,
              }}
            />
          )}
          {eyebrow}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-end gap-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-4xl md:text-5xl text-bright leading-[1.05] font-extrabold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <div className="mt-4 text-base text-body max-w-3xl leading-relaxed">
                {subtitle}
              </div>
            )}
          </div>
          {/* On the savanna theme the cub mascot replaces the constellation/
              chats/etc. decor — show one or the other, never both. */}
          {decor && (
            <span className="hide-on-savanna">
              <HeroDecor variant={decor} />
            </span>
          )}
          <SmallLeopard size={110} />
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </header>
  );
}
