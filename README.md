# NovaLift v0.4.0 — Economy, Recovery, and Orbital Debris

NovaLift is a portrait/mobile-first 2D rocket sandbox prototype. This version adds the first real economy systems and makes separated stages persist as physical objects instead of disappearing.

## What is new in v0.4.0

- Satellites and orbital data centers now generate revenue over time when deployed into stable orbit.
- Company cash and income-per-second are shown in the HUD.
- Rocket construction is still free/unlimited for prototyping, but part costs now matter for recovery value.
- Successfully landing/recovering the active rocket refunds a portion of the remaining active part costs.
- Separated stages become tracked debris objects instead of vanishing.
- Debris continues on its course under gravity and atmosphere until it stays in orbit or crashes into the planet.
- Persistent world objects now include payloads and debris, not only satellites/data centers.
- Tap/click a deployed object in flight to inspect it.
- Tap orbital debris and choose **Explode Debris** to remove it.
- Persistent world objects and company cash save to `localStorage`.

## Controls

Keyboard:

- W / Up Arrow: thrust
- A / Left Arrow: rotate left
- D / Right Arrow: rotate right
- X / Enter: activate next stage
- Space: pause
- F: debug
- R: debug reset

Mobile:

- Use the large on-screen buttons for thrust, rotation, staging, pause, and debug.
- The Stage preview panel tells you what the Stage button will do next.
- Drag the playfield to pan the camera.
- Pinch the playfield to zoom.
- Tap Center to return to rocket follow mode.
- Tap orbital debris or deployed payloads in the playfield to inspect them.

## Testing notes

Recommended quick tests:

1. Use the Starter button, launch, and stage once to create debris.
2. Confirm the separated stage continues moving instead of disappearing.
3. Tap the debris object and confirm the object inspector appears.
4. Tap **Explode Debris** and confirm the debris is removed.
5. Deploy a satellite/data center in stable orbit and confirm company income increases.
6. Wait several seconds and confirm company cash increases over time.
7. Recover a rocket with parachute/legs and confirm a refund appears in the flight summary.
8. Refresh the page and confirm saved payloads/debris/company cash remain.

## Running locally

Open `index.html` in a browser, or serve the folder with a simple local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

This build has no bundler and is ready for GitHub Pages.
