# NovaLift v0.2.0 — Rocket Builder Prototype

A portrait-first 2D browser prototype for a simplified Kerbal-style space company game.

The current game loop is now: build a simple rocket from parts, launch it, turn sideways, build horizontal speed, and try to hold a stable orbit.

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

## v0.2.0 patch notes

- Added the first rocket construction screen.
- Added an infinite prototype budget while still showing part costs.
- Added a mobile-friendly vertical stack builder.
- Added part cards for payloads, command pod, fuel tanks, and engines.
- Added stack controls to move parts up/down or remove them.
- Added live build stats: cost, mass, fuel, thrust-to-weight ratio, and burn time.
- Added validation so invalid rockets cannot launch.
- Added a **Build** button to return from flight to construction.
- Flight physics now uses the constructed rocket's mass, fuel, thrust, and fuel-use values.
- The in-flight rocket sprite now reflects the stacked parts.

## Builder notes

- Budget is currently infinite for fast prototyping.
- Costs are still included so future economy balancing will be easier.
- Stack parts from top to bottom.
- A valid rocket needs a command pod, fuel, and at least one engine.
- TWR must be at least 1.0 to launch.

## Mobile controls

- Hold **Thrust** to fire the engine.
- Hold **Left** or **Right** to rotate.
- Tap **Build** to return to construction.
- Tap **Reset** to restart the current rocket launch.
- Tap **Pause** to pause/resume.
- Tap **DBG** to show debug data, FPS, and vectors.
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

## Testing checklist

- Empty rocket cannot launch.
- Rocket without command pod cannot launch.
- Rocket without fuel cannot launch.
- Rocket without engine cannot launch.
- Rocket with TWR below 1.0 cannot launch.
- Starter rocket launches and lifts off.
- Adding fuel increases fuel and mass.
- Adding payload increases mass and cost.
- Adding a heavy engine increases thrust and fuel burn.
- Reset keeps the current built rocket.
- Build returns to the construction screen.
