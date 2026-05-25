import { PLANET, PHYSICS } from "./config.js";

export function cloneRocket(template) {
  return {
    ...template,
    orbitHoldTime: 0,
    missionComplete: false,
    lastGravity: { x: 0, y: 0 }
  };
}

export function getRocketMass(rocket) {
  return rocket.dryMass + Math.max(0, rocket.fuel) * rocket.fuelMassPerUnit;
}

export function getDistanceToPlanet(rocket, planet = PLANET) {
  const dx = rocket.x - planet.x;
  const dy = rocket.y - planet.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getAltitude(rocket, planet = PLANET) {
  return getDistanceToPlanet(rocket, planet) - planet.radius - rocket.collisionRadius;
}

export function getSpeed(rocket) {
  return Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
}

export function getGravityVector(rocket, planet = PLANET) {
  const dx = planet.x - rocket.x;
  const dy = planet.y - rocket.y;
  const distanceSq = Math.max(dx * dx + dy * dy, 1);
  const distance = Math.sqrt(distanceSq);
  const gravityStrength = planet.mu / distanceSq;

  return {
    x: (dx / distance) * gravityStrength,
    y: (dy / distance) * gravityStrength,
    strength: gravityStrength
  };
}

export function getRadialVelocity(rocket, planet = PLANET) {
  const dx = rocket.x - planet.x;
  const dy = rocket.y - planet.y;
  const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
  const ux = dx / distance;
  const uy = dy / distance;

  return rocket.vx * ux + rocket.vy * uy;
}

export function getTangentialSpeed(rocket, planet = PLANET) {
  const speed = getSpeed(rocket);
  const radial = getRadialVelocity(rocket, planet);
  return Math.sqrt(Math.max(0, speed * speed - radial * radial));
}

export function getCircularOrbitSpeed(rocket, planet = PLANET) {
  const distance = Math.max(getDistanceToPlanet(rocket, planet), 1);
  return Math.sqrt(planet.mu / distance);
}

export function getEscapeSpeed(rocket, planet = PLANET) {
  const distance = Math.max(getDistanceToPlanet(rocket, planet), 1);
  return Math.sqrt((2 * planet.mu) / distance);
}

export function rotateRocket(rocket, direction, dt) {
  if (rocket.crashed) return;
  rocket.angle += direction * rocket.rotateSpeed * dt;
}

export function stepRocket(rocket, input, dt, planet = PLANET) {
  if (rocket.crashed) return;

  if (rocket.landed) {
    const thrusting = input.thrusting && rocket.fuel > 0;
    const mass = getRocketMass(rocket);
    const gravity = getGravityVector(rocket, planet);
    const thrustAcceleration = rocket.thrust / mass;

    rocket.vx = 0;
    rocket.vy = 0;
    rocket.lastGravity = gravity;

    if (!thrusting || thrustAcceleration <= gravity.strength * 0.82) {
      return;
    }

    rocket.landed = false;
  }

  const gravity = getGravityVector(rocket, planet);
  rocket.lastGravity = gravity;

  rocket.vx += gravity.x * dt;
  rocket.vy += gravity.y * dt;

  if (input.thrusting && rocket.fuel > 0) {
    const mass = getRocketMass(rocket);
    const thrustAcceleration = rocket.thrust / mass;
    const throttleFuel = Math.min(rocket.fuel, rocket.fuelUse * dt);

    rocket.vx += Math.cos(rocket.angle) * thrustAcceleration * dt;
    rocket.vy += Math.sin(rocket.angle) * thrustAcceleration * dt;
    rocket.fuel -= throttleFuel;
  }

  rocket.x += rocket.vx * dt;
  rocket.y += rocket.vy * dt;

  resolveSurfaceContact(rocket, planet);
  updateOrbitMission(rocket, dt, planet);
}

function resolveSurfaceContact(rocket, planet) {
  const altitude = getAltitude(rocket, planet);
  if (altitude > 0) return;

  const speed = getSpeed(rocket);
  const distance = getDistanceToPlanet(rocket, planet);
  const nx = (rocket.x - planet.x) / Math.max(distance, 1);
  const ny = (rocket.y - planet.y) / Math.max(distance, 1);
  const safeTouchdown = speed < 7.5 && !rocket.missionComplete;

  rocket.x = planet.x + nx * (planet.radius + rocket.collisionRadius);
  rocket.y = planet.y + ny * (planet.radius + rocket.collisionRadius);

  if (safeTouchdown) {
    rocket.landed = true;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.orbitHoldTime = 0;
  } else {
    rocket.crashed = true;
    rocket.vx = 0;
    rocket.vy = 0;
  }
}

export function getOrbitStatus(rocket, planet = PLANET) {
  if (rocket.crashed) return "Crashed";
  if (rocket.missionComplete) return "Orbit achieved";
  if (rocket.landed) return "Ready on pad";

  const altitude = getAltitude(rocket, planet);
  const speed = getSpeed(rocket);
  const radialVelocity = getRadialVelocity(rocket, planet);
  const tangentialSpeed = getTangentialSpeed(rocket, planet);
  const circularSpeed = getCircularOrbitSpeed(rocket, planet);
  const escapeSpeed = getEscapeSpeed(rocket, planet);

  if (altitude < 0) return "Impact";
  if (altitude < planet.atmosphereHeight) return "Climbing through atmosphere";
  if (speed > escapeSpeed * 0.98 && radialVelocity > 10) return "Escaping";
  if (tangentialSpeed > circularSpeed * 0.9 && Math.abs(radialVelocity) < 23) return "Stable orbit likely";
  if (tangentialSpeed > circularSpeed * 0.68) return "Almost orbital";
  return "Suborbital arc";
}

function updateOrbitMission(rocket, dt, planet) {
  const status = getOrbitStatus(rocket, planet);

  if (status === "Stable orbit likely") {
    rocket.orbitHoldTime += dt;
    if (rocket.orbitHoldTime >= PHYSICS.orbitRequiredHoldSeconds) {
      rocket.missionComplete = true;
    }
  } else if (!rocket.missionComplete) {
    rocket.orbitHoldTime = Math.max(0, rocket.orbitHoldTime - dt * 1.25);
  }
}

export function predictTrajectory(rocket, planet = PLANET) {
  if (rocket.crashed) return [];

  const speed = getSpeed(rocket);
  if (rocket.landed && speed < 0.1) return [];

  const ghost = {
    ...rocket,
    crashed: false,
    landed: false,
    missionComplete: false
  };
  const points = [{ x: ghost.x, y: ghost.y }];
  const maxDistance = (planet.radius + planet.atmosphereHeight) * PHYSICS.trajectoryMaxDistanceMultiplier;

  let previousAngle = Math.atan2(ghost.y - planet.y, ghost.x - planet.x);
  let angularTravel = 0;

  for (let i = 0; i < PHYSICS.trajectorySteps; i++) {
    const gravity = getGravityVector(ghost, planet);

    // Predict the natural coast path from the rocket's current velocity only.
    // Live thrust changes the real velocity first; the trajectory then updates
    // from that new state instead of assuming the player will hold thrust forever.
    ghost.vx += gravity.x * PHYSICS.trajectoryDt;
    ghost.vy += gravity.y * PHYSICS.trajectoryDt;
    ghost.x += ghost.vx * PHYSICS.trajectoryDt;
    ghost.y += ghost.vy * PHYSICS.trajectoryDt;

    const altitude = getAltitude(ghost, planet);
    if (i % PHYSICS.trajectoryPointEvery === 0) points.push({ x: ghost.x, y: ghost.y });
    if (altitude <= 0) {
      points.push({ x: ghost.x, y: ghost.y });
      break;
    }

    const distance = getDistanceToPlanet(ghost, planet);
    if (distance > maxDistance) break;

    const angle = Math.atan2(ghost.y - planet.y, ghost.x - planet.x);
    angularTravel += Math.abs(normalizeAngle(angle - previousAngle));
    previousAngle = angle;

    if (angularTravel >= PHYSICS.trajectoryFullOrbitRadians) {
      points.push({ x: ghost.x, y: ghost.y });
      break;
    }
  }

  return points;
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
