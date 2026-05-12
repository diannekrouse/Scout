import PageHeader from "@/components/ui/PageHeader";
import ChatCard from "@/components/ui/ChatCard";
import {
  listSourceFiles,
  listSegments,
  listWorkspaces,
  loadLibraryCard,
  loadDossierBrandConfig,
  type LifecycleState,
} from "@/lib/dossier";

/**
 * Source library — shows all entries from master-index.json, grouped by
 * platform. /chats is similar but framed around conversations specifically;
 * /sources is the broader view (chats + docs + PDFs + spreadsheets, once
 * those exist in the substrate).
 */
export default async function SourcesPage() {
  const [allFiles, segments, workspaces, card, brand] = await Promise.all([
    listSourceFiles(),
    listSegments(),
    listWorkspaces(),
    loadLibraryCard(),
    loadDossierBrandConfig(),
  ]);
  // Active-only on the main library view. Archived/forgotten move to /archive.
  const files = allFiles.filter((f) => {
    const lc = (f as unknown as { lifecycle?: LifecycleState }).lifecycle;
    return !lc || lc === "active";
  });
  const cardSources = new Set(
    card.items.filter((i) => i.kind === "source").map((i) => i.id),
  );

  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#A89A88"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));

  const segCountByFile = new Map<string, number>();
  const wsByFile = new Map<string, Map<string, number>>();
  for (const seg of segments) {
    const fileId =
      seg.file_id ??
      (seg.segment_id.includes("-s")
        ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
        : null);
    if (!fileId) continue;
    segCountByFile.set(fileId, (segCountByFile.get(fileId) ?? 0) + 1);
    if (seg.workspace_primary) {
      const m = wsByFile.get(fileId) ?? new Map<string, number>();
      m.set(seg.workspace_primary, (m.get(seg.workspace_primary) ?? 0) + 1);
      wsByFile.set(fileId, m);
    }
  }

  function dominantWorkspace(fileId: string): string | undefined {
    const m = wsByFile.get(fileId);
    if (!m) return undefined;
    let best: [string, number] | null = null;
    for (const entry of m) {
      if (!best || entry[1] > best[1]) best = entry;
    }
    return best?.[0];
  }

  // Group by platform
  const byPlatform = new Map<string, typeof files>();
  for (const f of files) {
    const key = f.platform || "Other";
    const list = byPlatform.get(key) ?? [];
    list.push(f);
    byPlatform.set(key, list);
  }
  const platforms = Array.from(byPlatform.entries()).sort(([a, la], [b, lb]) => {
    return lb.length - la.length;
  });

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Sources`}
        title="Source library"
        subtitle={
          <>
            Every indexed file, grouped by platform. Includes chats, documents,
            PDFs, and spreadsheets as they&apos;re added.
          </>
        }
        decor="archive"
      />

      {files.length === 0 ? (
        <p className="text-sm text-muted">No sources indexed yet.</p>
      ) : (
        <>
          <div className="text-xs text-dim font-mono mb-4">
            {files.length} sources across {platforms.length} platform
            {platforms.length === 1 ? "" : "s"}
          </div>
          {platforms.map(([platform, list]) => {
            // Sort each platform group by date desc.
            const sorted = [...list].sort((a, b) => {
              const da = a.date_detected ?? "";
              const db = b.date_detected ?? "";
              return db.localeCompare(da);
            });
            return (
              <section key={platform} className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-display text-xl font-bold text-bright">
                    {platform}
                  </h2>
                  <span className="text-xs text-dim font-mono">
                    {list.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sorted.map((file) => {
                    const wsId =
                      file.workspace_primary ?? dominantWorkspace(file.file_id);
                    return (
                      <ChatCard
                        key={file.file_id}
                        file={file}
                        segmentCount={segCountByFile.get(file.file_id) ?? 0}
                        workspaceColor={
                          wsId ? wsColor.get(wsId) : undefined
                        }
                        workspaceName={
                          wsId ? wsName.get(wsId) : undefined
                        }
                        onCard={cardSources.has(file.file_id)}
                        showLifecycleToggle
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
