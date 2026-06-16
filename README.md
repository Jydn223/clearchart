# ClearChart

**Turn messy free-text consultation notes into a clean, structured clinical record.**

ClearChart is a small web app that takes a raw, shorthand consultation note and
uses an LLM (Google's **Gemini API**) to return the same information in three
structured forms, side by side:

1. A **SOAP note** (Subjective, Objective, Assessment, Plan) with medical
   abbreviations expanded into readable English.
2. A **structured data panel** — chief complaint, vitals, diagnoses, medications,
   allergies, follow-up.
3. A **flags** list noting anything missing or ambiguous.

The visual point is the contrast: ugly scribble in, clean EHR-style record out.

<p align="center"><em>Ugly scribble in → clean, structured record out.</em></p>

---

## ⚠️ Important — read this first

- **This is a portfolio prototype, not a medical device.** It demonstrates
  AI-assisted charting. It must not be used for real clinical care or decisions.
- **No medical advice.** The app only *restructures* text you paste. It does not
  give advice and never alters, corrects, or adds to a clinician's assessment or
  plan.
- **It never fabricates.** The model is instructed to extract *only* what is
  explicitly written. Anything not stated becomes `null` / empty and, where it
  matters, is surfaced in the **flags** list instead of being guessed.
- **Synthetic data only.** No real patient data, ever. Every example note in
  [`/samples`](./samples) is fictional and was generated for this project.
  Do not paste real patient information into the app.

---

## Design principles (the point of the project)

These are non-negotiable and are enforced in the system prompt
([`prompt.js`](./prompt.js)):

- **Never fabricate.** Extract only what is explicitly in the note. Missing field
  → `null` or empty array. No inferred blood pressures, doses, or diagnoses.
- **Flag, don't guess.** When a standard field is missing or ambiguous, add a
  short note to `flags` instead of inventing a value.
- **Synthetic data only.** All test notes are fictional.
- **Prototype, not a medical device.** No medical advice; the clinician's
  assessment and plan are never changed.

---

## How it works

```
Browser (two-pane UI)
   │  POST /api/structure  { note }
   ▼
Express server (server.js)      ← keeps the API key server-side
   │  Gemini generateContent
   │  · systemInstruction = the rules in prompt.js
   │  · responseMimeType  = application/json
   │  · responseSchema    = the structured record schema
   │  · temperature       = 0  (deterministic extraction)
   ▼
Gemini returns strict JSON → rendered as SOAP / structured / flags cards
```

The raw note is sent as the **user** content; the rules are sent as the
**system instruction**. Structured output is constrained with a JSON
`responseSchema`, so the response is always valid, parseable JSON.

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- A Gemini API key — get one free at <https://aistudio.google.com/apikey>

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.example .env
#    then edit .env and set GEMINI_API_KEY=...

# 3. Run it
npm start
```

Open <http://localhost:3000>.

> `npm run dev` runs the server with `--watch` for auto-reload during development.

### Configuration (`.env`)

| Variable         | Default            | Purpose                          |
| ---------------- | ------------------ | -------------------------------- |
| `GEMINI_API_KEY` | _(required)_       | Your Gemini API key.             |
| `GEMINI_MODEL`   | `gemini-2.5-flash` | Override the model used.         |
| `PORT`           | `3000`             | Port the server listens on.      |

---

## Using the app

1. Paste a shorthand note into the left pane, or click a **Load example** chip
   (or **↻ Surprise me** for a random one from the sample library).
2. Click **Structure note** (or press ⌘/Ctrl + Enter).
3. Read the structured record on the right.

The right pane has an empty state before the first run and a clear error state if
the API call or JSON parsing fails.

---

## Project structure

```
.
├── server.js          # Express server + Gemini call + samples API
├── prompt.js          # System prompt + JSON response schema
├── public/
│   ├── index.html     # Two-pane layout
│   ├── styles.css     # Design system (clinical, accessible)
│   └── app.js         # Fetch, render, state handling
├── samples/           # 31 fictional, synthetic consultation notes (.txt)
├── .env.example
└── README.md
```

---

## The sample notes

[`/samples`](./samples) contains 31 **fictional** notes spanning different
specialties (general practice, paediatrics, cardiology, respiratory, GI,
endocrine, MSK, dermatology, mental health, ENT, ophthalmology, women's health),
lengths, and levels of messiness. Some include allergies, some deliberately omit
vitals or allergy status so you can see the **flags** behaviour. The first five
match the canonical examples in the project brief.

All of them are invented for this project. **None describe a real person.**

---

## Tech

- **Gemini API** via the [`@google/genai`](https://www.npmjs.com/package/@google/genai)
  SDK, with structured JSON output (`responseSchema`).
- **Express** for the tiny server (also keeps the API key off the client).
- Vanilla HTML/CSS/JS frontend — no build step.

---

## License

Provided as-is for portfolio/demonstration purposes.
