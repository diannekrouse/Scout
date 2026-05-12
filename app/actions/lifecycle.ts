"use server";

import { revalidatePath } from "next/cache";
import { loadCurationOverlay, saveCurationOverlay } from "@/lib/dossier";

/**
 * Lifecycle toggle — flip an item between active / archived / forgotten.
 *
 * Implementation notes:
 *
 * The original substrate stores `lifecycle` directly on each segment / concept
 * record in the index files. We don't touch those files (the spec says
 * "JSON files in any dossier are never modified"). Instead, we extend the
 * curation overlay with a `lifecycleOverrides` map: { id: "archived" | "forgotten" | "active" }.
 *
 * Reads in lib/dossier.ts that respect lifecycle (the /archive page filter,
 * etc.) consult this overlay to determine the *effective* lifecycle state.
 * The substrate stays read-only; the overlay is the spec's "optional minimal
 * write surface".
 */

type LifecycleState = "active" | "archived" | "forgotten";

interface LifecycleOverlay {
  segments: Record<string, LifecycleState>;
  concepts: Record<string, LifecycleState>;
  sources?: Record<string, LifecycleState>;
}

/**
 * Set an item's lifecycle. Cycle order: active → archived → forgotten → active.
 * Or pass an explicit state.
 */
export async function setLifecycleAction(formData: FormData): Promise<void> {
  const kind = formData.get("kind") as "segment" | "concept" | "source" | null;
  const id = formData.get("id") as string | null;
  const target = formData.get("state") as LifecycleState | null;
  if (!kind || !id) return;

  const overlay = await loadCurationOverlay();
  const lifecycleMap: LifecycleOverlay =
    (overlay as unknown as { lifecycleOverrides?: LifecycleOverlay }).lifecycleOverrides ?? {
      segments: {},
      concepts: {},
      sources: {},
    };
  if (!lifecycleMap.sources) lifecycleMap.sources = {};

  const key =
    kind === "segment"
      ? "segments"
      : kind === "concept"
      ? "concepts"
      : "sources";
  const current = (lifecycleMap[key] as Record<string, LifecycleState>)[id] ?? "active";

  let next: LifecycleState;
  if (target) {
    next = target;
  } else {
    // Cycle: active → archived → forgotten → active
    next =
      current === "active"
        ? "archived"
        : current === "archived"
        ? "forgotten"
        : "active";
  }

  const map = lifecycleMap[key] as Record<string, LifecycleState>;
  if (next === "active") {
    delete map[id];
  } else {
    map[id] = next;
  }

  // Persist back to the curation overlay file via a small extension
  const overlayWithLifecycle = {
    ...overlay,
    lifecycleOverrides: lifecycleMap,
  };
  // saveCurationOverlay expects the original CurationOverlay shape; pass-through works
  // because JSON.stringify includes the extra field
  await saveCurationOverlay(overlayWithLifecycle as Parameters<typeof saveCurationOverlay>[0]);

  revalidatePath("/", "layout");
}
