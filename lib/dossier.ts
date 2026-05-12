/**
 * Scout. A persistent memory layer for indexed conversations,
 * documents, and notes.
 *
 * Designed and invented by Dianne Krouse,
 * host of Voyager: Awakening Intelligence
 * (https://youtube.com/@VoyagerQi7).
 *
 * ----
 *
 * Server-side substrate read layer.
 *
 * All reads flow through this module so that:
 *   1. The DOSSIER_ROOT environment variable can be swapped without touching pages.
 *   2. ALLOWED_WORKSPACES filtering is enforced at the boundary, never bypassed.
 *   3. Tolerant parsing is centralized: malformed entries are logged and skipped, not crashed on.
 *
 * Never modify substrate files. This module is read-only by design.
 */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import {
  WorkspaceSchema,
  SourceFileSchema,
  SegmentSchema,
  ConceptSchema,
  ConceptEdgeSchema,
  type Workspace,
  type SourceFile,
  type Segment,
  type Concept,
  type ConceptEdge,
} from "./schemas";

// -- Environment / scoping ---------------------------------------------------

function getDossierRoot(): string {
  const fromEnv = process.env.DOSSIER_ROOT;
  if (fromEnv && fromEnv.trim()) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv);
  }
  return path.resolve(process.cwd(), "sample-dossier");
}

function getAllowedWorkspaces(): Set<string> | null {
  const raw = process.env.ALLOWED_WORKSPACES;
  if (!raw || !raw.trim()) return null;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  return new Set(list);
}

function isWorkspaceAllowed(
  id: string | undefined,
  allowed: Set<string> | null,
): boolean {
  if (!allowed) return true;
  if (!id) return false;
  return allowed.has(id);
}

// -- Curation overlay --------------------------------------------------------

/**
 * Curation overlay — a non-destructive list of item IDs marked "hidden" by the
 * user via the /curate UI. Persisted as `curation.json` at the dossier root
 * (NOT inside index/, so the spec promise "never modify the index files" is
 * preserved). Used to whittle a working dossier down to a presentable subset
 * without losing data.
 *
 * Shape:
 * {
 *   "hiddenConceptIds": ["concept-id-1", ...],
 *   "hiddenSegmentIds": ["segment-id-1", ...],
 *   "hiddenFileIds":    ["file-id-1", ...]
 * }
 */
export type LifecycleState = "active" | "archived" | "forgotten";

export interface CurationOverlay {
  hiddenConceptIds: string[];
  hiddenSegmentIds: string[];
  hiddenFileIds: string[];
  /**
   * Optional: per-item lifecycle overrides. The substrate's index files are
   * never modified, but the user can flip an item's effective lifecycle via
   * the UI. Reads should consult this overlay to determine the effective
   * state (otherwise fall back to the item's stored `lifecycle` field).
   */
  lifecycleOverrides?: {
    segments: Record<string, LifecycleState>;
    concepts: Record<string, LifecycleState>;
    sources?: Record<string, LifecycleState>;
  };
}

function emptyOverlay(): CurationOverlay {
  return { hiddenConceptIds: [], hiddenSegmentIds: [], hiddenFileIds: [] };
}

export async function loadCurationOverlay(): Promise<CurationOverlay> {
  const root = getDossierRoot();
  const overlayPath = path.join(root, "curation.json");
  try {
    const txt = await fs.readFile(overlayPath, "utf-8");
    const raw = JSON.parse(txt);
    const overlay: CurationOverlay = {
      hiddenConceptIds: Array.isArray(raw?.hiddenConceptIds)
        ? raw.hiddenConceptIds
        : [],
      hiddenSegmentIds: Array.isArray(raw?.hiddenSegmentIds)
        ? raw.hiddenSegmentIds
        : [],
      hiddenFileIds: Array.isArray(raw?.hiddenFileIds)
        ? raw.hiddenFileIds
        : [],
    };
    if (
      raw?.lifecycleOverrides &&
      typeof raw.lifecycleOverrides === "object"
    ) {
      overlay.lifecycleOverrides = {
        segments: raw.lifecycleOverrides.segments ?? {},
        concepts: raw.lifecycleOverrides.concepts ?? {},
        sources: raw.lifecycleOverrides.sources ?? {},
      };
    }
    return overlay;
  } catch {
    return emptyOverlay();
  }
}

