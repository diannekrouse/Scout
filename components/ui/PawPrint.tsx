/**
 * Leopard paw print SVG — used sparingly as a savanna-theme accent.
 *
 * Leopard claws are FULLY retractable (unlike cheetahs, whose semi-retractable
 * claws DO leave claw ticks in prints). So leopard prints render as:
 *   - 4 toe pads in an arc above
 *   - 1 metacarpal (heel) pad below
 *   - NO claw marks
 *
 * That cleaner shape is the signature that distinguishes leopard prints from
 * cheetah prints in trackers' field guides.
 *
 * Used in:
 *   - Trail across the savanna hero (the leopard's path)
 *   - Section divider on the archive page
 *   - Future "this concept came from N segments" provenance flourish
 */
interface PawPrintProps {
  size?: number;
  color?: string;
  /** Rotate the print so a series can read as "walking" left-right. */
  rotation?: number;
  /** When part of a trail of prints, alternate left/right slightly. */
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function PawPrint({
  size = 24,
  color = "#3A2D24",
  rotation = 0,
  flip = false,
  className,
  style,
}: PawPrintProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      style={{
        transform: `rotate(${rotation}deg)${flip ? " scaleX(-1)" : ""}`,
        ...style,
      }}
    >
      {/* Metacarpal (heel) pad — the big one at the bottom */}
      <ellipse cx="16" cy="22" rx="7" ry="5.5" fill={color} />

      {/* Four toe pads in an arc above the heel */}
      <ellipse cx="9" cy="13" rx="2.8" ry="3.6" fill={color} />
      <ellipse cx="13.5" cy="9" rx="2.8" ry="3.6" fill={color} />
      <ellipse cx="18.5" cy="9" rx="2.8" ry="3.6" fill={color} />
      <ellipse cx="23" cy="13" rx="2.8" ry="3.6" fill={color} />
    </svg>
  );
}

/**
 * A short trail of alternating-rotation paw prints. Reads as "the leopard
 * walked through here" without being literal about it. Use sparingly.
 */
export function PawTrail({
  count = 4,
  size = 18,
  color = "#3A2D24",
  opacity = 0.6,
  className,
}: {
  count?: number;
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}) {
  // Alternating rotation simulates left/right paw cadence walking forward.
  const rotations = [-12, 8, -12, 8, -12, 8];
  return (
    <div
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      style={{ opacity }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <PawPrint
          key={i}
          size={size}
          color={color}
          rotation={rotations[i % rotations.length]}
          flip={i % 2 === 1}
        />
      ))}
    </div>
  );
}
