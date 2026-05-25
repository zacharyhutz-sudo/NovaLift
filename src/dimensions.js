export const ROCKET_PART_WORLD_WIDTH = 92;
export const ROCKET_WORLD_LINE = 3;

const TYPE_LENGTHS = {
  payload: 150,
  command: 138,
  aero: 118,
  parachute: 74,
  legs: 82,
  decoupler: 46,
  fuel: 156,
  engine: 128
};

export function getDrawLength(type) {
  return TYPE_LENGTHS[type] ?? 120;
}

export function getPartWorldLength(part) {
  return getDrawLength(part?.type);
}

export function getPartWorldWidth(part) {
  const widthFactor = part?.width ?? 1;
  return Math.max(44, ROCKET_PART_WORLD_WIDTH * widthFactor);
}

export function getRocketHalfLength(parts = []) {
  const activeParts = parts.filter((part) => part?.active !== false);
  if (!activeParts.length) return 64;
  const totalLength = activeParts.reduce((total, part) => total + getPartWorldLength(part), 0);
  return Math.max(64, totalLength / 2);
}

export function getRocketHitboxes(rocket) {
  const parts = Array.isArray(rocket?.parts) ? rocket.parts.filter((part) => part.active !== false) : [];
  if (!parts.length) return [];

  const lengths = parts.map((part) => getPartWorldLength(part));
  const totalLength = lengths.reduce((total, length) => total + length, 0);
  const angle = rocket.angle ?? -Math.PI / 2;
  const axisX = { x: Math.cos(angle), y: Math.sin(angle) };
  const axisY = { x: -Math.sin(angle), y: Math.cos(angle) };
  let cursor = totalLength / 2;

  const hitboxes = parts.map((part, index) => {
    const length = lengths[index];
    const centerLocalX = cursor - length / 2;
    let halfLength = length / 2;
    let halfWidth = getPartWorldWidth(part) / 2;
    cursor -= length;

    // A deployed canopy is drawn separately and does not collide with the ground.
    if (part.type === "parachute" && part.deployed) {
      halfWidth *= 0.72;
    }

    return {
      part,
      center: {
        x: rocket.x + axisX.x * centerLocalX,
        y: rocket.y + axisX.y * centerLocalX
      },
      axisX,
      axisY,
      halfLength,
      halfWidth
    };
  });

  // Landing legs deploy near the lower contact point of the current active vessel,
  // even if the packed legs part is higher in the stack. This makes recovery useful
  // in the simplified vertical builder and keeps the visible legs aligned to contact.
  if (rocket.landingLegsDeployed && parts.some((part) => part.type === "legs" && part.active !== false)) {
    const centerLocalX = -totalLength / 2 - 18;
    hitboxes.push({
      part: { type: "legs", deployed: true, virtual: true, name: "Deployed Landing Legs" },
      center: {
        x: rocket.x + axisX.x * centerLocalX,
        y: rocket.y + axisX.y * centerLocalX
      },
      axisX,
      axisY,
      halfLength: 42,
      halfWidth: ROCKET_PART_WORLD_WIDTH * 1.75
    });
  }

  return hitboxes;
}

export function getRocketSurfaceContact(rocket, planet) {
  const hitboxes = getRocketHitboxes(rocket);
  if (!hitboxes.length) {
    const dx = rocket.x - planet.x;
    const dy = rocket.y - planet.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    return {
      clearance: distance - planet.radius - (rocket.collisionRadius ?? 0),
      normalX: dx / distance,
      normalY: dy / distance,
      part: null
    };
  }

  let best = null;
  for (const hitbox of hitboxes) {
    const closest = getClosestPointOnHitbox(planet.x, planet.y, hitbox);
    const dx = closest.x - planet.x;
    const dy = closest.y - planet.y;
    const distance = Math.max(Math.hypot(dx, dy), 0.0001);
    const clearance = distance - planet.radius;

    if (!best || clearance < best.clearance) {
      best = {
        clearance,
        normalX: dx / distance,
        normalY: dy / distance,
        closest,
        part: hitbox.part
      };
    }
  }

  if (!Number.isFinite(best.normalX) || !Number.isFinite(best.normalY)) {
    const dx = rocket.x - planet.x;
    const dy = rocket.y - planet.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    best.normalX = dx / distance;
    best.normalY = dy / distance;
  }

  return best;
}

function getClosestPointOnHitbox(x, y, hitbox) {
  const dx = x - hitbox.center.x;
  const dy = y - hitbox.center.y;
  const localX = clamp(dx * hitbox.axisX.x + dy * hitbox.axisX.y, -hitbox.halfLength, hitbox.halfLength);
  const localY = clamp(dx * hitbox.axisY.x + dy * hitbox.axisY.y, -hitbox.halfWidth, hitbox.halfWidth);

  return {
    x: hitbox.center.x + hitbox.axisX.x * localX + hitbox.axisY.x * localY,
    y: hitbox.center.y + hitbox.axisX.y * localX + hitbox.axisY.y * localY
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
