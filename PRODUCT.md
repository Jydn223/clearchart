# Product

## Register

product

## Users

Clinicians (and, in this demo, anyone) who have a raw, shorthand consultation
note and want it turned into a clean, structured record. Their context is a
quick, focused task: paste a scribbled note, read back an organised version,
scan for anything missing. They are fluent in clinical shorthand but want the
output in plain, unambiguous English. This is a portfolio prototype, so a
secondary audience is reviewers evaluating the maker's craft.

## Product Purpose

ClearChart converts free-text consultation notes into three structured views
side by side: a SOAP note with abbreviations expanded, a discrete structured-data
panel (chief complaint, vitals, diagnoses, medications, allergies, follow-up),
and a flags list of anything missing or ambiguous. The point of the product is
the contrast: ugly scribble in, clean EHR-style record out. Success is a record
that is faithful (never fabricated), readable, and honest about its gaps. It is
explicitly a prototype, not a medical device: it gives no advice and never alters
the clinician's assessment or plan.

## Brand Personality

Clinical, calm, trustworthy, precise. The interface should inspire confidence
that nothing has been invented. Restraint is the voice: the data is the hero,
the chrome recedes. Three words: trustworthy, precise, quiet.

## Anti-references

- **Generic SaaS dashboard** — interchangeable cards, hero-metric template, the
  default AI-product look.
- **Playful consumer health app** — rounded pastel, emoji, wellness-app energy
  that undercuts clinical trust.
- **Over-designed / flashy** — gradients-for-decoration, glassmorphism, motion
  for its own sake. Style must never compete with the data.

## Design Principles

- **Never fabricate; flag, don't guess.** Missing data is surfaced, never
  invented. The UI must make absence legible, not paper over it.
- **The contrast is the product.** The whole design exists to dramatise messy
  input becoming a clean record. Protect that side-by-side reading.
- **Trust through restraint.** Confidence comes from precision and quiet, not
  decoration. When in doubt, remove.
- **Honest about being a prototype.** Disclaimers and synthetic-data framing are
  part of the design, not fine print to hide.
- **Accessible by default.** A clinical tool must be legible and operable for
  everyone, in every state.

## Accessibility & Inclusion

Target WCAG 2.1 AA: body text ≥4.5:1 contrast, visible focus rings, full
keyboard operation, and information never conveyed by color alone (flags carry
an icon and text, not just amber). Respect `prefers-reduced-motion`. Layout must
reflow cleanly to small screens and remain readable at 200% zoom.
