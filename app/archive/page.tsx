import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SegmentCard from "@/components/ui/SegmentCard";
import ConceptCard from "@/components/ui/ConceptCard";
import ChatCard from "@/components/ui/ChatCard";
import {
  listSegments,
  listConcepts,
  listSourceFiles,
  listWorkspaces,
  loadDossierBrandConfig,
  type LifecycleState,
} from "@/lib/dossier";

interface PageProps {
  searchParams: Promise<{ state?: string }>;
}

const ALLOWED_STATES = ["active", "archived", "forgotten"] as const;

const STATE_TINTS: Record<
  (typeof ALLOWED_STATES)[number],
  { bg: string; text: string; ring: string }
> = {
  active: { bg: "rgba(125, 211, 160, 0.18)", text: "#3D9968", ring: "#7DD3A0" },
  archived: {
    bg: "rgba(244, 199, 112, 0.22)",
    text: "#B58740",
    ring: "#F4C770",
  },
  forgotten: {
    bg: "rgba(200, 181, 217, 0.30)",
    text: "#7E63A0",
    ring: "#C8B5D9",
  },
};

export default async function ArchivePage({ searchParams }: PageProps) {
  const { state } = await searchParams;
  const requested = (state ?? "archived").toLowerCase();
  const current = (
    ALLOWED_STATES.find((s) => s === requested) ?? "archived"
  ) as (typeof ALLOWED_STATES)[number];

  const [segments, concepts, sources, workspaces, brand] = await Promise.all([
    listSegments(),
    listConcepts(),
    listSourceFiles(),
    listWorkspaces(),
    loadDossierBrandConfig(),
  ]);

  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#A89A88"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));

  const fileLifecycle = (f: (typeof sources)[number]): LifecycleState =>
    ((f as unknown as { lifecycle?: LifecycleState }).lifecycle ?? "active");

  const segMatches = segments.filter(
    (s) => (s.lifecycle ?? "active") === current,
  );
  const conMatches = concepts.filter(
    (c) => (c.lifecycle ?? "active") === current,
  );
  const srcMatches = sources.filter((f) => fileLifecycle(f) === current);

  const counts = {
    active: {
      segments: segments.filter((s) => (s.lifecycle ?? "active") === "active")
        .length,
      concepts: concepts.filter((c) => (c.lifecycle ?? "active") === "active")
        .length,
      sources: sources.filter((f) => fileLifecycle(f) === "active").length,
    },
    archived: {
      segments: segments.filter((s) => s.lifecycle === "archived").length,
      concepts: concepts.filter((c) => c.lifecycle === "archived").length,
      sources: sources.filter((f) => fileLifecycle(f) === "archived").length,
    },
    forgotten: {
      segments: segments.filter((s) => s.lifecycle === "forgotten").length,
      concepts: concepts.filter((c) => c.lifecycle === "forgotten").length,
      sources: sources.filter((f) => fileLifecycle(f) === "forgotten").length,
    },
  };

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Archive`}
        title="Lifecycle"
        subtitle={
          <>
            Things you&apos;ve set aside. Three states, one click between each.
          </>
        }
        decor="archive"
      />

      {/* Plain-English explainer of the three states. Sits below the header
          so it doesn't crowd the title but appears before the toggle pills
          so users know what they're clicking into. */}
      <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div
          className="rounded-2xl p-4 border"
          style={{
            backgroundColor: STATE_TINTS.active.bg,
            borderColor: `${STATE_TINTS.active.ring}55`,
          }}
        >
          <div
            className="eyebrow mb-1.5"
            style={{ color: STATE_TINTS.active.text }}
          >
            Active
          </div>
          <p className="text-body leading-relaxed">
            In play. Visible everywhere in the reader. The default state.
          </p>
        </div>
        <div
          className="rounded-2xl p-4 border"
          style={{
            backgroundColor: STATE_TINTS.archived.bg,
            borderColor: `${STATE_TINTS.archived.ring}55`,
          }}
        >
          <div
            className="eyebrow mb-1.5"
            style={{ color: STATE_TINTS.archived.text }}
          >
            Archived
          </div>
          <p className="text-body leading-relaxed">
            Set aside but kept close. Hidden from the main browser, easy to
            find here, one click to restore. Think{" "}
            <em className="text-muted">&ldquo;not now.&rdquo;</em>
          </p>
        </div>
        <div
          className="rounded-2xl p-4 border"
          style={{
            backgroundColor: STATE_TINTS.forgotten.bg,
            borderColor: `${STATE_TINTS.forgotten.ring}55`,
          }}
        >
          <div
            className="eyebrow mb-1.5"
            style={{ color: STATE_TINTS.forgotten.text }}
          >
            Forgotten
          </div>
          <p className="text-body leading-relaxed">
            Tucked away. Hidden from every default view, including this one
            unless you toggle in. Nothing leaves the substrate. Think{" "}
            <em className="text-muted">&ldquo;out of mind, not gone.&rdquo;</em>
          </p>
        </div>
      </section>

      {/* How-to note in a softer, less wordy style than the previous header */}
      <p className="text-xs text-dim mb-6 leading-relaxed">
        <strong className="text-muted">To change state:</strong> click the
        lifecycle pill on any card. It cycles{" "}
        <span className="font-mono">active</span> →{" "}
        <span className="font-mono">archived</span> →{" "}
        <span className="font-mono">forgotten</span> → back to{" "}
        <span className="font-mono">active</span>. Or use the small ↺
        restore shortcut next to the pill when an item is already set aside.
      </p>

      {/* Toggle as sticker pills */}
      <div className="mb-8 flex flex-wrap gap-3">
        {ALLOWED_STATES.map((s) => {
          const tint = STATE_TINTS[s];
          const isActive = s === current;
          return (
            <Link
              key={s}
              href={`/archive?state=${s}`}
              className={
                "no-underline rounded-full px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all " +
                (isActive
                  ? "shadow-soft"
                  : "bg-paper border border-line hover:border-mint hover:shadow-softer text-body")
              }
              style={
                isActive
                  ? {
                      background: tint.bg,
                      color: tint.text,
                      boxShadow: `0 0 0 2px ${tint.ring}55, 0 4px 12px -4px ${tint.ring}66`,
                    }
                  : undefined
              }
            >
              <span className="capitalize">{s}</span>
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isActive ? `${tint.ring}33` : "#F0EAE0",
                  color: isActive ? tint.text : "#A89A88",
                }}
              >
                {counts[s].segments + counts[s].concepts + counts[s].sources}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Sources grid (chats / docs / pdfs) */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright capitalize">
            {current} sources
          </h2>
          <span className="text-xs text-dim font-mono">
            {srcMatches.length} total
          </span>
        </div>
        {srcMatches.length === 0 ? (
          <EmptyTile state={current} kind="sources" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {srcMatches.map((file) => {
              const wsId = file.workspace_primary;
              return (
                <ChatCard
                  key={file.file_id}
                  file={file}
                  workspaceColor={wsId ? wsColor.get(wsId) : undefined}
                  workspaceName={wsId ? wsName.get(wsId) : undefined}
                  showLifecycleToggle
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Segments grid */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright capitalize">
            {current} segments
          </h2>
          <span className="text-xs text-dim font-mono">
            {segMatches.length} total
          </span>
        </div>
        {segMatches.length === 0 ? (
          <EmptyTile state={current} kind="segments" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segMatches.map((seg) => {
              const fileId =
                seg.file_id ??
                (seg.segment_id.includes("-s")
                  ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
                  : null);
              const href = fileId ? `/chats/${fileId}` : undefined;
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
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Concepts grid */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl font-bold text-bright capitalize">
            {current} concepts
          </h2>
          <span className="text-xs text-dim font-mono">
            {conMatches.length} total
          </span>
        </div>
        {conMatches.length === 0 ? (
          <EmptyTile state={current} kind="concepts" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conMatches.map((c) => (
              <ConceptCard
                key={c.concept_id}
                concept={c}
                workspaceColor={
                  c.primary_workspace
                    ? wsColor.get(c.primary_workspace)
                    : undefined
                }
                showLifecycleToggle
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function EmptyTile({
  state,
  kind,
}: {
  state: string;
  kind: "segments" | "concepts" | "sources";
}) {
  return (
    <div className="card card-pad text-center py-10">
      <div
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-3 mx-auto"
        style={{
          background: "linear-gradient(135deg, #7DD3A0 0%, #F4C770 100%)",
          opacity: 0.85,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-paper"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
        </svg>
      </div>
      <p className="text-sm text-muted">
        No {kind} in <span className="font-mono">{state}</span> state.
      </p>
    </div>
  );
}
