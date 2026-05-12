import fs from "node:fs/promises";
import path from "node:path";
import PageHeader from "@/components/ui/PageHeader";
import { dossierRootForDisplay, loadDossierBrandConfig } from "@/lib/dossier";
import { deleteBundleAction } from "@/app/actions/bundles";
import BundleActions from "@/components/ui/BundleActions";

interface BundleSummary {
  filename: string;
  fullPath: string;
  type: "full" | "card" | "unknown";
  format: "json" | "markdown" | "unknown";
  size: number;
  createdAt: string | null;
  schema: string | null;
  counts: {
    workspaces?: number;
    concepts?: number;
    sources?: number;
    segments?: number;
  } | null;
  /** Raw text content — used for inline preview and copy-to-clipboard. */
  body: string;
}

// Recognized bundle filename shapes:
//   New:   {workspace}_card_2026-05-09_14-04.{md,json}
//          {workspace}_bundle_2026-05-09_14-04.{md,json}
//   Legacy: card-{ts}.{md,json}, qwestor-card-{ts}.{md,json},
//           qwestor-bundle-{ts}.{md,json}
const BUNDLE_EXTENSIONS = [".json", ".md"];
function isBundleFile(filename: string): boolean {
  if (!BUNDLE_EXTENSIONS.some((e) => filename.endsWith(e))) return false;
  // New format
  if (/_card_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/.test(filename)) return true;
  if (/_bundle_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/.test(filename)) return true;
  // Legacy format
  if (filename.startsWith("card-")) return true;
  if (filename.startsWith("qwestor-card-")) return true;
  if (filename.startsWith("qwestor-bundle-")) return true;
  return false;
}

async function listBundles(): Promise<BundleSummary[]> {
  const root = dossierRootForDisplay();
  const bundleDir = path.join(root, "bundles");
  let entries: string[];
  try {
    entries = await fs.readdir(bundleDir);
  } catch {
    return [];
  }
  const summaries: BundleSummary[] = [];
  for (const filename of entries) {
    if (!isBundleFile(filename)) continue;

    const fullPath = path.join(bundleDir, filename);
    let stat;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      continue;
    }
    let type: BundleSummary["type"] = "unknown";
    if (filename.includes("_bundle_") || filename.includes("-bundle-"))
      type = "full";
    else if (
      filename.includes("_card_") ||
      filename.startsWith("card-") ||
      filename.startsWith("qwestor-card-")
    )
      type = "card";

    const format: BundleSummary["format"] = filename.endsWith(".md")
      ? "markdown"
      : filename.endsWith(".json")
        ? "json"
        : "unknown";

    let counts: BundleSummary["counts"] = null;
    let schema: string | null = null;
    let createdAt: string | null = null;
    let body = "";
    try {
      body = await fs.readFile(fullPath, "utf-8");
      if (format === "json") {
        const parsed = JSON.parse(body);
        counts = parsed?.counts ?? null;
        schema = parsed?.$schema ?? null;
        createdAt = parsed?.createdAt ?? null;
      } else if (format === "markdown") {
        // Pull metadata from YAML frontmatter (very small parser, just the
        // top-level fields we wrote in renderMarkdownBundle).
        const fmMatch = body.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const fm = fmMatch[1];
          const created = fm.match(/^created:\s*(.+)$/m);
          if (created) createdAt = created[1].trim();
          const sch = fm.match(/^schema:\s*(.+)$/m);
          if (sch) schema = sch[1].trim();
          const wsCount = fm.match(/^\s+workspaces:\s*(\d+)$/m);
          const cCount = fm.match(/^\s+concepts:\s*(\d+)$/m);
          const sCount = fm.match(/^\s+sources:\s*(\d+)$/m);
          const segCount = fm.match(/^\s+segments:\s*(\d+)$/m);
          counts = {
            workspaces: wsCount ? Number(wsCount[1]) : undefined,
            concepts: cCount ? Number(cCount[1]) : undefined,
            sources: sCount ? Number(sCount[1]) : undefined,
            segments: segCount ? Number(segCount[1]) : undefined,
          };
        }
      }
    } catch {
      // best-effort; show file even if metadata unreadable
    }

    summaries.push({
      filename,
      fullPath,
      type,
      format,
      size: stat.size,
      createdAt: createdAt ?? stat.mtime.toISOString(),
      schema,
      counts,
      body,
    });
  }
  // Newest first
  summaries.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  return summaries;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

interface BundlesPageProps {
  searchParams: Promise<{ last?: string }>;
}

