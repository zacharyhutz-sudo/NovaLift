# NovaLift v0.5.5 — UI Clarity + World View + Tracking Polish

NovaLift is a portrait/mobile-first 2D rocket company game prototype. This version improves builder navigation, adds world-view access from the build page, makes object tracking/centering more reliable, and increases engine thrust by 20%.


## What is new in v0.5.5

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
