"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import {
  loadCurationOverlay,
  saveCurationOverlay,
  listWorkspaces,
  listConcepts,
  listSegments,
  listSourceFiles,
  dossierRootForDisplay,
  allowedWorkspacesForDisplay,
} from "@/lib/dossier";

type ItemKind = "source" | "concept" | "segment";

/**
 * Flip an item's curation state. Toggles the item's id in/out of the
 * appropriate hidden list and persists the overlay file.
 *
 * Called from the /curate page checkbox form.
 */
export async function toggleCurationAction(formData: FormData): Promise<void> {
  const kind = formData.get("kind") as ItemKind | null;
  const id = formData.get("id") as string | null;
  if (!kind || !id) return;

  const overlay = await loadCurationOverlay();

  const listFor = (k: ItemKind) =>
    k === "source"
      ? overlay.hiddenFileIds
      : k === "concept"
      ? overlay.hiddenConceptIds
      : overlay.hiddenSegmentIds;
  const arr = listFor(kind);
  const idx = arr.indexOf(id);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(id);
  }

  // Reassign in case we created a new array. Defensive only.
  if (kind === "source") overlay.hiddenFileIds = arr;
  else if (kind === "concept") overlay.hiddenConceptIds = arr;
  else overlay.hiddenSegmentIds = arr;

  await saveCurationOverlay(overlay);
  // Refresh /curate so the count updates immediately.
  revalidatePath("/curate");
  // Other pages also depend on the overlay; revalidate the whole reader.
  revalidatePath("/", "layout");
}

/**
 * Bulk reset — clear ALL curation hides so everything is visible again.
 * Useful as an "undo" if you over-curate.
 */
export async function resetCurationAction(): Promise<void> {
  await saveCurationOverlay({
    hiddenConceptIds: [],
    hiddenSegmentIds: [],
    hiddenFileIds: [],
  });
  revalidatePath("/curate");
  revalidatePath("/", "layout");
}

/**
 * Hide every concept + source — useful as a "start fresh, then opt-in" prep
 * step before clicking the keepers. Segments are not bulk-hidden because
 * they're typically too many; they follow their parent source's visibility.
 */
export async function hideAllAction(formData: FormData): Promise<void> {
  const ids: string[] = JSON.parse(
    (formData.get("conceptIds") as string) || "[]",
  );
  const fileIds: string[] = JSON.parse(
    (formData.get("fileIds") as string) || "[]",
  );
  await saveCurationOverlay({
    hiddenConceptIds: ids,
    hiddenSegmentIds: [],
    hiddenFileIds: fileIds,
  });
  revalidatePath("/curate");
  revalidatePath("/", "layout");
}

/**
 * Compile the currently-visible (curated) substrate into a single JSON
 * bundle. The dossier-reader is the LIBRARY; this bundle is what the
 * researcher requests to take to Qwestor (or any downstream consumer).
 *
 * Output goes to $DOSSIER_ROOT/bundles/qwestor-bundle-{timestamp}.json
 * so it travels with the dossier and is easy to find later.
 */
export async function exportBundleAction(): Promise<void> {
  const [workspaces, concepts, segments, sources] = await Promise.all([
    listWorkspaces(),
    listConcepts(),
    listSegments(),
    listSourceFiles(),
  ]);
  const dossierRoot = dossierRootForDisplay();
  const allowed = allowedWorkspacesForDisplay();
  const overlay = await loadCurationOverlay();

  const bundle = {
    $schema: "qwestor-input-bundle-v1",
    createdAt: new Date().toISOString(),
    sourceDossier: dossierRoot,
    allowedWorkspaces: allowed,
    curationApplied: {
      hiddenConceptIds: overlay.hiddenConceptIds.length,
      hiddenSegmentIds: overlay.hiddenSegmentIds.length,
      hiddenFileIds: overlay.hiddenFileIds.length,
    },
    counts: {
      workspaces: workspaces.length,
      concepts: concepts.length,
      sources: sources.length,
      segments: segments.length,
    },
    workspaces,
    concepts,
    sources,
    segments,
  };

  // Filename uses local-time-ish ISO without colons (filesystem-safe)
  const ts = new Date()
    .toISOString()
    .replace(/[:]/g, "-")
    .replace(/\..+$/, "");
  const bundleDir = path.join(dossierRoot, "bundles");
  await fs.mkdir(bundleDir, { recursive: true });
  const bundlePath = path.join(bundleDir, `qwestor-bundle-${ts}.json`);
  await fs.writeFile(bundlePath, JSON.stringify(bundle, null, 2));

  revalidatePath("/curate");
}
