# NovaLift v0.8.0 — Satellite Roles + Orbital Network

This patch adds scan-producing exploration satellites, an Orbital Network dashboard, scan-based campaign objectives, and command-vessel control from World View.

# NovaLift v0.8.0 — Mobile Launchpad + Research Simplification

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This version simplifies the Launchpad and Research Lab so the game feels more like a tap-first mobile game and less like a document to read.



## What is new in v0.8.0

- Renamed the builder experience into a simpler **Launchpad** flow.
- Reworked the top navigation into four short actions: Mission, Rocket, Research, and World.
- Reduced build-page reading by hiding advanced stack/part editing behind an **Edit Rocket** button.
- Simplified mission display to show one current mission by default, with View All still available.
- Simplified rocket preset cards to show only name, cost, and part count.
- Simplified part catalog cards to show short stats instead of paragraph descriptions.
- Made the Research Lab more tap-first:
  - A large Recommended card appears first.
  - A compact earn strip explains Research: Missions, Telemetry, and Payloads.
  - Research nodes now show title, status, price, and one short unlock line.
- Kept all underlying v0.6.4 mines/research/economy logic intact.


## What is new in v0.6.4

- Reduced cash and Research/sec output from orbital satellites and data centers by 50x so orbital infrastructure no longer overwhelms the economy.
- Added **Earth Mines** as an early-game cash floor.
  - Each mine costs $100,000.
  - Each mine produces $1/sec.
  - Players can own up to 10 mines.
- Existing saved payload objects migrate to the new lower payload rates when loaded.
- Added an Earth Mines builder card with mine count, income, lifetime mine earnings, and a buy button.

## What is new in v0.6.3

- Reduced **Orbital Telemetry** from 25R to 20R so it is reachable from the first small set of mission Research rewards.
- Added a mission-research backfill on save load: if a player completed missions before the current Research rewards were balanced, the game grants any missing Research they should have earned.
- This keeps existing saves from getting stuck short of the first passive-R/sec unlock.

## What was new in v0.6.2

- Reduced launch-view congestion on mobile by shrinking bottom flight controls, stage preview, fuel bars, and the top HUD.
- Removed the keyboard help text from the bottom of the flight view to free up more viewport space.
- Hid the mission description panel on phone-sized flight screens so the rocket/world view stays cleaner.
- Replaced the long inline Research section with a compact builder card and a dedicated **Research Lab** page.
- Added a Research guide that explains how to earn R:
  - Complete missions for direct R rewards.
  - Research **Orbital Telemetry** so online satellites and data centers generate R/sec.
- Added a recommended research card so the next useful unlock is easier to identify.
- Research-producing parts now say **Research after Orbital Telemetry** until that upgrade is complete.
- Tracker/object inspector research rates now reflect whether Orbital Telemetry is actually unlocked.
- Passive income and Research/sec now continue while the player is in the builder or Research Lab.

## What was fixed in v0.6.1

- Launching a new rocket now explicitly clears any old tracked-object camera target.
- The **Current Command Pod** tracker row now forces the camera back to the active rocket instead of re-centering on the last selected object.
- Opening the builder clears object-follow state so the next launch starts focused on the new rocket.
- Closing or destroying a tracked object releases object-follow mode and returns the camera to the active rocket.
- Added renderer helpers for `followRocket()` and `clearObjectTracking()` so future world-view features can deliberately choose between rocket-follow and object-follow modes.

## What is new in v0.6.0

- Added a **Research Lab** to the builder screen.
- Missions now award both cash and Research.
- Added persistent company research state: current Research, total earned, completed nodes, and Research/sec.
- Added an **Orbital Telemetry** research node so online payloads can generate Research over time.
- Added research-gated parts:
  - Skyburner Engine
  - Titan Engine
  - Composite Fuel Tank
  - Efficient Data Center
  - Exploration Satellite
- Locked parts now appear in the catalog with their required research instead of silently disappearing.
- Career launches are blocked if the stack contains a locked part.
- Added Research readouts to the HUD, builder, tracker, object inspector, and flight summary.
- Added the first exploration hook: the Exploration Satellite is now unlockable, ready for planet discovery in the next milestone.

## What was new in v0.5.5

- Added a **World View** button directly in the builder so players can inspect the persistent orbital world anytime.
- Added builder shortcut buttons for Rocket, Parts, and Missions sections.
- Mission Board now defaults to a shorter recommended view with a **View All** toggle.
- Selecting an object from Track now centers it, follows it, and keeps it highly visible.
- The Center button now restores tracked-object or active-vessel follow behavior instead of just jumping once.
- Added stronger pulsing rings and labels for selected satellites, data centers, command pods, and debris.
- Added World View mode that hides flight controls and focuses on Build / Track / Pause.
- Increased engine thrust by 20%.

## What was new in v0.5.3

### Cleaner starter planet

- Homeworld is now a simpler bluish-green sphere.
- Removed the busy landmass/cloud treatment from the starter planet.
- Added soft spherical shading, a subtle rim highlight, and a light atmosphere glow.

### Cleaner air-resistance visuals

- Replaced the harsher atmospheric streak effect with a softer bow-wave/wake effect.
- Drag visuals are now subtler at medium speed and only become more noticeable under heavier atmospheric load.
- Rocket readability should be improved during launch and descent.

### Larger Homeworld

- Increased Homeworld radius by 5x.
- Scaled atmosphere height with the planet.
- Scaled gravity parameter to preserve a familiar surface-gravity launch feel.
- Extended trajectory prediction so arcs still read better around the larger world.
- Lowered automatic/manual minimum camera scale so the player can still zoom out meaningfully.

### Economy scale rebalance

- Increased all part costs by 20x.
- Increased starting career cash from $25,000 to $500,000.
- Increased mission rewards by 20x.
- Scaled payload income to match the larger economy:
  - Satellite: $140/sec
  - Data Center: $360/sec
- Older company/object saves migrate into the new economy scale when loaded.

## Existing features retained

- Mobile-first vertical flight view.
- Rocket construction from a vertical stack of parts.
- Live builder preview.
- Quick Build templates, Auto-Stage, part category tabs, recommended parts, and +3 quick-add controls.
- Stage preview text in flight.
- Staging, decouplers, satellites, data centers, parachutes, and landing legs.
- Basic atmosphere, drag, parachute recovery, and per-part hitboxes.
- Mission Board, Career Mode, Sandbox Mode, launch costs, mission rewards, recovery cash-in, and recurring payload income.
- The **Track** button toggles an orbit tracker panel for command pods, satellites, data centers, and debris.
- Separated stages become tracked debris objects instead of vanishing.
- Tap/click a deployed object in flight to inspect it.
- Tap orbital debris and choose **Explode Debris** to remove it.
- Persistent world objects and company state save to `localStorage`.
- Procedural starfield, color-coded trajectory lines, lightweight engine effects, and builder hangar visuals.

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
- Tap **Center** to return to rocket follow mode.

## Testing

Open `index.html` directly or host the folder through GitHub Pages/Netlify. No build step is required.
