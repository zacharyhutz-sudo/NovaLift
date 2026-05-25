# NovaLift v0.5.2 — Payload Activation + Flight Results + Builder QoL

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This version focuses on fixing payload activation clarity, making flights end with a real results/cash-in loop, and making rocket construction much faster.

## What is new in v0.5.2

### Payload activation fix

- Satellites and data centers now use a better orbit evaluation based on projected orbital shape instead of only momentary radial velocity.
- Payload tracker statuses now explain why a payload is offline, such as:
  - orbit dips into atmosphere
  - too low in atmosphere
  - not enough sideways speed
  - escape trajectory
- Older saved payload objects are still normalized and rechecked when loaded.
- Online satellites/data centers continue generating company revenue over time.

### Flight results and recovery cash-in

- Landing or crashing the active command rocket now opens a **Flight Results** popup.
- The popup shows:
  - max altitude
  - max speed
  - launch cost
  - mission rewards
  - recovery value
  - net result
  - recovered parts
  - a flight improvement tip
- Successful recoveries now create a pending recovery value.
- Tap **Cash In** to collect the recovered part value.
- Recovery payouts can only be cashed in once.

### Builder quality-of-life improvements

- Added **Quick Build** templates:
  - Starter Orbit
  - Satellite Launcher
  - Data Center Rig
  - Recovery Test
- Added an **Auto-Stage** button.
- Added part category tabs:
  - All
  - Core
  - Fuel
  - Engines
  - Payloads
  - Recovery
  - Aero
- Added mission-based recommended parts.
- Added **+3** buttons for repeated fuel/engine additions when there is room.
- Added duplicate controls for parts already in the current stack.

## Existing features retained

- Mobile-first vertical flight view.
- Rocket construction from a vertical stack of parts.
- Live builder preview.
- Stage preview text in flight.
- Staging, decouplers, satellites, data centers, parachutes, and landing legs.
- Basic atmosphere, drag, parachute recovery, and per-part hitboxes.
- Mission Board, Career Mode, Sandbox Mode, launch costs, mission rewards, and recurring payload income.
- The **Track** button toggles an orbit tracker panel for command pods, satellites, data centers, and debris.
- Separated stages become tracked debris objects instead of vanishing.
- Debris continues under gravity and atmosphere until it stays in orbit or crashes into the planet.
- Tap/click a deployed object in flight to inspect it.
- Tap orbital debris and choose **Explode Debris** to remove it.
- Persistent world objects and company state save to `localStorage`.
- Procedural starfield, improved Homeworld visuals, color-coded trajectory lines, and lightweight effects.

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

1. Open the builder and confirm the rocket starts empty.
2. Tap a Quick Build template and confirm the rocket stack, live preview, and stages update.
3. Tap **Auto-Stage** after editing and confirm staged parts receive sensible stage numbers.
4. Use part category tabs and recommended parts to add/duplicate parts quickly.
5. Launch a satellite or data center template and deploy the payload in a stable orbit.
6. Confirm the tracker shows the payload as online and generating income, or explains why it is offline.
7. Land a command rocket and confirm the Flight Results popup appears.
8. Tap **Cash In** and confirm the recovery value is added once.
9. Crash a rocket and confirm the Flight Results popup still appears with no recovery value.
10. Refresh the page and confirm company cash, completed missions, and orbital objects persist.

## Running locally

Open `index.html` in a browser, or serve the folder with a simple local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

This build has no bundler and is ready for GitHub Pages.
