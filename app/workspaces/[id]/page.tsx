import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import ConceptCard from "@/components/ui/ConceptCard";
import ChatCard from "@/components/ui/ChatCard";
import SegmentCard from "@/components/ui/SegmentCard";
import WorkspaceBadge from "@/components/ui/WorkspaceBadge";
import {
  getWorkspace,
  listConcepts,
  listSegments,
  listSourceFiles,
  loadLibraryCard,
} from "@/lib/dossier";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspacePage({ params }: PageProps) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  const [allConcepts, allSegments, allFiles, card] = await Promise.all([
    listConcepts(),
    listSegments(),
    listSourceFiles(),
    loadLibraryCard(),
  ]);
  const cardConcepts = new Set(
    card.items.filter((i) => i.kind === "concept").map((i) => i.id),
  );
  const cardSources = new Set(
    card.items.filter((i) => i.kind === "source").map((i) => i.id),
  );
  const cardSegments = new Set(
    card.items.filter((i) => i.kind === "segment").map((i) => i.id),
  );

  const concepts = allConcepts
    .filter((c) => {
      if (c.primary_workspace === id) return true;
      return (c.workspace_secondary ?? []).includes(id);
    })
    // Active-only (mirror of /concepts and the rest of the browser).
    .filter((c) => !c.lifecycle || c.lifecycle === "active");

  const segments = allSegments
    .filter((s) => {
      if (s.workspace_primary === id) return true;
      return (s.workspace_secondary ?? []).includes(id);
    })
    // Active-only (mirror of /segments).
    .filter((s) => !s.lifecycle || s.lifecycle === "active");

  // Per-file segment count for this workspace
  const segCountByFile = new Map<string, number>();
  for (const seg of segments) {
    const fileId =
      seg.file_id ??
      (seg.segment_id.includes("-s")
        ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
        : null);
    if (fileId) {
      segCountByFile.set(fileId, (segCountByFile.get(fileId) ?? 0) + 1);
    }
  }

  const sources = allFiles.filter(
    (f) => f.workspace_primary === id || segCountByFile.has(f.file_id),
  );

  // Sort sources by date desc
  const sortedSources = [...sources].sort((a, b) => {
    const da = a.date_detected ?? "";
    const db = b.date_detected ?? "";
    return db.localeCompare(da);
  });

  const accent = workspace.color || "#A89A88";

  return (
    <>
      {/* Custom hero with the workspace's own illustrated badge */}
      <header className="mb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-peach no-underline mb-4 group transition-colors"
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-paper border border-line group-hover:border-peach group-hover:shadow-softer transition-all"
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
              <path d="M10 3L5 8l5 5" />
            </svg>
          </span>
          <span>Overview</span>
        </Link>
        <div className="eyebrow mb-3 flex items-center gap-2" style={{ color: accent }}>
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: accent,
              boxShadow: `0 0 0 4px ${accent}22`,
            }}
          />
          {workspace.id}
        </div>
        <div className="flex items-end gap-5 flex-wrap">
          <div className="flex items-end gap-4">
            <WorkspaceBadge
              id={workspace.id}
              color={accent}
              size="lg"
              glyph={workspace.glyph}
            />
            <div>
              <h1 className="font-display text-4xl md:text-5xl text-bright leading-[1.05] font-extrabold tracking-tight">
                {workspace.name || workspace.id}
              </h1>
              {workspace.description && (
                <p className="mt-3 text-base text-muted leading-relaxed max-w-2xl">
                  {workspace.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats sticker row */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <span
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: `${accent}1F`, color: accent }}
          >
            {concepts.length} concepts
          </span>
          <span
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: `${accent}1F`, color: accent }}
          >
            {sortedSources.length} sources
          </span>
          <span
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: `${accent}1F`, color: accent }}
          >
            {segments.length} segments
          </span>
        </div>
      </header>

      <section className="mb-12">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright">
            Concepts
          </h2>
          <span className="text-xs text-dim font-mono">
            {concepts.length} total
          </span>
        </div>
        {concepts.length === 0 ? (
          <p className="text-sm text-muted">
            No concepts in this workspace yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {concepts.map((c) => (
              <ConceptCard
                key={c.concept_id}
                concept={c}
                workspaceColor={workspace.color}
                onCard={cardConcepts.has(c.concept_id)}
                showLifecycleToggle
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright">
            Sources
          </h2>
          <span className="text-xs text-dim font-mono">
            {sortedSources.length} total
          </span>
        </div>
        {sortedSources.length === 0 ? (
          <p className="text-sm text-muted">
            No sources in this workspace yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {sortedSources.map((file) => (
              <ChatCard
                key={file.file_id}
                file={file}
                segmentCount={segCountByFile.get(file.file_id) ?? 0}
                workspaceColor={accent}
                workspaceName={workspace.name}
                onCard={cardSources.has(file.file_id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Segments section — gives the workspace page a third pinnable kind
          so the user can pin a concept, a source, AND a segment from one
          page (the Scene 9 demo beat). Sorted by start_line within each
          source for some visual grouping; capped at 12 with a link to the
          filtered segments page for the full set. */}
      <section className="mb-12">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright">
            Segments
          </h2>
          <span className="text-xs text-dim font-mono">
            {segments.length} total
          </span>
        </div>
        {segments.length === 0 ? (
          <p className="text-sm text-muted">
            No segments in this workspace yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segments.slice(0, 12).map((seg) => {
                const fileId =
                  seg.file_id ??
                  (seg.segment_id.includes("-s")
                    ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
                    : null);
                const lineRange =
                  seg.start_line && seg.end_line
                    ? `?from=${seg.start_line}&to=${seg.end_line}`
                    : "";
                const href = fileId
                  ? `/chats/${fileId}${lineRange}`
                  : undefined;
                return (
                  <SegmentCard
                    key={seg.segment_id}
                    segment={seg}
                    workspaceColor={accent}
                    href={href}
                    showLifecycleToggle
                    showLibraryCardButton
                    onCard={cardSegments.has(seg.segment_id)}
                  />
                );
              })}
            </div>
            {segments.length > 12 && (
              <div className="mt-4 text-center">
                <Link
                  href={`/segments?workspace=${id}`}
                  className="inline-block text-xs font-semibold text-peach hover:text-bright no-underline transition-colors"
                >
                  See all {segments.length} segments in {workspace.name || id} →
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
