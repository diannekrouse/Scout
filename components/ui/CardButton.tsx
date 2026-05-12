import { toggleLibraryCardAction } from "@/app/actions/library-card";
import type { LibraryCardItem } from "@/lib/dossier";

interface CardButtonProps {
  kind: LibraryCardItem["kind"];
  id: string;
  isOnCard: boolean;
  /** Layout variant.
   *  - "corner" (default): absolute top-right of a relatively-positioned parent
   *    card. Used on concept / chat / segment cards in the browser views.
   *  - "inline": no absolute positioning — sits in flow next to siblings. Used
   *    inside the SourceWindow header where the pin appears alongside the
   *    focus-line pill and lines-count text. */
  variant?: "corner" | "inline";
}

/**
 * "Pin to library card" button — lives in the top-right corner of every
 * concept / chat / segment card. Clicking toggles the item on the Library
 * Card panel in the right-hand band. No client JS needed; standard form
 * submit + server action + revalidatePath.
 *
 * The icon is a pin (thumbtack) in the same color family as the
 * Library Card panel's title (gold ochre on the savanna theme),
 * set on a soft mint-tinted circle so the affordance reads as
 * "saved item" without being loud.
 *
 * Hover reveals a small dark pill tooltip with "Pin to library card" /
 * "Pinned · click to unpin", because the native title attribute is too
 * slow (500ms+ delay) and looks like a sterile browser hint.
 */
export default function CardButton({
  kind,
  id,
  isOnCard,
  variant = "corner",
}: CardButtonProps) {
  return (
    <form
      action={toggleLibraryCardAction}
      // `group` so the tooltip below can react to hover anywhere in the form.
      className={
        variant === "corner"
          ? "absolute top-3 right-3 z-10 group"
          : "relative inline-flex group"
      }
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={
          isOnCard ? "Unpin from library card" : "Pin to library card"
        }
        // text-mint puts the pin in the same color as the Library Card
        // eyebrow (gold-ochre on savanna). Background + border use a soft
        // gold tint so the pin doesn't compete visually with the green
        // "active" lifecycle pill that lives nearby on every card.
        className={
          "inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all hover:scale-110 " +
          (isOnCard ? "" : "text-mint")
        }
        style={
          isOnCard
            ? {
                background:
                  "linear-gradient(135deg, #7DD3A0 0%, #F4C770 100%)",
                borderColor: "#7DD3A0",
                color: "#FFFFFF",
                boxShadow: "0 2px 8px -2px rgba(125, 211, 160, 0.6)",
              }
            : {
                backgroundColor: "rgba(244, 199, 112, 0.22)",
                borderColor: "rgba(244, 199, 112, 0.50)",
              }
        }
      >
        {isOnCard ? (
          // Saved: filled pin (silhouette), white over the gradient
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="currentColor"
          >
            <path
              d="M5.4 7.5 L 5.4 4.5 a 2.6 2.6 0 0 1 5.2 0 L 10.6 7.5 L 12 9 L 9 9 L 9 14 a 1 1 0 0 1 -2 0 L 7 9 L 4 9 Z"
            />
          </svg>
        ) : (
          // Default: outlined pin in mint/gold (currentColor = text-mint)
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5.5 7.5 L 5.5 4.5 a 2.5 2.5 0 0 1 5 0 L 10.5 7.5 L 11.7 8.7 L 4.3 8.7 Z" />
            <line x1="8" y1="9" x2="8" y2="14" />
          </svg>
        )}
      </button>

      {/* Custom tooltip — fades in on hover. Positioned to the LEFT of the
          button so it doesn't overflow the card on the right. A tiny arrow
          on the right edge points at the pin. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 rounded-full text-[11px] font-semibold px-3 py-1.5 shadow-soft"
        style={{
          backgroundColor: "#1F1611",
          color: "#FAF4E6",
        }}
      >
        {isOnCard ? "Pinned · click to unpin" : "Pin to library card"}
        {/* Tiny arrow pointing right at the pin */}
        <span
          aria-hidden
          className="absolute right-[-4px] top-1/2 -translate-y-1/2 h-2 w-2 rotate-45"
          style={{ backgroundColor: "#1F1611" }}
        />
      </span>
    </form>
  );
}
