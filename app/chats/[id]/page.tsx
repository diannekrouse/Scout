import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import SegmentCard from "@/components/ui/SegmentCard";
import SourceWindow from "@/components/ui/SourceWindow";
import {
  getSourceFile,
  listAllSegmentsForFileForCuration,
  listWorkspaces,
  loadCurationOverlay,
  loadLibraryCard,
  readSourceBody,
} from "@/lib/dossier";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    line?: string;
    from?: string;
    to?: string;
    via?: string;
  }>;
}

export default async function ChatDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { line, from, to, via } = await searchParams;

  const file = await getSourceFile(id);
  if (!file) notFound();

  // Use the curation-bypassing variant so hidden segments are still visible
  // here — the user can see them dimmed and toggle them back on. The rest of
  // the app (workspace pages, search, library card) still respects the overlay.
  const [segments, workspaces, overlay, card] = await Promise.all([
    listAllSegmentsForFileForCuration(id),
    listWorkspaces(),
    loadCurationOverlay(),
    loadLibraryCard(),
  ]);
  const hiddenSegSet = new Set(overlay.hiddenSegmentIds);
  // Is THIS source already on the library card? Drives the source-window pin
  // button so the user can pin from inside the source-window beat in the demo
  // (the moment they're staring at the exact lines they want to capture).
  const sourceOnCard = card.items.some(
    (i) => i.kind === "source" && i.id === file.file_id,
  );
  // Set of segment IDs already on the library card — drives the per-segment
  // pin button (the one in the top-right of each segment card in the list
  // below the source window). Without this, the cards on the detail page were
  // missing the pin affordance that exists everywhere else.
  const cardSegments = new Set(
    card.items.filter((i) => i.kind === "segment").map((i) => i.id),
  );

  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#8899AA"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));

  const focusLine = line ? parseInt(line, 10) : undefined;
  const fromLine = from ? parseInt(from, 10) : undefined;
  const toLine = to ? parseInt(to, 10) : undefined;
  const showWindow = Boolean(focusLine || fromLine || toLine);

  const sourceBody = showWindow && file.path ? await readSourceBody(file.path) : null;

  const totalWords = segments.reduce((acc, s) => acc + (s.word_count ?? 0), 0);
  const allPersonas = new Set<string>();
  for (const s of segments) {
    for (const p of s.personas_detected ?? []) allPersonas.add(p);
  }
  const allTags = new Set<string>();
  for (const s of segments) {
    for (const t of s.tags ?? []) allTags.add(t);
  }

  // Sort segments by start_line ascending. Filter out archived/forgotten so
  // the detail page matches the rest of the browser (Chats / Sources /
  // Segments / Concepts all hide non-active items by default; /archive is the
  // single place where lifecycle state is managed). Previously this page
  // showed everything dimmed so the legacy eye-toggle could un-hide things;
  // lifecycle replaced that flow.
  const sortedSegments = [...segments]
    .filter((s) => !s.lifecycle || s.lifecycle === "active")
    .sort((a, b) => (a.start_line ?? 0) - (b.start_line ?? 0));

  const primaryWorkspace = file.workspace_primary;
  const accent = primaryWorkspace
    ? wsColor.get(primaryWorkspace)
    : sortedSegments[0]?.workspace_primary
    ? wsColor.get(sortedSegments[0].workspace_primary as string)
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow={`${file.platform || "source"} · ${file.file_id}`}
        title={file.title_detected || file.filename || file.file_id}
        accentColor={accent}
        subtitle={
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-dim">
            {file.date_detected && <span>{file.date_detected}</span>}
            {file.path && <span>{file.path}</span>}
          </div>
        }
        backHref={
          // If we're in source-window mode (line params present), back should
          // go to the segment list of THIS same chat (clears the line params).
          showWindow
            ? `/chats/${id}${via ? `?via=${via}` : ""}`
            : via === "curate-sources"
            ? "/curate?tab=sources"
            : primaryWorkspace
            ? `/workspaces/${primaryWorkspace}`
            : "/chats"
        }
        backLabel={
          showWindow
            ? "Segments"
            : via === "curate-sources"
            ? "Curate"
            : primaryWorkspace
            ? wsName.get(primaryWorkspace) || "Chats"
            : "Chats"
        }
      />

      {/* Stats grid */}
      <section className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Segments" value={sortedSegments.length} />
        <Stat label="Words" value={totalWords} />
        <Stat label="Personas" value={allPersonas.size} />
        <Stat label="Tags" value={allTags.size} />
      </section>

      {/* Source window if requested */}
      {showWindow && (
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold text-bright mb-4">
            Source window
          </h2>
          {sourceBody ? (
            <SourceWindow
              body={sourceBody}
              focusLine={focusLine}
              startLine={fromLine}
              endLine={toLine}
              sourceTitle={
                file.title_detected || file.filename || file.file_id
              }
              sourceFileId={file.file_id}
              sourcePlatform={file.platform || undefined}
              sourceOnCard={sourceOnCard}
            />
          ) : (
            <p className="text-sm text-muted">
              Source body not available for this file.
            </p>
          )}
        </section>
      )}

      {/* Segments list */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright">Segments</h2>
          <span className="text-xs text-dim font-mono">
            {sortedSegments.length} total
          </span>
        </div>

        {sortedSegments.length === 0 ? (
          <p className="text-sm text-muted">No segments indexed for this chat.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedSegments.map((seg) => (
              <SegmentCard
                key={seg.segment_id}
                segment={seg}
                workspaceColor={
                  seg.workspace_primary
                    ? wsColor.get(seg.workspace_primary)
                    : undefined
                }
                href={
                  seg.start_line
                    ? `?from=${seg.start_line}&to=${seg.end_line ?? seg.start_line}#source-window`
                    : undefined
                }
                hidden={hiddenSegSet.has(seg.segment_id)}
                showCurationToggle
                showLifecycleToggle
                showLibraryCardButton
                onCard={cardSegments.has(seg.segment_id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Workspace assignments summary — pills link to the workspace page */}
      {sortedSegments.length > 0 && (
        <section className="mb-10">
          <h3 className="font-display text-lg font-bold text-bright mb-3">
            Workspace assignments
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(
              new Set(
                sortedSegments.flatMap((s) => [
                  s.workspace_primary,
                  ...(s.workspace_secondary ?? []),
                ]),
              ),
            )
              .filter((id): id is string => Boolean(id))
              .map((id) => {
                const color = wsColor.get(id) || "#8899AA";
                return (
                  <Link
                    key={id}
                    href={`/workspaces/${id}`}
                    className="pill no-underline transition-all hover:-translate-y-0.5 hover:shadow-softer"
                    style={{
                      borderColor: `${color}55`,
                      color,
                      backgroundColor: `${color}0F`,
                    }}
                    title={`Open ${wsName.get(id) || id} workspace`}
                  >
                    {wsName.get(id) || id}
                    <span aria-hidden className="ml-1 opacity-60">→</span>
                  </Link>
                );
              })}
          </div>
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card card-pad">
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="font-display text-2xl font-bold text-bright tabular-nums">
        {value}
      </div>
    </div>
  );
}
