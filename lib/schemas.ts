/**
 * Zod schemas for tolerant parsing of the dossier substrate JSON files.
 *
 * Design notes:
 * - All fields are optional except primary identifiers (id / *_id).
 * - Each top-level file accepts both `{key: [...]}` envelopes AND bare arrays.
 * - Unknown fields are passed through (`.passthrough()`).
 * - Helpers below normalize to plain arrays so callers don't have to branch.
 *
 * Never assume the shape of any user-provided dossier. Be tolerant.
 */
import { z } from "zod";

// -- Primitive helpers -------------------------------------------------------

/**
 * Accept either a string, an array of strings, null, or undefined. Always
 * normalize to a string array (or an empty array). Null is treated like
 * "not provided" so the substrate's tolerance for missing values doesn't
 * cause validation failures.
 */
const StringOrStringArray = z
  .union([z.string(), z.array(z.string()).default([]), z.null()])
  .nullish()
  .transform((v) => {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  });

/** Optional string that also accepts null (treated as undefined). */
const NullableString = z.string().nullish().transform((v) => v ?? undefined);

/** Optional number that also accepts null (treated as undefined). */
const NullableNumber = z.number().nullish().transform((v) => v ?? undefined);

/** Optional boolean that also accepts null (treated as undefined). */
const NullableBoolean = z.boolean().nullish().transform((v) => v ?? undefined);

// -- Workspace ---------------------------------------------------------------

export const WorkspaceSchema = z
  .object({
    id: z.string(),
    name: NullableString,
    color: NullableString,
    description: NullableString,
    /** Optional explicit glyph name for the WorkspaceBadge. When omitted,
     *  the badge picks one deterministically from a small ambient pool by
     *  hashing the id. Workspaces whose meaning fits a specific glyph
     *  (research → magnifier, study → book, etc.) can opt in here. */
    glyph: z.string().optional(),
  })
  .passthrough();

export type Workspace = z.infer<typeof WorkspaceSchema>;

// -- Source file (master-index entry) ----------------------------------------

export const SourceFileSchema = z
  .object({
    file_id: z.string(),
    path: NullableString,
    platform: NullableString,
    filename: NullableString,
    file_type: NullableString,
    date_detected: NullableString,
    title_detected: NullableString,
    total_lines: NullableNumber,
    total_words: NullableNumber,
    personas_detected: StringOrStringArray,
    workspace_primary: NullableString,
    workspace_secondary: StringOrStringArray,
    tags: StringOrStringArray,
    status: NullableString,
  })
  .passthrough()
  .transform((data) => {
    // Backwards compatibility: accept `workspace` as a fallback for
    // `workspace_primary`, and `title` as a fallback for `title_detected`.
    // Older build-index versions wrote these legacy field names.
    const legacy = data as unknown as {
      workspace?: string | null;
      title?: string | null;
    };
    if (!data.workspace_primary && legacy.workspace) {
      data.workspace_primary = legacy.workspace;
    }
    if (!data.title_detected && legacy.title) {
      data.title_detected = legacy.title;
    }
    return data;
  });

export type SourceFile = z.infer<typeof SourceFileSchema>;

// -- Segment -----------------------------------------------------------------

export const LifecycleSchema = z
  .enum(["active", "archived", "forgotten"])
  .or(z.string())
  .transform((v): "active" | "archived" | "forgotten" => {
    if (v === "archived" || v === "forgotten") return v;
    return "active";
  });

export const SegmentSchema = z
  .object({
    segment_id: z.string(),
    source_file: NullableString,
    file_id: NullableString,
    start_line: NullableNumber,
    end_line: NullableNumber,
    word_count: NullableNumber,
    title: NullableString,
    summary: NullableString,
    personas_detected: StringOrStringArray,
    workspace_primary: NullableString,
    workspace_secondary: StringOrStringArray,
    tags: StringOrStringArray,
    lifecycle: LifecycleSchema.nullish(),
  })
  .passthrough();

export type Segment = z.infer<typeof SegmentSchema>;

// -- Concept -----------------------------------------------------------------

export const ConceptSchema = z
  .object({
    concept_id: z.string(),
    name: NullableString,
    category: NullableString,
    primary_workspace: NullableString,
    workspace_secondary: StringOrStringArray,
    summary: NullableString,
    source_segments: StringOrStringArray,
    related_concepts: StringOrStringArray,
    tags: StringOrStringArray,
    lifecycle: LifecycleSchema.nullish(),
  })
  .passthrough();

export type Concept = z.infer<typeof ConceptSchema>;

// -- Concept graph edge ------------------------------------------------------

export const ConceptEdgeSchema = z
  .object({
    from: NullableString,
    to: NullableString,
    source: NullableString,
    target: NullableString,
    type: NullableString,
    relation: NullableString,
    cross_workspace: NullableBoolean,
  })
  .passthrough()
  .transform((edge) => ({
    ...edge,
    from: edge.from ?? edge.source,
    to: edge.to ?? edge.target,
    type: edge.type ?? edge.relation,
  }));

export type ConceptEdge = z.infer<typeof ConceptEdgeSchema>;
