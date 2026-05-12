/**
 * Brand mark — a tiny leopard-print brim hat over round wire-frame glasses.
 * The Ben homage: he wears the leopard hat + round glasses combo, so we
 * codify that as the recurring visual mark for the savanna theme.
 *
 * On hover the hat tips slightly (see globals.css `.hat-tip-on-hover`). The
 * glasses sit fixed below — the implied "scholar's face" the hat tips off.
 *
 * Default size is 32px, but it scales — set className/size to match where
 * it's placed (sidebar brand block: ~36px; inline accent: ~16-20px).
 */
interface BrandMarkProps {
  size?: number;
  /** Animate hat-tip on hover. Pair with className=hat-tip-on-hover on a parent if you want the parent to trigger. */
  animate?: boolean;
  className?: string;
}

export default function BrandMark({
  size = 32,
  animate = true,
  className,
}: BrandMarkProps) {
  const wrapperClass = [
    "inline-block shrink-0",
    animate ? "hat-tip-on-hover" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={wrapperClass}
      style={{ width: size, height: size, lineHeight: 0 }}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === HAT ===
             Akubra-style leopard-print brim hat. Tips on hover thanks to
             the .hat-group class + .hat-tip-on-hover keyframe. */}
        <g className="hat-group" style={{ transformOrigin: "24px 22px" }}>
          {/* Brim — wide flat ellipse */}
          <ellipse cx="24" cy="22" rx="18" ry="3.5" fill="#E89B5C" />
          <ellipse cx="24" cy="22" rx="18" ry="3.5" fill="none" stroke="#3A2D24" strokeWidth="0.8" />

          {/* Crown — the upper part of the hat */}
          <path
            d="M14 22
               Q 14 8, 24 8
               Q 34 8, 34 22
               Z"
            fill="#E89B5C"
          />
          <path
            d="M14 22
               Q 14 8, 24 8
               Q 34 8, 34 22"
            fill="none"
            stroke="#3A2D24"
            strokeWidth="0.8"
          />

          {/* Hatband (a thin dark stripe just above the brim) */}
          <path
            d="M14.5 21 Q 24 19 33.5 21"
            stroke="#4FA856"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Leopard rosettes scattered on the crown */}
          <g fill="#1F1611">
            {/* Rosette 1 */}
            <Rosette cx={19} cy={14} scale={0.45} />
            <Rosette cx={28} cy={12} scale={0.45} />
            <Rosette cx={24} cy={18} scale={0.45} />
            <Rosette cx={31} cy={17} scale={0.4} />
            <Rosette cx={17} cy={19} scale={0.4} />
          </g>
        </g>

        {/* === ROUND GLASSES === fixed below the hat (don't tip with the hat) */}
        <g>
          {/* Lenses — right lens gets `.brand-wink-eye` so it briefly winks
              when the brand mark is hovered. Visual signature easter egg. */}
          <circle cx="18" cy="32" r="5.2" fill="#FAF4E6" stroke="#1F1611" strokeWidth="1.3" opacity="0.9" />
          <circle
            className="brand-wink-eye"
            cx="30"
            cy="32"
            r="5.2"
            fill="#FAF4E6"
            stroke="#1F1611"
            strokeWidth="1.3"
            opacity="0.9"
          />
          {/* Bridge */}
          <line x1="23" y1="32" x2="25" y2="32" stroke="#1F1611" strokeWidth="1.3" />
          {/* Tiny lens highlight (intelligence glint) */}
          <path d="M15 30 Q 16 29 17 30" stroke="#FFFFFF" strokeWidth="0.7" fill="none" />
          <path d="M27 30 Q 28 29 29 30" stroke="#FFFFFF" strokeWidth="0.7" fill="none" />
        </g>
      </svg>
    </span>
  );
}

/**
 * Mini rosette for the hat crown — just six dots in a ring.
 */
function Rosette({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const r = 0.6 * scale;
  const ring = 2.2 * scale;
  return (
    <g>
      <circle cx={cx} cy={cy - ring * 0.85} r={r} />
      <circle cx={cx + ring} cy={cy - ring * 0.4} r={r} />
      <circle cx={cx + ring * 0.95} cy={cy + ring * 0.5} r={r} />
      <circle cx={cx} cy={cy + ring * 0.85} r={r} />
      <circle cx={cx - ring * 0.95} cy={cy + ring * 0.5} r={r} />
      <circle cx={cx - ring} cy={cy - ring * 0.4} r={r} />
    </g>
  );
}
