# NovaLift v0.4.2 — Visual Polish Pass

NovaLift is a portrait/mobile-first 2D rocket sandbox prototype. This version keeps the game lightweight while improving the look and feel with procedural Canvas visuals, cleaner UI styling, better builder presentation, and more readable flight effects.

## What is new in v0.4.2

- Added a richer procedural space background with parallax stars and subtle nebula glows.
- Improved Homeworld visuals with atmosphere glow, gradient ocean, land shapes, cloud wisps, and a simple day/night shadow.
- Improved the launch pad with a small tower/stand treatment.
- Color-coded the predicted trajectory:
  - red/pink for impact paths
  - yellow for suborbital paths
  - green for orbit-like paths
  - purple for escape-like paths
- Added lightweight atmospheric speed streaks during fast flight in air.
- Improved engine flame glow and exhaust puffs without image assets.
- Added stronger selection glow/pulse for tracked orbital objects.
- Added online payload glow for satellites/data centers that are generating revenue.
- Improved the builder preview with a hangar-style background and launch stand.
- Added lightweight CSS part icons to the builder catalog.
- Polished HUD/cards/buttons with a more premium dark space UI style.
- Added a subtle income pulse when payload revenue is active.

## Existing v0.4 features retained

- Satellites and orbital data centers generate revenue over time when deployed into stable orbit.
- The **Track** button toggles an orbit tracker panel for command pods, satellites, data centers, and debris.
- Company cash and income-per-second are shown in the HUD.
- Rocket construction is still free/unlimited for prototyping, but part costs matter for recovery value.
- Successfully landing/recovering the active rocket refunds a portion of remaining active part costs.
- Separated stages become tracked debris objects instead of vanishing.
- Debris continues on its course under gravity and atmosphere until it stays in orbit or crashes into the planet.
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

- Use the large on-screen buttons for thrust, rotation, staging, pause, tracking, and debug.
- The Stage preview panel tells you what the Stage button will do next.
- Drag the playfield to pan the camera.
- Pinch the playfield to zoom.
- Tap Center to return to rocket follow mode.
- Tap orbital debris or deployed payloads in the playfield to inspect them.
- Tap **Track** to open/close the active object tracker. Tap **Select** in the tracker to inspect/focus an object.

## Testing notes

Recommended quick tests:

1. Build or use the Starter button, launch, and confirm the new planet/background visuals render smoothly.
2. Thrust in atmosphere and confirm flame/exhaust visuals appear.
3. Fly fast through atmosphere and confirm subtle speed streaks appear.
4. Confirm trajectory color changes for crash/suborbital/orbit-like paths.
5. Deploy a satellite/data center in stable orbit and confirm it glows when online.
6. Open **Track** and select an object; confirm the selection ring pulses.
7. Confirm company income increases and the income display pulses when revenue is active.
8. Confirm the builder catalog icons and preview stand render correctly on mobile.

## Running locally

Open `index.html` in a browser, or serve the folder with a simple local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

This build has no bundler and is ready for GitHub Pages.