export default async function BundlesPage({ searchParams }: BundlesPageProps) {
  const { last } = await searchParams;
  const [bundles, brand] = await Promise.all([
    listBundles(),
    loadDossierBrandConfig(),
  ]);
  const dossierRoot = dossierRootForDisplay();
  const bundleDir = path.join(dossierRoot, "bundles");

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Bundles`}
        title="Bundle ledger"
        subtitle={
          <>
            Bundles you (or an agent) have pulled together from the library.
            <br />
            <span className="text-dim">
              <strong className="text-muted">Markdown</strong> bundles inline
              the actual content. Paste them straight into any LLM chat.{" "}
              <strong className="text-muted">JSON</strong> bundles are
              structured input for programmatic agents. Each compile leaves a
              permanent record here so you can copy, preview, or hand off
              anytime.
            </span>
          </>
        }
        decor="archive"
      />

      {bundles.length === 0 ? (
        <div className="card card-pad text-center py-14">
          <div className="eyebrow mb-3 text-mint">No bundles yet</div>
          <p className="text-sm text-muted max-w-md mx-auto">
            Bundles appear here once you compile from{" "}
            <span className="font-mono text-body">/curate</span> or the
            Library Card on the right band.
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-dim font-mono mb-4">
            {bundles.length} bundle{bundles.length === 1 ? "" : "s"} ·{" "}
            {bundleDir}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundles.map((b) => (
              <BundleCard
                key={b.filename}
                bundle={b}
                isJustCompiled={b.filename === last}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function BundleCard({
  bundle,
  isJustCompiled,
}: {
  bundle: BundleSummary;
  isJustCompiled?: boolean;
}) {
  const isCard = bundle.type === "card";
  const isMarkdown = bundle.format === "markdown";
  // Markdown bundles get a peach tint (human format) — JSON bundles get
  // a sky tint (agent format) — full bundles get a mint tint.
  const accent = isMarkdown
    ? "#FFB39A"
    : isCard
      ? "#9BC9E8"
      : "#7DD3A0";
  const typeLabel = isCard ? "Card bundle" : "Full bundle";
  const formatLabel = isMarkdown ? "Markdown" : "JSON";
  const audience = isMarkdown ? "for humans + LLMs" : "for agents";
  const ts = bundle.createdAt
    ? new Date(bundle.createdAt).toLocaleString()
    : "unknown";
  return (
    <article
      className="card card-pad relative overflow-hidden transition-shadow"
      style={{
        background: `linear-gradient(160deg, ${accent}10 0%, #FFFFFF 60%)`,
        boxShadow: isJustCompiled
          ? `0 0 0 2px ${accent}, 0 0 24px -4px ${accent}88`
          : undefined,
      }}
    >
      <div
        aria-hidden
        className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: accent }}
      />

      <div className="relative">
        {isJustCompiled && (
          <div
            className="mb-3 text-[10px] uppercase tracking-[0.18em] font-bold inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              backgroundColor: `${accent}22`,
              color: accent === "#FFB39A" ? "#D87A5F" : accent === "#7DD3A0" ? "#3D9968" : "#4A87B0",
            }}
          >
            <span aria-hidden>✦</span>
            Just compiled
          </div>
        )}

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="sticker"
            style={{
              backgroundColor: `${accent}22`,
              color:
                accent === "#FFB39A"
                  ? "#D87A5F"
                  : accent === "#7DD3A0"
                    ? "#3D9968"
                    : "#4A87B0",
              transform: "rotate(-1deg)",
            }}
          >
            {typeLabel}
          </span>
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
            style={{
              backgroundColor: "rgba(31, 22, 17, 0.06)",
              color: "#3A2D24",
            }}
            title={audience}
          >
            {formatLabel}
          </span>
          {bundle.schema && (
            <span className="text-[11px] font-mono text-dim truncate">
              {bundle.schema}
            </span>
          )}
        </div>

        <div
          className="font-mono text-xs text-bright leading-snug font-semibold mb-2 break-all"
          title={bundle.fullPath}
        >
          {bundle.filename}
        </div>

        {bundle.counts && (
          <dl className="grid grid-cols-4 gap-2 text-center mb-3">
            {bundle.counts.workspaces !== undefined && (
              <CountBox
                label="workspaces"
                value={bundle.counts.workspaces}
              />
            )}
            {bundle.counts.concepts !== undefined && (
              <CountBox label="concepts" value={bundle.counts.concepts} />
            )}
            {bundle.counts.sources !== undefined && (
              <CountBox label="sources" value={bundle.counts.sources} />
            )}
            {bundle.counts.segments !== undefined && (
              <CountBox label="segments" value={bundle.counts.segments} />
            )}
          </dl>
        )}

        <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-3">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-dim">
            <span>{formatBytes(bundle.size)}</span>
            <span>{ts}</span>
            <span className="text-muted">{audience}</span>
          </div>
        </div>

        <BundleActions
          filename={bundle.filename}
          body={bundle.body}
          format={bundle.format}
          deleteAction={deleteBundleAction}
        />
      </div>
    </article>
  );
}

function CountBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line/60 bg-paper/70 py-1.5">
      <div className="font-display text-base text-bright tabular-nums leading-none font-extrabold">
        {value.toLocaleString()}
      </div>
      <div className="eyebrow mt-0.5 text-dim text-[9px]">{label}</div>
    </div>
  );
}
