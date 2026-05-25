# NovaLift v0.3.0 — Staging, Atmosphere, Recovery

NovaLift is a vertical mobile-first 2D space-company rocket prototype that runs on GitHub Pages with no build step.

## What is new in v0.3.0

- Staging system with a dedicated **Stage** button
- Builder stage assignment for each part
- Decouplers that drop lower rocket sections
- Detachable satellites and orbital data centers
- Basic atmosphere and drag model
- Drag stat in the builder
- Nose cone part for lowering drag
- Parachutes that deploy only inside atmosphere and can fail if deployed too fast
- Landing legs that improve touchdown tolerance
- Detached payload/debris rendering
- Stage event messages during flight
- Debug readout for drag, atmosphere, active parts, stages, and payloads

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

1. Use the Starter rocket.
2. Launch and climb out of the atmosphere.
3. Tilt sideways to build orbital speed.
4. Press **Stage** once to drop the lower booster.
5. Press **Stage** again in orbit to deploy the data center.
6. Reenter and press **Stage** again inside the atmosphere to deploy parachute and legs.
