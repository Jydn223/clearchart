import express from "express";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "./prompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(__dirname, "samples");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!API_KEY) {
  console.warn(
    "\x1b[33m[ClearChart] GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.\x1b[0m"
  );
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// --- Structure a raw note into the clinical record ---
app.post("/api/structure", async (req, res) => {
  const note = (req.body?.note || "").trim();

  if (!note) {
    return res.status(400).json({ error: "Please paste a consultation note first." });
  }
  if (!ai) {
    return res.status(500).json({
      error: "The server is missing GEMINI_API_KEY. Add it to .env and restart.",
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: note,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    });

    const text = response.text;
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res
        .status(502)
        .json({ error: "The model did not return valid JSON. Please try again.", raw: text });
    }
    res.json(data);
  } catch (err) {
    console.error("[ClearChart] Gemini request failed:", err);
    res.status(500).json({ error: err?.message || "The request to Gemini failed." });
  }
});

// --- List available synthetic sample notes ---
app.get("/api/samples", async (_req, res) => {
  try {
    const files = (await readdir(SAMPLES_DIR))
      .filter((f) => f.endsWith(".txt"))
      .sort();
    const samples = await Promise.all(
      files.map(async (file) => ({
        file,
        label: labelFromFilename(file),
        text: (await readFile(path.join(SAMPLES_DIR, file), "utf8")).trim(),
      }))
    );
    res.json(samples);
  } catch (err) {
    console.error("[ClearChart] Failed to read samples:", err);
    res.status(500).json({ error: "Could not load sample notes." });
  }
});

function labelFromFilename(file) {
  return file
    .replace(/\.txt$/, "")
    .replace(/^\d+[-_]/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\x1b[36m[ClearChart]\x1b[0m running at http://localhost:${PORT}  (model: ${MODEL})`);
});
