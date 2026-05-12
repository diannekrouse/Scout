import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import WorkspaceBadge from "@/components/ui/WorkspaceBadge";
import WelcomeCard from "@/components/ui/WelcomeCard";
import {
  listWorkspaceSummaries,
  listConcepts,
  listSourceFiles,
  listSegments,
  dossierRootForDisplay,
  allowedWorkspacesForDisplay,
  loadDossierBrandConfig,
} from "@/lib/dossier";

export default async function HomePage() {
  const [workspaces, concepts, files, segments, brand] = await Promise.all([
    listWorkspaceSummaries(),
    listConcepts(),
    listSourceFiles(),
    listSegments(),
    loadDossierBrandConfig(),
  ]);

  const dossierRoot = dossierRootForDisplay();
  const allowed = allowedWorkspacesForDisplay();

  return (
    <>
      <PageHeader
        eyebrow={`${brand.pageEyebrow} / Overview`}
        title={brand.tagline}
        subtitle={brand.subtitle}
        decor="constellation"
      />

      {/* Top-line stats — clickable, lift on hover */}
      <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Workspaces"
          value={workspaces.length}
          accent="peach"
          href="#workspaces"
        />
        <Stat
          label="Concepts"
          value={concepts.length}
          accent="mint"
          href="/concepts"
        />
        <Stat
          label="Sources"
          value={files.length}
          accent="sky"
          href="/sources"
        />
        <Stat
          label="Segments"
          value={segments.length}
          accent="lilac"
          href="/segments"
        />
      </section>

      {/* Workspace cards + side passport */}
      <section id="workspaces" className="mb-14 scroll-mt-6">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-2xl text-bright font-bold">
            Workspaces
          </h2>
          <div className="text-xs text-dim font-mono">
            {allowed
              ? `${workspaces.length} of ${allowed.length} allowed visible`
              : `${workspaces.length} total`}
          </div>
        </div>

        {workspaces.length === 0 ? (
          <EmptyState dossierRoot={dossierRoot} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {workspaces.map((ws) => (
              <WorkspaceCard key={ws.id} workspace={ws} />
            ))}
            <AddWorkspaceCard />
          </div>
        )}
      </section>

      {/* First-visit Welcome card — placed below the workspaces section so
          the first impression is the actual product (title → stats →
          workspaces), and the "how to use it" guide appears for those who
          keep scrolling. Dismissable, persists via localStorage. */}
      <WelcomeCard />

      {/* Brand byline — the positioning context as a quiet closing statement
          (just before the technical footer). Plain italic text rather than a
          badge so it reads as a footnote, not as a separate UI element. */}
      {brand.byline && (
        <section className="mb-6 max-w-2xl">
          <p className="text-xs text-muted italic leading-relaxed whitespace-pre-line">
            {brand.byline}
          </p>
        </section>
      )}

      {/* Provenance footer */}
      <section className="text-[11px] font-mono text-dim border-t border-line pt-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <div>
            <span className="text-muted">ROOT</span>{" "}
            <span className="text-body">{dossierRoot}</span>
          </div>
          <div>
            <span className="text-muted">ALLOWED_WORKSPACES</span>{" "}
            <span className="text-body">
              {allowed ? allowed.join(", ") : "(unset · all visible)"}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

const ACCENT_TINTS: Record<string, { bg: string; text: string }> = {
  peach: { bg: "rgba(255, 179, 154, 0.12)", text: "#D87A5F" },
  mint: { bg: "rgba(125, 211, 160, 0.14)", text: "#3D9968" },
  sky: { bg: "rgba(155, 201, 232, 0.18)", text: "#4A87B0" },
  lilac: { bg: "rgba(200, 181, 217, 0.20)", text: "#7E63A0" },
};

function Stat({
  label,
  value,
  accent = "peach",
  href,
}: {
  label: string;
  value: number;
  accent?: keyof typeof ACCENT_TINTS;
  href?: string;
}) {
  const tint = ACCENT_TINTS[accent];
  const card = (
    <div
      className={
        "card card-pad relative overflow-hidden transition-all " +
        (href ? "group-hover:shadow-lift group-hover:-translate-y-0.5" : "")
      }
      style={{
        background: `linear-gradient(135deg, ${tint.bg} 0%, rgba(255,255,255,0.4) 100%), #FFFFFF`,
      }}
    >
      <div className="eyebrow mb-2" style={{ color: tint.text }}>
        {label}
      </div>
      <div className="font-display text-4xl text-bright tabular-nums font-extrabold leading-none">
        {value.toLocaleString()}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block no-underline group">
        {card}
      </Link>
    );
  }
  return card;
}

interface WorkspaceCardData {
  id: string;
  name?: string;
  color?: string;
  description?: string;
  glyph?: string;
  conceptCount: number;
  sourceCount: number;
  segmentCount: number;
  lastUpdated: string | null;
}

function WorkspaceCard({ workspace }: { workspace: WorkspaceCardData }) {
  const accent = workspace.color || "#A89A88";
  return (
    <Link
      href={`/workspaces/${workspace.id}`}
      className="block no-underline group"
    >
      <article
        className="card card-pad relative overflow-hidden h-full transition-all group-hover:shadow-lift group-hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(140deg, ${accent}14 0%, ${accent}05 35%, #FFFFFF 100%)`,
        }}
      >
        {/* Soft halo blob in the corner */}
        <div
          aria-hidden
          className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: accent }}
        />

        <div className="relative">
          <div className="flex items-start gap-3 mb-3">
            <div className="relative">
              <WorkspaceBadge
                id={workspace.id}
                color={accent}
                size="lg"
                glyph={workspace.glyph}
              />
              {/* Animated halo, only visible on card hover */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 group-hover:halo-pulse pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
                }}
              />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="eyebrow" style={{ color: accent }}>
                {workspace.id}
              </div>
              <h3 className="font-display text-2xl text-bright leading-tight mt-1 font-bold">
                {workspace.name || workspace.id}
              </h3>
            </div>
          </div>

          {workspace.description && (
            <p className="text-sm text-muted leading-relaxed mb-5 line-clamp-3">
              {workspace.description}
            </p>
          )}

          <dl className="grid grid-cols-3 gap-2 text-center mt-auto">
            <CountBox label="concepts" value={workspace.conceptCount} />
            <CountBox label="sources" value={workspace.sourceCount} />
            <CountBox label="segments" value={workspace.segmentCount} />
          </dl>

          <div className="mt-4 flex items-center justify-end gap-2">
            {/* TEMPORARILY HIDDEN for the SNET demo — the dates reflect only
                the last ingested chat, not real activity. Restore the
                "Last updated …" / "No activity yet" line below after the
                walkthrough. */}
            {/* <span className="text-[11px] font-mono text-dim truncate">
              {workspace.lastUpdated
                ? `Last updated ${workspace.lastUpdated}`
                : "No activity yet"}
            </span> */}
            <span
              className="sticker shrink-0"
              style={{
                backgroundColor: `${accent}1F`,
                color: accent,
              }}
            >
              Enter →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function AddWorkspaceCard() {
  return (
    <article
      className="rounded-3xl border-2 border-dashed border-line2 bg-cream/30 px-6 py-8 flex flex-col items-center justify-center text-center min-h-[260px]"
      title="Workspaces are defined in the substrate. See README → Adding a workspace."
    >
      <span
        aria-hidden
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-paper border border-line2 text-mint mb-3 shadow-softer"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </span>
      <div className="eyebrow text-dim mb-1.5">How workspaces appear</div>
      <p className="text-xs text-muted leading-relaxed [overflow-wrap:anywhere]">
        Workspaces live in the substrate (
        <span className="font-mono text-body break-all">
          index/workspaces.json
        </span>
        ). The reader is read-only. Add a workspace by ingesting sources
        for it, and it shows up here automatically.
      </p>
    </article>
  );
}

function CountBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line/60 bg-paper/70 py-2.5 backdrop-blur-sm">
      <div className="font-display text-xl text-bright tabular-nums leading-none font-extrabold">
        {value.toLocaleString()}
      </div>
      <div className="eyebrow mt-1.5 text-dim">{label}</div>
    </div>
  );
}

function EmptyState({ dossierRoot }: { dossierRoot: string }) {
  return (
    <div className="card card-pad py-12 max-w-2xl mx-auto">
      <div className="eyebrow mb-3 text-peach text-center">Scout is empty</div>
      <h3 className="font-display text-2xl text-bright mb-3 font-bold text-center">
        Nothing to read here yet.
      </h3>
      <p className="text-sm text-muted leading-relaxed mb-6 text-center max-w-md mx-auto">
        Scout is looking at{" "}
        <span className="font-mono text-body">{dossierRoot}</span> but no
        workspaces are visible. The folder may not exist yet, or your{" "}
        <span className="font-mono text-body">ALLOWED_WORKSPACES</span> filter
        is excluding them all.
      </p>
      <div className="border-t border-line pt-6 mt-2">
        <div className="eyebrow mb-4 text-mint text-center">
          Getting started
        </div>
        <ol className="space-y-4 text-sm text-body leading-relaxed max-w-md mx-auto list-none">
          <li className="flex gap-3">
            <span
              className="flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: "rgba(125, 211, 160, 0.25)",
                color: "#3D9968",
              }}
            >
              1
            </span>
            <span>
              <strong className="text-bright">Check your path.</strong>{" "}
              The most common cause: your{" "}
              <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded">
                .env
              </code>{" "}
              points{" "}
              <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded">
                DOSSIER_ROOT
              </code>{" "}
              at a folder that doesn&apos;t exist or has no{" "}
              <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded">
                index/workspaces.json
              </code>
              . Fix the path and restart the dev server.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: "rgba(125, 211, 160, 0.25)",
                color: "#3D9968",
              }}
            >
              2
            </span>
            <span>
              <strong className="text-bright">
                Fall back to the welcome workspace.
              </strong>{" "}
              Delete{" "}
              <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded">
                .env
              </code>{" "}
              (or comment out{" "}
              <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded">
                DOSSIER_ROOT
              </code>
              ). Scout defaults to the bundled{" "}
              <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded">
                sample-dossier/
              </code>
              , which always renders.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: "rgba(125, 211, 160, 0.25)",
                color: "#3D9968",
              }}
            >
              3
            </span>
            <span>
              <strong className="text-bright">
                Verify the substrate shape.
              </strong>{" "}
              Your folder needs{" "}
              <code className="font-mono text-bright bg-cream2/40 px-1.5 py-0.5 rounded">
                index/workspaces.json
              </code>{" "}
              with at least one workspace. The README covers the full format;
              the welcome workspace is the canonical example.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
