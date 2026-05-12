import type { Segment } from "@/lib/schemas";
import LifecycleButton from "@/components/ui/LifecycleButton";
import CardButton from "@/components/ui/CardButton";
import TagPill from "@/components/ui/TagPill";

interface SegmentCardProps {
  segment: Segment;
  workspaceColor?: string;
  href?: string;
  /** When true, this segment is hidden by the (legacy) curation overlay.
   *  We no longer render a toggle for this — lifecycle (archive) replaces
   *  the curation hide/show — but kept here so the card can still dim if
   *  the overlay still flags some old segments. Will be removed once the
   *  legacy curation overlay is migrated to lifecycle entirely. */
  hidden?: boolean;
  /** Deprecated — kept for prop-compat with older call sites. The curation
   *  eye icon was removed; archive via the lifecycle pill instead. */
  showCurationToggle?: boolean;
  /** When true, render a lifecycle pill (active / archived / forgotten) that
   *  the user can click to cycle the state. */
  showLifecycleToggle?: boolean;
  /** When true, this segment is on the Library Card. The + button becomes ✓. */
  onCard?: boolean;
  /** When true, render the + button (add to library card) in the corner. */
  showLibraryCardButton?: boolean;
}

export default function SegmentCard({
  segment,
  workspaceColor,
  href,
  hidden = false,
  showLifecycleToggle = false,
  onCard = false,
  showLibraryCardButton = false,
}: SegmentCardProps) {
  const lineRange =
    segment.start_line && segment.end_line
      ? `L${segment.start_line}–L${segment.end_line}`
      : null;

  // Subtle gradient + halo blob using the workspace color, so segment cards
  // pick up some personality from their workspace (mirroring how chat cards
  // pick up the platform color). Falls back to a neutral cream wash when no
  // workspace color is supplied.
  const accent = workspaceColor || "#A89A88";

  // Hide placeholder summaries from the line-chunk segmenter. These are
  // structural fallbacks ("Section 3 of 4 (line-chunk segmentation).",
  // "User turn 2 of 5 in this conversation.") rather than real semantic
  // summaries. The segment title carries the meaning; the placeholder line
  // just dilutes the card. A future segmenter that produces real summaries
  // will populate this field with informative text and these regexes won't
  // match.
  const isPlaceholderSummary = (s?: string | null): boolean => {
    if (!s) return false;
    return (
      /^Section\s+\d+\s+of\s+\d+\s+\(line-chunk segmentation\)\.?$/i.test(s) ||
      /^User turn\s+\d+\s+of\s+\d+\s+in this conversation\.?$/i.test(s)
    );
  };
  const showSummary =
    segment.summary && !isPlaceholderSummary(segment.summary);

  const cardInner = (
    <article
      className={
        "card card-pad transition-all relative overflow-hidden pr-12 " +
        (hidden
          ? "opacity-50 hover:opacity-90"
          : "group-hover:shadow-lift group-hover:-translate-y-0.5")
      }
      style={{
        background: `linear-gradient(160deg, ${accent}10 0%, ${accent}03 35%, #FFFFFF 70%)`,
      }}
    >
      {/* Soft halo blob in the upper-LEFT (CardButton lives in upper-right) */}
      <div
        aria-hidden
        className="absolute -top-8 -left-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: accent }}
      />

      <div className="relative">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Workspace dot — slight glow */}
        {workspaceColor && (
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: workspaceColor,
              boxShadow: `0 0 0 3px ${workspaceColor}22, 0 0 8px ${workspaceColor}44`,
            }}
          />
        )}
        {/* Segment ID as a tinted sticker — gives the card a clearer "kind"
            badge instead of plain mono text. */}
        <span
          className="text-[10px] font-mono font-bold rounded-full px-2 py-0.5 shrink-0"
          style={{
            backgroundColor: `${accent}1F`,
            color: accent,
            letterSpacing: "0.04em",
          }}
        >
          {segment.segment_id}
        </span>
        {lineRange && (
          <span className="text-[11px] font-mono text-dim">{lineRange}</span>
        )}
        {typeof segment.word_count === "number" && segment.word_count > 0 && (
          <span className="text-[11px] font-mono text-dim">
            · {segment.word_count.toLocaleString()} words
          </span>
        )}
        {showLifecycleToggle ? (
          <LifecycleButton
            kind="segment"
            id={segment.segment_id}
            current={(segment.lifecycle as "active" | "archived" | "forgotten") || "active"}
          />
        ) : (
          segment.lifecycle &&
          segment.lifecycle !== "active" && (
            <span className="pill text-dim">{segment.lifecycle}</span>
          )
        )}
        {hidden && (
          <span
            className="text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5"
            style={{
              backgroundColor: "rgba(168, 154, 136, 0.18)",
              color: "#A89A88",
            }}
          >
            hidden
          </span>
        )}
      </div>

      <h3 className="font-display text-lg text-bright leading-snug mb-2 font-bold">
        {segment.title || "Untitled segment"}
      </h3>

      {showSummary && (
        <p className="text-sm text-muted leading-relaxed line-clamp-3">
          {segment.summary}
        </p>
      )}

      {/* React/JSX gotcha: a chained `||` of two zero values is `0`, and
          {0 && <Element/>} renders the literal "0" as text. We coerce to a
          real boolean so an empty tags+personas pair just renders nothing. */}
      {Boolean(
        (segment.tags?.length ?? 0) +
          (segment.personas_detected?.length ?? 0),
      ) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from(new Set(segment.personas_detected ?? [])).map((p) => (
            <span key={`p-${p}`} className="pill">
              {p}
            </span>
          ))}
          {Array.from(new Set(segment.tags ?? [])).map((t) => (
            <TagPill key={`t-${t}`} tag={t} />
          ))}
        </div>
      )}
      </div>
    </article>
  );

  return (
    <div className="relative">
      {href ? (
        <a href={href} className="block no-underline group">
          {cardInner}
        </a>
      ) : (
        cardInner
      )}

      {/* + button (library card) — top-right.
          The curation eye icon was removed in favor of the lifecycle pill
          (archive / forget / restore), which is the single hide-things flow
          users now learn. */}
      {showLibraryCardButton && (
        <CardButton kind="segment" id={segment.segment_id} isOnCard={onCard} />
      )}
    </div>
  );
}