/**
 * Resolve the effective lifecycle state for an item, taking the curation
 * overlay's per-item overrides into account.
 */
export function effectiveLifecycle(
  itemLifecycle: LifecycleState | string | null | undefined,
  overrideState: LifecycleState | undefined,
): LifecycleState {
  if (overrideState) return overrideState;
  if (itemLifecycle === "archived" || itemLifecycle === "forgotten") {
    return itemLifecycle;
  }
  return "active";
}

export async function saveCurationOverlay(
  overlay: CurationOverlay,
): Promise<void> {
  const root = getDossierRoot();
  const overlayPath = path.join(root, "curation.json");
  await fs.writeFile(overlayPath, JSON.stringify(overlay, null, 2));
  // Bust the cache for any reads that depend on this overlay (index files
  // themselves are unaffected, but curation-aware list functions read it
  // directly and don't go through readJsonRaw, so cache is fine).
}

export function curationRootPathForDisplay(): string {
  return path.join(getDossierRoot(), "curation.json");
}

// -- Brand config (per-dossier customization) --------------------------------

/**
 * Optional brand/copy customization that travels with each dossier. Lets the
 * same reader code serve different dossiers with different brand names, taglines,
 * and home-page subtitle. Defaults match the original "Dossier Reader" brand if
 * the file is missing.
 *
 * File location: $DOSSIER_ROOT/dossier-config.json
 *
 * Shape:
 * {
 *   "brandName": "MWML Reader",
 *   "tagline": "Your memory layer, line by line.",
 *   "subtitle": "..."
 * }
 */
import type { ThemeKey } from "@/themes";

export interface DossierBrandConfig {
  brandName: string;
  /** Optional small attribution line shown under the wordmark in the
   *  sidebar. Hidden when not set. Example: "from Qwestor" produces a small
   *  italic line under the brand name. Use this OR wordmarkEyebrow above,
   *  depending on which reads better with your brand. */
  parentBrand?: string;
  /** Optional small uppercase label above the brandName in the sidebar's
   *  top-left brand block. Hidden when not set. Example: "Qwestor" produces
   *  the sidebar reading QWESTOR / Scout. */
  wordmarkEyebrow?: string;
  /** Prefix used in every page-header eyebrow (e.g. "Scout / Concepts").
   *  Defaults to brandName when not explicitly set. Override per dossier
   *  if you want a different prefix (e.g. set pageEyebrow="Team A" with
   *  brandName="Scout" to read Team A / Concepts). */
  pageEyebrow?: string;
  tagline: string;
  /** The "what it is" line — the headline description. Short and direct. */
  subtitle: string;
  /** Optional smaller "where it fits" line that appears under the subtitle
   *  with quieter styling. Used for positioning context (parent product,
   *  category claim, broader architecture) without overloading the main
   *  description. Empty / undefined → not rendered. */
  byline?: string;
  /** Greeting shown on the right-hand band. Personal: "Hello, friend ✦".
   *  Public-handoff: "Welcome ✦" or similar. */
  greeting: string;
  /** Visual theme key. Scout ships with "savanna" as the only built-in
   *  theme; add new themes by extending the registry in themes/. */
  theme: ThemeKey;
}

const DEFAULT_BRAND_CONFIG: DossierBrandConfig = {
  brandName: "Scout",
  tagline: "Your memory, line by line.",
  subtitle:
    "A persistent memory layer for years of LLM chats, documents, PDFs, and notes. Indexed, searchable, traceable to the exact line they came from.",
  greeting: "Welcome ✦",
  theme: "savanna",
};

