"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  loadLibraryCard,
  saveLibraryCard,
  listConcepts,
  listSegments,
  listSourceFiles,
  listWorkspaces,
  readSourceBody,
  dossierRootForDisplay,
  type LibraryCardItem,
} from "@/lib/dossier";
import type { Concept, Segment, SourceFile, Workspace } from "@/lib/schemas";

/**
 * Toggle an item on the Library Card. If it's already there, remove it;
 * otherwise add it. Called from the small "+" button on every card.
 */
export async function toggleLibraryCardAction(
  formData: FormData,
): Promise<void> {
  const kind = formData.get("kind") as LibraryCardItem["kind"] | null;
  const id = formData.get("id") as string | null;
  if (!kind || !id) return;

  const card = await loadLibraryCard();
  const idx = card.items.findIndex(
    (it) => it.kind === kind && it.id === id,
  );
  if (idx >= 0) {
    card.items.splice(idx, 1);
  } else {
    card.items.push({ kind, id });
  }
  await saveLibraryCard(card);
  revalidatePath("/", "layout");
}

/**
 * Empty the Library Card (back to scan-mode).
 */
export async function clearLibraryCardAction(): Promise<void> {
  await saveLibraryCard({ items: [] });
  revalidatePath("/", "layout");
}

/**
 * Compile a bundle containing ONLY the carded items (plus the workspaces
 * those items belong to). Output goes under $DOSSIER_ROOT/bundles/ as
 * either:
 *   - card-{timestamp}.json     ← the agent format (structured data)
 *   - card-{timestamp}.md       ← the human format (with inlined content)
 *
 * Agents (Qwestor, OmegaClaw, Claude, etc.) consume the JSON as structured
 * input. Humans paste the Markdown into any LLM chat for context, or read
 * it standalone — the Markdown inlines the actual segment text from each
 * source so it's a self-contained, copy-pasteable artifact.
 *
 * After compile, redirects to /bundles?last={filename} so the user sees the
 * bundle in the agent-handoff log and can copy / download / preview it
 * (instead of the silent file-write the previous version did).
 */
