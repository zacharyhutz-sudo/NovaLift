export const PHYSICS = {
  fixedDt: 1 / 60,
  maxFrameTime: 0.25,
  orbitRequiredHoldSeconds: 6,
  trajectorySteps: 320,
  trajectoryDt: 0.48
};

export const PLANET = {
  name: "Homeworld",
  x: 0,
  y: 0,
  radius: 2500,
  atmosphereHeight: 740,
  mu: 90000000,
  color: "#1d4ed8",
  landColor: "#22c55e",
  atmosphereColor: "rgba(125, 211, 252, 0.12)"
};

export const ROCKET = {
  x: 0,
  y: -(PLANET.radius + 18),
  vx: 0,
  vy: 0,
  angle: -Math.PI / 2,
  dryMass: 8,
  fuel: 1400,
  maxFuel: 1400,
  fuelMassPerUnit: 0.003,
  thrust: 220,
  fuelUse: 9.2,
  rotateSpeed: 0.45,
  collisionRadius: 18,
  landed: true,
  crashed: false
};

export const RENDER = {
  minScale: 0.18,
  maxScale: 1.65,
  velocityVectorScale: 1.55,
  gravityVectorScale: 90,
  starCount: 180
};
