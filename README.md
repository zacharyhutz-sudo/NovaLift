# NovaLift v0.3.1 — Builder Guidance, Hitboxes, Larger Homeworld

NovaLift is a vertical mobile-first 2D space-company rocket prototype that runs on GitHub Pages with no build step.

## What is new in v0.3.1

- Added a selected-part explanation panel in the builder.
- Tapping a part in the catalog or current stack now explains what it does and how to use it.
- Added post-flight summaries with max altitude, max speed, outcome, and a short improvement tip.
- Rocket rendering is now a fixed readable screen size while panning/zooming the camera.
- Added per-part hitboxes for surface contact instead of using one simple circular rocket radius.
- Increased Homeworld radius by 5x and scaled atmosphere with it.
- Scaled planetary gravity to preserve familiar surface-gravity feel after the planet size increase.

The budget is still infinite for this prototype, but parts have costs for future economy balancing.

## Controls

### Mobile

- **Left** — rotate left
- **Thrust** — hold to burn engines
- **Right** — rotate right
- **Stage** — activate the next assigned stage
- **Build** — return to rocket construction
- **Reset** — reset the current launch
- **Pause** — pause flight
- Drag the playfield to pan the camera
- Pinch the playfield to zoom
- Tap **Center** to snap back to the rocket after moving the camera

### Keyboard

- **W / Up Arrow** — thrust
- **A / Left Arrow** — rotate left
- **D / Right Arrow** — rotate right
- **X / Enter** — stage
- **R** — reset launch
- **Space** — pause
- **F** — debug overlay

## Builder notes

- Parts are stacked from top to bottom.
- Tap any catalog or stack part to see an explanation and usage tip.
- **F** means the part stays active during flight and does not trigger from the Stage button.
- Numbered stages fire in order: Stage 1, Stage 2, Stage 3, etc.
- Decouplers remove themselves and every part below them.
- Payloads detach when their stage fires.
- Parachutes and landing legs deploy when their stage fires.

## How to test locally

Open `index.html` in a browser, or run a tiny local server:

```bash
python3 -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

## Recommended quick test

1. Tap several parts in the builder and confirm the explanation panel changes.
2. Use the Starter rocket.
3. Launch and test camera zoom. The rocket should stay readable instead of shrinking/growing with zoom.
4. Tip sideways to build orbital speed.
5. Press **Stage** once to drop the lower booster.
6. Press **Stage** again in orbit to deploy the data center.
7. Reenter and press **Stage** again inside the atmosphere to deploy parachute and legs.
8. Crash or recover and confirm the mission area gives a short flight summary.
