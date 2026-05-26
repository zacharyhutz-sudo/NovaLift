import { PLANET, PHYSICS } from "./config.js";
import { calculateStatsFromParts } from "./builder.js";
import { getRocketSurfaceContact } from "./dimensions.js";

export function cloneRocket(template) {
  return {
    ...template,
    angularVelocity: Number(template.angularVelocity ?? 0),
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


function getPartStage(part) {
  const stage = Number(part?.stage ?? 0);
  return Number.isFinite(stage) ? Math.max(0, Math.round(stage)) : 0;
}

function isEngineIgnited(part) {
  if (!part || part.type !== "engine" || part.active === false) return false;
  return getPartStage(part) === 0 || part.engineIgnited === true;
}

function getPartFuelRemaining(part) {
  if (!part || part.type !== "fuel") return 0;
  if (typeof part.fuelRemaining !== "number") part.fuelRemaining = part.fuelCapacity ?? 0;
  if (typeof part.maxFuelPart !== "number") part.maxFuelPart = part.fuelCapacity ?? 0;
  return Math.max(0, part.fuelRemaining ?? 0);
}

function getActiveFuelParts(rocket) {
  return getActiveParts(rocket).filter((part) => part.type === "fuel");
}

function getStageFuelParts(rocket, stage) {
  return getActiveFuelParts(rocket).filter((part) => getPartStage(part) === stage);
}

function getRemainingFuel(rocket) {
  return getActiveFuelParts(rocket).reduce((total, part) => total + getPartFuelRemaining(part), 0);
}

function getMaxFuelForActiveParts(rocket) {
  return getActiveFuelParts(rocket).reduce((total, part) => total + (part.maxFuelPart ?? part.fuelCapacity ?? 0), 0);
}

function getFueledEngineGroups(rocket) {
  const activeParts = getActiveParts(rocket);
  const engines = activeParts.filter(isEngineIgnited);
  const byStage = new Map();

  engines.forEach((engine) => {
    const stage = getPartStage(engine);
    if (!byStage.has(stage)) {
      byStage.set(stage, { stage, engines: [], fuelParts: [], availableFuel: 0, maxFuel: 0, thrust: 0, fuelUse: 0 });
    }
    byStage.get(stage).engines.push(engine);
  });

  byStage.forEach((group, stage) => {
    group.fuelParts = getStageFuelParts(rocket, stage);
    group.availableFuel = group.fuelParts.reduce((total, part) => total + getPartFuelRemaining(part), 0);
    group.maxFuel = group.fuelParts.reduce((total, part) => total + (part.maxFuelPart ?? part.fuelCapacity ?? 0), 0);
    if (group.availableFuel > 0) {
      group.thrust = group.engines.reduce((total, engine) => total + (engine.thrust ?? 0), 0);
      group.fuelUse = group.engines.reduce((total, engine) => total + (engine.fuelUse ?? 0), 0);
    }
  });

  const groups = [...byStage.values()].filter((group) => group.thrust > 0 && group.fuelUse > 0 && group.availableFuel > 0);
  return {
    groups,
    totalThrust: groups.reduce((total, group) => total + group.thrust, 0),
    totalFuelUse: groups.reduce((total, group) => total + group.fuelUse, 0)
  };
}

function consumeFuelFromStage(rocket, stage, amount) {
  let remaining = Math.max(0, amount);
  const fuelParts = getStageFuelParts(rocket, stage).filter((part) => getPartFuelRemaining(part) > 0);
  for (const part of fuelParts) {
    if (remaining <= 0) break;
    const available = getPartFuelRemaining(part);
    const used = Math.min(available, remaining);
    part.fuelRemaining = available - used;
    remaining -= used;
  }
  return amount - remaining;
}

export function getStageFuelSummary(rocket) {
  if (!rocket || !Array.isArray(rocket.parts)) return [];
  const stageMap = new Map();
  getActiveFuelParts(rocket).forEach((part) => {
    const stage = getPartStage(part);
    if (!stageMap.has(stage)) stageMap.set(stage, { stage, current: 0, max: 0, engineActive: false, engineCount: 0 });
    const entry = stageMap.get(stage);
    entry.current += getPartFuelRemaining(part);
    entry.max += part.maxFuelPart ?? part.fuelCapacity ?? 0;
  });
  getActiveParts(rocket)
    .filter((part) => part.type === "engine")
    .forEach((engine) => {
      const stage = getPartStage(engine);
      if (!stageMap.has(stage)) stageMap.set(stage, { stage, current: 0, max: 0, engineActive: false, engineCount: 0 });
      const entry = stageMap.get(stage);
      entry.engineCount += 1;
      entry.engineActive = entry.engineActive || isEngineIgnited(engine);
    });

  return [...stageMap.values()]
    .sort((a, b) => a.stage - b.stage)
    .map((entry) => ({
      ...entry,
      label: entry.stage === 0 ? "Flight" : `Stage ${entry.stage}`,
      percent: entry.max > 0 ? (entry.current / entry.max) * 100 : 0
    }));
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
  if (speed <= 0.001 || density <= 0) return { x: 0, y: 0, strength: 0, density, effectiveArea: 0, angleOfAttack: 0 };

  const velocityAngle = Math.atan2(rocket.vy ?? 0, rocket.vx ?? 0);
  const bodyAngle = rocket.angle ?? velocityAngle;
  const angleOfAttack = normalizeAngle(velocityAngle - bodyAngle);
  const crossflow = Math.abs(Math.sin(angleOfAttack));
  const aligned = Math.abs(Math.cos(angleOfAttack));
  const baseArea = Math.max(0.1, rocket.dragArea ?? 1);
  const frontalArea = Math.max(0.45, rocket.frontalArea ?? 1);
  const sideArea = Math.max(frontalArea, (rocket.collisionRadius ?? 80) / 42);
  const projectedArea = frontalArea * (0.75 + aligned * 0.42) + sideArea * crossflow * 1.45;
  const effectiveArea = Math.max(0.12, baseArea + projectedArea);

  const bodyForce = density * speed * speed * effectiveArea * scale;
  const chuteArea = rocket.parachuteState === "deployed" && density >= (PHYSICS.parachuteMinEffectiveDensity ?? 0)
    ? getParachuteDragArea(rocket)
    : 0;
  const chuteForce = density * speed * speed * chuteArea * (PHYSICS.parachuteDragScale ?? scale);

  let acceleration = (bodyForce + chuteForce) / mass;
  acceleration = Math.min(acceleration, PHYSICS.maxDragAcceleration ?? acceleration);

  // Avoid numerical overshoot where drag reverses the velocity in one fixed step.
  const maxStableAccel = speed * 0.82 / PHYSICS.fixedDt;
  acceleration = Math.min(acceleration, maxStableAccel);

  return {
    x: -(rocket.vx / speed) * acceleration,
    y: -(rocket.vy / speed) * acceleration,
    strength: acceleration,
    density,
    effectiveArea,
    angleOfAttack
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

export function getOrbitAnalysis(object, planet = PLANET) {
  const rx = object.x - planet.x;
  const ry = object.y - planet.y;
  const r = Math.max(Math.sqrt(rx * rx + ry * ry), 1);
  const vx = object.vx ?? 0;
  const vy = object.vy ?? 0;
  const v2 = vx * vx + vy * vy;
  const h = rx * vy - ry * vx;
  const mu = planet.mu;
  const energy = v2 / 2 - mu / r;
  const altitude = r - planet.radius - (object.collisionRadius ?? 0);
  const tangentialSpeed = Math.abs(h) / r;
  const circularSpeed = Math.sqrt(mu / r);

  if (!Number.isFinite(energy) || !Number.isFinite(h) || Math.abs(h) < 0.001) {
    return {
      altitude,
      bound: false,
      escaping: false,
      periapsisAltitude: -Infinity,
      apoapsisAltitude: Infinity,
      tangentialSpeed,
      circularSpeed,
      reason: "trajectory is too vertical"
    };
  }

  if (energy >= 0) {
    return {
      altitude,
      bound: false,
      escaping: true,
      periapsisAltitude: (h * h / mu) / (1 + Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu * mu)))) - planet.radius,
      apoapsisAltitude: Infinity,
      tangentialSpeed,
      circularSpeed,
      reason: "escape trajectory"
    };
  }

  const a = -mu / (2 * energy);
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu * mu)));
  const periapsisAltitude = a * (1 - eccentricity) - planet.radius;
  const apoapsisAltitude = a * (1 + eccentricity) - planet.radius;

  return {
    altitude,
    bound: true,
    escaping: false,
    semiMajorAxis: a,
    eccentricity,
    periapsisAltitude,
    apoapsisAltitude,
    tangentialSpeed,
    circularSpeed,
    reason: "bound orbit"
  };
}