export async function loadDossierBrandConfig(): Promise<DossierBrandConfig> {
  const root = getDossierRoot();
  const cfgPath = path.join(root, "dossier-config.json");
  try {
    const txt = await fs.readFile(cfgPath, "utf-8");
    const raw = JSON.parse(txt);
    const theme: ThemeKey =
      raw?.theme === "savanna"
        ? raw.theme
        : DEFAULT_BRAND_CONFIG.theme;
    return {
      brandName:
        typeof raw?.brandName === "string"
          ? raw.brandName
          : DEFAULT_BRAND_CONFIG.brandName,
      parentBrand:
        typeof raw?.parentBrand === "string" && raw.parentBrand.length > 0
          ? raw.parentBrand
          : undefined,
      wordmarkEyebrow:
        typeof raw?.wordmarkEyebrow === "string" &&
        raw.wordmarkEyebrow.length > 0
          ? raw.wordmarkEyebrow
          : undefined,
      // pageEyebrow defaults to brandName when not explicitly set, so the
      // page breadcrumb reads e.g. "Scout / Concepts" by default rather than
      // a generic placeholder. Override in dossier-config.json if you want a
      // different prefix (e.g. set pageEyebrow="MyTeam" alongside brandName="Scout").
      pageEyebrow:
        typeof raw?.pageEyebrow === "string" && raw.pageEyebrow.length > 0
          ? raw.pageEyebrow
          : typeof raw?.brandName === "string" && raw.brandName.length > 0
          ? raw.brandName
          : DEFAULT_BRAND_CONFIG.brandName,
      tagline:
        typeof raw?.tagline === "string"
          ? raw.tagline
          : DEFAULT_BRAND_CONFIG.tagline,
      subtitle:
        typeof raw?.subtitle === "string"
          ? raw.subtitle
          : DEFAULT_BRAND_CONFIG.subtitle,
      byline:
        typeof raw?.byline === "string" && raw.byline.length > 0
          ? raw.byline
          : undefined,
      greeting:
        typeof raw?.greeting === "string"
          ? raw.greeting
          : DEFAULT_BRAND_CONFIG.greeting,
      theme,
    };
  } catch {
    return DEFAULT_BRAND_CONFIG;
  }
}

// -- Library Card (click-to-bookmark for compile-bundle) ---------------------

/**
 * Library Card — a small list of items the user has marked to include in
 * the next compiled bundle. This is the additive complement to the curation
 * overlay (which is subtractive). Lives at $DOSSIER_ROOT/library-card.json
 * so it travels with the dossier.
 *
 * Shape:
 * {
 *   "items": [
 *     {"kind": "concept",  "id": "memory-layer"},
 *     {"kind": "source",   "id": "welcome-001"},
 *     {"kind": "segment",  "id": "welcome-001-s002"}
 *   ]
 * }
 */
export interface LibraryCardItem {
  kind: "concept" | "source" | "segment";
  id: string;
}

export interface LibraryCard {
  items: LibraryCardItem[];
}

export async function loadLibraryCard(): Promise<LibraryCard> {
  const root = getDossierRoot();
  const cardPath = path.join(root, "library-card.json");
  try {
    const txt = await fs.readFile(cardPath, "utf-8");
    const raw = JSON.parse(txt);
    const items: LibraryCardItem[] = Array.isArray(raw?.items)
      ? raw.items.filter(
          (i: unknown): i is LibraryCardItem =>
            !!i &&
            typeof i === "object" &&
            "kind" in i &&
            "id" in i,
        )
      : [];
    return { items };
  } catch {
    return { items: [] };
  }
}

export async function saveLibraryCard(card: LibraryCard): Promise<void> {
  const root = getDossierRoot();
  const cardPath = path.join(root, "library-card.json");
  await fs.writeFile(cardPath, JSON.stringify(card, null, 2));
}

