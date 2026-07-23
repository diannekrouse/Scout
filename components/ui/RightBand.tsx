/**
 * Persistent right-hand band. Always visible (on lg+ screens) regardless
 * of which page you're on. Self-fetching server component so it can live
 * in the layout without prop-drilling.
 *
 * Contains: hero scene (theme-aware illustration), stats grid, workspaces
 * row, Library Card panel with compile actions, bundle stats footer.
 */
import Link from "next/link";
import {
  listConcepts,
  listConceptEdges,
  listSourceFiles,
  listSegments,
  listWorkspaceSummaries,
  listBundleStats,
  dossierRootForDisplay,
  allowedWorkspacesForDisplay,
  loadLibraryCard,
  loadDossierBrandConfig,
} from "@/lib/dossier";
import { resolveTheme } from "@/themes";
import HeroScene from "@/components/ui/HeroScene";
import {
  clearLibraryCardAction,
  compileLibraryCardAction,
  toggleLibraryCardAction,
} from "@/app/actions/library-card";

export default async function RightBand() {
  const [concepts, files, segments, workspaceSummaries, card, brand, bundleStats, conceptEdges] =
    await Promise.all([
      listConcepts(),
      listSourceFiles(),
      listSegments(),
      listWorkspaceSummaries(),
      loadLibraryCard(),
      loadDossierBrandConfig(),
      listBundleStats(),
      listConceptEdges(),
    ]);

  // Graph expansion is offered only when there is a graph to walk and a
  // pinned concept to walk from.
  const offerExpand =
    conceptEdges.length > 0 && card.items.some((i) => i.kind === "concept");

  // Resolve titles + workspace info for each carded item.
  const conceptById = new Map(concepts.map((c) => [c.concept_id, c]));
  const fileById = new Map(files.map((f) => [f.file_id, f]));
  const segmentById = new Map(segments.map((s) => [s.segment_id, s]));
  const wsById = new Map(workspaceSummaries.map((w) => [w.id, w]));

  // For sources without an explicit workspace_primary, infer from segments
  const wsByFile = new Map<string, Map<string, number>>();
  for (const seg of segments) {
    const fid =
      seg.file_id ??
      (seg.segment_id.includes("-s")
        ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
        : null);
    if (!fid || !seg.workspace_primary) continue;
    const m = wsByFile.get(fid) ?? new Map<string, number>();
    m.set(
      seg.workspace_primary,
      (m.get(seg.workspace_primary) ?? 0) + 1,
    );
    wsByFile.set(fid, m);
  }
  function dominantWsFor(fileId: string): string | undefined {
    const m = wsByFile.get(fileId);
    if (!m) return undefined;
    let best: [string, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best?.[0];
  }

  const cardItems = card.items.map((item) => {
    let title = item.id;
    let subtitle = "";
    let workspaceId: string | undefined = undefined;
    if (item.kind === "concept") {
      const c = conceptById.get(item.id);
      title = c?.name || item.id;
      subtitle = c?.category || "concept";
      workspaceId = c?.primary_workspace;
    } else if (item.kind === "source") {
      const f = fileById.get(item.id);
      title = f?.title_detected || f?.filename || item.id;
      subtitle = f?.platform || "source";
      workspaceId = f?.workspace_primary ?? dominantWsFor(item.id);
    } else if (item.kind === "segment") {
      const s = segmentById.get(item.id);
      title = s?.title || item.id;
      subtitle = "segment";
      workspaceId = s?.workspace_primary;
    }
    const ws = workspaceId ? wsById.get(workspaceId) : undefined;
    return {
      ...item,
      title,
      subtitle,
      workspaceId,
      workspaceColor: ws?.color,
      workspaceName: ws?.name || workspaceId,
    };
  });

  const lastUpdated =
    workspaceSummaries
      .map((w) => w.lastUpdated)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop() ?? null;

  const dossierRoot = dossierRootForDisplay();
  const allowed = allowedWorkspacesForDisplay();

  // Display-friendly truncation of dossier root path
  const displayRoot =
    dossierRoot.length > 32
      ? "…" + dossierRoot.slice(-31)
      : dossierRoot;

  const theme = resolveTheme(brand.theme);

  return (
    <aside className="hidden lg:flex lg:w-80 lg:flex-col lg:self-stretch lg:border-l lg:border-line">
      {/* Theme-driven illustrated hero band */}
      <HeroScene theme={theme} greeting={brand.greeting} eyebrow={`Your ${brand.brandName}`} />

      {/* Stats body */}
      <div className="px-6 py-6 flex-1 bg-paper">
        <p className="text-xs text-muted leading-relaxed mb-5">
          A living substrate of conversations, line by line. Every concept
          traces back to a source.
        </p>

        <dl className="grid grid-cols-3 gap-2 text-center mb-3">
          <PassportStat
            label="concepts"
            value={concepts.length}
            accent="mint"
            href="/concepts"
          />
          <PassportStat
            label="sources"
            value={files.length}
            accent="sky"
            href="/sources"
          />
          <PassportStat
            label="segments"
            value={segments.length}
            accent="lilac"
            href="/segments"
          />
        </dl>

        {/* Workspaces count — positioned ABOVE the library card so the
            "shape of the substrate" is read first. Clickable: jumps to the
            home page workspace grid. */}
        <Link
          href="/#workspaces"
          className="block no-underline group mb-3"
        >
          <div className="rounded-2xl bg-cream/60 border border-line/70 px-3 py-2 flex items-center justify-between transition-all group-hover:bg-paper group-hover:border-peach/50 group-hover:shadow-softer">
            <span className="eyebrow text-peach">Workspaces</span>
            <span className="font-mono text-[11px] text-body">
              {workspaceSummaries.length}
              {allowed && ` / ${allowed.length} allowed`}
            </span>
          </div>
        </Link>

        {/* ============ Library Card ============ */}
        <LibraryCardPanel
          items={cardItems}
          bundleStats={bundleStats}
          offerExpand={offerExpand}
        />
        {/* ====================================== */}

        {/* TEMPORARILY HIDDEN for the SNET demo — restore after walkthrough.
            (Workspaces count moved above the Library Card; "Last activity"
            is suppressed because the dates reflect ingest time only.) */}
        {/* {lastUpdated && (
          <div className="rounded-2xl bg-cream2/40 border border-line/70 px-3 py-2 flex items-center justify-between">
            <span className="eyebrow text-mint">Last activity</span>
            <span className="font-mono text-[11px] text-body">
              {lastUpdated}
            </span>
          </div>
        )} */}
      </div>

      {/* Footer with dossier root */}
      <div className="px-6 py-4 border-t border-line bg-cream/30">
        <div className="eyebrow mb-1 text-mint">Source</div>
        <div
          className="text-[11px] text-body font-mono truncate"
          title={dossierRoot}
        >
          {displayRoot}
        </div>
        {allowed && (
          <div className="mt-2 text-[10px] text-muted font-mono">
            scoped: {allowed.join(", ")}
          </div>
        )}
      </div>
    </aside>
  );
}

const PASSPORT_TINTS: Record<string, { bg: string; text: string; ring: string }> = {
  peach: { bg: "rgba(255, 179, 154, 0.12)", text: "#D87A5F", ring: "#FFB39A" },
  mint: { bg: "rgba(125, 211, 160, 0.14)", text: "#3D9968", ring: "#7DD3A0" },
  sky: { bg: "rgba(155, 201, 232, 0.18)", text: "#4A87B0", ring: "#9BC9E8" },
  lilac: { bg: "rgba(200, 181, 217, 0.20)", text: "#7E63A0", ring: "#C8B5D9" },
};

function PassportStat({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number;
  accent?: keyof typeof PASSPORT_TINTS;
  href?: string;
}) {
  const tint = accent ? PASSPORT_TINTS[accent] : null;
  const inner = (
    <div
      className={
        "rounded-2xl border py-2.5 shadow-softer transition-all " +
        (href
          ? "group-hover:-translate-y-0.5 group-hover:shadow-soft cursor-pointer"
          : "")
      }
      style={{
        background: tint
          ? `linear-gradient(135deg, ${tint.bg} 0%, rgba(255,255,255,0.4) 100%), #FFFFFF`
          : undefined,
        borderColor: tint ? `${tint.ring}55` : undefined,
      }}
    >
      <div
        className="font-display text-lg tabular-nums leading-none font-extrabold"
        style={{ color: tint?.text ?? undefined }}
      >
        {value.toLocaleString()}
      </div>
      <div
        className="eyebrow mt-1"
        style={{ color: tint ? `${tint.text}aa` : undefined }}
      >
        {label}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block no-underline group">
        {inner}
      </Link>
    );
  }
  return inner;
}

