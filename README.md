# NovaLift v0.9.3 — Launchpad + Mobile UI Simplification

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This patch reorganizes the builder into a clearer Goal → Rocket → Launch flow, pushes secondary company systems below the primary action path, and improves World View access and object tracking clarity.

## What is new in v0.9.3

- Reordered the Launchpad around the player’s next action:
  - Current Objective
  - Rocket Preview
  - Rocket Readiness
  - Launch
  - Optional Editor
  - Program Systems
- Added a more prominent World View entry button in the Launchpad header.
- Changed the sticky Launchpad navigation to Goal, Rocket, Upgrades, and World.
- Added a mission progress bar and clearer objective CTA buttons.
- Added quick objective actions for suggested builds, editing, and launching when ready.
- Moved Research, Orbital Network, Planet Registry, Earth Mines, and Rocket Presets into a secondary Program Systems area.
- Improved mobile spacing, tap targets, and card hierarchy.
- Improved World View focus so it automatically centers a useful tracked object when available.
- Grouped the object tracker into Payloads, Command Pods, and Debris.
- Added stronger selected-object tracker styling, icons, labels, and current-rocket selection rings.
- Adjusted object camera framing so selected tracked objects are larger and easier to see.

## Previous v0.9.2 features retained


- Added a reusable feedback event pipeline from game logic to the UI.
- Added stacked toast notifications for:
  - Launch committed
  - Stage fired
  - Mission complete
  - Research complete
  - Planet discovered
  - Earth mine purchased
  - Recovery cashed in
  - Rocket/object sold or destroyed
  - Invalid launch/research/cash warnings
- Added larger reward reveal cards for major milestones, mission rewards, research unlocks, and planet discovery.
- Added mobile haptic feedback through `navigator.vibrate` where supported.
- Added an optional generated sound system with a HUD toggle.
  - Sound is off by default.
  - Sounds are generated in-browser with Web Audio, so no asset files are required.
- Added launch, stage, reward, unlock, crash, tap, and warning sound cues.
- Added more tactile button press states and a subtle animated launch-button sheen.
- Added flight-view juice:
  - Launch smoke
  - Stage burst particles
  - Crash explosion glow
  - Landing dust
  - Reward/unlock pings in world space
  - Engine plume sparkle trails
  - Camera shake during thrust and impact events
- Removed the stale `builderJumpToParts` reference from `main.js`.
- Cleaned duplicated README sections from the previous patch history.

## v0.9.1 features retained

- Mobile Launchpad flow with Mission, Rocket, Research, and World actions.
- Advanced rocket editing hidden behind the optional editor panel.
- Research Lab with recommended upgrade card and compact research tree.
- Orbital Network dashboard with cash, Research, and Scan income.
- Planet Registry with Homeworld plus discoverable fixed physical planets.
- World View access from the builder.
- Object tracking, command-vessel switching, selling, and destroying.
- Physical discovered planets with gravity wells and landing surfaces.
- Stage fuel bars that combine tanks by stage.
- Mobile-first flight controls and camera pan/zoom.

## Existing features retained

- Rocket construction from a vertical stack of parts.
- Live builder preview.
- Quick Build templates, Auto-Stage, part category tabs, recommended parts, and +3 quick-add controls.
- Staging, decouplers, satellites, data centers, parachutes, landing legs, and recovery cash-in.
- Career Mode, Sandbox Mode, launch costs, mission rewards, recurring payload income, Research, and Scan progression.
- Persistent world objects and company state save to `localStorage`.
- Procedural starfield, color-coded trajectory lines, starter planet shading, atmosphere, drag, and orbital prediction.

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

- Touch **Thrust**, **Left**, **Right**, **Stage**, **Track**, **Pause**, **Build**, and **Center** buttons.
- Drag the flight view to pan the camera.
- Pinch the flight view to zoom.
- Tap **Center** to return to rocket or tracked-object follow mode.
- Tap **SND Off / SND On** to toggle optional game sounds.

## Testing

Open `index.html` directly or host the folder through GitHub Pages/Netlify. No build step is required. Run `npm run check` to syntax-check all source files.
