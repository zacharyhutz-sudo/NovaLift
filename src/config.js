export const PHYSICS = {
  fixedDt: 1 / 60,
  maxFrameTime: 0.25,
  orbitRequiredHoldSeconds: 6,
  trajectorySteps: 2600,
  trajectoryDt: 0.42,
  trajectoryPointEvery: 3,
  trajectoryFullOrbitRadians: Math.PI * 2.02,
  trajectoryMaxDistanceMultiplier: 28,
  dragScale: 0.000035,
  detachedDragScale: 0.000055,
  parachuteDragScale: 0.00072,
  maxDragAcceleration: 85,
  parachuteSafeDeploySpeed: 235,
  parachuteRipSpeed: 310,
  parachuteMinEffectiveDensity: 0.035,
  parachuteStabilization: 1.55,
  landingSafeSpeedBare: 10,
  landingSafeSpeedLegs: 34,
  landingUprightAngle: 0.68
};

export const PLANET = {
  name: "Homeworld",
  x: 0,
  y: 0,
  radius: 62500,
  atmosphereHeight: 18500,
  surfaceDensity: 1,
  // Radius is 5x larger than v0.5.2. Mu is scaled by 25x to preserve familiar surface gravity.
  mu: 56250000000,
  color: "#2bb6a8",
  landColor: "#2bb6a8",
  atmosphereColor: "rgba(94, 234, 212, 0.13)"
};

export const ROCKET = {
  x: 0,
  y: -(PLANET.radius + 18),
  vx: 0,
  vy: 0,
  angle: -Math.PI / 2,
  dryMass: 8,
  fuel: 875,
  maxFuel: 875,
  fuelMassPerUnit: 0.003,
  thrust: 198,
  fuelUse: 9.2,
  rotateSpeed: 0.45,
  collisionRadius: 18,
  dragArea: 1.4,
  frontalArea: 1,
  landed: true,
  crashed: false
};

export const RENDER = {
  minScale: 0.0036,
  maxScale: 1.65,
  manualMinScale: 0.0012,
  manualMaxScale: 2.8,
  cameraDragDeadzonePx: 3,
  velocityVectorScale: 1.55,
  gravityVectorScale: 90,
  starCount: 180
};
