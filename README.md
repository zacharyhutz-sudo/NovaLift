# NovaLift v0.9.7 — Space Center + Flight Warp Pass

This patch makes the company layer feel more like a playable space center and adds Space Flight Simulator-style flight time warp without accelerating passive income, scan, research, or engineer timers.

## What is new in v0.9.7

- Added a Space Center facility map to the Launchpad with Mission Control, Engineering Bay, Contract Office, Storage Yard, Research Lab, and Planetary Ops.
- Facilities now act as shortcuts into the relevant game systems instead of leaving everything as detached stat panels.
- Reframed passive storage as the Storage Yard with visible cash, Research, and Scan containers.
- Reframed daily contracts as client requests from groups like Mission Control, Atlas Telecom, and Operations Office.
- Added named engineer crew cards so projects are assigned to people rather than abstract queue slots.
- Added facility labels and crew leads to engineer projects for a stronger space-company feel.
- Added a Warp button during flight that cycles 1x, 2x, 5x, 10x, and 25x physics speed.
- Added keyboard shortcuts for flight warp: T or period.
- Split flight simulation time from economy time so time warp accelerates rockets and orbital objects only. Passive income, colony production, scan, research, daily progress, engineer projects, and storage collection remain real-time.
- Updated the HUD/debug readouts so the current flight warp is clear.

# NovaLift v0.9.6 — Offworld Colony Test Pass

This patch keeps the existing planet discovery and physical planet system intact, then adds a first playable colonization layer plus a testing resource toggle.

## What is new in v0.9.6

- Added a visible TEST toggle in the top controls for infinite cash, Research, and Scan testing.
- Test resources bypass launch, engineer, Earth mine, research, and colony resource costs so features can be tested without grinding resources.
- Test resources also make Scan effectively infinite, which maps all starter planet signals for faster feature testing.
- Added first-pass offworld colonies from the Planet Registry.
- Discovered non-homeworld planets can now establish and upgrade robotic outposts after Robotic Landers research.
- Added Brim, Auralis, and Vestae colony roles with distinct passive cash, Research, and Scan production.
- Added colony save/load compatibility through the company save object.
- Added two new Colonization Program missions: First Offworld Outpost and Upgrade an Outpost.
- Updated the Planet Registry UI to show colony level, output, costs, requirements, and action buttons.

# NovaLift v0.9.5 — Space Program Progression Pass

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This patch adds a first pass at Clash-inspired pacing: short launch sessions, daily goals, timed engineer projects, passive income storage, launch contract stars, and a stronger recommended-next-action loop.

## What is new in v0.9.5

- Added Program Level and Program XP as a long-term era/progression layer.
- Added a Space Program dashboard to the Launchpad with a level badge, XP bar, and recommended next action.
- Added daily contracts that reset by local date and reward cash, Research, and Program XP.
- Added launch contract star scoring so each flight can earn 0–3 stars and small repeatable rewards.
- Added one Engineer queue with timed facility projects and future support for more engineer slots.
- Added early engineer projects for operations, storage, research lab, assembly bay, and engineering team growth.
- Converted passive cash, Research, and Scan income into capped Operations Storage that must be collected.
- Added storage caps that grow with Program Level and engineer projects.
- Added feedback/reward events for contract stars, daily claims, engineer starts/completions, and passive collection.
- Preserved the existing mission campaign, research tree, rocket building, and save compatibility.

## Previous v0.9.4.3 — Research RPG Tree Redesign

- Rebuilt the Research Lab around a top Recommended upgrade card.
- Replaced the previous roadmap layout with four RPG-style research paths: Propulsion, Orbital Ops, Exploration, and Planetary Systems.
- Added large circular node treatments with clear READY, DONE, LOCKED, and research-shortfall states.
- Added lane-colored progression styling and tier labels: Common, Uncommon, Rare, Epic, and Legendary.
- Added a selected-upgrade detail panel with effect, requirements, and research action.
- Added a compact tier/status legend.
- Converted research node icons to text-based badges and initials instead of emojis.
- Preserved existing research costs, unlock logic, prerequisites, and save compatibility.

## Previous v0.9.4.2 — World View Control Polish

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
- Career Mode, Sandbox Mode, launch costs, mission rewards, collectable passive income storage, Research, Scan progression, Program XP, daily contracts, and timed engineer projects.
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
