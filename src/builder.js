import { PLANET, ROCKET } from "./config.js";
import { AVAILABLE_PARTS, STAGE_MAX, STAGE_MIN, getPartById } from "./parts.js";

export const MAX_STACK_PARTS = 18;

export function normalizeStack(stack) {
  return stack.map((entry) => {
    if (typeof entry === "string") return { id: entry, stage: 0 };
    return {
      id: entry.id,
      stage: clampStage(entry.stage ?? 0)
    };
  });
}

export function getStackParts(stack) {
  return normalizeStack(stack).map((entry, index) => ({
    ...getPartById(entry.id),
    stage: clampStage(entry.stage),
    stackIndex: index,
    active: true
  }));
}

export function calculateBuildStats(stack) {
  const parts = getStackParts(stack);
  return calculateStatsFromParts(parts);
}

export function calculateStatsFromParts(parts) {
  const activeParts = parts.filter((part) => part.active !== false);
  const cost = sum(activeParts, "cost");
  const dryMass = sum(activeParts, "dryMass");
  const fuelCapacity = sum(activeParts, "fuelCapacity");
  const fuelMass = fuelCapacity * ROCKET.fuelMassPerUnit;
  const launchMass = dryMass + fuelMass;
  const thrust = sum(activeParts.filter((part) => part.type === "engine"), "thrust");
  const fuelUse = sum(activeParts.filter((part) => part.type === "engine"), "fuelUse");
  const burnTime = fuelUse > 0 ? fuelCapacity / fuelUse : 0;
  const surfaceGravity = PLANET.mu / Math.pow(PLANET.radius + ROCKET.collisionRadius, 2);
  const twr = launchMass > 0 ? thrust / (launchMass * surfaceGravity) : 0;
  const stageCount = activeParts.reduce((max, part) => Math.max(max, part.stage ?? 0), 0);
  const dragArea = calculateDragArea(activeParts);
  const frontalArea = activeParts.reduce((max, part) => Math.max(max, part.width ?? 1), 1);

  return {
    parts: activeParts,
    count: activeParts.length,
    cost,
    dryMass,
    fuelCapacity,
    fuelMass,
    launchMass,
    thrust,
    fuelUse,
    burnTime,
    surfaceGravity,
    twr,
    dragArea,
    frontalArea,
    stageCount
  };
}

export function validateBuild(stack) {
  const stats = calculateBuildStats(stack);
  const hasCommand = stats.parts.some((part) => part.type === "command");
  const hasEngine = stats.parts.some((part) => part.type === "engine");
  const hasFuel = stats.fuelCapacity > 0;
  const hasPayload = stats.parts.some((part) => part.type === "payload");
  const hasDecoupler = stats.parts.some((part) => part.type === "decoupler");
  const hasParachute = stats.parts.some((part) => part.type === "parachute");
  const hasLegs = stats.parts.some((part) => part.type === "legs");
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

  if (!hasPayload) warnings.push("No payload attached. Add a satellite or data center for deployment tests.");
  if (hasPayload && !hasDecoupler) warnings.push("Payload attached, but no decoupler. Add one so the upper craft can separate from the booster.");
  if (hasEngine && !engineAtBottom) warnings.push("Tip: place a launch engine at the bottom of the stack.");
  if (hasEngine && hasFuel && stats.burnTime < 20) warnings.push("Short burn time. Add fuel for serious orbit attempts.");
  if (stats.dragArea > 4.4) warnings.push("High drag. Nose cones and narrow stacks help in atmosphere.");
  if (!hasParachute) warnings.push("No parachute. Safe recovery will be difficult.");
  if (!hasLegs) warnings.push("No landing legs. Touchdown tolerance will be very low.");
  if (stats.stageCount === 0) warnings.push("No staged parts. Add a decoupler, parachute, legs, or payload stage to use the Stage button.");
  if (stats.twr > 2.6) warnings.push("High TWR. It will launch fast, but may be harder to control.");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

export function buildRocketFromStack(stack) {
  const normalized = normalizeStack(stack);
  const validation = validateBuild(normalized);
  const stats = validation.stats;
  const parts = stats.parts.map((part, index) => ({
    ...part,
    instanceId: `${part.id}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    active: true,
    deployed: false
  }));

  return {
    validation,
    rocket: {
      ...ROCKET,
      dryMass: stats.dryMass,
      fuel: stats.fuelCapacity,
      maxFuel: stats.fuelCapacity,
      thrust: stats.thrust,
      fuelUse: stats.fuelUse,
      dragArea: stats.dragArea,
      frontalArea: stats.frontalArea,
      collisionRadius: Math.max(18, 10 + parts.length * 2),
      parts,
      nextStage: 1,
      maxStage: stats.stageCount,
      parachuteState: "packed",
      landingLegsDeployed: false,
      lastStageMessage: "Stage system ready.",
      payloadsOnline: 0,
      buildStats: {
        cost: stats.cost,
        partCount: stats.count,
        launchMass: stats.launchMass,
        twr: stats.twr,
        burnTime: stats.burnTime,
        dragArea: stats.dragArea,
        stageCount: stats.stageCount
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
    aero: "Aero",
    parachute: "Recovery",
    legs: "Landing",
    decoupler: "Stage",
    fuel: "Fuel",
    engine: "Engine"
  }[type] ?? type;
}

export function getStageLabel(stage) {
  return stage === 0 ? "Flight" : `Stage ${stage}`;
}

export function clampStage(stage) {
  const numeric = Number(stage);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(STAGE_MIN, Math.min(STAGE_MAX, Math.round(numeric)));
}

export function calculateDragArea(parts) {
  if (!parts.length) return 0.4;

  let drag = 0.65;
  let maxWidth = 1;
  parts.forEach((part) => {
    drag += part.dragArea ?? 0.55;
    maxWidth = Math.max(maxWidth, part.width ?? 1);
  });

  const firstActive = parts[0];
  if (firstActive && firstActive.type !== "aero" && firstActive.type !== "command") drag += 0.85;
  drag += Math.max(0, maxWidth - 1) * 1.2;

  return Math.max(0.35, drag);
}

export { AVAILABLE_PARTS };

function sum(parts, key) {
  return parts.reduce((total, part) => total + (part[key] ?? 0), 0);
}
