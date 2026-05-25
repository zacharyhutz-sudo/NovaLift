# NovaLift v0.5.1 — Engine/Fuel Tuning + Gravity-Aligned Parachutes

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This version turns the polished flight sandbox into a more game-like progression loop with starter missions, launch costs, rewards, and the existing payload-income economy.

## What is new in v0.5.1

### Balance/physics patch

- Reduced all engine thrust values by 25%.
- Reduced fuel tank capacities by 50%.
- Parachute canopies now render opposite the local gravity vector, so they deploy away from the planet instead of simply pointing screen-up or rocket-up.


- Added a **Mission Board** to the builder.
- Added starter progression missions:
  - First Launch
  - Reach the Sky
  - Touch Space
  - First Orbit
  - Deploy Satellite
  - Deploy Data Center
  - Recover Rocket
  - Clean Orbit
- Added mission rewards that pay company cash when completed.
- Added **Career Mode** with a $25,000 starting budget.
- Added a **Sandbox Mode** toggle that keeps unlimited launches for testing.
- Rocket launches now subtract the rocket's part cost in Career Mode.
- The launch button now shows the career launch cost.
- Builder validation warns when the company cannot afford the current rocket.
- Flight messages now call out completed missions and rewards.
- Flight summaries include launch cost, mission reward, recovery refund, and net result.
- Existing local saves migrate to the new company format with career cash available.

## Existing features retained

- Mobile-first vertical flight view.
- Rocket construction from a vertical stack of parts.
- Live builder preview.
- Stage preview text in flight.
- Staging, decouplers, satellites, data centers, parachutes, and landing legs.
- Basic atmosphere, drag, parachute recovery, and per-part hitboxes.
- Satellites and orbital data centers generate revenue over time when deployed into stable orbit.
- The **Track** button toggles an orbit tracker panel for command pods, satellites, data centers, and debris.
- Successfully landing/recovering the active rocket refunds a portion of remaining active part costs.
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

1. Open the builder and confirm the Mission Board shows starter missions.
2. Confirm Career Mode starts with $25,000 and launch button shows the rocket cost.
3. Toggle Sandbox Mode and confirm the cash display shows infinite/unlimited budget behavior.
4. Build a valid rocket, launch, and confirm the launch cost is deducted in Career Mode.
5. Lift off and confirm **First Launch** pays its reward.
6. Reach altitude milestones and confirm mission rewards appear in the flight message.
7. Deploy an online satellite/data center and confirm recurring income plus mission reward behavior.
8. Recover a rocket and confirm both part refund and recovery mission reward behavior.
9. Explode orbital debris and confirm the Clean Orbit mission can complete.
10. Refresh the page and confirm company cash, completed missions, and orbital objects persist.

## Running locally

Open `index.html` in a browser, or serve the folder with a simple local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

This build has no bundler and is ready for GitHub Pages.