interface ResolvedCardItem {
  kind: "concept" | "source" | "segment";
  id: string;
  title: string;
  subtitle: string;
  workspaceId?: string;
  workspaceColor?: string;
  workspaceName?: string;
}

const KIND_TINT: Record<
  ResolvedCardItem["kind"],
  { bg: string; text: string }
> = {
  concept: { bg: "rgba(200, 181, 217, 0.22)", text: "#7E63A0" },
  source: { bg: "rgba(125, 211, 160, 0.22)", text: "#3D9968" },
  segment: { bg: "rgba(155, 201, 232, 0.24)", text: "#4A87B0" },
};

/**
 * The Library Card panel — accumulates click-to-bookmarked items and lets
 * the user compile a focused bundle from just those items. After compile,
 * the items stay pinned (so users can compile both formats from the same
 * stack); a small footer line shows the ledger count + most recent compile
 * time so it's clear bundles aren't lost.
 */
function LibraryCardPanel({
  items,
  bundleStats,
  offerExpand,
}: {
  items: ResolvedCardItem[];
  bundleStats: { count: number; lastCreatedAt: string | null };
  /** Whether to offer graph expansion (a concept graph exists AND a concept is pinned). */
  offerExpand: boolean;
}) {
  const isEmpty = items.length === 0;
  return (
    <section
      className="rounded-2xl border-2 border-dashed p-3 mb-3"
      style={{
        borderColor: isEmpty ? "#E5DDD0" : "#7DD3A088",
        background: isEmpty
          ? "transparent"
          : "linear-gradient(160deg, rgba(125, 211, 160, 0.10) 0%, rgba(244, 199, 112, 0.06) 100%)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="eyebrow text-mint flex items-center gap-1.5">
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <path d="M2 6h12" />
            <circle cx="11" cy="9" r="0.6" fill="currentColor" />
          </svg>
          Library Card
        </div>
        {!isEmpty && (
          <span className="text-[11px] font-mono text-muted">
            {items.length}
          </span>
        )}
      </div>

      {isEmpty ? (
        <p className="text-[11px] text-dim leading-relaxed py-2">
          Click <span className="font-mono text-body">+</span> on any card to
          add it here. Compile a focused bundle from just what you collect.
        </p>
      ) : (
        <>
          <ul className="space-y-1.5 mb-3 max-h-72 overflow-y-auto">
            {items.map((it) => {
              const tint = KIND_TINT[it.kind];
              const wsColor = it.workspaceColor || "#A89A88";
              return (
                <li
                  key={`${it.kind}-${it.id}`}
                  className="flex items-center gap-2 rounded-xl bg-paper border-l-[3px] border border-line/70 px-2 py-1.5"
                  style={{ borderLeftColor: wsColor }}
                  title={it.workspaceName ? `Workspace: ${it.workspaceName}` : undefined}
                >
                  {/* Workspace color dot */}
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: wsColor,
                      boxShadow: `0 0 0 2px ${wsColor}33`,
                    }}
                  />
                  {/* Kind pill */}
                  <span
                    className="text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5 shrink-0"
                    style={{
                      backgroundColor: tint.bg,
                      color: tint.text,
                    }}
                  >
                    {it.kind}
                  </span>
                  {/* Title */}
                  <span className="flex-1 min-w-0 text-[11px] font-medium text-body leading-tight truncate">
                    {it.title}
                  </span>
                  <form action={toggleLibraryCardAction}>
                    <input type="hidden" name="kind" value={it.kind} />
                    <input type="hidden" name="id" value={it.id} />
                    <button
                      type="submit"
                      aria-label="Remove from card"
                      title="Remove"
                      className="text-dim hover:text-peach text-base leading-none"
                    >
                      ×
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>

          {offerExpand && (
            <label
              className="mb-1.5 flex items-center gap-1.5 text-[10px] text-dim cursor-pointer select-none"
              title="Expand pinned concepts one hop along the concept graph — related concepts and their crossings ride along with evidence references"
            >
              <input
                type="checkbox"
                name="expand"
                value="1"
                form="compile-bundle-form"
                className="h-3 w-3 accent-[#7DD3A0]"
              />
              Include related · 1 hop along the graph
            </label>
          )}
          <div className="flex gap-1.5">
            {/* One form, two format submits (the button's name/value rides
                the submit), so the expand checkbox governs both. */}
            <form
              id="compile-bundle-form"
              action={compileLibraryCardAction}
              className="flex-1 flex gap-1.5"
            >
              {/* Markdown — the human-format default. Inlines actual segment
                  content so you can paste it into any LLM chat (or read it
                  standalone). The bigger button because it's what people want. */}
              <button
                type="submit"
                name="format"
                value="markdown"
                className="flex-1 rounded-full px-3 py-2 text-xs font-semibold text-paper inline-flex items-center justify-center gap-1.5"
                style={{
                  background:
                    "linear-gradient(135deg, #7DD3A0 0%, #F4C770 100%)",
                  boxShadow: "0 3px 10px -3px rgba(125, 211, 160, 0.55)",
                }}
                title="Compile a Markdown bundle (inlines content; paste into any LLM chat)"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 2v9M4 7l4 4 4-4M2 13h12" />
                </svg>
                Compile · MD
              </button>
              {/* JSON — the agent format. Same data, structured for programmatic
                  consumption. Smaller button because most people want Markdown. */}
              <button
                type="submit"
                name="format"
                value="json"
                aria-label="Compile bundle as JSON for agents"
                title="Compile a JSON bundle (structured input for agents)"
                className="rounded-full h-8 px-3 text-[11px] font-bold inline-flex items-center justify-center text-body border border-line bg-paper hover:border-mint hover:text-bright transition-colors"
              >
                JSON
              </button>
            </form>
            <form action={clearLibraryCardAction}>
              <button
                type="submit"
                aria-label="Clear card"
                title="Clear card"
                className="rounded-full h-8 w-8 inline-flex items-center justify-center text-dim border border-line bg-paper hover:border-peach hover:text-peach"
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
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </form>
          </div>
        </>
      )}

      {/* Ledger footer — visible feedback that bundles are saved.
          Without this, users worry their pinned items disappeared into
          the void after pressing Compile. The card itself preserves the
          stack so you can compile both formats; this line points the user
          to where the compiled bundles actually live. */}
      <LibraryCardLedgerFooter
        bundleCount={bundleStats.count}
        lastCreatedAt={bundleStats.lastCreatedAt}
        cardHasItems={!isEmpty}
      />
    </section>
  );
}

function LibraryCardLedgerFooter({
  bundleCount,
  lastCreatedAt,
  cardHasItems,
}: {
  bundleCount: number;
  lastCreatedAt: string | null;
  cardHasItems: boolean;
}) {
  if (bundleCount === 0) return null;
  // Relative-time string. Server-rendered, so this snapshots at request
  // time; close enough for a "compiled a few minutes ago" hint.
  const rel = lastCreatedAt ? relativeTime(lastCreatedAt) : null;
  return (
    <div className="mt-3 pt-3 border-t border-line/60">
      <Link
        href="/bundles"
        className="block no-underline group/ledger -mx-1 px-2 py-1.5 rounded-xl hover:bg-paper/70 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3 shrink-0 text-mint"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 2.5h7.5L13 5v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
              <path d="M10 2.5V5h2.5" />
              <path d="M5.5 8h5M5.5 11h3" />
            </svg>
            <div className="text-[11px] text-body leading-tight">
              <strong className="text-bright">
                {bundleCount} bundle{bundleCount === 1 ? "" : "s"}
              </strong>{" "}
              <span className="text-dim">
                in the ledger
                {rel ? ` · last ${rel}` : ""}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-dim shrink-0 group-hover/ledger:text-bright transition-colors">
            View →
          </span>
        </div>
      </Link>
      {cardHasItems && (
        <p className="text-[10px] text-dim leading-snug mt-2 px-2">
          Items stay pinned after compile so you can re-bundle in the other
          format. Use <span className="font-mono">×</span> to clear.
        </p>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!then) return "just now";
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 2) return "a minute ago";
  if (min < 60) return `${min} minutes ago`;
  const hr = Math.round(min / 60);
  if (hr < 2) return "an hour ago";
  if (hr < 24) return `${hr} hours ago`;
  const d = Math.round(hr / 24);
  if (d < 2) return "yesterday";
  if (d < 30) return `${d} days ago`;
  // Fall back to date for older bundles
  return new Date(then).toLocaleDateString();
}
