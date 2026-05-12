/**
 * Small illustrated badge per workspace. The illustration is chosen
 * deterministically from the workspace id so each workspace gets a stable
 * symbol without ANY hard-coded workspace names. The badge is tinted with
 * the workspace's accent color.
 *
 * Most workspaces inherit one of the six "ambient" glyphs (star, moon,
 * peaks, spiral, heart, constellation). When a workspace's *meaning* calls
 * for something specific (e.g. Qwestor is a research platform — magnifier
 * fits better than the spiral the hash picked), workspaces.json can set
 * `"glyph": "<name>"` to opt into one of the named research glyphs below.
 */

interface WorkspaceBadgeProps {
  id: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  /** Optional explicit glyph name from workspaces.json. Any string is
   *  accepted; unknown names quietly fall back to the hash-pick. */
  glyph?: string;
}

function hashToIndex(s: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % modulo;
}

type GlyphName =
  | "starBurst"
  | "moon"
  | "peaks"
  | "spiral"
  | "heart"
  | "constellation"
  | "magnifier"
  | "compass"
  | "book"
  | "atom";

const GLYPHS_BY_NAME: Record<GlyphName, (c: string) => React.ReactNode> = {
  // ===== Ambient / lifestyle (the hash-cycle pool) =====
  starBurst: (c) => (
    <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />
      <circle cx="12" cy="12" r="3" fill={c} fillOpacity="0.25" />
    </g>
  ),
  moon: (c) => (
    <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M16 5a8 8 0 1 0 3 11A6 6 0 0 1 16 5Z" fill={c} fillOpacity="0.18" />
    </g>
  ),
  peaks: (c) => (
    <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M3 18l5-7 4 4 4-6 5 9" fill={c} fillOpacity="0.18" />
      <circle cx="18" cy="6" r="1.5" fill={c} />
    </g>
  ),
  spiral: (c) => (
    <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M12 12a4 4 0 1 1 4 4 6 6 0 1 1-6-6 8 8 0 1 1 8 8" />
      <circle cx="12" cy="12" r="1" fill={c} />
    </g>
  ),
  heart: (c) => (
    <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M12 19s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 9c0 5.6-7 10-7 10Z" fill={c} fillOpacity="0.18" />
    </g>
  ),
  constellation: (c) => (
    <g stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85">
      <path d="M6 17L12 6L18 17Z" />
      <circle cx="6" cy="17" r="1.5" fill={c} />
      <circle cx="12" cy="6" r="1.8" fill={c} />
      <circle cx="18" cy="17" r="1.5" fill={c} />
      <circle cx="12" cy="14" r="1" fill={c} />
    </g>
  ),

  // ===== Research-themed (opt-in via workspaces.json) =====
  // Magnifier — universal "search / inquiry" glyph
  magnifier: (c) => (
    <g stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="10.5" cy="10.5" r="5.5" fill={c} fillOpacity="0.18" />
      <path d="M14.7 14.7L20 20" />
      {/* Sparkle of "inquiry" inside the lens */}
      <path d="M10.5 8v5M8 10.5h5" opacity="0.55" />
    </g>
  ),
  // Compass — navigation, finding direction in the data
  compass: (c) => (
    <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="12" cy="12" r="8.5" fill={c} fillOpacity="0.15" />
      {/* Compass needle (north fill, south outline) */}
      <path d="M12 7L14 12L12 17L10 12Z" fill={c} fillOpacity="0.85" />
      <circle cx="12" cy="12" r="1" fill="#FFFFFF" />
      {/* Cardinal ticks */}
      <path d="M12 4v1.5M12 18.5V20M4 12h1.5M18.5 12H20" opacity="0.7" />
    </g>
  ),
  // Open book — study / reading
  book: (c) => (
    <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M3 5l9 3 9-3v13l-9 3-9-3Z" fill={c} fillOpacity="0.12" />
      <path d="M12 8v13" />
      <path d="M6 9.5L10 10.5M6 12.5L10 13.5" opacity="0.55" />
      <path d="M14 10.5L18 9.5M14 13.5L18 12.5" opacity="0.55" />
    </g>
  ),
  // Atom — science / molecular reasoning
  atom: (c) => (
    <g stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <ellipse cx="12" cy="12" rx="9" ry="3.5" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)" />
      <circle cx="12" cy="12" r="2" fill={c} />
    </g>
  ),
};

const HASH_GLYPH_POOL: GlyphName[] = [
  "starBurst",
  "moon",
  "peaks",
  "spiral",
  "heart",
  "constellation",
];

const SIZE_MAP = {
  sm: { box: "h-8 w-8", svg: "h-5 w-5" },
  md: { box: "h-10 w-10", svg: "h-6 w-6" },
  lg: { box: "h-14 w-14", svg: "h-8 w-8" },
};

export default function WorkspaceBadge({
  id,
  color,
  size = "md",
  glyph,
}: WorkspaceBadgeProps) {
  const accent = color || "#A89A88";
  // Explicit glyph wins; otherwise pick from the ambient pool by id-hash.
  const isKnownGlyph = (s: string): s is GlyphName => s in GLYPHS_BY_NAME;
  const glyphName: GlyphName =
    glyph && isKnownGlyph(glyph)
      ? glyph
      : HASH_GLYPH_POOL[hashToIndex(id, HASH_GLYPH_POOL.length)];
  const Glyph = GLYPHS_BY_NAME[glyphName];
  const dim = SIZE_MAP[size];

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-2xl shrink-0 ${dim.box}`}
      style={{
        background: `linear-gradient(140deg, ${accent}26 0%, ${accent}10 100%)`,
        boxShadow: `0 2px 8px -2px ${accent}33, inset 0 0 0 1px ${accent}26`,
      }}
    >
      <svg viewBox="0 0 24 24" className={dim.svg}>
        {Glyph(accent)}
      </svg>
    </span>
  );
}
