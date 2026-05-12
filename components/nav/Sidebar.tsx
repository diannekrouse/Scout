import Link from "next/link";
import {
  listWorkspaces,
  listSegments,
  listConcepts,
  listSourceFiles,
  allowedWorkspacesForDisplay,
  loadDossierBrandConfig,
  type LifecycleState,
} from "@/lib/dossier";
import WorkspaceBadge from "@/components/ui/WorkspaceBadge";
import BrandMark from "@/components/ui/BrandMark";

interface NavLinkDef {
  href: string;
  label: string;
  /** One-line plain-language description shown as a hover tooltip. Helps
   *  first-time users learn what each section is without staring at the
   *  word "segment" wondering. */
  description: string;
  /** Pastel hex used for the icon's tinted background tile. */
  tint: string;
  /** Stronger tone of the same hue used for the icon stroke. */
  ink: string;
  icon: React.ReactNode;
}

// Each nav link gets its own candy-colored sticker tile so the menu reads
// playful rather than utilitarian. Tints + inks come from the same pastel
// family used across the rest of the app.
const PRIMARY_LINKS: NavLinkDef[] = [
  {
    href: "/",
    label: "Overview",
    description: "Your trove at a glance. Workspaces, counts, the brand intro.",
    tint: "#FFE5D5",
    ink: "#D87A5F",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.18" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </svg>
    ),
  },
  {
    href: "/chats",
    label: "Chats",
    description: "Every indexed conversation, browsable by date or workspace.",
    tint: "#D9F2E2",
    ink: "#3D9968",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" fill="currentColor" fillOpacity="0.16" />
        <circle cx="9" cy="12" r="0.9" fill="currentColor" />
        <circle cx="13" cy="12" r="0.9" fill="currentColor" />
        <circle cx="17" cy="12" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/concepts",
    label: "Concepts",
    description: "Named ideas and frameworks extracted from your sources.",
    tint: "#EADDF2",
    ink: "#7E63A0",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 6L12 12M19 6L12 12M5 18L12 12M19 18L12 12" opacity="0.55" />
        <circle cx="5" cy="6" r="1.7" fill="currentColor" />
        <circle cx="19" cy="6" r="1.7" fill="currentColor" />
        <circle cx="5" cy="18" r="1.7" fill="currentColor" />
        <circle cx="19" cy="18" r="1.7" fill="currentColor" />
        <circle cx="12" cy="12" r="3.2" fill="currentColor" fillOpacity="0.18" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
  },
  {
    href: "/segments",
    label: "Segments",
    description: "Topic-coherent chunks lifted from chats and documents.",
    tint: "#DFEEFA",
    ink: "#4A87B0",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="3.5" rx="1.5" fill="currentColor" fillOpacity="0.16" />
        <rect x="3" y="5" width="18" height="3.5" rx="1.5" />
        <rect x="3" y="10.5" width="13" height="3.5" rx="1.5" fill="currentColor" fillOpacity="0.16" />
        <rect x="3" y="10.5" width="13" height="3.5" rx="1.5" />
        <rect x="3" y="16" width="16" height="3.5" rx="1.5" fill="currentColor" fillOpacity="0.16" />
        <rect x="3" y="16" width="16" height="3.5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/sources",
    label: "Sources",
    description: "Every file: chats, documents, PDFs, spreadsheets.",
    tint: "#FCEBC5",
    ink: "#B58740",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" fill="currentColor" fillOpacity="0.16" />
        <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M14 3v5h5" />
        <path d="M8 13h8M8 17h6" />
      </svg>
    ),
  },
  {
    href: "/archive",
    label: "Archive",
    description: "Things you've set aside. Active, archived, forgotten.",
    tint: "#FFE0D0",
    ink: "#D87A5F",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="5" rx="1.5" fill="currentColor" fillOpacity="0.18" />
        <rect x="3" y="4" width="18" height="5" rx="1.5" />
        <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
        <path d="M10 13h4" strokeWidth="2" />
      </svg>
    ),
  },
];

const TOOLS_LINKS: NavLinkDef[] = [
  {
    href: "/curate",
    label: "Curate",
    description: "Hide individual items from views without changing the source.",
    tint: "#FCEBC5",
    ink: "#B58740",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 6.5l3 3 7-7" fill="currentColor" fillOpacity="0.18" />
        <path d="M5 6.5l3 3 7-7" />
        <path d="M5 13.5l3 3 7-7" />
        <path d="M5 20.5l3 3 7-7" opacity="0.55" />
      </svg>
    ),
  },
  {
    href: "/bundles",
    label: "Bundles",
    description: "Compiled exports for humans (Markdown) and agents (JSON).",
    tint: "#D9F2E2",
    ink: "#3D9968",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7.5l8 4 8-4-8-4-8 4Z" fill="currentColor" fillOpacity="0.20" />
        <path d="M4 7.5l8 4 8-4-8-4-8 4Z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 16.5l8 4 8-4" opacity="0.55" />
      </svg>
    ),
  },
];