export interface BundleStats {
  count: number;
  lastCreatedAt: string | null;
  /** Filename of the most-recently-created bundle (for deep-link). */
  lastFilename: string | null;
}

/**
 * Lightweight count + last-created summary of bundles in the dossier's
 * /bundles directory. Used by the Library Card panel to give visible
 * feedback that compiled bundles were saved (so users don't worry their
 * pinned items vanished into the void after pressing Compile).
 *
 * Mirrors the prefix/extension filter used on the /bundles page.
 */
export async function listBundleStats(): Promise<BundleStats> {
  const root = getDossierRoot();
  const bundleDir = path.join(root, "bundles");
  let entries: string[];
  try {
    entries = await fs.readdir(bundleDir);
  } catch {
    return { count: 0, lastCreatedAt: null, lastFilename: null };
  }
  let count = 0;
  let lastCreatedAt: string | null = null;
  let lastFilename: string | null = null;
  for (const filename of entries) {
    if (!isBundleFilename(filename)) continue;
    const fullPath = path.join(bundleDir, filename);
    try {
      const stat = await fs.stat(fullPath);
      const ts = stat.mtime.toISOString();
      count += 1;
      if (lastCreatedAt === null || ts > lastCreatedAt) {
        lastCreatedAt = ts;
        lastFilename = filename;
      }
    } catch {
      // skip
    }
  }
  return { count, lastCreatedAt, lastFilename };
}

/**
 * Whether a filename looks like one of our bundles. Recognizes the new
 * `{workspace}_card_{date}_{time}.{ext}` format alongside the legacy
 * `card-{ts}.{ext}` / `qwestor-{kind}-{ts}.{ext}` patterns so older
 * bundles keep showing up in the ledger.
 */
function isBundleFilename(filename: string): boolean {
  if (!filename.endsWith(".md") && !filename.endsWith(".json")) return false;
  if (/_card_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/.test(filename)) return true;
  if (/_bundle_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/.test(filename)) return true;
  if (filename.startsWith("card-")) return true;
  if (filename.startsWith("qwestor-card-")) return true;
  if (filename.startsWith("qwestor-bundle-")) return true;
  return false;
}

/**
 * List functions that bypass the curation overlay, used only by the /curate
 * page so it can render every item (including hidden ones) with its checkbox
 * state. ALLOWED_WORKSPACES is still applied — the curate page only operates
 * within the visible scope.
 */
export async function listAllSourceFilesForCuration(): Promise<SourceFile[]> {
  const raw = await readJsonRaw("index/master-index.json");
  const all = parseEnvelopedArray<SourceFile>(
    raw,
    "files",
    SourceFileSchema,
    "master-index.json",
  );
  const allowed = getAllowedWorkspaces();
  if (!allowed) return all;
  // Same scoping rule as listSourceFiles — see that function for details.
  const segRaw = await readJsonRaw("index/segments.json");
  const allSegs = parseEnvelopedArray<Segment>(
    segRaw,
    "segments",
    SegmentSchema,
    "segments.json",
  );
  const segsByFile = new Map<string, Segment[]>();
  for (const seg of allSegs) {
    const fid =
      seg.file_id ??
      (seg.segment_id.includes("-s")
        ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
        : null);
    if (!fid) continue;
    const list = segsByFile.get(fid) ?? [];
    list.push(seg);
    segsByFile.set(fid, list);
  }
  return all.filter((f) => {
    if (
      f.workspace_primary &&
      isWorkspaceAllowed(f.workspace_primary, allowed)
    ) {
      return true;
    }
    const segs = segsByFile.get(f.file_id) ?? [];
    return segs.some((s) => {
      if (isWorkspaceAllowed(s.workspace_primary, allowed)) return true;
      return (s.workspace_secondary ?? []).some((id) =>
        isWorkspaceAllowed(id, allowed),
      );
    });
  });
}

