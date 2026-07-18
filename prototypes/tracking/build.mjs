// Inline DATA + app into the template → tracking.html (self-contained).
import { readFileSync, writeFileSync } from "node:fs";
import { DATA } from "./data.mjs";

const dir = new URL(".", import.meta.url).pathname;
const tpl = readFileSync(dir + "template.html", "utf8");
const app = readFileSync(dir + "app.mjs", "utf8");

// </script> inside inlined JSON/JS would terminate the script tag early.
const json = JSON.stringify(DATA).replace(/<\//g, "<\\/");
const safeApp = app.replace(/<\/script>/g, "<\\/script>");

let out = tpl.replace("/*__DATA__*/ null", json);
if (!out.includes(json)) throw new Error("DATA marker not replaced");
out = out.replace("/*__APP__*/", safeApp);
if (out.includes("/*__APP__*/")) throw new Error("APP marker not replaced");

writeFileSync(dir + "tracking.html", out);
console.log(`built tracking.html (${(out.length / 1024).toFixed(1)} KB)`);
