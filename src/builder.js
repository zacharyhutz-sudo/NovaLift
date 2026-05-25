import { PLANET, ROCKET } from "./config.js";
import { AVAILABLE_PARTS, getPartById } from "./parts.js";

export const MAX_STACK_PARTS = 12;

export function getStackParts(stack) {
  return stack.map((id) => getPartById(id));
}

export function calculateBuildStats(stack) {
  const parts = getStackParts(stack);
  const cost = sum(parts, "cost");
  const dryMass = sum(parts, "dryMass");
  const fuelCapacity = sum(parts, "fuelCapacity");
  const fuelMass = fuelCapacity * ROCKET.fuelMassPerUnit;
  const launchMass = dryMass + fuelMass;
  const thrust = sum(parts, "thrust");
  const fuelUse = sum(parts, "fuelUse");
  const burnTime = fuelUse > 0 ? fuelCapacity / fuelUse : 0;
  const surfaceGravity = PLANET.mu / Math.pow(PLANET.radius + ROCKET.collisionRadius, 2);
  const twr = launchMass > 0 ? thrust / (launchMass * surfaceGravity) : 0;

  return {
    parts,
    count: parts.length,
    cost,
    dryMass,
    fuelCapacity,
    fuelMass,
    launchMass,
    thrust,
    fuelUse,
    burnTime,
    surfaceGravity,
    twr
  };
}

export function validateBuild(stack) {
  const stats = calculateBuildStats(stack);
  const hasCommand = stats.parts.some((part) => part.type === "command");
  const hasEngine = stats.parts.some((part) => part.type === "engine");
  const hasFuel = stats.fuelCapacity > 0;
  const hasPayload = stats.parts.some((part) => part.type === "payload");
  const engineAtBottom = stats.parts.length > 0 && stats.parts[stats.parts.length - 1].type === "engine";
  const errors = [];
  const warnings = [];

  if (stats.count === 0) errors.push("Add parts to build a rocket.");
  if (!hasCommand) errors.push("Add a command pod.");
  if (!hasEngine) errors.push("Add an engine.");
  if (!hasFuel) errors.push("Add at least one fuel tank.");
  if (stats.count > MAX_STACK_PARTS) errors.push(`Keep this prototype rocket to ${MAX_STACK_PARTS} parts or fewer.`);
  if (hasCommand && hasEngine && hasFuel && stats.twr < 1) {
    errors.push("This rocket is too heavy to lift off. Add thrust or remove mass.");
  }

  if (!hasPayload) warnings.push("No payload attached. It can fly, but future contracts will need payloads.");
  if (hasEngine && !engineAtBottom) warnings.push("Tip: place an engine at the bottom of the stack.");
  if (hasEngine && hasFuel && stats.burnTime < 20) warnings.push("Short burn time. Add fuel for serious orbit attempts.");
  if (stats.twr > 2.6) warnings.push("High TWR. It will launch fast, but it may be harder to control.");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

export function buildRocketFromStack(stack) {
  const validation = validateBuild(stack);
  const stats = validation.stats;
  const parts = stats.parts.map((part) => ({ ...part }));

  return {
    validation,
    rocket: {
      ...ROCKET,
      dryMass: stats.dryMass,
      fuel: stats.fuelCapacity,
      maxFuel: stats.fuelCapacity,
      thrust: stats.thrust,
      fuelUse: stats.fuelUse,
      collisionRadius: Math.max(18, 10 + parts.length * 2),
      parts,
      buildStats: {
        cost: stats.cost,
        partCount: stats.count,
        launchMass: stats.launchMass,
        twr: stats.twr,
        burnTime: stats.burnTime
      }
    }
  };
}

export function formatMoney(value) {
  if (value === Infinity) return "∞";
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatStatNumber(value, decimals = 1) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(decimals);
}

export function getPartTypeLabel(type) {
  return {
    payload: "Payload",
    command: "Command",
    fuel: "Fuel",
    engine: "Engine"
  }[type] ?? type;
}

export { AVAILABLE_PARTS };

function sum(parts, key) {
  return parts.reduce((total, part) => total + (part[key] ?? 0), 0);
}
