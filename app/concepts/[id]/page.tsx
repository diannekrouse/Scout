import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import SegmentCard from "@/components/ui/SegmentCard";
import {
  getConcept,
  listSegments,
  listConcepts,
  listConceptEdges,
  listWorkspaces,
  loadLibraryCard,
} from "@/lib/dossier";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ via?: string }>;
}

export default async function ConceptPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { via } = await searchParams;
  const concept = await getConcept(id);
  if (!concept) notFound();

  const [allSegments, allConcepts, edges, workspaces, card] = await Promise.all([
    listSegments(),
    listConcepts(),
    listConceptEdges(),
    listWorkspaces(),
    loadLibraryCard(),
  ]);
  // Pinned segment IDs — drives the pin button on each segment card below.
  const cardSegments = new Set(
    card.items.filter((i) => i.kind === "segment").map((i) => i.id),
  );

  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#8899AA"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));

  const sourceSegmentIds = new Set(concept.source_segments ?? []);
  const sourceSegments = allSegments.filter((s) =>
    sourceSegmentIds.has(s.segment_id),
  );

  // Related: union of explicit related_concepts AND graph neighbors
  const relatedIds = new Set<string>(concept.related_concepts ?? []);
  for (const edge of edges) {
    if (edge.from === concept.concept_id && edge.to) relatedIds.add(edge.to);
    if (edge.to === concept.concept_id && edge.from) relatedIds.add(edge.from);
  }
  relatedIds.delete(concept.concept_id);
  const related = allConcepts.filter((c) => relatedIds.has(c.concept_id));

  // Cross-workspace refs: concepts in other workspaces that share related ties
  const crossWorkspaceRefs = related.filter(
    (c) => c.primary_workspace !== concept.primary_workspace,
  );

  const accent = concept.primary_workspace
    ? wsColor.get(concept.primary_workspace)
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow={
          concept.primary_workspace
            ? `${wsName.get(concept.primary_workspace) || concept.primary_workspace}${concept.category ? ` · ${concept.category}` : ""}`
            : concept.category
        }
        title={concept.name || concept.concept_id}
        accentColor={accent}
        subtitle={concept.summary}
        decor="concept"
        backHref={
          via === "curate-concepts"
            ? "/curate?tab=concepts"
            : concept.primary_workspace
            ? `/workspaces/${concept.primary_workspace}`
            : "/concepts"
        }
        backLabel={
          via === "curate-concepts"
            ? "Curate"
            : concept.primary_workspace
            ? wsName.get(concept.primary_workspace) || "Concepts"
            : "Concepts"
        }
      />

      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright">
            Source segments
          </h2>
          <span className="text-xs text-dim font-mono">
            {sourceSegments.length} total
          </span>
        </div>
        {sourceSegments.length === 0 ? (
          <p className="text-sm text-muted">
            No segments are linked to this concept.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sourceSegments.map((seg) => {
              const fileId =
                seg.file_id ??
                (seg.segment_id.includes("-s")
                  ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
                  : null);
              const lineRange =
                seg.start_line && seg.end_line
                  ? `?from=${seg.start_line}&to=${seg.end_line}`
                  : "";
              const href = fileId ? `/chats/${fileId}${lineRange}` : undefined;
              return (
                <SegmentCard
                  key={seg.segment_id}
                  segment={seg}
                  workspaceColor={accent}
                  href={href}
                  showLibraryCardButton
                  onCard={cardSegments.has(seg.segment_id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold text-bright mb-4">
            Related concepts
          </h2>
          <div className="flex flex-wrap gap-2">
            {related.map((c) => {
              const color = c.primary_workspace
                ? wsColor.get(c.primary_workspace)
                : undefined;
              return (
                <Link
                  key={c.concept_id}
                  href={`/concepts/${c.concept_id}`}
                  className="pill no-underline hover:border-peach hover:text-bright"
                  style={
                    color
                      ? { borderColor: `${color}55`, color }
                      : undefined
                  }
                >
                  {c.name || c.concept_id}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {crossWorkspaceRefs.length > 0 && (
        <section className="mb-10">
          <h3 className="font-display text-lg font-bold text-bright mb-3">
            Cross-workspace references
          </h3>
          <ul className="space-y-1.5">
            {crossWorkspaceRefs.map((c) => (
              <li
                key={`xw-${c.concept_id}`}
                className="text-sm text-muted"
              >
                <Link
                  href={`/concepts/${c.concept_id}`}
                  className="text-bright"
                >
                  {c.name || c.concept_id}
                </Link>{" "}
                <span className="text-dim font-mono text-[11px]">
                  in {wsName.get(c.primary_workspace || "") || c.primary_workspace}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