export function rotateRocket(rocket, direction, dt) {
  if (rocket.crashed) {
    rocket.angularVelocity = 0;
    return;
  }

  const input = Math.max(-1, Math.min(1, Number(direction) || 0));
  const acceleration = PHYSICS.angularAcceleration ?? Math.max(rocket.rotateSpeed ?? 0.45, 0.1) * 3;
  const damping = PHYSICS.angularDamping ?? 2.2;
  const maxVelocity = PHYSICS.maxAngularVelocity ?? Math.max(rocket.rotateSpeed ?? 0.45, 0.1) * 1.8;
  let angularVelocity = Number(rocket.angularVelocity ?? 0);

  if (input !== 0) {
    angularVelocity += input * acceleration * dt;
  }

  angularVelocity *= Math.exp(-damping * dt);

  if (Math.abs(angularVelocity) < 0.002 && input === 0) angularVelocity = 0;
  angularVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, angularVelocity));

  rocket.angularVelocity = angularVelocity;
  rocket.angle += angularVelocity * dt;
}

export function stepRocket(rocket, input, dt, planet = PLANET) {
  if (rocket.crashed) return;
  recalculateRocketStats(rocket);

  let engineInfo = getFueledEngineGroups(rocket);

  if (rocket.landed) {
    const thrusting = input.thrusting && engineInfo.totalThrust > 0;
    const mass = getRocketMass(rocket);
    const gravity = getGravityVector(rocket, planet);
    const thrustAcceleration = engineInfo.totalThrust / mass;

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

  if (input.thrusting) {
    engineInfo = getFueledEngineGroups(rocket);
    const mass = getRocketMass(rocket);
    let effectiveThrust = 0;

    engineInfo.groups.forEach((group) => {
      const desiredFuel = group.fuelUse * dt;
      const fuelUsed = consumeFuelFromStage(rocket, group.stage, desiredFuel);
      const fuelRatio = desiredFuel > 0 ? fuelUsed / desiredFuel : 0;
      effectiveThrust += group.thrust * fuelRatio;
    });

    if (effectiveThrust > 0) {
      const thrustAcceleration = effectiveThrust / mass;
      rocket.vx += Math.cos(rocket.angle) * thrustAcceleration * dt;
      rocket.vy += Math.sin(rocket.angle) * thrustAcceleration * dt;
    }

    recalculateRocketStats(rocket);
  }

  const drag = getDragVector(rocket, planet, PHYSICS.dragScale);
  rocket.lastDrag = drag;
  rocket.lastDensity = drag.density;
  rocket.vx += drag.x * dt;
  rocket.vy += drag.y * dt;

  stabilizeUnderParachute(rocket, planet, dt);

  rocket.x += rocket.vx * dt;
  rocket.y += rocket.vy * dt;

  resolveSurfaceContact(rocket, planet);
  updateOrbitMission(rocket, dt, planet);
}

export function stepDetachedObject(object, dt, planet = PLANET) {
  if (object.exploded || object.crashed || object.landed) return;

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
    object.online = false;
    object.status = "crashed";
    return;
  }

  updateDetachedObjectStatus(object, planet);
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
  const legContact = contact.part?.type === "legs" && rocket.landingLegsDeployed;
  const safeTouchdownSpeed = legContact ? PHYSICS.landingSafeSpeedLegs : PHYSICS.landingSafeSpeedBare;
  const upright = getUprightAngleError(rocket, planet) <= PHYSICS.landingUprightAngle;
  const safeTouchdown = speed < safeTouchdownSpeed && upright;

  // Push the active rocket out of the planet by the exact hitbox penetration amount.
  // This lets each part, rather than one large invisible circle, interact with the ground.
  const penetration = Math.max(0, -contact.clearance);
  rocket.x += nx * penetration;
  rocket.y += ny * penetration;

  if (safeTouchdown) {
    rocket.landed = true;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angularVelocity = 0;
    rocket.orbitHoldTime = 0;
    rocket.lastStageMessage = rocket.landingLegsDeployed ? "Touchdown: rocket recovered on landing legs." : "Touchdown: soft landing.";
  } else {
    rocket.crashed = true;
    rocket.vx = 0;
    rocket.vy = 0;
    rocket.angularVelocity = 0;
    rocket.lastStageMessage = rocket.landingLegsDeployed ? "Touchdown too hard or tilted. Rocket lost." : "Rocket crashed. Add legs or slow down more.";
  }
}

