// Inline DATA + app into the template → tracking.html (self-contained).
import { readFileSync, writeFileSync } from "node:fs";
import { DATA } from "./data.mjs";

const dir = new URL(".", import.meta.url).pathname;
const tpl = readFileSync(dir + "template.html", "utf8");
const app = readFileSync(dir + "app.mjs", "utf8");

// ---- Anchor contract (CC-2A-R corrected): edge-creation-time stamping ----
// Sources get a content hash; every edge copies its file's hash into the
// anchor tuple AND stores the verbatim quotation as its recovery key.
// (Must match fnv1a in app.mjs exactly.)
const fnv1a = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return "fnv1a:" + h.toString(16).padStart(8, "0");
};
const segMap = new Map(DATA.segments.map((s) => [s.segment_id, s]));
for (const src of Object.values(DATA.sources)) src.source_hash = fnv1a(src.lines.join("\n"));
for (const e of DATA.edges) {
  if (e.stale_demo) continue; // authored hash+quote preserved — demonstrates the recovery/failure path
  const seg = segMap.get(e.evidence.segment);
  const src = DATA.sources[seg.file_id];
  e.evidence.source_hash = src.source_hash;
  const from = seg.start_line + e.evidence.from_offset, to = seg.start_line + e.evidence.to_offset;
  e.quote = src.lines.slice(from - 1, to).join(" ").replace(/\s+/g, " ").trim();
}

// </script> inside inlined JSON/JS would terminate the script tag early.
const json = JSON.stringify(DATA).replace(/<\//g, "<\\/");
const safeApp = app.replace(/<\/script>/g, "<\\/script>");

let out = tpl.replace("/*__DATA__*/ null", json);
if (!out.includes(json)) throw new Error("DATA marker not replaced");
out = out.replace("/*__APP__*/", safeApp);
if (out.includes("/*__APP__*/")) throw new Error("APP marker not replaced");

writeFileSync(dir + "tracking.html", out);
console.log(`built tracking.html (${(out.length / 1024).toFixed(1)} KB)`);