/**
 * List ALL segments for a given source file, including those hidden by the
 * curation overlay. Used by the chat detail page so the user can see hidden
 * segments and toggle them back.
 *
 * IMPORTANT: applies lifecycle overrides from the curation overlay so that
 * archiving a segment from the chat detail page is visibly reflected (the
 * pill flips to "archived" right away). Earlier this function read raw
 * lifecycle from the index file only, which made archive look broken.
 */
export async function listAllSegmentsForFileForCuration(
  fileId: string,
): Promise<Segment[]> {
  const [raw, overlay] = await Promise.all([
    readJsonRaw("index/segments.json"),
    loadCurationOverlay(),
  ]);
  const lcOverrides = overlay.lifecycleOverrides?.segments ?? {};
  const all = parseEnvelopedArray<Segment>(
    raw,
    "segments",
    SegmentSchema,
    "segments.json",
  );
  return all
    .filter((seg) => {
      if (seg.file_id && seg.file_id === fileId) return true;
      return seg.segment_id.startsWith(`${fileId}-`);
    })
    .map((s) => {
      const override = lcOverrides[s.segment_id];
      if (!override) return s;
      return { ...s, lifecycle: override };
    });
}

export async function listAllConceptsForCuration(): Promise<Concept[]> {
  const conceptFiles = await listIndexFilesMatching("concepts", ".json");
  const merged = new Map<string, Concept>();
  for (const relPath of conceptFiles) {
    const raw = await readJsonRaw(relPath);
    const items = parseEnvelopedArray<Concept>(
      raw,
      "concepts",
      ConceptSchema,
      relPath,
    );
    const fname = path.basename(relPath, ".json");
    const inferredWorkspace = fname.startsWith("concepts-")
      ? fname.slice("concepts-".length)
      : null;
    for (const c of items) {
      const enriched: Concept =
        !c.primary_workspace && inferredWorkspace
          ? { ...c, primary_workspace: inferredWorkspace }
          : c;
      merged.set(enriched.concept_id, enriched);
    }
  }
  const all = Array.from(merged.values());
  const allowed = getAllowedWorkspaces();
  if (!allowed) return all;
  return all.filter((c) => {
    if (isWorkspaceAllowed(c.primary_workspace, allowed)) return true;
    const sec = c.workspace_secondary ?? [];
    return sec.some((id) => isWorkspaceAllowed(id, allowed));
  });
}

// -- Low level file reads (cached per-process) -------------------------------

type CacheEntry<T> = { value: T; mtimeMs: number };
const fileCache = new Map<string, CacheEntry<unknown>>();

async function readJsonRaw(relPath: string): Promise<unknown> {
  const root = getDossierRoot();
  const fullPath = path.join(root, relPath);
  let stat;
  try {
    stat = await fs.stat(fullPath);
  } catch {
    return null;
  }
  const cached = fileCache.get(fullPath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.value;
  }
  const raw = await fs.readFile(fullPath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`[dossier] Failed to parse ${relPath}:`, err);
    parsed = null;
  }
  fileCache.set(fullPath, { value: parsed, mtimeMs: stat.mtimeMs });
  return parsed;
}

/**
 * Tolerant array extraction: accept either a bare array OR a `{[arrayKey]: [...]}`
 * envelope, then validate each item independently. One bad entry doesn't kill
 * the whole load — it gets skipped and counted, with a single summary warning.
 */
function parseEnvelopedArray<T>(
  raw: unknown,
  arrayKey: string,
  itemSchema: {
    safeParse: (x: unknown) => { success: boolean; data?: T };
  },
  label: string,
): T[] {
  if (raw == null) return [];
  let candidate: unknown = null;
  if (Array.isArray(raw)) {
    candidate = raw;
  } else if (raw && typeof raw === "object" && arrayKey in raw) {
    candidate = (raw as Record<string, unknown>)[arrayKey];
  }
  if (!Array.isArray(candidate)) {
    console.warn(
      `[dossier] ${label}: expected an array or {${arrayKey}: [...]} envelope; got ${typeof raw}.`,
    );
    return [];
  }
  const items: T[] = [];
  let skipped = 0;
  for (const item of candidate) {
    const result = itemSchema.safeParse(item);
    if (result.success && result.data !== undefined) {
      items.push(result.data);
    } else {
      skipped++;
    }
  }
  if (skipped > 0) {
    console.warn(`[dossier] ${label}: ${skipped} entries skipped (failed validation).`);
  }
  return items;
}

