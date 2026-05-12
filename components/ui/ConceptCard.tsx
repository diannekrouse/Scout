import Link from "next/link";
import type { Concept } from "@/lib/schemas";
import CardButton from "@/components/ui/CardButton";
import LifecycleButton from "@/components/ui/LifecycleButton";
import TagPill from "@/components/ui/TagPill";

interface ConceptCardProps {
  concept: Concept;
  workspaceColor?: string;
  onCard?: boolean;
  /** When true, show a clickable lifecycle pill (active / archived / forgotten). */
  showLifecycleToggle?: boolean;
}

export default function ConceptCard({
  concept,
  workspaceColor,
  onCard = false,
  showLifecycleToggle = false,
}: ConceptCardProps) {
  const accent = workspaceColor || "#A89A88";
  return (
    <div className="relative h-full">
      <Link
        href={`/concepts/${concept.concept_id}`}
        className="block no-underline group h-full"
      >
        <article
          className="card card-pad relative overflow-hidden h-full transition-all group-hover:shadow-lift group-hover:-translate-y-0.5 pr-12"
          style={{
            background: `linear-gradient(160deg, ${accent}0A 0%, #FFFFFF 60%)`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{
                backgroundColor: accent,
                boxShadow: `0 0 0 3px ${accent}22`,
              }}
            />
            {concept.category && (
              <span className="eyebrow" style={{ color: accent }}>
                {concept.category}
              </span>
            )}
            {showLifecycleToggle ? (
              <LifecycleButton
                kind="concept"
                id={concept.concept_id}
                current={(concept.lifecycle as "active" | "archived" | "forgotten") || "active"}
              />
            ) : (
              concept.lifecycle &&
              concept.lifecycle !== "active" && (
                <span className="pill text-dim">{concept.lifecycle}</span>
              )
            )}
          </div>

          <h3 className="font-display text-lg text-bright leading-snug mb-2 font-bold">
            {concept.name || concept.concept_id}
          </h3>

          {concept.summary && (
            <p className="text-sm text-muted leading-relaxed line-clamp-3">
              {concept.summary}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5 items-center text-[11px] text-dim font-mono">
            {concept.source_segments && concept.source_segments.length > 0 && (
              <span>
                {concept.source_segments.length} source
                {concept.source_segments.length === 1 ? "" : "s"}
              </span>
            )}
            {concept.related_concepts && concept.related_concepts.length > 0 && (
              <span>· {concept.related_concepts.length} related</span>
            )}
          </div>

          {/* Tags — clickable, jump to /segments?tag={tag} for cross-cutting
              filter. Same controlled vocabulary across segments + concepts.
              Deduped at render time so any accidental dupe in the substrate
              doesn't blow up React's key uniqueness rule. */}
          {concept.tags && concept.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from(new Set(concept.tags)).map((t) => (
                <TagPill key={`t-${t}`} tag={t} />
              ))}
            </div>
          )}
        </article>
      </Link>
      <CardButton kind="concept" id={concept.concept_id} isOnCard={onCard} />
    </div>
  );
}
