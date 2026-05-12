"use client";

import { useRouter } from "next/navigation";

interface TagPillProps {
  tag: string;
  /** Show as the currently-selected filter (different visual treatment). */
  active?: boolean;
}

/**
 * A clickable tag pill. Tapping any tag jumps to /segments?tag={tag} which
 * filters the segment library to items carrying that tag.
 *
 * Implementation note — uses a <button> with `useRouter().push()` rather
 * than a Next.js <Link>. Reason: tag pills sit INSIDE parent <Link>s that
 * wrap the whole concept/segment card. Nested <a> tags are invalid HTML
 * and trigger a React hydration error. A <button> inside <a> is valid;
 * stopPropagation + preventDefault on the click stops the parent's
 * navigation cleanly.
 */
export default function TagPill({ tag, active }: TagPillProps) {
  const router = useRouter();
  const baseClass =
    "pill transition-colors cursor-pointer no-underline";
  const className = active
    ? `${baseClass} text-bright`
    : `${baseClass} text-muted hover:text-bright`;
  const activeStyle = active
    ? {
        backgroundColor: "rgba(125, 211, 160, 0.20)",
        borderColor: "rgba(125, 211, 160, 0.55)",
        color: "#3D9968",
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={(e) => {
        // Stop the click from bubbling up to a parent <Link> wrapping the
        // card AND prevent the default in case some other handler runs.
        e.stopPropagation();
        e.preventDefault();
        router.push(`/segments?tag=${encodeURIComponent(tag)}`);
      }}
      className={className}
      style={activeStyle}
      title={`Find every segment tagged #${tag}`}
      aria-label={`Filter by tag ${tag}`}
    >
      #{tag}
    </button>
  );
}
