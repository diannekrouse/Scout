import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SegmentCard from "@/components/ui/SegmentCard";
import {
  listSegments,
  listWorkspaces,
  loadLibraryCard,
  loadDossierBrandConfig,
} from "@/lib/dossier";

interface PageProps {
  searchParams: Promise<{ workspace?: string; tag?: string }>;
}

export default async function SegmentsPage({ searchParams }: PageProps) {
  const { workspace: wsFilter, tag: tagFilter } = await searchParams;
  const [allSegments, workspaces, card, brand] = await Promise.all([
    listSegments(),
    listWorkspaces(),
    loadLibraryCard(),
    loadDossierBrandConfig(),
  ]);
  // Active-only on the main browser. Archived/forgotten segments live on
  // /archive (mirror of the same filter applied to Chats and Sources).
  const segments = allSegments.filter(
    (s) => !s.lifecycle || s.lifecycle === "active",
  );
  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#A89A88"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));
  const cardSegments = new Set(
    card.items.filter((i) => i.kind === "segment").map((i) => i.id),
  );

  // Compute counts per workspace once for the filter pills.
  const countByWs = new Map<string, number>();
  for (const seg of segments) {
    const all = [
      seg.workspace_primary,
      ...(seg.workspace_secondary ?? []),
    ].filter((x): x is string => Boolean(x));
    const seen = new Set(all);
    for (const ws of seen) {
      countByWs.set(ws, (countByWs.get(ws) ?? 0) + 1);
    }
  }

  // Apply filters: workspace and/or tag. Both can be active at once
  // (e.g. /segments?workspace=qwestor&tag=memory).
  let filtered = segments;
  if (wsFilter) {
    filtered = filtered.filter((s) => {
      if (s.workspace_primary === wsFilter) return true;
      return (s.workspace_secondary ?? []).includes(wsFilter);
    });
  }
  if (tagFilter) {
    filtered = filtered.filter((s) => (s.tags ?? []).includes(tagFilter));
  }

  // Newest segments first (segment_id often carries date order)
  const sorted = [...filtered].sort((a, b) =>
    b.segment_id.localeCompare(a.segment_id),
  );

  // Build the pill list — workspaces from workspaces.json, sorted by their order
  const pills = workspaces.map((w) => ({
    id: w.id,
    name: w.name || w.id,
    color: w.color || "#A89A88",
    count: countByWs.get(w.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Segments`}
        title="Segment library"
        subtitle={
          <>
            Topic-coherent chunks lifted from your conversations and documents.
            Click any segment to jump to its exact line range in the source.
          </>
        }
        decor="concept"
      />

      {/* Workspace filter pills */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Link
          href="/segments"
          className={
            "no-underline rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-2 transition-all " +
            (!wsFilter && !tagFilter
              ? "bg-gold/30 text-bright shadow-softer"
              : "bg-paper border border-line text-body hover:border-mint")
          }
        >
          <span>All</span>
          <span className="text-[11px] font-mono text-dim">
            {segments.length}
          </span>
        </Link>
        {pills.map((p) => {
          const isActive = wsFilter === p.id;
          // Preserve the active tag filter when clicking a workspace pill
          // so workspace + tag combine.
          const href = tagFilter
            ? `/segments?workspace=${p.id}&tag=${encodeURIComponent(tagFilter)}`
            : `/segments?workspace=${p.id}`;
          return (
            <Link
              key={p.id}
              href={href}
              className={
                "no-underline rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-2 transition-all " +
                (isActive
                  ? "shadow-soft"
                  : "bg-paper border border-line text-body hover:border-mint")
              }
              style={
                isActive
                  ? {
                      background: `${p.color}22`,
                      color: p.color,
                      boxShadow: `0 0 0 2px ${p.color}55`,
                    }
                  : undefined
              }
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span>{p.name}</span>
              <span className="text-[11px] font-mono text-dim">{p.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Active tag filter chip — shows when ?tag= is in the URL. Clicking
          the × clears the tag (preserves any active workspace filter). */}
      {tagFilter && (
        <div className="mb-6 flex items-center gap-2 text-xs">
          <span className="text-dim">Filtered by tag:</span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono font-semibold"
            style={{
              backgroundColor: "rgba(125, 211, 160, 0.20)",
              color: "#3D9968",
              border: "1px solid rgba(125, 211, 160, 0.55)",
            }}
          >
            #{tagFilter}
            <Link
              href={
                wsFilter ? `/segments?workspace=${wsFilter}` : "/segments"
              }
              className="text-mint hover:text-bright no-underline transition-colors"
              title="Clear tag filter"
              aria-label="Clear tag filter"
            >
              ×
            </Link>
          </span>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">
          No segments match this filter.
        </p>
      ) : (
        <>
          <div className="text-xs text-dim font-mono mb-4">
            {sorted.length.toLocaleString()} segment
            {sorted.length === 1 ? "" : "s"}
            {wsFilter ? ` in ${wsName.get(wsFilter) || wsFilter}` : ""}
            {tagFilter ? ` tagged #${tagFilter}` : ""}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.slice(0, 200).map((seg) => {
              const fileId =
                seg.file_id ??
                (seg.segment_id.includes("-s")
                  ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
                  : null);
              const lineParam =
                seg.start_line && seg.end_line
                  ? `?from=${seg.start_line}&to=${seg.end_line}`
                  : "";
              const href = fileId ? `/chats/${fileId}${lineParam}` : undefined;
              return (
                <SegmentCard
                  key={seg.segment_id}
                  segment={seg}
                  workspaceColor={
                    seg.workspace_primary
                      ? wsColor.get(seg.workspace_primary)
                      : undefined
                  }
                  href={href}
                  showLifecycleToggle
                  showLibraryCardButton
                  onCard={cardSegments.has(seg.segment_id)}
                />
              );
            })}
          </div>
          {sorted.length > 200 && (
            <p className="mt-6 text-xs text-dim text-center font-mono">
              Showing the first 200 of {sorted.length.toLocaleString()}. Use
              filter pills to narrow further.
            </p>
          )}
        </>
      )}
    </>
  );
}
