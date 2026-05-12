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

export default async function ChatsPage() {
  const [allFiles, segments, workspaces, card, brand] = await Promise.all([
    listSourceFiles(),
    listSegments(),
    listWorkspaces(),
    loadLibraryCard(),
    loadDossierBrandConfig(),
  ]);
  // Active-only on the main browser. Archived/forgotten chats live on /archive.
  const files = allFiles.filter((f) => {
    const lc = (f as unknown as { lifecycle?: LifecycleState }).lifecycle;
    return !lc || lc === "active";
  });
  const cardSources = new Set(
    card.items.filter((i) => i.kind === "source").map((i) => i.id),
  );

  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#A89A88"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));

  // Count segments per file_id and find the dominant workspace per file.
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

  const sorted = [...files].sort((a, b) => {
    const da = a.date_detected ?? "";
    const db = b.date_detected ?? "";
    return db.localeCompare(da);
  });

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Chats`}
        title="Chat browser"
        subtitle={
          <>
            Every indexed conversation across all visible workspaces. Click any
            chat to drill into segments and source.
          </>
        }
        decor="chats"
      />

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No chats indexed yet.</p>
      ) : (
        <>
          <div className="text-xs text-dim font-mono mb-4">
            {sorted.length} chats
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((file) => {
              const wsId =
                file.workspace_primary ?? dominantWorkspace(file.file_id);
              return (
                <ChatCard
                  key={file.file_id}
                  file={file}
                  segmentCount={segCountByFile.get(file.file_id) ?? 0}
                  workspaceColor={wsId ? wsColor.get(wsId) : undefined}
                  workspaceName={wsId ? wsName.get(wsId) : undefined}
                  onCard={cardSources.has(file.file_id)}
                  showLifecycleToggle
                />
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
