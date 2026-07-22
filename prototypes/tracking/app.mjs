/* Scout Tracking prototype — app logic.
   Expects window.SCOUT_DATA. Deterministic: same substrate, same scene. */
(function () {
  "use strict";
  const DATA = window.SCOUT_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const SVGNS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- indexes ----
  const conceptById = new Map(DATA.concepts.map((c) => [c.concept_id, c]));
  const segById = new Map(DATA.segments.map((s) => [s.segment_id, s]));
  const wsById = new Map(DATA.workspaces.map((w) => [w.id, w]));
  const groveByConcept = new Map();
  DATA.groves.forEach((t) => t.concepts.forEach((c) => groveByConcept.set(c, t)));

  const DAY = 86400000;
  const parseD = (s) => Date.parse(s + "T00:00:00Z");
  const fmtD = (ms) =>
    new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const T_MIN = parseD(DATA.meta.time_min), T_MAX = parseD(DATA.meta.time_max);

  const firstSeen = (cid) => {
    const c = conceptById.get(cid);
    let m = Infinity;
    for (const sg of c.source_segments) {
      const seg = segById.get(sg);
      const d = parseD(DATA.sources[seg.file_id].date);
      if (d < m) m = d;
    }
    return m;
  };

  // Provenance contract: evidence anchors to a segment_id + intra-segment
  // offsets; absolute lines are resolved HERE, at render time, so segment
  // remapping (content-hash staleness) never strands a quotation.
  const resolveEvidence = (e) => {
    const seg = segById.get(e.evidence.segment);
    const src = DATA.sources[seg.file_id];
    const from = seg.start_line + e.evidence.from_offset;
    const to = seg.start_line + e.evidence.to_offset;
    return { seg, src, from, to };
  };
  const quoteOf = (e) => {
    const { src, from, to } = resolveEvidence(e);
    return src.lines.slice(from - 1, to).join(" ").replace(/\s+/g, " ").trim();
  };
  const citeOf = (e) => {
    const { seg, from, to } = resolveEvidence(e);
    return `${seg.segment_id} · L${from}–L${to} · ${e.date}`;
  };

  // ---- relation grammar: sector bands (deg, 0=east, clockwise) ----
  const TYPES = {
    depends_on:     { label: "depends on",     mid: -90,  span: 52, arrow: true,  dash: null },
    influences:     { label: "influences",     mid: -145, span: 40, arrow: true,  dash: null },
    contrasts_with: { label: "contrasts with", mid: 180,  span: 40, arrow: false, dash: "7 5" },
    instance_of:    { label: "instance of",    mid: 135,  span: 36, arrow: true,  dash: "2 5" },
    co_occurs:      { label: "co-occurs",      mid: 90,   span: 44, arrow: false, dash: null },
    evolved_into:   { label: "evolved into",   mid: 0,    span: 44, arrow: true,  dash: null },
  };

  // ---- state ----
  const state = {
    center: "line-level-provenance",
    t: T_MAX,
    view: "track",
    trail: [],
    sticky: null, // pinned edge
    playTimer: null,
  };

  // hash: #c=<id>&t=<yyyy-mm-dd>&v=track|list
  (function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get("c") && conceptById.has(h.get("c"))) state.center = h.get("c");
    if (h.get("t") && !isNaN(parseD(h.get("t")))) state.t = Math.min(T_MAX, Math.max(T_MIN, parseD(h.get("t"))));
    if (h.get("v") === "list") state.view = "list";
  })();
  const writeHash = () => {
    const iso = new Date(state.t).toISOString().slice(0, 10);
    history.replaceState(null, "", `#c=${state.center}&t=${iso}&v=${state.view}`);
  };

  // ---- graph queries ----
  const edgesAt = (t) => DATA.edges.filter((e) => parseD(e.date) <= t);
  const neighborsOf = (cid, t) => {
    const out = [];
    for (const e of edgesAt(t)) {
      if (e.from === cid) out.push({ edge: e, other: e.to, outgoing: true });
      else if (e.to === cid) out.push({ edge: e, other: e.from, outgoing: false });
    }
    return out;
  };
  const weightOf = (e) => e.evidence.to_offset - e.evidence.from_offset + 1;

  // ---- trail ----
  function pushTrail(cid, via) {
    const last = state.trail[state.trail.length - 1];
    if (last && last.concept === cid) return;
    state.trail.push({ concept: cid, via: via || null });
    renderTrail();
    $("#compileBtn").textContent = `Compile trail (${state.trail.length})`;
  }

  function walk(cid, via) {
    if (!conceptById.has(cid)) return;
    state.center = cid;
    state.sticky = null;
    pushTrail(cid, via);
    const c = conceptById.get(cid);
    const seg = segById.get(c.source_segments[0]);
    showGround(seg.file_id, seg.start_line, seg.end_line, `Primary evidence — “${seg.title}”`);
    clearQuote();
    renderAll();
  }

  // ---- ground pane (source window) ----
  function showGround(fileId, from, to, cause) {
    const src = DATA.sources[fileId];
    const ws = wsById.get(src.workspace);
    $("#groundCause").textContent = cause || "";
    $("#groundTitle").textContent = src.title;
    $("#groundMeta").innerHTML =
      `<span class="chip ${ws.color}">${esc(ws.name)}</span> <code>${esc(src.path)}</code> · ${esc(src.date)}`;
    const lo = Math.max(1, from - 6), hi = Math.min(src.lines.length, to + 6);
    let html = "";
    for (let n = lo; n <= hi; n++) {
      const hot = n >= from && n <= to;
      html += `<div class="srcline${hot ? " hot" : ""}"><span class="ln">${n}</span><span class="lt">${esc(src.lines[n - 1]) || "&nbsp;"}</span></div>`;
    }
    $("#groundLines").innerHTML = html;
    const first = $("#groundLines .hot");
    if (first) first.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  }

  // ---- quotation card ----
  function showQuote(e, stick) {
    const card = $("#quoteCard");
    const from = conceptById.get(e.from), to = conceptById.get(e.to);
    card.hidden = false;
    card.classList.toggle("stuck", !!stick);
    $("#quoteText").textContent = "“" + quoteOf(e) + "”";
    $("#quoteCite").textContent = citeOf(e);
    $("#quoteRel").innerHTML =
      `${esc(from.name)} <span class="reltype">${TYPES[e.type].label}</span> ${esc(to.name)}` +
      (stick ? ` <button class="unstick" id="unstickBtn" title="Unpin">✕</button>` : "");
    if (stick) $("#unstickBtn").addEventListener("click", () => { state.sticky = null; clearQuote(); renderStage(); });
    const ev = resolveEvidence(e);
    showGround(ev.src.file_id, ev.from, ev.to, `Crossing evidence — ${ev.seg.segment_id}`);
  }
  function clearQuote() {
    if (state.sticky) return;
    const card = $("#quoteCard");
    card.hidden = true; card.classList.remove("stuck");
  }

  // ---- stage (radial track view) ----
  const CX = 460, CY = 292;
  function layoutNeighbors(nbrs) {
    const groups = {};
    nbrs.forEach((n) => { (groups[n.edge.type] = groups[n.edge.type] || []).push(n); });
    const placed = [];
    for (const [type, list] of Object.entries(groups)) {
      const t = TYPES[type];
      list.sort((a, b) => a.other.localeCompare(b.other));
      const n = list.length;
      list.forEach((item, i) => {
        const frac = n === 1 ? 0.5 : i / (n - 1);
        const ang = ((t.mid - t.span / 2) + frac * t.span) * Math.PI / 180;
        const r = 236 - Math.min(weightOf(item.edge), 5) * 16 + (i % 2 ? 16 : 0);
        placed.push({ ...item, x: CX + r * Math.cos(ang), y: CY + r * Math.sin(ang) });
      });
    }
    return placed;
  }

  function nodeShape(ws, x, y, r) {
    // Secondary encoding: shape per workspace (never color alone).
    if (ws === "claude-code") {
      const s = r * 1.5;
      return `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="2.5" transform="rotate(45 ${x} ${y})"/>`;
    }
    if (ws === "voyager") {
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 2;
        pts.push(`${(x + r * 1.12 * Math.cos(a)).toFixed(1)},${(y + r * 1.12 * Math.sin(a)).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(" ")}"/>`;
    }
    return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  }

  function renderStage() {
    const svg = $("#stage");
    const center = conceptById.get(state.center);
    const nbrs = layoutNeighbors(neighborsOf(state.center, state.t));
    const freshCut = state.t - 45 * DAY;
    let g = `<defs>`;
    for (const w of DATA.workspaces)
      g += `<marker id="arr-${w.id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" class="arrow"/></marker>`;
    g += `<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" class="arrow"/></marker></defs>`;

    // sector ghost labels — teach the grammar
    for (const [k, t] of Object.entries(TYPES)) {
      const a = (t.mid * Math.PI) / 180, rr = 272;
      const x = CX + rr * Math.cos(a), y = CY + rr * Math.sin(a);
      g += `<text class="sector" x="${x}" y="${y}" text-anchor="middle">${t.label}</text>`;
    }

    // edges under nodes
    for (const n of nbrs) {
      const e = n.edge, t = TYPES[e.type];
      let sx = n.outgoing ? CX : n.x, sy = n.outgoing ? CY : n.y;
      let tx = n.outgoing ? n.x : CX, ty = n.outgoing ? n.y : CY;
      const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      // stop short of the marks: edges meet node rims, arrows stay visible,
      // and hit-paths never steal clicks from the nodes themselves
      const srcOff = n.outgoing ? 26 : 15, dstOff = n.outgoing ? 15 : 28;
      sx += ux * srcOff; sy += uy * srcOff; tx -= ux * dstOff; ty -= uy * dstOff;
      const mx = (sx + tx) / 2, my = (sy + ty) / 2;
      const cxq = mx - uy * 14, cyq = my + ux * 14;
      const d = `M${sx},${sy} Q${cxq},${cyq} ${tx},${ty}`;
      const w = 1.4 + Math.min(weightOf(e), 4) * 0.55;
      const fresh = parseD(e.date) >= freshCut;
      const key = edgeKey(e);
      const stuck = state.sticky && edgeKey(state.sticky) === key;
      if (fresh) g += `<path class="spoor" d="${d}"/>`;
      g += `<path class="edge${stuck ? " stuck" : ""}" data-ek="${key}" d="${d}" stroke-width="${w}"` +
        (t.dash ? ` stroke-dasharray="${t.dash}"` : "") +
        (t.arrow ? ` marker-end="url(#arr)"` : "") + `/>`;
      g += `<path class="edgehit" data-ek="${key}" d="${d}"/>`;
    }

    // neighbor nodes
    for (const n of nbrs) {
      const c = conceptById.get(n.other);
      const seen = firstSeen(n.other) <= state.t;
      g += `<g class="node ${wsById.get(c.workspace).color}${seen ? "" : " unseen"}" data-c="${c.concept_id}" data-ek="${edgeKey(n.edge)}" tabindex="0" role="button" aria-label="Walk to ${esc(c.name)}">` +
        `<circle class="hit" cx="${n.x}" cy="${n.y}" r="20"/>` +
        nodeShape(c.workspace, n.x, n.y, 9) +
        `<text class="nlabel" x="${n.x}" y="${n.y + 24}" text-anchor="middle">${esc(c.name)}</text></g>`;
    }

    // center node + rosette ring (broken ring — rosettes, not solid spots)
    const cn = nbrs.length;
    g += `<g class="center ${wsById.get(center.workspace).color}">` +
      `<circle class="rosette" cx="${CX}" cy="${CY}" r="21"/>` +
      `<circle class="rosette r2" cx="${CX}" cy="${CY}" r="27"/>` +
      nodeShape(center.workspace, CX, CY, 13) +
      `<text class="clabel" x="${CX}" y="${CY + 48}" text-anchor="middle">${esc(center.name)}</text>` +
      `<text class="csub" x="${CX}" y="${CY + 64}" text-anchor="middle">${cn} crossing${cn === 1 ? "" : "s"} · ${esc(center.category)}</text></g>`;

    if (!cn)
      g += `<text class="empty" x="${CX}" y="${CY - 46}" text-anchor="middle">No tracks yet this early — drag the season line forward.</text>`;

    svg.innerHTML = g;

    // wire events
    svg.querySelectorAll(".edgehit").forEach((p) => {
      const e = edgeByKey(p.dataset.ek);
      p.addEventListener("mouseenter", () => { if (!state.sticky) showQuote(e, false); hi(p.dataset.ek, true); });
      p.addEventListener("mouseleave", () => { if (!state.sticky) clearQuote(); hi(p.dataset.ek, false); });
      p.addEventListener("click", () => { state.sticky = e; showQuote(e, true); renderStage(); });
    });
    svg.querySelectorAll(".node").forEach((nd) => {
      const cid = nd.dataset.c, ek = nd.dataset.ek;
      nd.addEventListener("mouseenter", () => { if (!state.sticky) showQuote(edgeByKey(ek), false); hi(ek, true); });
      nd.addEventListener("mouseleave", () => { if (!state.sticky) clearQuote(); hi(ek, false); });
      nd.addEventListener("click", () => walk(cid, edgeByKey(ek)));
      nd.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); walk(cid, edgeByKey(ek)); } });
    });
    function hi(key, on) {
      svg.querySelectorAll(`.edge[data-ek="${key}"]`).forEach((el) => el.classList.toggle("hover", on));
    }
  }
  const citeParts = (e) => {
    const { seg, from, to } = resolveEvidence(e);
    return `${seg.segment_id} L${from}–${to}`;
  };
  const edgeKey = (e) => `${e.from}|${e.type}|${e.to}`;
  const edgeByKey = (k) => { const [f, t, o] = k.split("|"); return DATA.edges.find((e) => e.from === f && e.type === t && e.to === o); };

  // ---- list view (table — the accessible twin of the stage) ----
  function renderList() {
    const nbrs = neighborsOf(state.center, state.t);
    const rows = nbrs.map((n) => {
      const c = conceptById.get(n.other), e = n.edge, ws = wsById.get(c.workspace);
      const q = quoteOf(e);
      return `<tr data-c="${c.concept_id}" data-ek="${edgeKey(e)}">` +
        `<td><span class="reltype">${TYPES[e.type].label}</span>${n.outgoing ? " →" : " ←"}</td>` +
        `<td><button class="linklike walkbtn">${esc(c.name)}</button></td>` +
        `<td><span class="chip ${ws.color}">${esc(ws.name)}</span></td>` +
        `<td><code>${esc(citeParts(e))}</code></td>` +
        `<td>${esc(e.date)}</td>` +
        `<td class="qcell">“${esc(q.length > 90 ? q.slice(0, 90) + "…" : q)}”</td></tr>`;
    }).join("");
    $("#listBody").innerHTML = rows ||
      `<tr><td colspan="6" class="emptycell">No tracks yet this early — drag the season line forward.</td></tr>`;
    $("#listBody").querySelectorAll("tr[data-ek]").forEach((tr) => {
      const e = edgeByKey(tr.dataset.ek);
      tr.addEventListener("mouseenter", () => { if (!state.sticky) showQuote(e, false); });
      tr.addEventListener("mouseleave", () => { if (!state.sticky) clearQuote(); });
      tr.querySelector(".walkbtn").addEventListener("click", () => walk(tr.dataset.c, e));
    });
    $("#listCenter").textContent = conceptById.get(state.center).name;
  }

  // ---- trailhead rail ----
  function renderRail() {
    let html = "";
    for (const t of DATA.groves) {
      html += `<div class="terr"><div class="terrname eyebrow">${esc(t.name)}</div>`;
      for (const cid of t.concepts) {
        const c = conceptById.get(cid);
        const ws = wsById.get(c.workspace);
        const seen = firstSeen(cid) <= state.t;
        html += `<button class="citem${cid === state.center ? " on" : ""}${seen ? "" : " unseen"}" data-c="${cid}">` +
          `<svg class="glyph ${ws.color}" viewBox="-12 -12 24 24" aria-hidden="true">${nodeShape(c.workspace, 0, 0, 7)}</svg>` +
          `<span>${esc(c.name)}</span></button>`;
      }
      html += `</div>`;
    }
    $("#railList").innerHTML = html;
    $("#railList").querySelectorAll(".citem").forEach((b) =>
      b.addEventListener("click", () => walk(b.dataset.c, null)));
  }

  function renderTrail() {
    const wrap = $("#trailList");
    if (!state.trail.length) { wrap.innerHTML = `<div class="trailempty">Walk the graph and your path collects here.</div>`; return; }
    wrap.innerHTML = state.trail.map((s, i) => {
      const c = conceptById.get(s.concept);
      const via = s.via ? `<span class="via">${TYPES[s.via.type].label}</span>` : "";
      return `<div class="tstep" data-i="${i}">` +
        `<svg class="paw${i % 2 ? " flip" : ""}" viewBox="-8 -8 16 16" aria-hidden="true">` +
        `<ellipse cx="0" cy="3.1" rx="3.4" ry="2.7"/><circle cx="-3.6" cy="-1.2" r="1.55"/><circle cx="-1.25" cy="-2.9" r="1.65"/><circle cx="1.35" cy="-2.9" r="1.65"/><circle cx="3.6" cy="-1.2" r="1.55"/></svg>` +
        `<button class="linklike tgo">${esc(c.name)}</button>${via}` +
        `<button class="tdel" title="Remove step" aria-label="Remove step">✕</button></div>`;
    }).join("");
    wrap.querySelectorAll(".tstep").forEach((el) => {
      const i = +el.dataset.i;
      el.querySelector(".tgo").addEventListener("click", () => walk(state.trail[i].concept, null));
      el.querySelector(".tdel").addEventListener("click", () => {
        state.trail.splice(i, 1); renderTrail();
        $("#compileBtn").textContent = `Compile trail (${state.trail.length})`;
      });
    });
  }

  // ---- compile trail → markdown bundle ----
  function compileTrail() {
    const now = new Date().toISOString();
    const L = [];
    L.push("---");
    L.push(`title: "Trail bundle — ${now.slice(0, 10)}"`);
    L.push("schema: trail-bundle-v0");
    L.push(`compiled: ${now}`);
    L.push(`steps: ${state.trail.length}`);
    L.push("substrate: tracking-prototype demo");
    L.push("---", "");
    const names = state.trail.map((s) => conceptById.get(s.concept).name);
    L.push(`# Trail — ${names[0]}${names.length > 1 ? " → " + names[names.length - 1] : ""}`, "");
    L.push("> A walked path through the concept graph. Every crossing below carries");
    L.push("> the exact lines that evidence it. Paste into any LLM chat for context.", "");
    state.trail.forEach((s, i) => {
      const c = conceptById.get(s.concept);
      L.push(`## ${i + 1}. ${c.name}  \`${c.concept_id}\``, "");
      L.push(c.summary, "");
      if (s.via) {
        const e = s.via, from = conceptById.get(e.from), to = conceptById.get(e.to);
        L.push(`**Crossing:** ${from.name} *${TYPES[e.type].label}* ${to.name}`, "");
        L.push(`> “${quoteOf(e)}”`);
        L.push(`> — \`${citeOf(e)}\``, "");
      }
      for (const sg of c.source_segments) {
        const seg = segById.get(sg);
        L.push(`Evidence: \`${seg.file_id}\` L${seg.start_line}–L${seg.end_line} — “${seg.title}”`);
      }
      L.push("");
    });
    L.push("---", "", `*Compiled ${now} by the Tracking prototype (demo substrate).*`, "");
    return L.join("\n");
  }

  // ---- season scrubber ----
  const scrub = $("#scrub");
  scrub.min = 0; scrub.max = Math.round((T_MAX - T_MIN) / DAY); scrub.step = 7;
  const syncScrub = () => {
    scrub.value = Math.round((state.t - T_MIN) / DAY);
    $("#seasonLabel").textContent = fmtD(state.t);
  };
  scrub.addEventListener("input", () => {
    state.t = T_MIN + (+scrub.value) * DAY;
    $("#seasonLabel").textContent = fmtD(state.t);
    stopPlay(); renderAll(false);
  });
  function stopPlay() {
    if (state.playTimer) { clearInterval(state.playTimer); state.playTimer = null; $("#playBtn").textContent = "▸ replay season"; }
  }
  $("#playBtn").addEventListener("click", () => {
    if (state.playTimer) return stopPlay();
    if (reduceMotion) { state.t = T_MAX; syncScrub(); renderAll(false); return; }
    state.t = T_MIN; syncScrub(); renderAll(false);
    $("#playBtn").textContent = "⏸ pause";
    state.playTimer = setInterval(() => {
      state.t = Math.min(T_MAX, state.t + 7 * DAY);
      syncScrub(); renderAll(false);
      if (state.t >= T_MAX) stopPlay();
    }, 380);
  });

  // ---- header controls ----
  $("#viewTrack").addEventListener("click", () => setView("track"));
  $("#viewList").addEventListener("click", () => setView("list"));
  function setView(v) {
    state.view = v;
    $("#viewTrack").classList.toggle("on", v === "track");
    $("#viewList").classList.toggle("on", v === "list");
    $("#stageWrap").hidden = v !== "track";
    $("#listWrap").hidden = v !== "list";
    writeHash(); renderAll(false);
  }
  $("#themeBtn").addEventListener("click", () => {
    const root = document.documentElement;
    const cur = root.dataset.theme ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    root.dataset.theme = cur === "dark" ? "light" : "dark";
    $("#themeBtn").textContent = root.dataset.theme === "dark" ? "☀ day" : "☾ night";
  });
  $("#compileBtn").addEventListener("click", () => {
    $("#bundleText").value = compileTrail();
    $("#compileDlg").showModal();
  });
  $("#copyBtn").addEventListener("click", async () => {
    const ta = $("#bundleText");
    try { await navigator.clipboard.writeText(ta.value); } catch { ta.select(); document.execCommand("copy"); }
    $("#copyBtn").textContent = "Copied ✓";
    setTimeout(() => ($("#copyBtn").textContent = "Copy bundle"), 1600);
  });
  $("#closeDlg").addEventListener("click", () => $("#compileDlg").close());
  $("#hintClose").addEventListener("click", () => ($("#hint").hidden = true));

  // keyboard: Backspace walks back along the trail
  document.addEventListener("keydown", (ev) => {
    if (ev.target.matches("input,textarea") || $("#compileDlg").open) return;
    if (ev.key === "Backspace" && state.trail.length > 1) {
      ev.preventDefault();
      state.trail.pop();
      walkSilent(state.trail[state.trail.length - 1].concept);
    }
  });
  function walkSilent(cid) {
    state.center = cid; state.sticky = null;
    const c = conceptById.get(cid);
    const seg = segById.get(c.source_segments[0]);
    showGround(seg.file_id, seg.start_line, seg.end_line, `Primary evidence — “${seg.title}”`);
    clearQuote(); renderAll();
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  function renderAll(hash = true) {
    renderStage(); renderList(); renderRail(); renderTrail();
    if (hash !== false) writeHash();
  }

  // ---- boot ----
  syncScrub();
  $("#themeBtn").textContent = window.matchMedia("(prefers-color-scheme: dark)").matches ? "☀ day" : "☾ night";
  setView(state.view);
  pushTrail(state.center, null);
  walkSilent(state.center);
  writeHash();
})();
