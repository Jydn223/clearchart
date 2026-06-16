// ===== ClearChart frontend =====
const $ = (id) => document.getElementById(id);

const noteInput = $("note-input");
const structureBtn = $("structure-btn");
const clearBtn = $("clear-btn");
const retryBtn = $("retry-btn");
const charCount = $("char-count");
const exampleRow = $("example-row");

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

// --- Char count + clear button visibility ---
function syncInputUi() {
  const len = noteInput.value.length;
  charCount.textContent = `${len.toLocaleString()} character${len === 1 ? "" : "s"}`;
  clearBtn.hidden = len === 0;
}
noteInput.addEventListener("input", syncInputUi);

clearBtn.addEventListener("click", () => {
  noteInput.value = "";
  syncInputUi();
  noteInput.focus();
  showEmpty();
});

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
  noteInput.focus();
  noteInput.scrollTop = 0;
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
  const soap = data.soap || {};
  const s = data.structured || {};
  const patient = s.patient || {};
  const vitals = s.vitals || {};
  const meds = Array.isArray(s.medications) ? s.medications : [];
  const diagnoses = Array.isArray(s.diagnoses) ? s.diagnoses : [];
  const allergies = Array.isArray(s.allergies) ? s.allergies : [];
  const flags = Array.isArray(data.flags) ? data.flags : [];

  results.innerHTML = `
    ${soapCard(soap)}
    ${structuredCard(patient, s, vitals, diagnoses, meds, allergies)}
    ${flags.length ? flagsCard(flags) : ""}
  `;

  emptyState.hidden = true;
  errorState.hidden = true;
  results.hidden = false;
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

function structuredCard(patient, s, vitals, diagnoses, meds, allergies) {
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
            <div class="field-value ${patientText ? "" : "is-empty"}">${
              patientText ? escapeHtml(patientText) : "Not stated"
            }</div>
          </div>
          <div class="field-row">
            <div class="field-label">Chief complaint</div>
            <div class="field-value ${hasValue(s.chief_complaint) ? "" : "is-empty"}">${value(
              s.chief_complaint,
              "Not stated"
            )}</div>
          </div>

          <div class="divider"></div>

          <div class="field-row">
            <div class="field-label">Vitals</div>
            <div>${vitalsGrid(vitals)}</div>
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
            <div class="field-value ${hasValue(s.follow_up) ? "" : "is-empty"}">${value(
              s.follow_up,
              "Not specified"
            )}</div>
          </div>
        </div>
      </div>
    </article>`;
}

function vitalsGrid(vitals) {
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
        <div class="vital">
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
  return `<div class="tags">${items
    .map((t) => `<span class="${cls}">${escapeHtml(t)}</span>`)
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
        <div class="med">
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

// --- Init ---
syncInputUi();
loadSamples();