export default async function Sidebar() {
  const [workspaces, brand, segments, concepts, sources] = await Promise.all([
    listWorkspaces(),
    loadDossierBrandConfig(),
    listSegments(),
    listConcepts(),
    listSourceFiles(),
  ]);
  const allowed = allowedWorkspacesForDisplay();

  // Count of items in archived state only (NOT forgotten). The Archive page
  // lands on the "archived" tab by default, so the sidebar badge needs to
  // match what the user sees when they click in — otherwise the badge says
  // 74 and the page shows 13, which is confusing. Forgotten items have
  // their own tab on /archive and are intentionally not badged in the nav
  // (they're set further away on purpose; the user knows where to find them).
  const archiveCount =
    segments.filter(
      (s) => ((s.lifecycle ?? "active") as LifecycleState) === "archived",
    ).length +
    concepts.filter(
      (c) => ((c.lifecycle ?? "active") as LifecycleState) === "archived",
    ).length +
    sources.filter(
      (f) =>
        (((f as unknown as { lifecycle?: LifecycleState }).lifecycle ??
          "active") as LifecycleState) === "archived",
    ).length;

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col md:bg-cream/30 md:border-r md:border-line md:self-stretch md:relative md:z-40">
      {/* Brand block — theme-aware logo. Sunset (default) keeps the constellation
          star tile. Savanna swaps in the leopard-hat-and-glasses brand mark
          (the Ben homage), which tips its hat on hover. */}
      <div className="px-7 py-8 flex items-center gap-3">
        {brand.theme === "savanna" ? (
          <Link
            href="/"
            className="no-underline shrink-0 inline-flex items-center justify-center rounded-2xl h-11 w-11 hat-tip-on-hover"
            style={{
              background:
                "linear-gradient(135deg, #FAEED0 0%, #E89B5C 100%)",
              boxShadow: "0 6px 16px -4px rgba(232, 155, 92, 0.55)",
            }}
            aria-label="Home"
          >
            <BrandMark size={32} animate={false} />
          </Link>
        ) : (
          <span
            aria-hidden
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl shrink-0"
            style={{
              background: "linear-gradient(135deg, #7DD3A0 0%, #F4C770 100%)",
              boxShadow: "0 6px 16px -4px rgba(125, 211, 160, 0.55)",
            }}
          >
            <svg viewBox="0 0 32 32" className="h-6 w-6 text-paper" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 10L18 6M18 6L24 14M24 14L14 22M14 22L8 10" opacity="0.5" />
              <circle cx="8" cy="10" r="1.5" fill="currentColor" />
              <circle cx="18" cy="6" r="1.8" fill="currentColor" />
              <circle cx="24" cy="14" r="1.6" fill="currentColor" />
              <circle cx="14" cy="22" r="1.4" fill="currentColor" />
              <circle cx="22" cy="24" r="1" fill="currentColor" opacity="0.7" />
            </svg>
          </span>
        )}
        <Link href="/" className="no-underline leading-tight min-w-0">
          {brand.wordmarkEyebrow && (
            <div className="eyebrow text-mint">{brand.wordmarkEyebrow}</div>
          )}
          <div className="font-display text-xl text-bright leading-tight font-extrabold">
            {brand.brandName}
          </div>
          {brand.parentBrand && (
            <div className="text-[10px] italic text-muted leading-tight mt-0.5 truncate">
              {brand.parentBrand}
            </div>
          )}
        </Link>
      </div>

      <nav className="px-5 mb-2">
        <div className="eyebrow px-2 mb-3 text-dim">Browse</div>
        <ul className="space-y-1">
          {PRIMARY_LINKS.map((link) => {
            const showCount = link.href === "/archive" && archiveCount > 0;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-body font-semibold no-underline transition-all duration-200 hover:translate-x-1 hover:text-bright hover:shadow-soft"
                  aria-describedby={`navtt-${link.href.replace(/\W/g, "")}`}
                >
                  {/* Hover background — uses the link's own tint color so each
                      nav item lights up in its own family on hover. Far more
                      visible than the previous bg-paper-on-cream which was
                      basically white-on-white. */}
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-200"
                    style={{ backgroundColor: link.tint }}
                  />
                  <span
                    aria-hidden
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-[-4deg]"
                    style={{
                      backgroundColor: link.tint,
                      color: link.ink,
                      boxShadow: `inset 0 0 0 1px ${link.ink}1A, 0 1px 3px ${link.ink}22`,
                    }}
                  >
                    <span className="h-[18px] w-[18px] inline-block">
                      {link.icon}
                    </span>
                  </span>
                  <span className="relative flex-1">{link.label}</span>
                  {showCount && (
                    <span
                      className="relative text-[11px] font-mono font-bold rounded-full px-2 py-0.5 shrink-0"
                      style={{
                        backgroundColor: `${link.ink}1F`,
                        color: link.ink,
                      }}
                      title={`${archiveCount} archived item${archiveCount === 1 ? "" : "s"}`}
                    >
                      {archiveCount}
                    </span>
                  )}
                  <NavTooltip text={link.description} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav className="px-5 mt-2">
        <div className="eyebrow px-2 mb-3 text-dim">Tools</div>
        <ul className="space-y-1">
          {TOOLS_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-body font-semibold no-underline transition-all duration-200 hover:translate-x-1 hover:text-bright hover:shadow-soft"
                aria-describedby={`navtt-${link.href.replace(/\W/g, "")}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-200"
                  style={{ backgroundColor: link.tint }}
                />
                <span
                  aria-hidden
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-[-4deg]"
                  style={{
                    backgroundColor: link.tint,
                    color: link.ink,
                    boxShadow: `inset 0 0 0 1px ${link.ink}1A, 0 1px 3px ${link.ink}22`,
                  }}
                >
                  <span className="h-[18px] w-[18px] inline-block">
                    {link.icon}
                  </span>
                </span>
                <span className="relative">{link.label}</span>
                <NavTooltip text={link.description} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav className="px-5 mt-4">
        <div className="eyebrow px-2 mb-3 flex items-center justify-between text-dim">
          <span>Workspaces</span>
          <span className="text-dim normal-case tracking-normal text-[11px] font-mono">
            {workspaces.length}
          </span>
        </div>
        <ul className="space-y-1">
          {workspaces.length === 0 && (
            <li className="px-3 py-2 text-xs text-dim">
              No workspaces visible.
            </li>
          )}
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <Link
                href={`/workspaces/${ws.id}`}
                className="group relative flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm text-body font-medium no-underline transition-all duration-200 hover:translate-x-1 hover:text-bright hover:shadow-softer"
              >
                {/* Hover background tinted with the workspace's own color so
                    each workspace lights up in its own family on hover. */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-200"
                  style={{ backgroundColor: ws.color || "#A89A88" }}
                />
                <span className="relative inline-flex transition-transform duration-200 group-hover:scale-110 group-hover:rotate-[-4deg]">
                  <WorkspaceBadge
                    id={ws.id}
                    color={ws.color}
                    size="sm"
                    glyph={ws.glyph}
                  />
                </span>
                <span className="relative truncate">{ws.name || ws.id}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto px-7 py-5 border-t border-line text-[11px] text-dim font-mono">
        {allowed ? (
          <div>
            <div className="eyebrow mb-1 text-mint">Scoped</div>
            <div className="text-muted">
              {allowed.length} workspace{allowed.length === 1 ? "" : "s"} exposed
            </div>
          </div>
        ) : (
          <div>
            <div className="eyebrow mb-1 text-mint">Scope</div>
            <div className="text-muted">All workspaces visible</div>
          </div>
        )}

        {/* Creator credit — authorship attribution, not copyright.
            "Voyager: Awakening Intelligence" is the link target so the
            attribution and the destination are the same line; viewers
            who click land on the docu-cast home. */}
        <div className="mt-4 pt-4 border-t border-line/60">
          <div className="eyebrow mb-1 text-mint">Designed by</div>
          <div className="text-body not-italic font-sans text-[11px] leading-snug">
            Dianne Krouse
          </div>
          <div className="text-muted text-[10px] italic font-sans leading-snug">
            host of{" "}
            <a
              href="https://youtube.com/@VoyagerQi7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-bright no-underline transition-colors"
              title="Voyager: Awakening Intelligence docu-cast on YouTube"
            >
              Voyager: Awakening Intelligence ↗
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

/**
 * Hover tooltip for nav items. Pops out to the right of the link with a
 * small arrow pointing back at it. Fades in 200ms on hover. The parent
 * <Link> must carry `class="group"` and `position: relative`.
 *
 * Styled in the same cream-paper / mint-border family as the brand byline
 * badge so it reads as part of the app, not as a system tooltip.
 *
 * Uses pointer-events: none so the tooltip never blocks clicks even when
 * mouse is over it.
 */
function NavTooltip({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 rounded-xl text-xs font-medium px-3.5 py-2 shadow-soft z-50"
      style={{
        backgroundColor: "#FAF4E6",
        color: "#3A2D24",
        border: "1px solid rgba(125, 211, 160, 0.45)",
        maxWidth: "240px",
        whiteSpace: "normal",
        lineHeight: "1.4",
      }}
    >
      {text}
      {/* Tiny arrow pointing left at the nav item — paper-cream with a
          mint-tinted left border so the join with the tooltip body is clean. */}
      <span
        aria-hidden
        className="absolute left-[-5px] top-1/2 -translate-y-1/2 h-[9px] w-[9px] rotate-45"
        style={{
          backgroundColor: "#FAF4E6",
          borderLeft: "1px solid rgba(125, 211, 160, 0.45)",
          borderBottom: "1px solid rgba(125, 211, 160, 0.45)",
        }}
      />
    </span>
  );
}
