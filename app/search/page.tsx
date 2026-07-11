import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import {
  listConcepts,
  listSegments,
  listSourceFiles,
  listWorkspaces,
  loadDossierBrandConfig,
} from "@/lib/dossier";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface MatchSegment {
  kind: "segment";
  workspaceId: string | undefined;
  href: string;
  title: string;
  subtitle: string;
  match: string;
}
interface MatchConcept {
  kind: "concept";
  workspaceId: string | undefined;
  href: string;
  title: string;
  subtitle: string;
  match: string;
}
interface MatchSource {
  kind: "source";
  workspaceId: string | undefined;
  href: string;
  title: string;
  subtitle: string;
  match: string;
}
type Match = MatchSegment | MatchConcept | MatchSource;

function fieldMatches(needle: string, haystack: string | undefined): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle);
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const needle = query.toLowerCase();

  const [workspaces, concepts, segments, files, brand] = await Promise.all([
    listWorkspaces(),
    listConcepts(),
    listSegments(),
    listSourceFiles(),
    loadDossierBrandConfig(),
  ]);

  const wsColor = new Map(workspaces.map((w) => [w.id, w.color || "#8899AA"]));
  const wsName = new Map(workspaces.map((w) => [w.id, w.name || w.id]));

  let matches: Match[] = [];

  if (needle.length > 0) {
    for (const c of concepts) {
      if (
        fieldMatches(needle, c.name) ||
        fieldMatches(needle, c.summary) ||
        fieldMatches(needle, c.concept_id) ||
        (c.tags ?? []).some((t) => fieldMatches(needle, t))
      ) {
        matches.push({
          kind: "concept",
          workspaceId: c.primary_workspace,
          href: `/concepts/${c.concept_id}`,
          title: c.name || c.concept_id,
          subtitle: c.summary || c.concept_id,
          match: c.concept_id,
        });
      }
    }

    for (const s of segments) {
      if (
        fieldMatches(needle, s.title) ||
        fieldMatches(needle, s.summary) ||
        fieldMatches(needle, s.segment_id) ||
        (s.tags ?? []).some((t) => fieldMatches(needle, t)) ||
        (s.personas_detected ?? []).some((p) => fieldMatches(needle, p))
      ) {
        const fileId =
          s.file_id ??
          (s.segment_id.includes("-s")
            ? s.segment_id.slice(0, s.segment_id.lastIndexOf("-s"))
            : null);
        const lineRange =
          s.start_line && s.end_line
            ? `?from=${s.start_line}&to=${s.end_line}`
            : "";
        const href = fileId ? `/chats/${fileId}${lineRange}` : "/chats";
        matches.push({
          kind: "segment",
          workspaceId: s.workspace_primary,
          href,
          title: s.title || s.segment_id,
          subtitle: s.summary || s.segment_id,
          match: s.segment_id,
        });
      }
    }

    for (const f of files) {
      if (
        fieldMatches(needle, f.title_detected) ||
        fieldMatches(needle, f.filename) ||
        fieldMatches(needle, f.file_id) ||
        (f.personas_detected ?? []).some((p) => fieldMatches(needle, p)) ||
        (f.tags ?? []).some((t) => fieldMatches(needle, t))
      ) {
        matches.push({
          kind: "source",
          workspaceId: f.workspace_primary,
          href: `/chats/${f.file_id}`,
          title: f.title_detected || f.filename || f.file_id,
          subtitle: `${f.platform || "source"} · ${f.date_detected ?? ""}`,
          match: f.file_id,
        });
      }
    }
  }

  // Group by workspace
  const grouped = new Map<string, Match[]>();
  for (const m of matches) {
    const key = m.workspaceId || "unscoped";
    const list = grouped.get(key) ?? [];
    list.push(m);
    grouped.set(key, list);
  }

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Search`}
        title="Universal search"
        subtitle={
          <>
            Searches concept names, segment titles and summaries, source
            titles, tags, and personas across every visible workspace.
          </>
        }
        decor="search"
      />

      <form
        action="/search"
        method="get"
        className="mb-10 flex gap-2"
      >
        <input
          name="q"
          defaultValue={query}
          placeholder="Search concepts, segments, chats…"
          className="flex-1 bg-paper border border-line rounded-full px-5 py-2.5 text-bright placeholder:text-dim font-sans focus:outline-none focus:border-peach focus:shadow-softer shadow-softer"
          autoFocus
        />
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {query.length === 0 ? (
        <p className="text-sm text-muted">
          Type a query above to search across every indexed source.
        </p>
      ) : matches.length === 0 ? (
        <div className="text-sm text-muted space-y-2">
          <p>
            No matches for{" "}
            <span className="font-mono text-bright">&ldquo;{query}&rdquo;</span>{" "}
            in concept names, segment titles or summaries, source titles,
            filenames, tags, or personas.
          </p>
          <p className="text-xs text-dim">
            Message-body text is not yet searched. If you are looking for a
            phrase you know sits inside a chat, open the chat directly from{" "}
            <Link href="/chats" className="underline hover:text-body">
              Chats
            </Link>{" "}
            for now; full-text search is on the roadmap.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="text-xs text-dim font-mono">
            {matches.length} result{matches.length === 1 ? "" : "s"} for{" "}
            <span className="text-bright">&ldquo;{query}&rdquo;</span>
          </div>
          {Array.from(grouped.entries()).map(([wsId, list]) => {
            const color = wsColor.get(wsId);
            const name = wsName.get(wsId) || wsId;
            return (
              <section key={wsId}>
                <div className="flex items-center gap-2 mb-3">
                  {color && (
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}66`,
                      }}
                    />
                  )}
                  <h2 className="font-display text-xl font-bold text-bright">{name}</h2>
                  <span className="text-xs text-dim font-mono">
                    {list.length} result{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="divide-y divide-line/60 border border-line rounded-3xl overflow-hidden bg-paper shadow-soft">
                  {list.map((m, idx) => (
                    <li
                      key={`${m.kind}-${m.match}-${idx}`}
                      className="bg-paper/60 hover:bg-cream2/40 transition-colors"
                    >
                      <Link
                        href={m.href}
                        className="block px-5 py-4 no-underline"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="eyebrow">{m.kind}</span>
                          <span className="text-[11px] font-mono text-dim">
                            {m.match}
                          </span>
                        </div>
                        <div className="font-display text-base font-semibold text-bright leading-snug">
                          {m.title}
                        </div>
                        {m.subtitle && (
                          <p className="mt-1 text-sm text-muted line-clamp-2">
                            {m.subtitle}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
