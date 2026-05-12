import PageHeader from "@/components/ui/PageHeader";
import ConceptCard from "@/components/ui/ConceptCard";
import { listConcepts, listWorkspaces, loadLibraryCard, loadDossierBrandConfig } from "@/lib/dossier";

export default async function ConceptsPage() {
  const [allConcepts, workspaces, card, brand] = await Promise.all([
    listConcepts(),
    listWorkspaces(),
    loadLibraryCard(),
    loadDossierBrandConfig(),
  ]);
  // Active-only on the main browser. Archived/forgotten concepts live on
  // /archive (mirror of the same filter applied to Chats and Sources).
  const concepts = allConcepts.filter(
    (c) => !c.lifecycle || c.lifecycle === "active",
  );
  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#A89A88"]));
  const cardConcepts = new Set(
    card.items.filter((i) => i.kind === "concept").map((i) => i.id),
  );

  // Group by primary_workspace so the grid keeps related concepts together.
  const byWorkspace = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const key = c.primary_workspace || "unscoped";
    const list = byWorkspace.get(key) ?? [];
    list.push(c);
    byWorkspace.set(key, list);
  }

  // Sort: workspaces alphabetical with unscoped last.
  const groups = Array.from(byWorkspace.entries()).sort(([a], [b]) => {
    if (a === "unscoped") return 1;
    if (b === "unscoped") return -1;
    return a.localeCompare(b);
  });

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Concepts`}
        title="Concept registry"
        subtitle={
          <>
            Every named idea, framework, entity, or thread extracted from your
            sources. Click any concept to see its source segments and
            cross-references.
          </>
        }
        decor="concept"
      />

      {concepts.length === 0 ? (
        <p className="text-sm text-muted">No concepts in the registry yet.</p>
      ) : (
        <>
          <div className="text-xs text-dim font-mono mb-4">
            {concepts.length} concepts across {groups.length} workspace
            {groups.length === 1 ? "" : "s"}
          </div>
          {groups.map(([wsId, list]) => {
            const ws = workspaces.find((w) => w.id === wsId);
            const color = ws?.color ?? wsColor.get(wsId) ?? undefined;
            const name = ws?.name ?? wsId;
            return (
              <section key={wsId} className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  {color && (
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 0 4px ${color}22`,
                      }}
                    />
                  )}
                  <h2 className="font-display text-xl font-bold text-bright">
                    {name}
                  </h2>
                  <span className="text-xs text-dim font-mono">
                    {list.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((c) => (
                    <ConceptCard
                      key={c.concept_id}
                      concept={c}
                      workspaceColor={color}
                      onCard={cardConcepts.has(c.concept_id)}
                      showLifecycleToggle
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