/**
 * List the JSON files inside `index/` that match a glob-like prefix+suffix.
 * Used to aggregate split concept registries (concepts.json, concepts-foo.json,
 * concepts-bar.json) into a single list. Returns paths relative to DOSSIER_ROOT.
 */
async function listIndexFilesMatching(
  prefix: string,
  suffix: string,
): Promise<string[]> {
  const root = getDossierRoot();
  const indexDir = path.join(root, "index");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(indexDir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => path.join("index", name))
    .sort();
}

// -- Public read API ---------------------------------------------------------

export async function listWorkspaces(): Promise<Workspace[]> {
  const raw = await readJsonRaw("index/workspaces.json");
  const all = parseEnvelopedArray<Workspace>(
    raw,
    "workspaces",
    WorkspaceSchema,
    "workspaces.json",
  );
  const allowed = getAllowedWorkspaces();
  return all.filter((w) => isWorkspaceAllowed(w.id, allowed));
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const list = await listWorkspaces();
  return list.find((w) => w.id === id) ?? null;
}

export async function listSourceFiles(): Promise<SourceFile[]> {
  const raw = await readJsonRaw("index/master-index.json");
  const overlay = await loadCurationOverlay();
  const hiddenFiles = new Set(overlay.hiddenFileIds);
  const sourceLcOverrides = overlay.lifecycleOverrides?.sources ?? {};
  const allRaw = parseEnvelopedArray<SourceFile>(
    raw,
    "files",
    SourceFileSchema,
    "master-index.json",
  );
  const all = allRaw
    .filter((f) => !hiddenFiles.has(f.file_id))
    .map((f) => {
      // Attach lifecycle (from override, defaulting to "active")
      const override = sourceLcOverrides[f.file_id];
      return { ...f, lifecycle: override ?? "active" } as SourceFile & { lifecycle: LifecycleState };
    });
  const allowed = getAllowedWorkspaces();
  if (!allowed) return all;

  // A file is visible only if (a) its workspace_primary is allowed, OR
  // (b) at least one of its segments belongs to an allowed workspace.
  // Files with no allowed segments are hidden entirely so the chat browser
  // and search cannot leak titles or paths from a disallowed scope.
  const visibleSegments = await listSegments();
  const filesWithVisibleSegments = new Set<string>();
  for (const seg of visibleSegments) {
    const fileId =
      seg.file_id ??
      (seg.segment_id.includes("-s")
        ? seg.segment_id.slice(0, seg.segment_id.lastIndexOf("-s"))
        : null);
    if (fileId) filesWithVisibleSegments.add(fileId);
  }

  return all.filter((file) => {
    if (file.workspace_primary && isWorkspaceAllowed(file.workspace_primary, allowed)) {
      return true;
    }
    return filesWithVisibleSegments.has(file.file_id);
  });
}

export async function getSourceFile(fileId: string): Promise<SourceFile | null> {
  const list = await listSourceFiles();
  return list.find((f) => f.file_id === fileId) ?? null;
}

