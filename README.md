# ECHO / FIELD

ECHO / FIELD is a browser-native instrument for making art from attention.
Move through the field, switch between VOICE, MOTION, and MEMORY, and begin new fields that never resolve into the same image twice. The artwork is generated live with Canvas rather than shown as a pre-rendered image.

## Why it fits Hack the Arts

This is a new medium rather than a digital version of an existing one: the visitor is part of the instrument. Pointer movement changes the flow field, microphone energy can change the visual density, and the Memory channel introduces a new seeded state. The result is a visual score that only exists during the interaction.

The submission build also includes guided onboarding, a live Inspector for palette/density/drift/seed, six-slot local field memory, PNG export, short WebM recording, responsive mobile controls, and FIELD NOTES explaining the medium.

## Run locally

Open `index.html` in a browser. For microphone permissions, serve the folder from a local web server. No build step or dependency install is required.

## Technologies

- HTML, CSS, and vanilla JavaScript
- HTML Canvas 2D rendering
- Web Audio API microphone analyser (permission-gated)
- Responsive CSS layout

## Attribution

No third-party visual assets or APIs are required at runtime. Fonts are loaded from Google Fonts when online: DM Mono and Space Grotesk. The concept image in `outputs/echo-field-concept.png` was generated during development as a visual design reference; the shipped artwork is rendered in code.

## Submission copy

**Short description:** A living visual instrument where voice, motion, and memory become a generative field that can only exist through interaction.

**Demo moment:** Hover around the canvas, switch to MOTION, then click BEGIN A NEW FIELD. The seed, phrase, and visual flow all shift, making the change legible in seconds.
