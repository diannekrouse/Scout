import fs from "node:fs/promises";
import path from "node:path";
import PageHeader from "@/components/ui/PageHeader";
import {
  listWorkspaces,
  listAllSourceFilesForCuration,
  listAllConceptsForCuration,
  listSegments,
  loadCurationOverlay,
  curationRootPathForDisplay,
  dossierRootForDisplay,
  loadDossierBrandConfig,
} from "@/lib/dossier";
import {
  toggleCurationAction,
  resetCurationAction,
  exportBundleAction,
} from "./actions";

/**
 * Look up the most recent bundle file in <SUBSTRATE_ROOT>/bundles/ so we can
 * show a "Last bundle: …" pill on the curate page after an export.
 */
async function readMostRecentBundle(): Promise<{
  filename: string;
  fullPath: string;
  size: number;
  createdAt: string | null;
} | null> {
  const dossierRoot = dossierRootForDisplay();
  const bundleDir = path.join(dossierRoot, "bundles");
  let entries: string[];
  try {
    entries = await fs.readdir(bundleDir);
  } catch {
    return null;
  }
  // Most recent FULL bundle from the curate page export. Matches both the
  // legacy `qwestor-bundle-*.json` and the newer `{workspace}_bundle_*.json`
  // / `{workspace}_bundle_*.md` shapes.
  const candidates = entries
    .filter(
      (n) =>
        (n.startsWith("qwestor-bundle-") || n.includes("_bundle_")) &&
        (n.endsWith(".json") || n.endsWith(".md")),
    )
    .sort();
  if (candidates.length === 0) return null;
  const latest = candidates[candidates.length - 1];
  const fullPath = path.join(bundleDir, latest);
  try {
    const stat = await fs.stat(fullPath);
    return {
      filename: latest,
      fullPath,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CuratePage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const currentTab: "sources" | "concepts" =
    tab === "concepts" ? "concepts" : "sources";

  const [workspaces, files, concepts, segments, overlay, lastBundle, brand] =
    await Promise.all([
      listWorkspaces(),
      listAllSourceFilesForCuration(),
      listAllConceptsForCuration(),
      listSegments(),
      loadCurationOverlay(),
      readMostRecentBundle(),
      loadDossierBrandConfig(),
    ]);

  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#A89A88"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));

  const hiddenFiles = new Set(overlay.hiddenFileIds);
  const hiddenConcepts = new Set(overlay.hiddenConceptIds);

  // Build a per-file workspace tally from segments — the source's workspace_primary
  // is often unset on real dossiers, but its segments carry workspace_primary.
  const wsByFile = new Map<string, Map<string, number>>();
  for (const seg of segments) {
    const fid =
      seg.file_id ??
      (seg.segment_id.includes("-s")
        ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
        : null);
    if (!fid) continue;
    const ws = seg.workspace_primary;
    if (!ws) continue;
    const m = wsByFile.get(fid) ?? new Map<string, number>();
    m.set(ws, (m.get(ws) ?? 0) + 1);
    wsByFile.set(fid, m);
  }
  function dominantWorkspace(fileId: string): string | undefined {
    const m = wsByFile.get(fileId);
    if (!m) return undefined;
    let best: [string, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best?.[0];
  }

  // Group sources by their dominant workspace (falling back to "unscoped")
  const sourcesByWs = new Map<string, typeof files>();
  for (const f of files) {
    const key =
      f.workspace_primary ?? dominantWorkspace(f.file_id) ?? "unscoped";
    const list = sourcesByWs.get(key) ?? [];
    list.push(f);
    sourcesByWs.set(key, list);
  }
  // Sort sources within each group by date desc
  for (const list of sourcesByWs.values()) {
    list.sort((a, b) =>
      (b.date_detected ?? "").localeCompare(a.date_detected ?? ""),
    );
  }

  // Group concepts by primary workspace
  const conceptsByWs = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const key = c.primary_workspace || "unscoped";
    const list = conceptsByWs.get(key) ?? [];
    list.push(c);
    conceptsByWs.set(key, list);
  }
  for (const list of conceptsByWs.values()) {
    list.sort((a, b) => (a.name || a.concept_id).localeCompare(b.name || b.concept_id));
  }

  // Stats
  const visibleSources = files.length - hiddenFiles.size;
  const visibleConcepts = concepts.length - hiddenConcepts.size;
  const totalHidden = hiddenFiles.size + hiddenConcepts.size;

  // Workspace ordering (use the order from workspaces.json)
  const wsOrder = workspaces.map((w) => w.id);
  function sortGroups<T>(map: Map<string, T>): [string, T][] {
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = wsOrder.indexOf(a);
      const bi = wsOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }
  const sourceGroups = sortGroups(sourcesByWs);
  const conceptGroups = sortGroups(conceptsByWs);

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Curate`}
        title="Curate the demo"
        subtitle={
          <>
            Click any card to toggle whether it appears in the rest of the
            reader. Hidden items stay in the substrate (your source files are
            never modified) but they disappear from every other view until you
            bring them back. Choices save to{" "}
            <span className="font-mono text-body">curation.json</span> at the
            substrate root.
          </>
        }
        decor="constellation"
      />

      {/* Header bar */}
      <div className="card card-pad mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <StatusPill
            label="Visible sources"
            value={`${visibleSources} / ${files.length}`}
            color="#7DD3A0"
          />
          <StatusPill
            label="Visible concepts"
            value={`${visibleConcepts} / ${concepts.length}`}
            color="#9BC9E8"
          />
          {totalHidden > 0 && (
            <StatusPill
              label="Hidden"
              value={String(totalHidden)}
              color="#C8B5D9"
            />
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <form action={resetCurationAction}>
            <button type="submit" className="btn">
              Reset (show all)
            </button>
          </form>
          <form action={exportBundleAction}>
            <button
              type="submit"
              className="rounded-full px-5 py-2 text-sm font-semibold text-paper inline-flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, #7DD3A0 0%, #F4C770 100%)",
                boxShadow: "0 4px 12px -4px rgba(125, 211, 160, 0.5)",
              }}
            >
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v9M4 7l4 4 4-4M2 13h12" />
              </svg>
              Compile bundle
            </button>
          </form>
        </div>
      </div>

      {lastBundle && <LastBundlePill info={lastBundle} />}

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <a
          href="/curate?tab=sources"
          className={
            "rounded-full px-5 py-2 text-sm font-semibold no-underline transition-all " +
            (currentTab === "sources"
              ? "bg-gold/30 text-bright shadow-softer"
              : "bg-paper border border-line text-body hover:border-mint")
          }
        >
          Sources <span className="font-mono ml-1 text-dim">{files.length}</span>
        </a>
        <a
          href="/curate?tab=concepts"
          className={
            "rounded-full px-5 py-2 text-sm font-semibold no-underline transition-all " +
            (currentTab === "concepts"
              ? "bg-gold/30 text-bright shadow-softer"
              : "bg-paper border border-line text-body hover:border-mint")
          }
        >
          Concepts{" "}
          <span className="font-mono ml-1 text-dim">{concepts.length}</span>
        </a>
      </div>

      {/* Body */}
      {currentTab === "sources" ? (
        <>
          {sourceGroups.map(([wsId, list]) => {
            const color = wsColor.get(wsId) ?? "#A89A88";
            const name = wsName.get(wsId) ?? wsId;
            const groupVisible = list.filter(
              (f) => !hiddenFiles.has(f.file_id),
            ).length;
            return (
              <section key={wsId} className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 0 4px ${color}22`,
                    }}
                  />
                  <h2 className="font-display text-xl font-bold text-bright">
                    {name}
                  </h2>
                  <span className="text-xs text-dim font-mono">
                    {groupVisible} / {list.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {list.map((f) => (
                    <CurationCard
                      key={f.file_id}
                      kind="source"
                      id={f.file_id}
                      title={f.title_detected || f.filename || f.file_id}
                      eyebrow={`${f.platform || "source"} · ${f.date_detected ?? ""}`}
                      hidden={hiddenFiles.has(f.file_id)}
                      accent={color}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <>
          {conceptGroups.map(([wsId, list]) => {
            const color = wsColor.get(wsId) ?? "#A89A88";
            const name = wsName.get(wsId) ?? wsId;
            const groupVisible = list.filter(
              (c) => !hiddenConcepts.has(c.concept_id),
            ).length;
            return (
              <section key={wsId} className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 0 4px ${color}22`,
                    }}
                  />
                  <h2 className="font-display text-xl font-bold text-bright">
                    {name}
                  </h2>
                  <span className="text-xs text-dim font-mono">
                    {groupVisible} / {list.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {list.map((c) => (
                    <CurationCard
                      key={c.concept_id}
                      kind="concept"
                      id={c.concept_id}
                      title={c.name || c.concept_id}
                      eyebrow={c.category || "concept"}
                      summary={c.summary}
                      hidden={hiddenConcepts.has(c.concept_id)}
                      accent={color}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      <p className="mt-12 text-[11px] font-mono text-dim">
        overlay file: {curationRootPathForDisplay()}
      </p>
    </>
  );
}

function StatusPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium text-xs"
      style={{
        backgroundColor: `${color}1F`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      <span className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

function LastBundlePill({
  info,
}: {
  info: {
    filename: string;
    fullPath: string;
    size: number;
    createdAt: string | null;
  };
}) {
  const sizeKb = (info.size / 1024).toFixed(0);
  const ts = info.createdAt
    ? new Date(info.createdAt).toLocaleString()
    : null;
  return (
    <div
      className="mb-6 rounded-2xl border px-4 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
      style={{
        background: "linear-gradient(135deg, #D9F2E2 0%, #FCEBC5 100%)",
        borderColor: "#7DD3A055",
      }}
    >
      <span
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper shrink-0"
        style={{
          color: "#3D9968",
          boxShadow: "0 2px 8px -2px rgba(125, 211, 160, 0.4)",
        }}
      >
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8l3.5 3.5L13 5" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-mint">
          Last bundle compiled
        </div>
        <div
          className="font-mono text-xs text-body truncate"
          title={info.fullPath}
        >
          {info.filename}
        </div>
      </div>
      <div className="text-[11px] font-mono text-muted shrink-0">
        {sizeKb} KB · {ts}
      </div>
    </div>
  );
}

interface CurationCardProps {
  kind: "source" | "concept" | "segment";
  id: string;
  title: string;
  eyebrow: string;
  summary?: string;
  hidden: boolean;
  accent: string;
}

/**
 * Two click targets per card:
 *   - Body (eyebrow + title + summary) opens the detail page in a NEW TAB so
 *     you can preview content without leaving /curate or losing scroll position.
 *   - Checkbox in the corner is its own form-submit button that toggles the
 *     overlay state via the server action.
 */
function CurationCard({
  kind,
  id,
  title,
  eyebrow,
  summary,
  hidden,
  accent,
}: CurationCardProps) {
  // The `via` param tells the destination page where the user came from so
  // its back arrow can return them to /curate instead of the workspace.
  const detailHref =
    kind === "source"
      ? `/chats/${id}?via=curate-sources`
      : kind === "concept"
      ? `/concepts/${id}?via=curate-concepts`
      : undefined;

  return (
    <div
      className={
        "rounded-2xl border bg-paper transition-all relative overflow-hidden " +
        (hidden
          ? "border-line opacity-50 hover:opacity-90"
          : "border-line hover:border-mint hover:shadow-softer")
      }
      style={
        !hidden
          ? {
              background: `linear-gradient(160deg, ${accent}10 0%, #FFFFFF 60%)`,
            }
          : undefined
      }
    >
      {/* Body — opens detail page in a new tab for safe preview */}
      {detailHref ? (
        <a
          href={detailHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 pr-12 no-underline group/body"
          title="Open in new tab to review content"
        >
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-1"
            style={{ color: hidden ? "#A89A88" : accent }}
          >
            {eyebrow}
          </div>
          <div className="font-display text-sm font-bold text-bright leading-snug mb-1 line-clamp-2 group-hover/body:underline decoration-mint/60 underline-offset-2">
            {title}
          </div>
          {summary && (
            <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
              {summary}
            </p>
          )}
          <div className="text-[10px] font-mono text-dim mt-2 flex items-center gap-1.5">
            <span>{id}</span>
            <span className="text-mint group-hover/body:opacity-100 opacity-60">
              ↗ preview
            </span>
          </div>
        </a>
      ) : (
        <div className="p-4 pr-12">
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-semibold mb-1"
            style={{ color: hidden ? "#A89A88" : accent }}
          >
            {eyebrow}
          </div>
          <div className="font-display text-sm font-bold text-bright leading-snug mb-1 line-clamp-2">
            {title}
          </div>
          {summary && (
            <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
              {summary}
            </p>
          )}
          <div className="text-[10px] font-mono text-dim mt-2">{id}</div>
        </div>
      )}

      {/* Checkbox toggle — its own tiny form so the click never navigates */}
      <form
        action={toggleCurationAction}
        className="absolute top-3 right-3"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          aria-label={hidden ? "Show this item" : "Hide this item"}
          title={hidden ? "Show this item" : "Hide this item"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all hover:scale-110"
          style={{
            backgroundColor: hidden ? "#FFFFFF" : accent,
            borderColor: hidden ? "#E5DDD0" : accent,
            color: "#FFFFFF",
            boxShadow: hidden ? "none" : `0 2px 6px -2px ${accent}88`,
          }}
        >
          {!hidden && (
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8l3.5 3.5L13 5" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
