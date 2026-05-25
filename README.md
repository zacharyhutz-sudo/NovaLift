# NovaLift v0.1.4 — Vertical Flight Sandbox

A portrait-first 2D browser prototype for a simplified Kerbal-style space company game.

The current goal is simple: launch from the homeworld, turn sideways, build horizontal speed, and hold a stable orbit.

## How to run

Open `index.html` through a local web server, or upload the folder to GitHub Pages/Netlify.

Because this uses JavaScript modules, some browsers may block it when opened directly from the file system. If that happens, run a tiny local server from the project folder:

```bash
python3 -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

## Mobile controls

- Hold **Thrust** to fire the engine. The button text is protected from mobile text selection/highlighting.
- Hold **Left** or **Right** to rotate. Rotation is intentionally gentle for mobile control.
- Tap **Reset** to restart the launch.
- Tap **Pause** to pause/resume.
- Tap **DBG** to show debug data and vectors. The dotted trajectory is visible during flight.
- Drag directly on the playfield to pan the camera.
- Pinch on the playfield to zoom in/out.
- Tap **Center** when it appears to snap the camera back to the rocket.

## Keyboard controls

- `W` / `Up Arrow`: thrust
- `A` / `Left Arrow`: rotate left
- `D` / `Right Arrow`: rotate right
- `R`: reset launch
- `Space`: pause
- `F`: toggle debug overlay

## v0.1.4 patch notes

- Added one-finger camera dragging on the playfield.
- Added two-finger pinch zoom for the camera.
- Added a floating **Center** button that appears after the user manually moves the camera.
- Tapping **Center** snaps the camera back to the rocket and returns to auto-follow.
- Reset also recenters the camera on the rocket.

## v0.1.3 patch notes

- Changed the dotted trajectory to a coast-only prediction based on the rocket's current position and velocity.
- Removed the old behavior where the arc assumed the thrust button would stay held forever.
- Increased the prediction horizon so stable orbits draw a much fuller loop.
- Added full-orbit detection so the prediction can stop after roughly one completed orbit instead of drawing repeated loops.

## v0.1.2 patch notes

- Increased the homeworld radius from `250` to `2500`, making the planet 10x larger.
- Scaled atmospheric height from `74` to `740` to match the larger planet.
- Scaled gravity parameter from `900000` to `90000000` so surface gravity remains meaningful on the larger world.
- Increased fuel capacity from `140` to `1400`.
- Reduced fuel mass per unit from `0.03` to `0.003` so the 10x fuel tank does not make the rocket too heavy to launch.

## v0.1.1 patch notes

- Prevented mobile text selection/callout behavior on the touch controls.
- Reduced engine thrust for a slower, less jumpy launch.
- Greatly reduced left/right rotation power for more precise mobile steering.
- Added a live dotted trajectory arc that stays visible during flight.

## What changed in this mobile version

- Renamed the prototype to **NovaLift**.
- Converted the layout to a vertical mobile game format.
- Added large touch controls for thrust and rotation.
- Added mobile-safe spacing for iPhone-style safe areas.
- Reworked the HUD into a compact top bar.
- Repositioned the camera for portrait gameplay.
- Kept keyboard controls for desktop testing.

## What is included

- 2D Canvas rendering
- One planet
- One prebuilt rocket
- Fixed timestep physics
- Simple Newtonian gravity
- Thrust and fuel consumption
- Crash detection
- Basic orbit status detection
- Debug overlay
- Live dotted trajectory prediction, visible during flight and based on current position/velocity
- Manual drag/pinch camera controls with snap-back recenter button

## What is intentionally not included yet

- Rocket builder
- Money/contracts
- Data center payloads
- Multiple planets
- Staging
- Atmosphere/drag
- Saving/loading
- Colonization/terraforming

## Suggested manual tests

1. On mobile, hold **Thrust** without turning. The rocket should go up and eventually fall back down.
2. Hold **Thrust** and slowly rotate right. The rocket should build horizontal speed.
3. Stop thrusting in space. The rocket should coast under gravity.
4. Hit the planet at high speed. The rocket should crash.
5. Tap **Reset**. The rocket should reset to the launchpad.
6. Tap **DBG**. The debug panel, velocity vector, and gravity vector should appear. The dotted trajectory is now visible outside debug mode too.
7. Hold **Thrust** and watch the dotted trajectory update smoothly as the rocket gains actual velocity. When thrust is released, the arc should not snap to a totally different path unless the rocket's velocity changed significantly during the burn.
8. Drag the playfield. The camera should pan and the **Center** button should appear near the top right.
9. Pinch the playfield. The camera should zoom around your fingers without changing flight controls.
10. Tap **Center**. The camera should snap back to the rocket and hide the button.