export async function listSegments(): Promise<Segment[]> {
  const raw = await readJsonRaw("index/segments.json");
  const overlay = await loadCurationOverlay();
  const hiddenSegs = new Set(overlay.hiddenSegmentIds);
  const hiddenFiles = new Set(overlay.hiddenFileIds);
  const lcOverrides = overlay.lifecycleOverrides?.segments ?? {};
  const allRaw = parseEnvelopedArray<Segment>(
    raw,
    "segments",
    SegmentSchema,
    "segments.json",
  );
  const all = allRaw
    .filter((s) => {
      if (hiddenSegs.has(s.segment_id)) return false;
      // Cascade: a segment whose parent file is hidden disappears too. Stops
      // /segments and search results from linking to a 404'd chat detail page.
      const fid =
        s.file_id ??
        (s.segment_id.includes("-s")
          ? s.segment_id.slice(0, s.segment_id.lastIndexOf("-s"))
          : null);
      if (fid && hiddenFiles.has(fid)) return false;
      return true;
    })
    .map((s) => {
      // Apply lifecycle overrides — overlay wins over the stored field
      const override = lcOverrides[s.segment_id];
      if (!override) return s;
      return { ...s, lifecycle: override };
    });
  const allowed = getAllowedWorkspaces();
  if (!allowed) return all;
  return all.filter((seg) => {
    if (isWorkspaceAllowed(seg.workspace_primary, allowed)) return true;
    const sec = seg.workspace_secondary ?? [];
    return sec.some((id) => isWorkspaceAllowed(id, allowed));
  });
}

export async function listSegmentsForFile(fileId: string): Promise<Segment[]> {
  const all = await listSegments();
  return all.filter((seg) => {
    // segment_id is conventionally `${file_id}-sNNN` so we match by prefix
    // OR by an explicit `file_id` field if present.
    if (seg.file_id && seg.file_id === fileId) return true;
    return seg.segment_id.startsWith(`${fileId}-`);
  });
}

export async function getSegment(segmentId: string): Promise<Segment | null> {
  const all = await listSegments();
  return all.find((s) => s.segment_id === segmentId) ?? null;
}

export async function listConcepts(): Promise<Concept[]> {
  // The substrate may split the concept registry across multiple files for
  // size/locality reasons (e.g. concepts-research.json, concepts-product.json).
  // Glob index/concepts*.json and merge them, deduplicating by concept_id.
  // If a concept lacks `primary_workspace`, infer it from the filename suffix
  // (concepts-FOO.json → "FOO"), matching the substrate convention where each
  // category file lives in its own workspace.
  const conceptFiles = await listIndexFilesMatching("concepts", ".json");
  const merged = new Map<string, Concept>();
  for (const relPath of conceptFiles) {
    const raw = await readJsonRaw(relPath);
    const items = parseEnvelopedArray<Concept>(
      raw,
      "concepts",
      ConceptSchema,
      relPath,
    );
    // Derive workspace fallback from filename: "concepts-research.json" → "research"
    const fname = path.basename(relPath, ".json");
    const inferredWorkspace = fname.startsWith("concepts-")
      ? fname.slice("concepts-".length)
      : null;

    for (const c of items) {
      const enriched: Concept =
        !c.primary_workspace && inferredWorkspace
          ? { ...c, primary_workspace: inferredWorkspace }
          : c;
      // Last-writer-wins on duplicate concept_id; sorted glob order makes
      // the precedence stable.
      merged.set(enriched.concept_id, enriched);
    }
  }
  const overlay = await loadCurationOverlay();
  const hiddenConcepts = new Set(overlay.hiddenConceptIds);
  const lcOverrides = overlay.lifecycleOverrides?.concepts ?? {};
  const all = Array.from(merged.values())
    .filter((c) => !hiddenConcepts.has(c.concept_id))
    .map((c) => {
      const override = lcOverrides[c.concept_id];
      if (!override) return c;
      return { ...c, lifecycle: override };
    });

  const allowed = getAllowedWorkspaces();
  if (!allowed) return all;
  return all.filter((c) => {
    if (isWorkspaceAllowed(c.primary_workspace, allowed)) return true;
    const sec = c.workspace_secondary ?? [];
    return sec.some((id) => isWorkspaceAllowed(id, allowed));
  });
}

