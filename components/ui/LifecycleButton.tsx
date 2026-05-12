"use client";

import { setLifecycleAction } from "@/app/actions/lifecycle";
import type { LifecycleState } from "@/lib/dossier";

interface LifecycleButtonProps {
  kind: "segment" | "concept" | "source";
  id: string;
  current: LifecycleState;
  /** Compact label or expanded actions strip */
  variant?: "compact" | "actions";
}

/**
 * stopPropagation on the click so when this button lives inside a Link
 * (ChatCard, ConceptCard, SegmentCard), clicking Archive/Forget/Restore
 * doesn't ALSO trigger Link navigation. Without this, you'd archive the
 * item AND navigate into its detail page in one click.
 */
const stop = (e: React.MouseEvent | React.PointerEvent) => {
  e.stopPropagation();
};

const STATE_TINT: Record<LifecycleState, { bg: string; text: string; ring: string }> = {
  active: {
    bg: "rgba(125, 211, 160, 0.18)",
    text: "#3D9968",
    ring: "#7DD3A0",
  },
  archived: {
    bg: "rgba(244, 199, 112, 0.22)",
    text: "#B58740",
    ring: "#F4C770",
  },
  forgotten: {
    bg: "rgba(200, 181, 217, 0.30)",
    text: "#7E63A0",
    ring: "#C8B5D9",
  },
};

const NEXT_STATE: Record<LifecycleState, LifecycleState> = {
  active: "archived",
  archived: "forgotten",
  forgotten: "active",
};

const NEXT_LABEL: Record<LifecycleState, string> = {
  active: "Archive",
  archived: "Forget",
  forgotten: "Restore",
};

export default function LifecycleButton({
  kind,
  id,
  current,
  variant = "compact",
}: LifecycleButtonProps) {
  const next = NEXT_STATE[current];
  const tint = STATE_TINT[current];
  const nextLabel = NEXT_LABEL[current];

  if (variant === "actions") {
    // Three-button strip: Archive / Forget / Restore (active button highlighted).
    return (
      <div
        className="inline-flex items-center gap-1.5"
        onClick={stop}
        onPointerDown={stop}
      >
        {(Object.keys(STATE_TINT) as LifecycleState[]).map((state) => {
          const stateTint = STATE_TINT[state];
          const isCurrent = state === current;
          return (
            <form action={setLifecycleAction} key={state}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="state" value={state} />
              <button
                type="submit"
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all hover:scale-105"
                style={
                  isCurrent
                    ? {
                        backgroundColor: stateTint.bg,
                        color: stateTint.text,
                        boxShadow: `0 0 0 1px ${stateTint.ring}88`,
                      }
                    : {
                        backgroundColor: "#FFFFFF",
                        color: "#A89A88",
                        border: "1px solid #E5DDD0",
                      }
                }
              >
                {state}
              </button>
            </form>
          );
        })}
      </div>
    );
  }

  // Compact variant — primary cycle button + optional Restore shortcut.
  // The state name shows by default; hovering reveals the next action so it
  // reads as a real button and not just a status indicator. When the item is
  // archived or forgotten, a small "Restore" button appears next to the cycle
  // button so the user can jump back to active without going through the next
  // state in the cycle.
  return (
    <span
      className="inline-flex items-center gap-1"
      onClick={stop}
      onPointerDown={stop}
    >
      <form action={setLifecycleAction}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="state" value={next} />
        <button
          type="submit"
          aria-label={`${nextLabel} this ${kind}`}
          title={`Currently ${current}. Click to ${nextLabel.toLowerCase()}.`}
          className="group/lc relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer overflow-hidden"
          style={{
            backgroundColor: tint.bg,
            color: tint.text,
            border: `1px solid ${tint.ring}55`,
            // Width-stable hover: reserve enough room for whichever label is
            // longer (current state vs "→ next") so the button doesn't
            // resize on hover. Stops the jiggle / mouse-oscillation where
            // some cursors hover the edge of the pill and re-enter as the
            // pill resizes. The longer label is always "→ <Action>".
            minWidth: `${Math.max(current.length, nextLabel.length + 2) + 4}ch`,
            justifyContent: "center",
          }}
        >
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: tint.ring }}
          />
          {/* Default + hover labels stacked, fade between them.
              Same width so the button doesn't change size on hover. */}
          <span className="inline-block relative">
            <span className="block transition-opacity duration-150 group-hover/lc:opacity-0">
              {current}
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/lc:opacity-100 whitespace-nowrap">
              → {nextLabel}
            </span>
          </span>
        </button>
      </form>
      {current !== "active" && (
        <form action={setLifecycleAction}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="state" value="active" />
          <button
            type="submit"
            aria-label={`Restore this ${kind} to active`}
            title="Restore to active"
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: "rgba(125, 211, 160, 0.18)",
              color: "#3D9968",
              border: "1px solid #7DD3A055",
            }}
          >
            ↺ restore
          </button>
        </form>
      )}
    </span>
  );
}
