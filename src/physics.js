import { PLANET, PHYSICS } from "./config.js";
import { calculateStatsFromParts } from "./builder.js";
import { getRocketSurfaceContact } from "./dimensions.js";

export function cloneRocket(template) {
  return {
    ...template,
    parts: Array.isArray(template.parts) ? template.parts.map((part) => ({ ...part })) : template.parts,
    orbitHoldTime: 0,
    missionComplete: false,
    lastGravity: { x: 0, y: 0, strength: 0 },
    lastDrag: { x: 0, y: 0, strength: 0 },
    lastDensity: 0,
    stageEvents: [],
    lastStageMessage: template.lastStageMessage ?? "Stage system ready."
  };
}

export function getActiveParts(rocket) {
  return Array.isArray(rocket.parts) ? rocket.parts.filter((part) => part.active !== false) : [];
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
  if (Array.isArray(rocket?.parts) && rocket.parts.some((part) => part.active !== false)) {
    return getRocketSurfaceContact(rocket, planet).clearance;
  }
  return getDistanceToPlanet(rocket, planet) - planet.radius - (rocket.collisionRadius ?? 0);
}

export function getSpeed(rocket) {
  return Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
}

export function getAtmosphereDensity(rocket, planet = PLANET) {
  const altitude = getAltitude(rocket, planet);
  if (altitude < 0) return planet.surfaceDensity ?? 1;
  if (altitude >= planet.atmosphereHeight) return 0;
  const t = 1 - altitude / planet.atmosphereHeight;
  return (planet.surfaceDensity ?? 1) * t * t;
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

export function getDragVector(rocket, planet = PLANET, scale = PHYSICS.dragScale) {
  const speed = getSpeed(rocket);
  const density = getAtmosphereDensity(rocket, planet);
  const mass = Math.max(getRocketMass(rocket), 0.1);
  if (speed <= 0.001 || density <= 0) return { x: 0, y: 0, strength: 0, density };

  let dragArea = rocket.dragArea ?? 1;
  if (rocket.parachuteState === "deployed") {
    dragArea += getParachuteDragArea(rocket);
  }
  const force = density * speed * speed * Math.max(0.1, dragArea) * scale;
  const acceleration = force / mass;

  return {
    x: -(rocket.vx / speed) * acceleration,
    y: -(rocket.vy / speed) * acceleration,
    strength: acceleration,
    density
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
  recalculateRocketStats(rocket);

  if (rocket.landed) {
    const thrusting = input.thrusting && rocket.fuel > 0 && rocket.thrust > 0;
    const mass = getRocketMass(rocket);
    const gravity = getGravityVector(rocket, planet);
    const thrustAcceleration = rocket.thrust / mass;

    rocket.vx = 0;
    rocket.vy = 0;
    rocket.lastGravity = gravity;
    rocket.lastDrag = { x: 0, y: 0, strength: 0, density: getAtmosphereDensity(rocket, planet) };

    if (!thrusting || thrustAcceleration <= gravity.strength * 0.82) {
      return;
    }

    rocket.landed = false;
  }

  const gravity = getGravityVector(rocket, planet);
  rocket.lastGravity = gravity;

  rocket.vx += gravity.x * dt;
  rocket.vy += gravity.y * dt;

  if (input.thrusting && rocket.fuel > 0 && rocket.thrust > 0) {
    const mass = getRocketMass(rocket);
    const thrustAcceleration = rocket.thrust / mass;
    const throttleFuel = Math.min(rocket.fuel, rocket.fuelUse * dt);

    rocket.vx += Math.cos(rocket.angle) * thrustAcceleration * dt;
    rocket.vy += Math.sin(rocket.angle) * thrustAcceleration * dt;
    rocket.fuel -= throttleFuel;
  }

  const drag = getDragVector(rocket, planet, PHYSICS.dragScale);
  rocket.lastDrag = drag;
  rocket.lastDensity = drag.density;
  rocket.vx += drag.x * dt;
  rocket.vy += drag.y * dt;

  rocket.x += rocket.vx * dt;
  rocket.y += rocket.vy * dt;

  resolveSurfaceContact(rocket, planet);
  updateOrbitMission(rocket, dt, planet);
}

export function stepDetachedObject(object, dt, planet = PLANET) {
  if (object.crashed || object.landed) return;

  const gravity = getGravityVector(object, planet);
  object.vx += gravity.x * dt;
  object.vy += gravity.y * dt;

  const drag = getDetachedDragVector(object, planet);
  object.vx += drag.x * dt;
  object.vy += drag.y * dt;
  object.x += object.vx * dt;
  object.y += object.vy * dt;

  const altitude = getAltitude(object, planet);
  if (altitude <= 0) {
    const distance = getDistanceToPlanet(object, planet);
    const nx = (object.x - planet.x) / Math.max(distance, 1);
    const ny = (object.y - planet.y) / Math.max(distance, 1);
    object.x = planet.x + nx * (planet.radius + (object.collisionRadius ?? 8));
    object.y = planet.y + ny * (planet.radius + (object.collisionRadius ?? 8));
    object.vx = 0;
    object.vy = 0;
    object.crashed = true;
    object.status = "crashed";
  }
}

function getDetachedDragVector(object, planet = PLANET) {
  const speed = getSpeed(object);
  const density = getAtmosphereDensity(object, planet);
  const mass = Math.max(object.mass ?? 1, 0.1);
  if (speed <= 0.001 || density <= 0) return { x: 0, y: 0, strength: 0, density };
  const force = density * speed * speed * Math.max(0.2, object.dragArea ?? 1) * PHYSICS.detachedDragScale;
  const acceleration = force / mass;
  return {
    x: -(object.vx / speed) * acceleration,
    y: -(object.vy / speed) * acceleration,
    strength: acceleration,
    density
  };
}

function resolveSurfaceContact(rocket, planet) {
  const altitude = getAltitude(rocket, planet);
  if (altitude > 0) return;

  const speed = getSpeed(rocket);
  const contact = getRocketSurfaceContact(rocket, planet);
  const nx = contact.normalX;
  const ny = contact.normalY;
  const safeTouchdownSpeed = rocket.landingLegsDeployed ? PHYSICS.landingSafeSpeedLegs : PHYSICS.landingSafeSpeedBare;
  const upright = getUprightAngleError(rocket, planet) <= PHYSICS.landingUprightAngle;
  const safeTouchdown = speed < safeTouchdownSpeed && upright && !rocket.missionComplete;

  // Push the active rocket out of the planet by the exact hitbox penetration amount.
  // This lets each part, rather than one large invisible circle, interact with the ground.
  const penetration = Math.max(0, -contact.clearance);
  rocket.x += nx * penetration;
  rocket.y += ny * penetration;

  if (safeTouchdown) {
    rocket.landed = true;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.orbitHoldTime = 0;
    rocket.lastStageMessage = rocket.landingLegsDeployed ? "Touchdown: rocket recovered on landing legs." : "Touchdown: soft landing.";
  } else {
    rocket.crashed = true;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.lastStageMessage = rocket.landingLegsDeployed ? "Touchdown too hard or tilted. Rocket lost." : "Rocket crashed. Add legs or slow down more.";
  }
}

export function getOrbitStatus(rocket, planet = PLANET) {
  if (rocket.crashed) return "Crashed";
  if (rocket.payloadsOnline > 0) return "Payload online";
  if (rocket.missionComplete) return "Orbit achieved";
  if (rocket.landed) return "Ready on pad";
  if (rocket.parachuteState === "deployed") return "Chute deployed";
  if (rocket.parachuteState === "failed") return "Chute failed";

  const altitude = getAltitude(rocket, planet);
  const speed = getSpeed(rocket);
  const radialVelocity = getRadialVelocity(rocket, planet);
  const tangentialSpeed = getTangentialSpeed(rocket, planet);
  const circularSpeed = getCircularOrbitSpeed(rocket, planet);
  const escapeSpeed = getEscapeSpeed(rocket, planet);

  if (altitude < 0) return "Impact";
  if (altitude < planet.atmosphereHeight && radialVelocity < -8) return "Descending";
  if (altitude < planet.atmosphereHeight) return "Climbing through atmosphere";
  if (speed > escapeSpeed * 0.98 && radialVelocity > 10) return "Escaping";
  if (tangentialSpeed > circularSpeed * 0.9 && Math.abs(radialVelocity) < 23) return "Stable orbit likely";
  if (tangentialSpeed > circularSpeed * 0.68) return "Almost orbital";
  return "Suborbital arc";
}

function updateOrbitMission(rocket, dt, planet) {
  if (rocket.payloadsOnline > 0) {
    rocket.missionComplete = true;
    return;
  }

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

export function activateNextStage(rocket, planet = PLANET) {
  if (rocket.crashed) return { message: "Cannot stage after a crash.", objects: [] };
  recalculateRocketStats(rocket);

  const activeParts = getActiveParts(rocket);
  const stageNumber = rocket.nextStage ?? 1;
  if (stageNumber > (rocket.maxStage ?? 0)) {
    const message = "No more stages assigned.";
    rocket.lastStageMessage = message;
    return { message, objects: [] };
  }

  const stagedParts = activeParts.filter((part) => part.stage === stageNumber);
  const objects = [];
  const messages = [];

  if (!stagedParts.length) {
    messages.push(`Stage ${stageNumber}: no assigned parts.`);
  }

  // Decouplers first, because they remove lower active sections.
  const decouplers = activeParts.filter((part) => part.stage === stageNumber && part.stageAction === "decoupleBelow");
  decouplers.forEach((decoupler) => {
    const currentParts = getActiveParts(rocket);
    const index = currentParts.findIndex((part) => part.instanceId === decoupler.instanceId);
    if (index < 0) return;
    const detached = currentParts.slice(index);
    detached.forEach((part) => {
      part.active = false;
      part.detached = true;
    });
    const object = makeDetachedObject("booster", detached, rocket, planet, `Stage ${stageNumber} booster`);
    objects.push(object);
    messages.push(`Stage ${stageNumber}: booster separated.`);
  });

  // Refresh after possible decoupling.
  getActiveParts(rocket)
    .filter((part) => part.stage === stageNumber && part.stageAction === "deployPayload")
    .forEach((part) => {
      part.active = false;
      part.deployed = true;
      const stable = isStableEnoughForPayload(rocket, planet);
      const object = makeDetachedObject(part.type, [part], rocket, planet, part.shortName ?? part.name);
      object.kind = "payload";
      object.online = stable;
      object.status = stable ? "online" : "drifting";
      objects.push(object);
      if (stable) {
        rocket.payloadsOnline = (rocket.payloadsOnline ?? 0) + 1;
        rocket.missionComplete = true;
        messages.push(`Stage ${stageNumber}: ${part.shortName ?? part.name} deployed and online.`);
      } else {
        messages.push(`Stage ${stageNumber}: ${part.shortName ?? part.name} deployed, but orbit is not stable yet.`);
      }
    });

  getActiveParts(rocket)
    .filter((part) => part.stage === stageNumber && part.stageAction === "deployParachute")
    .forEach((part) => {
      const speed = getSpeed(rocket);
      const density = getAtmosphereDensity(rocket, planet);
      const safeSpeed = part.safeDeploySpeed ?? PHYSICS.parachuteSafeDeploySpeed;
      if (density <= 0) {
        rocket.parachuteState = "packed";
        messages.push(`Stage ${stageNumber}: parachute armed, but there is no air here.`);
      } else if (speed > safeSpeed) {
        rocket.parachuteState = "failed";
        part.active = false;
        messages.push(`Stage ${stageNumber}: parachute ripped off. Slow below ${Math.round(safeSpeed)} m/s first.`);
      } else {
        rocket.parachuteState = "deployed";
        part.deployed = true;
        messages.push(`Stage ${stageNumber}: parachute deployed.`);
      }
    });

  getActiveParts(rocket)
    .filter((part) => part.stage === stageNumber && part.stageAction === "deployLegs")
    .forEach((part) => {
      rocket.landingLegsDeployed = true;
      part.deployed = true;
      messages.push(`Stage ${stageNumber}: landing legs deployed.`);
    });

  rocket.nextStage = stageNumber + 1;
  recalculateRocketStats(rocket);

  const message = messages.length ? messages.join(" ") : `Stage ${stageNumber} activated.`;
  rocket.lastStageMessage = message;
  rocket.stageEvents = [...(rocket.stageEvents ?? []), { time: performance.now?.() ?? Date.now(), message }].slice(-6);
  return { message, objects };
}

export function recalculateRocketStats(rocket) {
  if (!Array.isArray(rocket.parts)) return;
  const stats = calculateStatsFromParts(rocket.parts.filter((part) => part.active !== false));
  const previousMaxFuel = Math.max(rocket.maxFuel ?? 0, 0);
  const currentFuel = Math.max(rocket.fuel ?? 0, 0);

  rocket.dryMass = stats.dryMass;
  rocket.maxFuel = stats.fuelCapacity;
  rocket.fuel = Math.min(currentFuel, stats.fuelCapacity);
  if (previousMaxFuel > 0 && rocket.fuel === 0 && currentFuel > 0) {
    rocket.fuel = Math.min(currentFuel, stats.fuelCapacity);
  }
  rocket.thrust = stats.thrust;
  rocket.fuelUse = stats.fuelUse;
  rocket.dragArea = stats.dragArea;
  rocket.frontalArea = stats.frontalArea;
  rocket.collisionRadius = stats.collisionRadius;
  rocket.maxStage = Math.max(rocket.maxStage ?? 0, stats.stageCount);
}

export function predictTrajectory(rocket, planet = PLANET) {
  if (rocket.crashed) return [];

  const speed = getSpeed(rocket);
  if (rocket.landed && speed < 0.1) return [];

  const ghost = {
    ...rocket,
    parts: Array.isArray(rocket.parts) ? rocket.parts.map((part) => ({ ...part })) : rocket.parts,
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
    const drag = getDragVector(ghost, planet, PHYSICS.dragScale);

    ghost.vx += (gravity.x + drag.x) * PHYSICS.trajectoryDt;
    ghost.vy += (gravity.y + drag.y) * PHYSICS.trajectoryDt;
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

function makeDetachedObject(kind, parts, rocket, planet, name) {
  const stats = calculateStatsFromParts(parts.map((part) => ({ ...part, active: true })));
  const distance = getDistanceToPlanet(rocket, planet);
  const nx = (rocket.x - planet.x) / Math.max(distance, 1);
  const ny = (rocket.y - planet.y) / Math.max(distance, 1);
  const sideX = -ny;
  const sideY = nx;
  const separation = kind === "booster" ? -10 : 10;

  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    kind,
    x: rocket.x + sideX * separation,
    y: rocket.y + sideY * separation,
    vx: rocket.vx + sideX * (kind === "booster" ? -2 : 2),
    vy: rocket.vy + sideY * (kind === "booster" ? -2 : 2),
    angle: rocket.angle,
    dryMass: stats.dryMass,
    fuel: 0,
    maxFuel: 0,
    fuelMassPerUnit: rocket.fuelMassPerUnit,
    mass: Math.max(stats.dryMass, 0.25),
    dragArea: stats.dragArea,
    collisionRadius: kind === "booster" ? 14 : 8,
    color: parts[0]?.color ?? "#aab4ca",
    parts: parts.map((part) => ({ ...part })),
    status: kind === "booster" ? "falling" : "drifting",
    crashed: false,
    landed: false
  };
}

function isStableEnoughForPayload(rocket, planet) {
  const altitude = getAltitude(rocket, planet);
  const radialVelocity = Math.abs(getRadialVelocity(rocket, planet));
  const tangentialSpeed = getTangentialSpeed(rocket, planet);
  const circularSpeed = getCircularOrbitSpeed(rocket, planet);
  return altitude > planet.atmosphereHeight && tangentialSpeed > circularSpeed * 0.82 && radialVelocity < 35;
}

function getParachuteDragArea(rocket) {
  return getActiveParts(rocket)
    .filter((part) => part.type === "parachute" && part.deployed)
    .reduce((total, part) => total + (part.deployedDragArea ?? 70), 0);
}

function getUprightAngleError(rocket, planet) {
  const localUp = Math.atan2(rocket.y - planet.y, rocket.x - planet.x);
  return Math.abs(normalizeAngle(rocket.angle - localUp));
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
