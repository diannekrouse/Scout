import Link from "next/link";
import type { SourceFile } from "@/lib/schemas";
import CardButton from "@/components/ui/CardButton";
import LifecycleButton from "@/components/ui/LifecycleButton";

interface ChatCardProps {
  file: SourceFile;
  workspaceColor?: string;
  workspaceName?: string;
  segmentCount?: number;
  onCard?: boolean;
  /** When true, render the lifecycle pill (active / archived / forgotten). */
  showLifecycleToggle?: boolean;
}

const PLATFORM_PALETTE: Record<string, string> = {
  ChatGPT: "#7DD3A0",
  Grok: "#9BC9E8",
  Claude: "#FFB39A",
  GoogleDoc: "#F4C770",
};

export default function ChatCard({
  file,
  workspaceColor,
  workspaceName,
  segmentCount,
  onCard = false,
  showLifecycleToggle = false,
}: ChatCardProps) {
  // The lifecycle field gets attached by listSourceFiles via overlay
  const fileLifecycle =
    ((file as unknown as { lifecycle?: "active" | "archived" | "forgotten" })
      .lifecycle) || "active";
  const platform = file.platform || "Source";
  const platformColor =
    PLATFORM_PALETTE[platform] || workspaceColor || "#A89A88";

  return (
    <div className="relative h-full">
      <Link
        href={`/chats/${file.file_id}`}
        className="block no-underline group h-full"
      >
        <article
          className="card card-pad relative overflow-hidden h-full transition-all group-hover:shadow-lift group-hover:-translate-y-0.5 pr-12"
          style={{
            background: `linear-gradient(160deg, ${platformColor}10 0%, #FFFFFF 60%)`,
          }}
        >
          {/* Soft halo blob in the top-right */}
          <div
            aria-hidden
            className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
            style={{ backgroundColor: platformColor }}
          />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="sticker"
                style={{
                  backgroundColor: `${platformColor}22`,
                  color: platformColor,
                  transform: "rotate(-1deg)",
                }}
              >
                {platform}
              </span>
              {file.date_detected && (
                <span className="text-[11px] font-mono text-dim">
                  {file.date_detected}
                </span>
              )}
              <span className="text-[11px] font-mono text-dim">
                · {file.file_id}
              </span>
              {showLifecycleToggle && (
                <LifecycleButton
                  kind="source"
                  id={file.file_id}
                  current={fileLifecycle}
                />
              )}
            </div>

            <h3 className="font-display text-base text-bright leading-snug font-bold mb-2 line-clamp-2">
              {file.title_detected || file.filename || file.file_id}
            </h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted">
              {typeof segmentCount === "number" && (
                <span>
                  <strong className="text-body">{segmentCount}</strong> segment
                  {segmentCount === 1 ? "" : "s"}
                </span>
              )}
              {file.total_words && (
                <span>
                  <strong className="text-body">
                    {file.total_words.toLocaleString()}
                  </strong>{" "}
                  words
                </span>
              )}
              {file.total_lines && (
                <span>
                  <strong className="text-body">
                    {file.total_lines.toLocaleString()}
                  </strong>{" "}
                  lines
                </span>
              )}
            </div>

            {workspaceName && (
              <div className="mt-3 flex items-center gap-1.5">
                {workspaceColor && (
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: workspaceColor }}
                  />
                )}
                <span className="text-[11px] text-dim font-medium">
                  {workspaceName}
                </span>
              </div>
            )}
          </div>
        </article>
      </Link>
      <CardButton kind="source" id={file.file_id} isOnCard={onCard} />
    </div>
  );
}
