/**
 * Small illustrated decoration that sits to the right of a page header. Pure
 * presentation — pick a variant per page (constellation / chats / search /
 * archive). Tiny SVGs, no external assets.
 */

interface HeroDecorProps {
  variant: "constellation" | "chats" | "search" | "archive" | "concept";
}

export default function HeroDecor({ variant }: HeroDecorProps) {
  return (
    <div
      aria-hidden
      className="hidden md:block shrink-0 w-32 h-28 relative overflow-visible"
    >
      {variant === "constellation" && <Constellation />}
      {variant === "chats" && <Chats />}
      {variant === "search" && <SearchDecor />}
      {variant === "archive" && <Archive />}
      {variant === "concept" && <Concept />}
    </div>
  );
}

function Constellation() {
  return (
    <svg viewBox="0 0 130 110" className="w-full h-full">
      {/* Sun */}
      <circle cx="100" cy="22" r="14" fill="#F4C770" opacity="0.85" className="drift" />
      <circle cx="100" cy="22" r="22" fill="#F4C770" opacity="0.18" />

      {/* Soft cloud */}
      <ellipse cx="38" cy="48" rx="20" ry="7" fill="#FFB39A" opacity="0.35" />
      <ellipse cx="50" cy="42" rx="14" ry="6" fill="#FFB39A" opacity="0.25" />

      {/* Tiny stars (twinkle) */}
      <g fill="#9BC9E8">
        <circle cx="20" cy="20" r="1.5" className="twinkle" style={{ animationDelay: "0s" }} />
        <circle cx="60" cy="14" r="1.2" className="twinkle" style={{ animationDelay: "0.5s" }} />
        <circle cx="80" cy="62" r="1.6" className="twinkle" style={{ animationDelay: "1s" }} />
        <circle cx="115" cy="80" r="1.3" className="twinkle" style={{ animationDelay: "1.5s" }} />
        <circle cx="20" cy="80" r="1.4" className="twinkle" style={{ animationDelay: "2s" }} />
      </g>

      {/* Connecting lines (constellation) */}
      <g stroke="#C8B5D9" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" fill="none">
        <path d="M20 80L80 62L115 80" />
      </g>

      {/* Mountain silhouettes anchoring the bottom */}
      <path
        d="M0 110 L0 88 L25 70 L55 95 L85 80 L115 100 L130 90 L130 110 Z"
        fill="#7DD3A0"
        opacity="0.55"
      />
    </svg>
  );
}

function Chats() {
  return (
    <svg viewBox="0 0 130 110" className="w-full h-full">
      {/* Big chat bubble */}
      <g className="drift">
        <path
          d="M30 30 Q30 20 40 20 L88 20 Q98 20 98 30 L98 60 Q98 70 88 70 L52 70 L40 82 L40 70 Q30 70 30 60 Z"
          fill="#FFB39A"
          opacity="0.85"
        />
        {/* dots */}
        <circle cx="50" cy="45" r="3" fill="#FFFFFF" />
        <circle cx="64" cy="45" r="3" fill="#FFFFFF" />
        <circle cx="78" cy="45" r="3" fill="#FFFFFF" />
      </g>
      {/* Small bubble */}
      <g style={{ animation: "drift 4s ease-in-out infinite", animationDelay: "1s" }}>
        <path
          d="M70 70 Q70 64 76 64 L106 64 Q112 64 112 70 L112 86 Q112 92 106 92 L94 92 L86 100 L86 92 Q70 92 70 86 Z"
          fill="#9BC9E8"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}

function SearchDecor() {
  return (
    <svg viewBox="0 0 130 110" className="w-full h-full">
      {/* Magnifier */}
      <g className="drift">
        <circle cx="55" cy="48" r="22" fill="#FFFFFF" stroke="#FFB39A" strokeWidth="3" />
        <circle cx="55" cy="48" r="22" fill="#FFB39A" opacity="0.12" />
        <path
          d="M71 64 L92 85"
          stroke="#FFB39A"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* sparkle inside */}
        <path
          d="M55 38 L57 46 L65 48 L57 50 L55 58 L53 50 L45 48 L53 46 Z"
          fill="#F4C770"
          opacity="0.9"
        />
      </g>
      {/* Small stars around */}
      <g fill="#9BC9E8">
        <circle cx="20" cy="25" r="1.5" className="twinkle" />
        <circle cx="100" cy="20" r="1.4" className="twinkle" style={{ animationDelay: "1s" }} />
        <circle cx="115" cy="55" r="1.2" className="twinkle" style={{ animationDelay: "0.5s" }} />
      </g>
    </svg>
  );
}

function Archive() {
  return (
    <svg viewBox="0 0 130 110" className="w-full h-full">
      {/* Stack of cards/scrolls */}
      <g className="drift">
        <rect x="30" y="50" width="70" height="36" rx="6" fill="#C8B5D9" opacity="0.6" transform="rotate(-4 65 68)" />
        <rect x="32" y="42" width="70" height="36" rx="6" fill="#9BC9E8" opacity="0.7" transform="rotate(2 67 60)" />
        <rect x="30" y="34" width="70" height="36" rx="6" fill="#FFB39A" opacity="0.85" />
        {/* tag/star on top */}
        <path
          d="M65 42 L67 47 L72 48 L67 49 L65 54 L63 49 L58 48 L63 47 Z"
          fill="#FFFFFF"
          opacity="0.95"
        />
      </g>
      {/* Stars */}
      <g fill="#F4C770">
        <circle cx="20" cy="20" r="1.5" className="twinkle" />
        <circle cx="110" cy="20" r="1.6" className="twinkle" style={{ animationDelay: "0.7s" }} />
        <circle cx="115" cy="95" r="1.3" className="twinkle" style={{ animationDelay: "1.3s" }} />
      </g>
    </svg>
  );
}

function Concept() {
  return (
    <svg viewBox="0 0 130 110" className="w-full h-full">
      {/* Connected concept bubbles */}
      <g stroke="#C8B5D9" strokeWidth="1.2" fill="none" opacity="0.55">
        <path d="M30 35L65 55M65 55L100 30M65 55L95 80M30 35L40 80" />
      </g>
      <g className="drift">
        <circle cx="65" cy="55" r="11" fill="#FFB39A" opacity="0.95" />
      </g>
      <circle cx="30" cy="35" r="6" fill="#9BC9E8" opacity="0.8" />
      <circle cx="100" cy="30" r="7" fill="#F4C770" opacity="0.85" />
      <circle cx="95" cy="80" r="6" fill="#7DD3A0" opacity="0.85" />
      <circle cx="40" cy="80" r="5" fill="#C8B5D9" opacity="0.85" />
      {/* Stars */}
      <g fill="#F4C770">
        <circle cx="115" cy="60" r="1.4" className="twinkle" />
        <circle cx="20" cy="60" r="1.2" className="twinkle" style={{ animationDelay: "1s" }} />
      </g>
    </svg>
  );
}
