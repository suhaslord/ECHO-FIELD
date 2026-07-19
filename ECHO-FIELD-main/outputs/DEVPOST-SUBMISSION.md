# ECHO / FIELD

## Tagline

Give your attention a shape.

## Short description

ECHO / FIELD is a living visual instrument where voice, motion, and memory become a generative field that can only exist through interaction.

## Inspiration

Most digital art is still something we look at. ECHO / FIELD asks what happens when attention becomes part of the medium. A visitor does not select a finished image; they enter a system that responds to their movement, listening, and choices. Every field is temporary, and every saved field is evidence of a specific encounter.

## What it does

- Move through the canvas to bend the living contour field.
- Switch between VOICE, MOTION, and MEMORY input modes.
- Use the inspector to shape palette, density, drift, and seed.
- Save up to six fields locally and reload them later.
- Export a field as a PNG or record a short WebM of the evolving artwork.
- Begin new fields with different seeds and phrases.
- Use the guided FIELD NOTES introduction to understand the medium in seconds.

## How we built it

The artwork is rendered from scratch in an HTML Canvas 2D loop. A seeded function field creates the contour lines and particles; pointer position changes the local flow; density and drift alter the system parameters; and the Web Audio API can feed microphone energy into visual intensity when permission is granted. The surrounding interface is semantic HTML/CSS with responsive layouts and localStorage persistence.

## Why it could not exist without technology

The piece is not a static image and not a recording of one. It is a responsive system that changes while it is being experienced. Its “brush” is a cursor, its atmosphere can include a room’s live sound, and its memory is a programmable seed. The work only exists as a relationship between a person and a running program.

## Built with

HTML · CSS · JavaScript · Canvas 2D · Web Audio API · MediaRecorder API · localStorage

## Demo script

1. Click **ENTER THE FIELD**.
2. Move the pointer slowly across the canvas.
3. Switch to **MOTION**, then choose **LIME** in the inspector.
4. Raise **DENSITY** and click **RANDOMIZE**.
5. Click **SAVE FIELD**, then **EXPORT PNG**.
6. Click **RECORD**, move through the field for a few seconds, then click **STOP**.

## Challenges and learning

The biggest challenge was making a generative system feel authored rather than random. We used a limited visual vocabulary—contours, particles, glow, and a single cursor-orb—then exposed only the parameters that make the system legible to a visitor. We also designed the saved-field and recording features as part of the artwork’s concept: the visitor can leave with traces, not just a screenshot.

## Future work

With more time, we would add multi-person fields using WebRTC, MIDI input for live performance, a public gallery of anonymous seeds, and an installation mode for projection-scale screens.

## Attribution

No third-party visual assets are required at runtime. Fonts are loaded from Google Fonts when online: DM Mono and Space Grotesk. The concept references in `outputs/` were generated during development; the shipped artwork is rendered in code.