export async function compileLibraryCardAction(formData: FormData): Promise<void> {
  const formatRaw = formData.get("format");
  const format: "json" | "markdown" =
    formatRaw === "json" || formatRaw === "markdown" ? formatRaw : "markdown";

  const card = await loadLibraryCard();
  if (card.items.length === 0) return;

  const conceptIds = new Set(
    card.items.filter((i) => i.kind === "concept").map((i) => i.id),
  );
  const fileIds = new Set(
    card.items.filter((i) => i.kind === "source").map((i) => i.id),
  );
  const segIds = new Set(
    card.items.filter((i) => i.kind === "segment").map((i) => i.id),
  );

  const [allConcepts, allSegments, allSources, allWorkspaces] =
    await Promise.all([
      listConcepts(),
      listSegments(),
      listSourceFiles(),
      listWorkspaces(),
    ]);

  // Direct picks
  const concepts = allConcepts.filter((c) => conceptIds.has(c.concept_id));
  const sources = allSources.filter((s) => fileIds.has(s.file_id));
  const segments = allSegments.filter((s) => segIds.has(s.segment_id));

  // Pull in segments that belong to any picked source (so the bundle is
  // self-contained: a source without its segments is half a thing).
  const segsForPickedSources = allSegments.filter((s) => {
    const fid =
      s.file_id ??
      (s.segment_id.includes("-s")
        ? s.segment_id.slice(0, s.segment_id.lastIndexOf("-s"))
        : null);
    return fid ? fileIds.has(fid) : false;
  });
  const segMerged = [
    ...segments,
    ...segsForPickedSources.filter((s) => !segIds.has(s.segment_id)),
  ];

  // Workspaces touched by any of the picked items
  const wsTouched = new Set<string>();
  for (const c of concepts) {
    if (c.primary_workspace) wsTouched.add(c.primary_workspace);
    for (const w of c.workspace_secondary ?? []) wsTouched.add(w);
  }
  for (const s of sources) {
    if (s.workspace_primary) wsTouched.add(s.workspace_primary);
  }
  for (const s of segMerged) {
    if (s.workspace_primary) wsTouched.add(s.workspace_primary);
    for (const w of s.workspace_secondary ?? []) wsTouched.add(w);
  }
  const workspaces = allWorkspaces.filter((w) => wsTouched.has(w.id));

  const createdAt = new Date().toISOString();
  const bundle = {
    $schema: "library-card-bundle-v1",
    createdAt,
    sourceDossier: dossierRootForDisplay(),
    cardItems: card.items,
    counts: {
      workspaces: workspaces.length,
      concepts: concepts.length,
      sources: sources.length,
      segments: segMerged.length,
    },
    workspaces,
    concepts,
    sources,
    segments: segMerged,
  };

  // Filename: {workspace}_card_{date}_{time}.{ext}
  //   qwestor_card_2026-05-09_14-04.md      (single workspace)
  //   multi_card_2026-05-09_22-30.json      (mixed workspaces)
  //   unscoped_card_2026-05-09_15-30.md     (no workspace info)
  // Reads cleanly at-a-glance vs the old `card-2026-05-09T00-04-09.md`.
  // YYYY-MM-DD + HH-MM (no seconds, no ms) is enough to disambiguate; if
  // someone compiles two bundles within the same minute, we tack on a
  // `_2`, `_3`… suffix to avoid clobbering. UTC is used so filenames stay
  // stable across timezones (the UI shows local time when listed).
  const dateUTC = createdAt.slice(0, 10); // 2026-05-09
  const timeUTC = createdAt.slice(11, 16).replace(":", "-"); // 14-04
  const wsLabel =
    workspaces.length === 0
      ? "unscoped"
      : workspaces.length === 1
        ? workspaces[0].id.replace(/[^a-z0-9-]/gi, "-")
        : "multi";
  const ext = format === "markdown" ? "md" : "json";
  const baseStem = `${wsLabel}_card_${dateUTC}_${timeUTC}`;

  const bundleDir = path.join(dossierRootForDisplay(), "bundles");
  await fs.mkdir(bundleDir, { recursive: true });

  // Collision-avoidance: if a bundle with the same minute exists, append _2…
  let bundleFilename = `${baseStem}.${ext}`;
  let suffix = 2;
  while (await fileExists(path.join(bundleDir, bundleFilename))) {
    bundleFilename = `${baseStem}_${suffix}.${ext}`;
    suffix += 1;
  }

  let bundleContent: string;
  if (format === "markdown") {
    // For Markdown, inline the actual source content so the bundle is a
    // self-contained, copy-pasteable artifact (vs JSON which is metadata-only).
    const segmentBodies = await readSegmentBodies(segMerged, allSources);
    bundleContent = renderMarkdownBundle(bundle, segmentBodies);
  } else {
    bundleContent = JSON.stringify(bundle, null, 2);
  }

  const bundlePath = path.join(bundleDir, bundleFilename);
  await fs.writeFile(bundlePath, bundleContent);

  revalidatePath("/", "layout");
  revalidatePath("/bundles");

  // Land the user on the bundle ledger so they can SEE the new bundle
  // they just made, copy/download/preview it. The `last` param lets the
  // /bundles page highlight the row that was just created.
  // NB: redirect() throws NEXT_REDIRECT — keep this as the literal last
  // statement; nothing after it will execute.
  console.log(
    `[compileLibraryCardAction] wrote ${bundleFilename}, redirecting to /bundles`,
  );
  redirect(`/bundles?last=${encodeURIComponent(bundleFilename)}`);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * For each segment in the bundle, read the slice of its source file that
 * the segment covers (start_line through end_line). Returns a map of
 * segment_id → body string. Best-effort: missing/unreadable sources just
 * map to undefined and the Markdown skips that segment's content block.
 */
async function readSegmentBodies(
  segments: Segment[],
  allSources: SourceFile[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sourcePathById = new Map(
    allSources.map((s) => [s.file_id, s.path]),
  );
  // Read each unique source file at most once.
  const bodyByPath = new Map<string, string | null>();
  for (const seg of segments) {
    const fid =
      seg.file_id ??
      (seg.segment_id.includes("-s")
        ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
        : null);
    const relPath = fid ? sourcePathById.get(fid) ?? null : null;
    if (!relPath) continue;
    if (!bodyByPath.has(relPath)) {
      bodyByPath.set(relPath, await readSourceBody(relPath));
    }
    const body = bodyByPath.get(relPath);
    if (!body) continue;
    if (
      typeof seg.start_line === "number" &&
      typeof seg.end_line === "number"
    ) {
      const lines = body.split("\n");
      const slice = lines
        .slice(seg.start_line - 1, seg.end_line)
        .join("\n");
      out.set(seg.segment_id, slice);
    }
  }
  return out;
}

/**
 * Render the bundle as a self-contained Markdown document. Includes:
 *   - YAML frontmatter for metadata (parseable by tools, readable by humans)
 *   - A friendly intro paragraph
 *   - Workspaces, Concepts, Sources, Segments sections
 *   - Inline segment content as fenced code blocks
 *
 * The output is designed to be paste-into-any-LLM-chat-and-it-just-works.
 */
function renderMarkdownBundle(
  bundle: {
    createdAt: string;
    sourceDossier: string;
    counts: {
      workspaces: number;
      concepts: number;
      sources: number;
      segments: number;
    };
    workspaces: Workspace[];
    concepts: Concept[];
    sources: SourceFile[];
    segments: Segment[];
  },
  segmentBodies: Map<string, string>,
): string {
  const lines: string[] = [];
  const date = bundle.createdAt.slice(0, 10);

  // YAML frontmatter
  lines.push("---");
  lines.push(`title: "Library Card Bundle, ${date}"`);
  lines.push(`schema: library-card-bundle-v1`);
  lines.push(`format: markdown`);
  lines.push(`created: ${bundle.createdAt}`);
  lines.push(`dossier: ${bundle.sourceDossier}`);
  lines.push(`counts:`);
  lines.push(`  workspaces: ${bundle.counts.workspaces}`);
  lines.push(`  concepts: ${bundle.counts.concepts}`);
  lines.push(`  sources: ${bundle.counts.sources}`);
  lines.push(`  segments: ${bundle.counts.segments}`);
  if (bundle.workspaces.length) {
    lines.push(
      `workspaces_touched: [${bundle.workspaces.map((w) => w.id).join(", ")}]`,
    );
  }
  lines.push("---");
  lines.push("");

  // Intro
  lines.push(`# Library Card Bundle`);
  lines.push("");
  lines.push(
    `> A focused bundle of items pinned from the library card on ${date}.`,
  );
  lines.push(
    `> Paste this into any LLM chat for context, or read it standalone.`,
  );
  lines.push("");
  lines.push(
    `Counts: **${bundle.counts.concepts}** concepts · **${bundle.counts.sources}** sources · **${bundle.counts.segments}** segments across **${bundle.counts.workspaces}** workspace${bundle.counts.workspaces === 1 ? "" : "s"}.`,
  );
  lines.push("");

  // Workspaces
  if (bundle.workspaces.length) {
    lines.push("## Workspaces");
    lines.push("");
    for (const w of bundle.workspaces) {
      lines.push(`### ${w.name || w.id}  \`${w.id}\``);
      if (w.description) {
        lines.push("");
        lines.push(w.description);
      }
      lines.push("");
    }
  }

  // Concepts
  if (bundle.concepts.length) {
    lines.push("## Concepts");
    lines.push("");
    for (const c of bundle.concepts) {
      lines.push(`### ${c.name || c.concept_id}`);
      lines.push("");
      const meta: string[] = [`\`${c.concept_id}\``];
      if (c.category) meta.push(`*${c.category}*`);
      if (c.primary_workspace) meta.push(`workspace: \`${c.primary_workspace}\``);
      if (c.tags && c.tags.length) {
        meta.push(`tags: ${c.tags.map((t) => `\`${t}\``).join(", ")}`);
      }
      lines.push(meta.join(" · "));
      lines.push("");
      if (c.summary) {
        lines.push(c.summary);
        lines.push("");
      }
      if (c.source_segments && c.source_segments.length) {
        lines.push(
          `Source segments: ${c.source_segments
            .map((s) => `\`${s}\``)
            .join(", ")}`,
        );
        lines.push("");
      }
    }
  }

  // Sources
  if (bundle.sources.length) {
    lines.push("## Sources");
    lines.push("");
    for (const s of bundle.sources) {
      lines.push(`### ${s.title_detected || s.filename || s.file_id}`);
      lines.push("");
      const meta: string[] = [`\`${s.file_id}\``];
      if (s.platform) meta.push(s.platform);
      if (s.date_detected) meta.push(s.date_detected);
      if (s.workspace_primary)
        meta.push(`workspace: \`${s.workspace_primary}\``);
      if (s.total_words)
        meta.push(`${s.total_words.toLocaleString()} words`);
      if (s.total_lines)
        meta.push(`${s.total_lines.toLocaleString()} lines`);
      lines.push(meta.join(" · "));
      lines.push("");
      if (s.path) {
        lines.push(`Path: \`${s.path}\``);
        lines.push("");
      }
    }
  }

  // Segments — with inlined content
  if (bundle.segments.length) {
    lines.push("## Segments");
    lines.push("");
    for (const seg of bundle.segments) {
      lines.push(`### ${seg.title || seg.segment_id}`);
      lines.push("");
      const meta: string[] = [`\`${seg.segment_id}\``];
      if (
        typeof seg.start_line === "number" &&
        typeof seg.end_line === "number"
      ) {
        meta.push(`L${seg.start_line}–L${seg.end_line}`);
      }
      if (seg.workspace_primary)
        meta.push(`workspace: \`${seg.workspace_primary}\``);
      if (typeof seg.word_count === "number" && seg.word_count > 0)
        meta.push(`${seg.word_count.toLocaleString()} words`);
      lines.push(meta.join(" · "));
      lines.push("");
      if (seg.summary) {
        lines.push(`*${seg.summary}*`);
        lines.push("");
      }
      const body = segmentBodies.get(seg.segment_id);
      if (body && body.trim().length > 0) {
        lines.push("```");
        lines.push(body.trim());
        lines.push("```");
        lines.push("");
      }
    }
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(
    `*Bundle compiled ${bundle.createdAt} from ${bundle.sourceDossier}.*`,
  );
  lines.push("");

  return lines.join("\n");
}