export async function getConcept(conceptId: string): Promise<Concept | null> {
  const all = await listConcepts();
  return all.find((c) => c.concept_id === conceptId) ?? null;
}

export async function listConceptEdges(): Promise<ConceptEdge[]> {
  const raw = await readJsonRaw("index/concept-graph.json");
  const all = parseEnvelopedArray<ConceptEdge>(
    raw,
    "edges",
    ConceptEdgeSchema,
    "concept-graph.json",
  );
  // Edges are filtered transitively: an edge is visible only if both endpoints
  // resolve to concepts visible under ALLOWED_WORKSPACES.
  const allowed = getAllowedWorkspaces();
  if (!allowed) return all;
  const visibleConcepts = await listConcepts();
  const visibleIds = new Set(visibleConcepts.map((c) => c.concept_id));
  return all.filter((edge) => {
    if (!edge.from || !edge.to) return false;
    return visibleIds.has(edge.from) && visibleIds.has(edge.to);
  });
}

// -- Aggregations used by listing pages --------------------------------------

export interface WorkspaceSummary extends Workspace {
  conceptCount: number;
  sourceCount: number;
  segmentCount: number;
  lastUpdated: string | null;
}

export async function listWorkspaceSummaries(): Promise<WorkspaceSummary[]> {
  const [workspaces, concepts, files, segments] = await Promise.all([
    listWorkspaces(),
    listConcepts(),
    listSourceFiles(),
    listSegments(),
  ]);

  return workspaces.map((w) => {
    const wsConcepts = concepts.filter((c) => {
      if (c.primary_workspace === w.id) return true;
      const sec = c.workspace_secondary ?? [];
      return sec.includes(w.id);
    });

    const wsSegments = segments.filter((s) => {
      if (s.workspace_primary === w.id) return true;
      const sec = s.workspace_secondary ?? [];
      return sec.includes(w.id);
    });

    const segmentFileIds = new Set(
      wsSegments
        .map((s) => {
          // derive file_id from segment_id `${file_id}-sNNN`
          if (s.file_id) return s.file_id;
          const idx = s.segment_id.lastIndexOf("-s");
          if (idx > 0) return s.segment_id.slice(0, idx);
          return null;
        })
        .filter((x): x is string => Boolean(x)),
    );

    const wsFiles = files.filter((f) => {
      if (f.workspace_primary === w.id) return true;
      return segmentFileIds.has(f.file_id);
    });

    const dates = wsFiles
      .map((f) => f.date_detected)
      .filter((d): d is string => Boolean(d))
      .sort();
    const lastUpdated = dates.length ? dates[dates.length - 1] : null;

    return {
      ...w,
      conceptCount: wsConcepts.length,
      sourceCount: wsFiles.length,
      segmentCount: wsSegments.length,
      lastUpdated,
    };
  });
}

// -- Source file body access --------------------------------------------------

/**
 * Read the raw text of a source file. The path comes from a SourceFile entry
 * (master-index.json). Restricts to files inside DOSSIER_ROOT; refuses to read
 * paths that try to escape via `..`.
 */
export async function readSourceBody(relPath: string): Promise<string | null> {
  const root = getDossierRoot();
  const fullPath = path.resolve(root, relPath);
  // Path traversal guard: must stay inside DOSSIER_ROOT.
  if (!fullPath.startsWith(root + path.sep) && fullPath !== root) {
    console.warn(`[dossier] Refused source read outside root: ${relPath}`);
    return null;
  }
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch (err) {
    console.warn(`[dossier] Could not read source ${relPath}:`, err);
    return null;
  }
}

// -- Convenience: dossier root for display -----------------------------------

export function dossierRootForDisplay(): string {
  return getDossierRoot();
}

export function allowedWorkspacesForDisplay(): string[] | null {
  const allowed = getAllowedWorkspaces();
  return allowed ? Array.from(allowed) : null;
}
