# NovaLift v0.3.2 — World-Scale Rockets, Better Parts, Recovery Physics

NovaLift is a portrait/mobile-first 2D rocket sandbox prototype. This version focuses on fixing rocket scale, improving part readability, and making parachutes/landing legs actually useful for recovery.

## What is new in v0.3.2

- Rocket rendering is now world-scale instead of screen-locked.
- Zooming in/out now scales the rocket, Earth, trajectory, pad, and hitboxes together.
- Rebuilt rocket part visuals with clearer Canvas vector assets:
  - nose cones
  - command pods
  - fuel tanks
  - engines
  - decouplers
  - satellites/data centers
  - parachutes
  - landing legs
- Added a local auto-camera framing pass so the rocket stays readable without breaking world scale.
- Improved per-part hitboxes to line up with the visible rocket.
- Added deployed landing-leg contact hitboxes near the lower vessel contact point.
- Retuned body drag so launch does not feel overly sluggish.
- Retuned parachute drag so a safe deployment slows a normal rocket to recovery speed.
- Added parachute stabilization so the rocket tends to hang upright under canopy.
- Added a `Safe` descent status when parachute + landing legs have slowed the vehicle enough.

## Controls

Keyboard:

- W / Up Arrow: thrust
- A / Left Arrow: rotate left
- D / Right Arrow: rotate right
- X / Enter: activate next stage
- R: reset flight
- Space: pause
- F: debug

Mobile:

- Use the large on-screen buttons for thrust, rotation, staging, reset, pause, and debug.
- Drag the playfield to pan the camera.
- Pinch the playfield to zoom.
- Tap Center to return to rocket follow mode.

## Testing notes

Recommended quick tests:

1. Pinch zoom in/out and confirm the rocket changes size with Earth rather than staying screen-fixed.
2. Launch the starter rocket and confirm the part visuals remain aligned to the vessel.
3. Stage the parachute and landing legs during descent below safe deploy speed.
4. Confirm the parachute slows the rocket to a safe descent and landing legs can recover the vehicle.
5. Deploy the parachute too fast and confirm it can still fail.

## Running locally

Open `index.html` in a browser, or serve the folder with a simple local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

This build has no bundler and is ready for GitHub Pages.
