// ===== ClearChart frontend =====
const $ = (id) => document.getElementById(id);

const noteInput = $("note-input");
const noteHighlights = $("note-highlights");
const structureBtn = $("structure-btn");
const clearBtn = $("clear-btn");
const retryBtn = $("retry-btn");
const charCount = $("char-count");
const exampleRow = $("example-row");

let lastResult = null; // most recent structured record, for export

const emptyState = $("empty-state");
const errorState = $("error-state");
const errorMessage = $("error-message");
const results = $("results");

let samples = [];

// --- Icons (inline SVG, Lucide-style) ---
const ICONS = {
  soap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14M16 12h2M16 8h2M5 21V5a2 2 0 0 1 2-2h7l6 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M6 12h2M6 16h2"/></svg>`,
  data: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  flagItem: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  trace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>`,
};

// --- Utilities ---
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== "";

function value(v, emptyLabel = "Not recorded") {
  return hasValue(v)
    ? escapeHtml(v)
    : `<span class="is-empty">${emptyLabel}</span>`;
}

// Attributes that make an element traceable back to a verbatim note snippet.
function srcAttr(snippet) {
  return hasValue(snippet)
    ? ` data-src="${escapeHtml(String(snippet).trim())}" tabindex="0"`
    : "";
}

// --- Char count + clear button visibility ---
function syncInputUi() {
  const len = noteInput.value.length;
  charCount.textContent = `${len.toLocaleString()} character${len === 1 ? "" : "s"}`;
  clearBtn.hidden = len === 0;
}
noteInput.addEventListener("input", () => {
  syncInputUi();
  renderHighlightBase();
});

clearBtn.addEventListener("click", () => {
  noteInput.value = "";
  syncInputUi();
  renderHighlightBase();
  noteInput.focus();
  showEmpty();
});

// --- Source highlighting (backdrop mirrors the textarea text) ---
function renderHighlightBase() {
  noteHighlights.textContent = noteInput.value; // textContent escapes; clears any <mark>
  syncHighlightScroll();
}
function syncHighlightScroll() {
  noteHighlights.scrollTop = noteInput.scrollTop;
  noteHighlights.scrollLeft = noteInput.scrollLeft;
}
noteInput.addEventListener("scroll", syncHighlightScroll);

// Find every case-insensitive occurrence of `snippet` in `text`.
function findRanges(text, snippet) {
  const ranges = [];
  const needle = String(snippet || "").trim().toLowerCase();
  if (!needle) return ranges;
  const hay = text.toLowerCase();
  let i = hay.indexOf(needle);
  while (i !== -1) {
    ranges.push([i, i + needle.length]);
    i = hay.indexOf(needle, i + needle.length);
  }
  return ranges;
}

function highlightSource(snippet) {
  const text = noteInput.value;
  const ranges = findRanges(text, snippet);
  if (!ranges.length) {
    renderHighlightBase();
    return;
  }
  let html = "";
  let last = 0;
  for (const [start, end] of ranges) {
    html += escapeHtml(text.slice(last, start));
    html += `<mark>${escapeHtml(text.slice(start, end))}</mark>`;
    last = end;
  }
  html += escapeHtml(text.slice(last));
  noteHighlights.innerHTML = html;
  syncHighlightScroll();
  scrollMarkIntoView();
}

// Bring the first highlighted span into view inside the textarea.
function scrollMarkIntoView() {
  const mark = noteHighlights.querySelector("mark");
  if (!mark) return;
  const top = mark.offsetTop;
  const bottom = top + mark.offsetHeight;
  if (top < noteInput.scrollTop || bottom > noteInput.scrollTop + noteInput.clientHeight) {
    noteInput.scrollTop = Math.max(0, top - noteInput.clientHeight / 2);
    syncHighlightScroll();
  }
}

function clearHighlight() {
  renderHighlightBase();
}

// --- Load example chips ---
async function loadSamples() {
  try {
    const res = await fetch("/api/samples");
    if (!res.ok) throw new Error();
    samples = await res.json();
    renderExampleChips();
  } catch {
    exampleRow.innerHTML = `<span class="examples-loading">Examples unavailable.</span>`;
  }
}

function renderExampleChips() {
  if (!samples.length) {
    exampleRow.innerHTML = `<span class="examples-loading">No examples found.</span>`;
    return;
  }
  exampleRow.innerHTML = "";
  // Show the first five named examples, then a "Surprise me" random chip.
  samples.slice(0, 5).forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = s.label;
    btn.addEventListener("click", () => loadExample(s.text));
    exampleRow.appendChild(btn);
  });
  const rnd = document.createElement("button");
  rnd.type = "button";
  rnd.className = "chip chip--random";
  rnd.textContent = "↻ Surprise me";
  rnd.addEventListener("click", () => {
    const pick = samples[Math.floor(Math.random() * samples.length)];
    loadExample(pick.text);
  });
  exampleRow.appendChild(rnd);
}

function loadExample(text) {
  noteInput.value = text;
  syncInputUi();
  noteInput.scrollTop = 0;
  renderHighlightBase();
  noteInput.focus();
}

// --- View state helpers ---
function showEmpty() {
  emptyState.hidden = false;
  errorState.hidden = true;
  results.hidden = true;
  results.innerHTML = "";
}
function showError(msg) {
  emptyState.hidden = true;
  errorState.hidden = false;
  results.hidden = true;
  errorMessage.textContent = msg;
}
function setLoading(on) {
  structureBtn.classList.toggle("is-loading", on);
  structureBtn.disabled = on;
  structureBtn.querySelector(".btn-label").textContent = on ? "Structuring…" : "Structure note";
}

// --- Submit ---
async function structureNote() {
  const note = noteInput.value.trim();
  if (!note) {
    showError("Please paste a consultation note first.");
    noteInput.focus();
    return;
  }
  setLoading(true);
  try {
    const res = await fetch("/api/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "The request failed. Please try again.");
      return;
    }
    renderResults(data);
  } catch {
    showError("Could not reach the server. Check your connection and try again.");
  } finally {
    setLoading(false);
  }
}

structureBtn.addEventListener("click", structureNote);
retryBtn.addEventListener("click", structureNote);

// Cmd/Ctrl + Enter to submit
noteInput.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    structureNote();
  }
});

// --- Render ---
function renderResults(data) {
  lastResult = data;
  const soap = data.soap || {};
  const s = data.structured || {};
  const ev = data.evidence || {};
  const patient = s.patient || {};
  const vitals = s.vitals || {};
  const meds = Array.isArray(s.medications) ? s.medications : [];
  const diagnoses = Array.isArray(s.diagnoses) ? s.diagnoses : [];
  const allergies = Array.isArray(s.allergies) ? s.allergies : [];
  const flags = Array.isArray(data.flags) ? data.flags : [];

  results.innerHTML = `
    ${resultsBar()}
    ${soapCard(soap)}
    ${structuredCard(patient, s, vitals, diagnoses, meds, allergies, ev)}
    ${flags.length ? flagsCard(flags) : ""}
  `;

  results.querySelector("#copy-btn")?.addEventListener("click", (e) => copyRecord(e.currentTarget));
  results.querySelector("#download-btn")?.addEventListener("click", () => downloadJson(lastResult));

  emptyState.hidden = true;
  errorState.hidden = true;
  results.hidden = false;
}

function resultsBar() {
  return `
    <div class="results-bar">
      <span class="results-hint">${ICONS.trace}Hover any value to trace it back to the note.</span>
      <div class="results-tools">
        <button type="button" class="ghost-btn" id="copy-btn">${ICONS.copy}<span class="ghost-label">Copy</span></button>
        <button type="button" class="ghost-btn" id="download-btn">${ICONS.download}<span class="ghost-label">Download JSON</span></button>
      </div>
    </div>`;
}

function soapCard(soap) {
  const block = (key, label) => {
    const v = soap[key];
    return `
      <div class="soap-block">
        <div class="soap-key">${label}</div>
        <div class="soap-val ${hasValue(v) ? "" : "is-empty"}">${
          hasValue(v) ? escapeHtml(v) : "Not documented"
        }</div>
      </div>`;
  };
  return `
    <article class="card">
      <div class="card-head">${ICONS.soap}<h3>SOAP note</h3></div>
      <div class="card-body">
        <div class="soap-grid">
          ${block("subjective", "Subjective")}
          ${block("objective", "Objective")}
          ${block("assessment", "Assessment")}
          ${block("plan", "Plan")}
        </div>
      </div>
    </article>`;
}

function structuredCard(patient, s, vitals, diagnoses, meds, allergies, ev = {}) {
  const patientLine = [patient.age, patient.sex].filter(hasValue).join(", ");
  const patientText =
    hasValue(patient.name) || patientLine
      ? [patient.name, patientLine].filter((x) => hasValue(x) || x).join(" · ")
      : null;

  return `
    <article class="card">
      <div class="card-head">${ICONS.data}<h3>Structured data</h3></div>
      <div class="card-body">
        <div class="field-grid">
          <div class="field-row">
            <div class="field-label">Patient</div>
            <div class="field-value ${patientText ? "" : "is-empty"}"${
              patientText ? srcAttr(ev.patient) : ""
            }>${patientText ? escapeHtml(patientText) : "Not stated"}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Chief complaint</div>
            <div class="field-value ${hasValue(s.chief_complaint) ? "" : "is-empty"}"${
              hasValue(s.chief_complaint) ? srcAttr(ev.chief_complaint) : ""
            }>${value(s.chief_complaint, "Not stated")}</div>
          </div>

          <div class="divider"></div>

          <div class="field-row">
            <div class="field-label">Vitals</div>
            <div>${vitalsGrid(vitals, ev)}</div>
          </div>

          <div class="divider"></div>

          <div class="field-row">
            <div class="field-label">Diagnoses</div>
            <div>${tagList(diagnoses, "tag", "No diagnosis recorded")}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Medications</div>
            <div>${medList(meds)}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Allergies</div>
            <div>${tagList(allergies, "tag tag--allergy", "Not documented")}</div>
          </div>

          <div class="divider"></div>

          <div class="field-row">
            <div class="field-label">Follow-up</div>
            <div class="field-value ${hasValue(s.follow_up) ? "" : "is-empty"}"${
              hasValue(s.follow_up) ? srcAttr(ev.follow_up) : ""
            }>${value(s.follow_up, "Not specified")}</div>
          </div>
        </div>
      </div>
    </article>`;
}

function vitalsGrid(vitals, ev = {}) {
  const fields = [
    ["temperature", "Temp"],
    ["blood_pressure", "BP"],
    ["heart_rate", "Heart rate"],
    ["respiratory_rate", "Resp rate"],
    ["oxygen_saturation", "SpO₂"],
    ["weight", "Weight"],
  ];
  const anyValue = fields.some(([k]) => hasValue(vitals[k]));
  if (!anyValue) return `<span class="empty-inline">No vital signs recorded</span>`;
  return `
    <div class="vitals-grid">
      ${fields
        .map(
          ([k, label]) => `
        <div class="vital"${hasValue(vitals[k]) ? srcAttr(ev[k]) : ""}>
          <div class="vital-label">${label}</div>
          <div class="vital-value ${hasValue(vitals[k]) ? "" : "is-empty"}">${
            hasValue(vitals[k]) ? escapeHtml(vitals[k]) : "—"
          }</div>
        </div>`
        )
        .join("")}
    </div>`;
}

function tagList(items, cls, emptyLabel) {
  if (!items.length) return `<span class="empty-inline">${emptyLabel}</span>`;
  // Diagnoses/allergies are extracted verbatim, so the tag text doubles as its own source.
  return `<div class="tags">${items
    .map((t) => `<span class="${cls}"${srcAttr(t)}>${escapeHtml(t)}</span>`)
    .join("")}</div>`;
}

function medList(meds) {
  if (!meds.length) return `<span class="empty-inline">No medications recorded</span>`;
  const detail = (label, v) =>
    hasValue(v) ? `<span class="med-detail"><b>${label}</b> ${escapeHtml(v)}</span>` : "";
  return `
    <div class="med-list">
      ${meds
        .map(
          (m) => `
        <div class="med"${srcAttr(m.source || m.name)}>
          <span class="med-name">${escapeHtml(m.name || "Unnamed medication")}</span>
          ${detail("dose", m.dose)}
          ${detail("freq", m.frequency)}
          ${detail("route", m.route)}
          ${detail("for", m.duration)}
        </div>`
        )
        .join("")}
    </div>`;
}

function flagsCard(flags) {
  return `
    <article class="card card--flags">
      <div class="card-head">${ICONS.flag}<h3>Flags &amp; gaps (${flags.length})</h3></div>
      <div class="card-body">
        <ul class="flag-list">
          ${flags
            .map((f) => `<li class="flag">${ICONS.flagItem}<span>${escapeHtml(f)}</span></li>`)
            .join("")}
        </ul>
      </div>
    </article>`;
}

// --- Export ---
function recordToText(data) {
  const soap = data.soap || {};
  const s = data.structured || {};
  const p = s.patient || {};
  const v = s.vitals || {};
  const meds = Array.isArray(s.medications) ? s.medications : [];
  const dx = Array.isArray(s.diagnoses) ? s.diagnoses : [];
  const ax = Array.isArray(s.allergies) ? s.allergies : [];
  const flags = Array.isArray(data.flags) ? data.flags : [];
  const clean = (x) => (hasValue(x) ? String(x).trim() : "—");

  const lines = [];
  lines.push("SOAP NOTE");
  lines.push(`Subjective: ${clean(soap.subjective)}`);
  lines.push(`Objective:  ${clean(soap.objective)}`);
  lines.push(`Assessment: ${clean(soap.assessment)}`);
  lines.push(`Plan:       ${clean(soap.plan)}`);
  lines.push("");
  lines.push("STRUCTURED DATA");
  lines.push(`Patient:         ${[p.name, p.age, p.sex].filter(hasValue).map((x) => String(x).trim()).join(", ") || "—"}`);
  lines.push(`Chief complaint: ${clean(s.chief_complaint)}`);
  const vit = [
    ["Temp", v.temperature], ["BP", v.blood_pressure], ["HR", v.heart_rate],
    ["Resp", v.respiratory_rate], ["SpO2", v.oxygen_saturation], ["Weight", v.weight],
  ]
    .filter(([, x]) => hasValue(x))
    .map(([k, x]) => `${k} ${String(x).trim()}`)
    .join(", ");
  lines.push(`Vitals:          ${vit || "—"}`);
  lines.push(`Diagnoses:       ${dx.length ? dx.join("; ") : "—"}`);
  if (meds.length) {
    lines.push("Medications:");
    meds.forEach((m) => {
      const det = [m.dose, m.frequency, m.route, m.duration]
        .filter(hasValue)
        .map((x) => String(x).trim())
        .join(" · ");
      lines.push(`  - ${m.name || "Unnamed"}${det ? ` (${det})` : ""}`);
    });
  } else {
    lines.push("Medications:     —");
  }
  lines.push(`Allergies:       ${ax.length ? ax.join("; ") : "—"}`);
  lines.push(`Follow-up:       ${clean(s.follow_up)}`);
  if (flags.length) {
    lines.push("");
    lines.push("FLAGS & GAPS");
    flags.forEach((f) => lines.push(`  - ${f}`));
  }
  lines.push("");
  lines.push("— Generated by ClearChart (prototype, synthetic data; not a medical device).");
  return lines.join("\n");
}

async function copyRecord(btn) {
  if (!lastResult) return;
  try {
    await navigator.clipboard.writeText(recordToText(lastResult));
    flashButton(btn, "Copied ✓");
  } catch {
    flashButton(btn, "Copy failed");
  }
}

function downloadJson(data) {
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clearchart-record.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function flashButton(btn, msg) {
  const label = btn.querySelector(".ghost-label");
  if (!label) return;
  const prev = label.dataset.prev || label.textContent;
  label.dataset.prev = prev;
  label.textContent = msg;
  btn.classList.add("is-done");
  clearTimeout(btn._flashTimer);
  btn._flashTimer = setTimeout(() => {
    label.textContent = prev;
    btn.classList.remove("is-done");
  }, 1600);
}

// --- Source-highlight wiring (delegated; results element persists) ---
function onSourceHover(e) {
  const el = e.target.closest("[data-src]");
  if (el && results.contains(el)) highlightSource(el.getAttribute("data-src"));
  else clearHighlight();
}
results.addEventListener("mouseover", onSourceHover);
results.addEventListener("mouseleave", clearHighlight);
results.addEventListener("focusin", onSourceHover);
results.addEventListener("focusout", clearHighlight);

// --- Init ---
syncInputUi();
renderHighlightBase();
loadSamples();
