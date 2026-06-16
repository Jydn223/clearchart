// System prompt + response schema for the clinical documentation assistant.
// Sent to Gemini as `systemInstruction`; the raw note is sent as the user content.

export const SYSTEM_PROMPT = `You are a clinical documentation assistant that converts free-text
consultation notes into a structured record. This is a prototype that operates on synthetic,
fictional data only. Follow these rules exactly:

- Extract ONLY information explicitly present in the note. Never infer, assume, or fabricate
  values. If a field is not stated, use null (or an empty array). Do not invent a vital sign,
  a dose, a diagnosis, or an allergy status that is not written.
- In the SOAP narrative, expand standard medical abbreviations into readable English while
  preserving the exact clinical meaning. Examples:
    c/o -> complains of; O/E -> on examination; PRN -> as needed; RV -> review;
    NKDA -> no known drug allergies; OD -> once daily; BD -> twice daily;
    TDS -> three times daily; QDS -> four times daily; nocte -> at night;
    "x3 days" -> "for 3 days"; "5/7" -> "5 days"; "2/52" -> "2 weeks"; "3/12" -> "3 months";
    SOB -> shortness of breath; PMH -> past medical history; FHx -> family history;
    HTN -> hypertension; T2DM -> type 2 diabetes mellitus; URTI -> upper respiratory tract
    infection; LRTI -> lower respiratory tract infection; UTI -> urinary tract infection;
    GERD/GORD -> gastro-oesophageal reflux disease; PUD -> peptic ulcer disease;
    NAD -> no abnormality detected; Imp -> impression; Rx -> prescription; Ix -> investigations;
    CXR -> chest X-ray; ECG -> electrocardiogram; abdo -> abdomen; creps -> crepitations.
- Map content to SOAP correctly:
    Subjective = patient-reported history and symptoms;
    Objective = examination findings and vital signs;
    Assessment = the clinician's impression / working diagnosis;
    Plan = management, prescriptions, investigations, and follow-up.
- Populate "flags" with brief notes about MISSING standard fields or AMBIGUITIES, e.g.
  "Vital signs not recorded", "Allergy status not documented", "Patient age not stated",
  "Dose of medication not specified". Use an empty array if nothing is notable.
- Do NOT give medical advice and do NOT change, add to, or correct the clinician's assessment
  or plan. Only restructure what is written.
- PROVENANCE: populate "evidence" and each medication's "source" with the EXACT verbatim
  substring, copied character-for-character from the ORIGINAL note, that each value was drawn
  from (e.g. evidence.temperature -> "temp 37.9", evidence.patient -> "32F", a medication
  source -> "amlodipine 5mg OD"). The quote must occur in the note exactly as written so the
  interface can locate it — never paraphrase, expand abbreviations, or quote from your SOAP
  rewrite. Use null where the corresponding field is absent.
- Your output must conform to the provided JSON schema.`;

// Gemini structured-output schema (OpenAPI subset). Nullable scalars allow "field not present".
const nullableString = { type: "string", nullable: true };

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    soap: {
      type: "object",
      description: "SOAP note with abbreviations expanded into readable English.",
      properties: {
        subjective: nullableString,
        objective: nullableString,
        assessment: nullableString,
        plan: nullableString,
      },
      required: ["subjective", "objective", "assessment", "plan"],
    },
    structured: {
      type: "object",
      description: "Discrete structured fields, extracted verbatim where present.",
      properties: {
        patient: {
          type: "object",
          properties: {
            name: nullableString,
            age: nullableString,
            sex: nullableString,
          },
          required: ["name", "age", "sex"],
        },
        chief_complaint: nullableString,
        vitals: {
          type: "object",
          properties: {
            temperature: nullableString,
            blood_pressure: nullableString,
            heart_rate: nullableString,
            respiratory_rate: nullableString,
            oxygen_saturation: nullableString,
            weight: nullableString,
          },
          required: [
            "temperature",
            "blood_pressure",
            "heart_rate",
            "respiratory_rate",
            "oxygen_saturation",
            "weight",
          ],
        },
        diagnoses: {
          type: "array",
          description: "Diagnoses / impressions explicitly stated.",
          items: { type: "string" },
        },
        medications: {
          type: "array",
          description: "Medications mentioned, with details only where written.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dose: nullableString,
              frequency: nullableString,
              route: nullableString,
              duration: nullableString,
              source: { ...nullableString, description: "Verbatim substring from the note this medication was drawn from." },
            },
            required: ["name", "dose", "frequency", "route", "duration", "source"],
          },
        },
        allergies: {
          type: "array",
          description: "Allergies explicitly documented (empty if none stated).",
          items: { type: "string" },
        },
        follow_up: nullableString,
      },
      required: [
        "patient",
        "chief_complaint",
        "vitals",
        "diagnoses",
        "medications",
        "allergies",
        "follow_up",
      ],
    },
    flags: {
      type: "array",
      description: "Notes about missing or ambiguous information.",
      items: { type: "string" },
    },
    evidence: {
      type: "object",
      description:
        "For each populated scalar field, the exact verbatim substring from the original note " +
        "it was drawn from (character-for-character, so the UI can locate it). Null where absent.",
      properties: {
        patient: nullableString,
        chief_complaint: nullableString,
        temperature: nullableString,
        blood_pressure: nullableString,
        heart_rate: nullableString,
        respiratory_rate: nullableString,
        oxygen_saturation: nullableString,
        weight: nullableString,
        follow_up: nullableString,
      },
      required: [
        "patient",
        "chief_complaint",
        "temperature",
        "blood_pressure",
        "heart_rate",
        "respiratory_rate",
        "oxygen_saturation",
        "weight",
        "follow_up",
      ],
    },
  },
  required: ["soap", "structured", "flags", "evidence"],
};
