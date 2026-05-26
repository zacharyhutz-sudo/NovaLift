# NovaLift v0.9.4.2 — World View Control Polish

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This patch tightens the World View tracker so command pods can be inspected, controlled, and destroyed more reliably, reduces engine camera shake, and clears finished craft from the world after crashes or recovery cash-in.

## What is new in v0.9.4.2

- Added direct Control and Destroy actions to tracker rows.
- Fixed current-rocket selection getting cleared by object cleanup logic.
- Improved command-center switching so saved command pods can become the active rocket more intuitively from World View.
- Prevented crashed active rockets from being re-persisted as switchable command pods.
- Removed crashed detached objects from persistent world objects.
- Cleared the active rocket from the world after a crash, while preserving the flight result summary.
- Cleared recovered rockets after cashing in recovery value.
- Reduced camera shake from engine thrust and limited thrust rumble to the first 100m of altitude.

## Previous v0.9.4.1 — Research Usability Patch

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This patch keeps the v0.9.4 identity/progression polish and fixes the Research Lab so players can navigate it with normal vertical scrolling instead of hidden sideways scrolling.


## What is new in v0.9.4.1

- Converted the Research Lab from a sideways-scrolling tree into a vertical-first roadmap.
- Added sticky lane jump buttons for Propulsion, Orbital Ops, Exploration, and Planetary research.
- Removed the forced horizontal minimum width that made the tree awkward on phones.
- Made research lanes full-width cards on mobile, two columns on larger screens, and four columns on wide desktop.
- Hid the wide connector rails until the layout is wide enough to support them.
- Improved research node readability, tap targets, scroll positioning, and lane highlight feedback.

## Previous v0.9.4 features retained

- Added a full-screen NovaLift title/home screen with:
  - Logo mark
  - Tagline
  - Continue Program action
  - Tucked-away New Company reset action
  - Build / Orbit / Discover game-pillar strip
- Added a reusable NovaLift logo mark to the Launchpad header.
- Added system badges/icons for Research, Orbital Network, Planet Registry, Earth Mines, and Rocket Presets.
- Reworked the expanded mission view into a campaign road grouped by chapter:
  - Flight School
  - Orbit Program
  - Orbital Business
  - Exploration Program
- Added chapter cards with progress bars, numbered mission nodes, current-chapter styling, and claimed reward labels.
- Improved the Current Objective card with a chapter emblem and clearer mission/reward chips.
- Improved reward reveal cards with a larger badge icon and customizable kicker text for:
  - Mission Complete
  - Campaign Progress
  - Program Unlock
  - Discovery
- Improved the Planet Registry presentation:
  - Planet orb visuals
  - Locked unknown-signal silhouettes
  - Per-planet scan progress bars
  - Discovered planet descriptions
- Added `visualColor` to planet registry data so UI cards can style each world even before full physical details are revealed.
- Updated project version and syntax-check script.

## Previous v0.9.3 features retained

- Reordered the Launchpad around the player’s next action:
  - Current Objective
  - Rocket Preview
  - Rocket Readiness
  - Launch
  - Optional Editor
  - Program Systems
- Added prominent World View entry from the Launchpad header.
- Added Goal, Rocket, Upgrades, and World sticky Launchpad navigation.
- Added mission progress bars and quick objective actions.
- Moved Research, Orbital Network, Planet Registry, Earth Mines, and Rocket Presets into Program Systems.
- Improved mobile spacing, tap targets, and card hierarchy.
- Improved World View focus and object tracking clarity.
- Grouped the object tracker into Payloads, Command Pods, and Debris.
- Added stronger selected-object tracker styling, labels, icons, and current-rocket selection rings.

## Previous v0.9.2 features retained

- Reusable feedback event pipeline from game logic to the UI.
- Toast notifications for launches, staging, mission completion, research, discovery, economy events, and warnings.
- Reward reveal cards for major milestones and unlocks.
- Mobile haptic feedback through `navigator.vibrate` where supported.
- Optional generated Web Audio sound system with HUD toggle.
- Tactile button press states and animated launch-button sheen.
- Flight-view juice including launch smoke, stage burst particles, crash glow, landing dust, reward/unlock pings, engine sparkle trails, and camera shake.

## Core features

- Rocket construction from a vertical stack of parts.
- Live builder preview.
- Quick Build templates, Auto-Stage, part category tabs, recommended parts, and +3 quick-add controls.
- Staging, decouplers, satellites, data centers, parachutes, landing legs, and recovery cash-in.
- Career Mode, Sandbox Mode, launch costs, mission rewards, recurring payload income, Research, and Scan progression.
- Persistent world objects and company state saved to `localStorage`.
- Procedural starfield, color-coded trajectory lines, planet shading, atmosphere, drag, and orbital prediction.
- World View with object tracking, command-vessel switching, selling, and destroying.
- Physical discovered planets with gravity wells and landing surfaces.
- Stage fuel bars that combine tanks by stage.

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
