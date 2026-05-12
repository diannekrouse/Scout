"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { dossierRootForDisplay } from "@/lib/dossier";

/**
 * Whether a string looks like one of OUR bundle filenames. Recognizes:
 *   New format:   `{workspace}_card_2026-05-09_14-04.{md,json}` (or _bundle_)
 *                 with optional `_2`, `_3`… collision-avoidance suffix
 *   Legacy:       `card-{ts}.{md,json}`
 *                 `qwestor-card-{ts}.{json}`
 *                 `qwestor-bundle-{ts}.{json}`
 *
 * Strict enough to reject path traversal attempts (no slashes, no `..`)
 * — anything that doesn't match one of these shapes is refused.
 */
function isOurBundleFilename(filename: string): boolean {
  // No path separators or directory navigation
  if (filename.includes("/") || filename.includes("\\")) return false;
  if (filename.includes("..")) return false;

  // New format
  if (
    /^[a-z0-9-]+_card_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}(?:_\d+)?\.(md|json)$/i.test(
      filename,
    )
  ) {
    return true;
  }
  if (
    /^[a-z0-9-]+_bundle_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}(?:_\d+)?\.(md|json)$/i.test(
      filename,
    )
  ) {
    return true;
  }
  // Legacy (still in some users' bundle dirs)
  if (/^card-[\w\-:.T]+\.(md|json)$/.test(filename)) return true;
  if (/^qwestor-(bundle|card)-[\w\-:.T]+\.(md|json)$/.test(filename))
    return true;

  return false;
}

/**
 * Delete a single bundle file by name. Validates the filename against the
 * shapes we create and refuses anything else (incl. path traversal). Used
 * by the trash icon on every bundle card on /bundles.
 */
export async function deleteBundleAction(formData: FormData): Promise<void> {
  const filename = (formData.get("filename") as string | null)?.trim();
  if (!filename) return;

  if (!isOurBundleFilename(filename)) {
    console.warn(`[bundles] Refused unsafe filename: ${filename}`);
    return;
  }

  const dossierRoot = dossierRootForDisplay();
  const bundleDir = path.join(dossierRoot, "bundles");
  const fullPath = path.join(bundleDir, filename);

  // Belt-and-suspenders path traversal guard (in addition to the regex)
  if (!fullPath.startsWith(bundleDir + path.sep)) {
    console.warn(`[bundles] Refused traversal: ${filename}`);
    return;
  }

  try {
    await fs.unlink(fullPath);
  } catch (err) {
    console.warn(`[bundles] Could not delete ${filename}:`, err);
  }

  revalidatePath("/bundles");
  revalidatePath("/curate");
}
