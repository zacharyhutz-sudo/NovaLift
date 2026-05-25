export const ROCKET_BODY_HEIGHT = 15;
export const ROCKET_HITBOX_SCALE = 0.35;

export function getDrawLength(type) {
  return {
    payload: 20,
    command: 20,
    aero: 15,
    parachute: 12,
    legs: 12,
    decoupler: 8,
    fuel: 18,
    engine: 16
  }[type] ?? 16;
}

export function getPartWorldLength(part) {
  return getDrawLength(part?.type) * ROCKET_HITBOX_SCALE;
}

export function getRocketHalfLength(parts = []) {
  const activeParts = parts.filter((part) => part?.active !== false);
  if (!activeParts.length) return 18;
  const totalLength = activeParts.reduce((total, part) => total + getPartWorldLength(part), 0);
  return Math.max(18, totalLength / 2);
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

  return parts.map((part, index) => {
    const length = lengths[index];
    const centerLocalX = cursor - length / 2;
    const halfLength = length / 2;
    const halfWidth = Math.max(2.4, (ROCKET_BODY_HEIGHT * (part.width ?? 1) * ROCKET_HITBOX_SCALE) / 2);
    cursor -= length;

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