export function getOrbitStatus(rocket, planet = PLANET) {
  if (rocket.crashed) return "Crashed";
  if (rocket.payloadsOnline > 0) return "Payload online";
  if (rocket.missionComplete) return "Orbit achieved";
  if (rocket.landed) return "Ready on pad";
  if (rocket.parachuteState === "deployed") {
    const recoveryLimit = rocket.landingLegsDeployed ? PHYSICS.landingSafeSpeedLegs : PHYSICS.landingSafeSpeedBare;
    if (getSpeed(rocket) <= recoveryLimit * 1.2 && getAltitude(rocket, planet) < planet.atmosphereHeight) return "Descent safe";
    return "Chute deployed";
  }
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


export function getNextStageDescription(rocket) {
  if (rocket?.crashed) return "No stages available after crash";
  if (!rocket || !Array.isArray(rocket.parts)) return "No stages assigned";

  const stageNumber = rocket.nextStage ?? 1;
  const maxStage = rocket.maxStage ?? 0;
  if (stageNumber > maxStage) return "No stages remaining";

  const activeParts = getActiveParts(rocket);
  const stagedParts = activeParts.filter((part) => part.stage === stageNumber);
  if (!stagedParts.length) return `Stage ${stageNumber}: no assigned parts`;

  const actions = [];
  const hasDecoupler = stagedParts.some((part) => part.stageAction === "decoupleBelow");
  const payloads = stagedParts.filter((part) => part.stageAction === "deployPayload");
  const hasParachute = stagedParts.some((part) => part.stageAction === "deployParachute");
  const hasLegs = stagedParts.some((part) => part.stageAction === "deployLegs");
  const engines = stagedParts.filter((part) => part.type === "engine");

  if (hasDecoupler) actions.push("separate lower stage");
  if (payloads.length) {
    const dataCenters = payloads.filter((part) => part.id?.includes("data_center")).length;
    const satellites = payloads.filter((part) => part.id?.includes("satellite")).length;
    if (dataCenters) actions.push(dataCenters > 1 ? `deploy ${dataCenters} data centers` : "deploy data center");
    if (satellites) actions.push(satellites > 1 ? `deploy ${satellites} satellites` : "deploy satellite");
    if (!dataCenters && !satellites) actions.push(payloads.length > 1 ? `deploy ${payloads.length} payloads` : "deploy payload");
  }
  if (hasParachute) actions.push("deploy parachute");
  if (hasLegs) actions.push("deploy landing legs");
  if (engines.length) actions.push(engines.length > 1 ? "ignite staged engines" : "ignite staged engine");

  if (!actions.length) {
    const labels = stagedParts.map((part) => part.shortName ?? part.name).slice(0, 2).join(" + ");
    actions.push(labels ? `activate ${labels}` : "activate assigned parts");
  }

  return `Stage ${stageNumber}: ${toSentence(actions)}`;
}

function toSentence(items) {
  if (items.length <= 1) return items[0] ?? "nothing";
  if (items.length === 2) return `${items[0]} + ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} + ${items[items.length - 1]}`;
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
    const object = makeDetachedObject("debris", detached, rocket, planet, `Stage ${stageNumber} debris`);
    objects.push(object);
    messages.push(object.kind === "vessel"
      ? `Stage ${stageNumber}: command stage separated and remains tracked.`
      : `Stage ${stageNumber}: lower stage separated and now tracked as debris.`);
  });

  // Refresh after possible decoupling.
  getActiveParts(rocket)
    .filter((part) => part.stage === stageNumber && part.type === "engine")
    .forEach((part) => {
      part.engineIgnited = true;
      messages.push(`Stage ${stageNumber}: ${part.shortName ?? part.name} ignited.`);
    });

  getActiveParts(rocket)
    .filter((part) => part.stage === stageNumber && part.stageAction === "deployPayload")
    .forEach((part) => {
      part.active = false;
      part.deployed = true;
      const object = makeDetachedObject("payload", [part], rocket, planet, part.shortName ?? part.name);
      object.kind = "payload";
      object.payloadType = getPayloadTypeFromParts([part]);
      object.incomeRate = part.incomeRate ?? object.incomeRate ?? 0;
      object.researchRate = part.researchRate ?? object.researchRate ?? 0;
      object.scanRate = part.scanRate ?? object.scanRate ?? 0;
      object.payloadRole = part.payloadRole ?? object.payloadRole ?? object.payloadType;
      updateDetachedObjectStatus(object, planet);
      objects.push(object);
      if (object.online) {
        rocket.payloadsOnline = (rocket.payloadsOnline ?? 0) + 1;
        rocket.missionComplete = true;
        messages.push(`Stage ${stageNumber}: ${part.shortName ?? part.name} deployed and online.`);
      } else {
        messages.push(`Stage ${stageNumber}: ${part.shortName ?? part.name} deployed, but ${object.offlineReason ?? "orbit is not stable yet"}.`);
      }
    });

  getActiveParts(rocket)
    .filter((part) => part.stage === stageNumber && part.stageAction === "deployParachute")
    .forEach((part) => {
      const speed = getSpeed(rocket);
      const density = getAtmosphereDensity(rocket, planet);
      const safeSpeed = part.safeDeploySpeed ?? PHYSICS.parachuteSafeDeploySpeed;
      const ripSpeed = PHYSICS.parachuteRipSpeed ?? safeSpeed;
      if (density <= 0) {
        rocket.parachuteState = "packed";
        messages.push(`Stage ${stageNumber}: parachute armed, but there is no air here.`);
      } else if (speed > ripSpeed) {
        rocket.parachuteState = "failed";
        part.active = false;
        messages.push(`Stage ${stageNumber}: parachute ripped off. Slow below ${Math.round(safeSpeed)} m/s first.`);
      } else {
        rocket.parachuteState = "deployed";
        part.deployed = true;
        messages.push(speed > safeSpeed
          ? `Stage ${stageNumber}: parachute deployed hard. Expect a strong pull.`
          : `Stage ${stageNumber}: parachute deployed.`);
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

  rocket.parts.forEach((part) => {
    if (part.type === "fuel") {
      if (typeof part.maxFuelPart !== "number") part.maxFuelPart = part.fuelCapacity ?? 0;
      if (typeof part.fuelRemaining !== "number") part.fuelRemaining = Math.min(part.maxFuelPart, part.fuelCapacity ?? part.maxFuelPart);
      part.fuelRemaining = Math.max(0, Math.min(part.fuelRemaining, part.maxFuelPart));
    }
    if (part.type === "engine" && typeof part.engineIgnited !== "boolean") {
      part.engineIgnited = getPartStage(part) === 0;
    }
  });

  const activeParts = rocket.parts.filter((part) => part.active !== false);
  const stats = calculateStatsFromParts(activeParts);
  const engineInfo = getFueledEngineGroups(rocket);

  rocket.dryMass = stats.dryMass;
  rocket.maxFuel = getMaxFuelForActiveParts(rocket);
  rocket.fuel = getRemainingFuel(rocket);
  rocket.thrust = engineInfo.totalThrust;
  rocket.fuelUse = engineInfo.totalFuelUse;
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

export function makeDetachedObject(kind, parts, rocket, planet, name) {
  const stats = calculateStatsFromParts(parts.map((part) => ({ ...part, active: true })));
  const hasPayload = parts.some((part) => part.type === "payload" || part.stageAction === "deployPayload");
  const hasCommandPod = parts.some((part) => part.type === "command");
  const payloadType = getPayloadTypeFromParts(parts);
  const actualKind = kind === "payload" || hasPayload ? "payload" : hasCommandPod ? "vessel" : "debris";
  const distance = getDistanceToPlanet(rocket, planet);
  const nx = (rocket.x - planet.x) / Math.max(distance, 1);
  const ny = (rocket.y - planet.y) / Math.max(distance, 1);
  const sideX = -ny;
  const sideY = nx;
  const isDebris = actualKind === "debris";
  const separation = isDebris ? -18 : 18;
  const partCost = parts.reduce((total, part) => total + (part.cost ?? 0), 0);
  const incomeRate = parts.reduce((total, part) => total + (part.incomeRate ?? 0), 0);
  const researchRate = parts.reduce((total, part) => total + (part.researchRate ?? 0), 0);
  const scanRate = parts.reduce((total, part) => total + (part.scanRate ?? 0), 0);
  const payloadRole = parts.find((part) => part.payloadRole)?.payloadRole ?? payloadType;
  const remainingFuel = parts.reduce((total, part) => total + (part.type === "fuel" ? getPartFuelRemaining(part) : 0), 0);
  const maxFuel = parts.reduce((total, part) => total + (part.type === "fuel" ? (part.maxFuelPart ?? part.fuelCapacity ?? 0) : 0), 0);

  return {
    id: `${actualKind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name ?? defaultDetachedName(actualKind, payloadType),
    kind: actualKind,
    payloadType,
    x: rocket.x + sideX * separation,
    y: rocket.y + sideY * separation,
    vx: rocket.vx + sideX * (isDebris ? -2 : 2),
    vy: rocket.vy + sideY * (isDebris ? -2 : 2),
    angle: rocket.angle,
    dryMass: stats.dryMass,
    fuel: remainingFuel,
    maxFuel,
    fuelMassPerUnit: rocket.fuelMassPerUnit,
    mass: Math.max(stats.dryMass + remainingFuel * rocket.fuelMassPerUnit, 0.25),
    dragArea: stats.dragArea,
    collisionRadius: isDebris ? Math.max(14, stats.collisionRadius ?? 14) : 8,
    color: parts[0]?.color ?? "#aab4ca",
    parts: parts.map((part) => ({ ...part, active: part.active !== false })),
    status: actualKind === "debris" ? "falling" : actualKind === "vessel" ? "command pod drifting" : "drifting",
    cost: partCost,
    recoveryValue: partCost * 0.45,
    incomeRate,
    researchRate,
    scanRate,
    payloadRole,
    revenueEarned: 0,
    researchEarned: 0,
    online: false,
    crashed: false,
    landed: false,
    exploded: false
  };
}

export function makeCommandVesselObject(parts, rocket, name = "Command Pod") {
  const object = makeDetachedObject("vessel", parts, rocket, PLANET, name);
  object.kind = "vessel";
  object.payloadType = "";
  object.online = false;
  object.status = "command pod drifting";
  updateDetachedObjectStatus(object, PLANET);
  return object;
}

function getPayloadTypeFromParts(parts) {
  if (!Array.isArray(parts)) return "";
  if (parts.some((part) => part.id?.includes("data_center") || /data/i.test(part.name ?? ""))) return "data_center";
  if (parts.some((part) => part.id?.includes("exploration_satellite") || /exploration/i.test(part.name ?? ""))) return "exploration_satellite";
  if (parts.some((part) => part.id?.includes("satellite") || /satellite/i.test(part.name ?? ""))) return "satellite";
  if (parts.some((part) => part.type === "payload")) return "payload";
  return "";
}

function defaultDetachedName(kind, payloadType) {
  if (kind === "payload" && payloadType === "data_center") return "Orbital Data Center";
  if (kind === "payload" && payloadType === "satellite") return "Small Satellite";
  if (kind === "payload") return "Payload";
  if (kind === "vessel") return "Command Pod";
  return "Orbital Debris";
}

export function updateDetachedObjectStatus(object, planet = PLANET) {
  if (!object || object.exploded) return "destroyed";
  if (object.crashed) {
    object.online = false;
    object.status = "crashed";
    object.offlineReason = "crashed on Homeworld";
    return object.status;
  }

  const evaluation = evaluatePayloadOrbit(object, planet);
  if (object.kind === "payload") {
    object.online = evaluation.online;
    object.offlineReason = evaluation.online ? "" : evaluation.reason;
    object.status = evaluation.online ? "online" : `offline: ${evaluation.reason}`;
  } else if (object.kind === "vessel") {
    object.online = false;
    object.offlineReason = evaluation.reason;
    object.status = evaluation.online ? "command pod in orbit" : evaluation.falling ? "command pod falling" : "command pod drifting";
  } else {
    object.online = false;
    object.offlineReason = evaluation.reason;
    object.status = evaluation.online ? "orbital debris" : evaluation.falling ? "falling" : "drifting";
  }

  return object.status;
}

export function evaluatePayloadOrbit(object, planet = PLANET) {
  const altitude = getAltitude(object, planet);
  const analysis = getOrbitAnalysis(object, planet);
  const atmosphereClearance = planet.atmosphereHeight * 0.82;

  if (altitude <= 0) return { online: false, falling: true, reason: "impact with Homeworld", analysis };
  if (altitude < planet.atmosphereHeight * 0.72) return { online: false, falling: true, reason: "too low in atmosphere", analysis };
  if (analysis.escaping) return { online: false, falling: false, reason: "escape trajectory", analysis };
  if (!analysis.bound) return { online: false, falling: true, reason: analysis.reason ?? "unstable trajectory", analysis };
  if (analysis.periapsisAltitude < atmosphereClearance) {
    return { online: false, falling: true, reason: "orbit dips into atmosphere", analysis };
  }
  if (analysis.tangentialSpeed < analysis.circularSpeed * 0.55) {
    return { online: false, falling: true, reason: "not enough sideways speed", analysis };
  }

  return { online: true, falling: false, reason: "stable orbit", analysis };
}

export function isStableEnoughForPayload(rocket, planet) {
  return evaluatePayloadOrbit(rocket, planet).online;
}

function stabilizeUnderParachute(rocket, planet, dt) {
  if (rocket.parachuteState !== "deployed") return;
  const density = getAtmosphereDensity(rocket, planet);
  if (density <= 0) return;

  const localUp = Math.atan2(rocket.y - planet.y, rocket.x - planet.x);
  const error = normalizeAngle(localUp - rocket.angle);
  const strength = (PHYSICS.parachuteStabilization ?? 1.2) * Math.min(1, density * 2.5);
  rocket.angle += error * strength * dt;
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
