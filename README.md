# NovaLift v0.1.2 — Vertical Flight Sandbox

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
- Tap **DBG** to show debug data, vectors, and predicted trajectory.

## Keyboard controls

- `W` / `Up Arrow`: thrust
- `A` / `Left Arrow`: rotate left
- `D` / `Right Arrow`: rotate right
- `R`: reset launch
- `Space`: pause
- `F`: toggle debug overlay

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
- Added a live dotted trajectory arc that stays visible during flight and previews continued thrust while the thrust button is held.

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
- Live dotted trajectory prediction, visible during flight and updated by current thrust input

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
7. Hold **Thrust** and watch the dotted trajectory update as the rocket gains acceleration.
