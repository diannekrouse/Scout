// Smoke test: load tracking.html in Chromium, fail on console errors,
// exercise walk + edge hover + scrubber + compile, screenshot both themes.
import { chromium } from "playwright-core";

const dir = new URL(".", import.meta.url).pathname;
const errors = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto("file://" + dir + "tracking.html");
await page.waitForTimeout(400);

// Structure sanity
const nodes = await page.locator("#stage .node").count();
const edges = await page.locator("#stage .edge").count();
console.log(`nodes=${nodes} edges=${edges}`);
if (nodes < 3 || edges < 3) errors.push("stage looks empty");

// Hover an edge → quote card appears with serif quote + mono cite
await page.locator("#stage .edgehit").first().hover();
await page.waitForTimeout(150);
const quoteVisible = await page.locator("#quoteCard").isVisible();
const quote = await page.locator("#quoteText").textContent();
console.log("quote on hover:", quoteVisible, (quote || "").slice(0, 70));
if (!quoteVisible || !quote || quote.length < 20) errors.push("edge hover did not surface a quotation");

// Ground pane shows highlighted lines
const hot = await page.locator("#groundLines .srcline.hot").count();
console.log("hot lines:", hot);
if (!hot) errors.push("no highlighted evidence lines in the Ground");

// Walk to a neighbor → trail grows
await page.locator("#stage .node").first().click();
await page.waitForTimeout(200);
const steps = await page.locator("#trailList .tstep").count();
console.log("trail steps after walk:", steps);
if (steps < 2) errors.push("walking did not extend the trail");

// Scrub to the earliest season → stage should thin out or show empty-state
await page.locator("#scrub").fill("0");
await page.locator("#scrub").dispatchEvent("input");
await page.waitForTimeout(200);
const earlyEdges = await page.locator("#stage .edge").count();
console.log("edges at season start:", earlyEdges);
await page.locator("#scrub").fill(await page.locator("#scrub").getAttribute("max"));
await page.locator("#scrub").dispatchEvent("input");
await page.waitForTimeout(200);

// Compile dialog
await page.locator("#compileBtn").click();
await page.waitForTimeout(150);
const bundle = await page.locator("#bundleText").inputValue();
console.log("bundle bytes:", bundle.length, "| has schema:", bundle.includes("trail-bundle-v0"), "| has cite:", /L\d+–L\d+/.test(bundle));
if (!bundle.includes("trail-bundle-v0") || bundle.length < 300) errors.push("compiled bundle looks wrong");
await page.locator("#closeDlg").click();

// List view renders rows
await page.locator("#viewList").click();
await page.waitForTimeout(150);
const rows = await page.locator("#listBody tr").count();
console.log("list rows:", rows);
if (!rows) errors.push("list view empty");
await page.locator("#viewTrack").click();
await page.waitForTimeout(150);

// Screenshots: light then dark
await page.screenshot({ path: dir + "shot-light.png" });
await page.locator("#themeBtn").click();
await page.waitForTimeout(250);
await page.screenshot({ path: dir + "shot-dark.png" });

await browser.close();
if (errors.length) { console.error("\nFAILURES:"); errors.forEach((e) => console.error("  ✗ " + e)); process.exit(1); }
console.log("\nSmoke test passed ✓ (screenshots: shot-light.png, shot-dark.png)");
