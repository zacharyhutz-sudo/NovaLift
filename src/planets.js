export const PLANET_DISCOVERY_VERSION = "v0.9.8-colony-payload-pass";
export const COLONY_VERSION = "v0.9.8-staged-colonies";

export const PLANET_SCAN_TARGETS = [500, 1200, 2500];
export const INFINITE_TEST_RESOURCE_AMOUNT = 999999999;

export const PLANETS = [
  {
    id: "homeworld",
    name: "Homeworld",
    classification: "Home planet",
    scanRequired: 0,
    distanceLabel: "Home",
    gravityLabel: "1.00g",
    atmosphereLabel: "Thick",
    mineralsLabel: "Moderate",
    habitabilityLabel: "High",
    description: "Company headquarters and launch operations.",
    physical: {
      x: 0,
      y: 0,
      radius: 62500,
      atmosphereHeight: 18500,
      surfaceDensity: 1,
      mu: 56250000000,
      color: "#2bb6a8",
      landColor: "#2bb6a8",
      atmosphereColor: "rgba(94, 234, 212, 0.13)"
    }
  },
  {
    id: "brim",
    name: "Brim",
    classification: "Rocky planet",
    scanRequired: 500,
    distanceLabel: "Near",
    gravityLabel: "0.72g",
    atmosphereLabel: "Thin",
    mineralsLabel: "High",
    habitabilityLabel: "Low",
    description: "A mineral-rich rocky world. Best first target for robotic mining.",
    colony: {
      role: "Mining Outpost",
      summary: "Mineral-rich outposts generate strong cash and useful Scan telemetry.",
      baseOutput: { cash: 28, research: 0.018, scan: 0.08 }
    },
    physical: {
      x: 420000,
      y: -230000,
      radius: 28500,
      atmosphereHeight: 6200,
      surfaceDensity: 0.32,
      mu: 8427240000,
      color: "#c26945",
      landColor: "#c26945",
      atmosphereColor: "rgba(251, 146, 60, 0.09)"
    }
  },
  {
    id: "auralis",
    name: "Auralis",
    classification: "Cold moon",
    scanRequired: 1200,
    distanceLabel: "Medium",
    gravityLabel: "0.38g",
    atmosphereLabel: "Trace",
    mineralsLabel: "Medium",
    habitabilityLabel: "Very low",
    description: "A low-gravity icy moon that should be easier to land on.",
    colony: {
      role: "Ice Lab",
      summary: "Low gravity makes Auralis ideal for research stations and cheap expansion.",
      baseOutput: { cash: 16, research: 0.045, scan: 0.05 }
    },
    physical: {
      x: -520000,
      y: -310000,
      radius: 20500,
      atmosphereHeight: 2600,
      surfaceDensity: 0.08,
      mu: 2304246000,
      color: "#93c5fd",
      landColor: "#93c5fd",
      atmosphereColor: "rgba(147, 197, 253, 0.08)"
    }
  },
  {
    id: "vestae",
    name: "Vestae",
    classification: "Desert world",
    scanRequired: 2500,
    distanceLabel: "Far",
    gravityLabel: "0.94g",
    atmosphereLabel: "Harsh",
    mineralsLabel: "Very high",
    habitabilityLabel: "Very low",
    description: "A difficult but valuable future mining and terraforming target.",
    colony: {
      role: "Industrial Foothold",
      summary: "Harsh conditions are expensive, but Vestae can become a huge industrial engine.",
      baseOutput: { cash: 46, research: 0.024, scan: 0.11 }
    },
    physical: {
      x: 760000,
      y: 360000,
      radius: 36000,
      atmosphereHeight: 15000,
      surfaceDensity: 1.18,
      mu: 17540928000,
      color: "#d97706",
      landColor: "#d97706",
      atmosphereColor: "rgba(252, 211, 77, 0.10)"
    }
  }
];

export const COLONY_TIERS = [
  {
    level: 1,
    name: "Robotic Lander",
    cost: { cash: 1200000, research: 110, scan: 450 },
    outputMultiplier: 0.45,
    requiredResearch: "robotic_landers",
    requiredPayloadType: "robotic_lander",
    missionName: "Deliver robotic lander",
    missionDescription: "Send a lander payload to prove the planet can support surface operations."
  },
  {
    level: 2,
    name: "Powered Outpost",
    cost: { cash: 2800000, research: 220, scan: 900 },
    outputMultiplier: 1.2,
    requiredResearch: "surface_power_systems",
    requiredPayloadType: "power_module",
    missionName: "Deliver power module",
    missionDescription: "Add solar arrays and batteries so the outpost can produce consistently."
  },
  {
    level: 3,
    name: "Mining Site",
    cost: { cash: 6500000, research: 420, scan: 1800 },
    outputMultiplier: 2.8,
    requiredResearch: "offworld_mining",
    requiredPayloadType: "mining_rig",
    missionName: "Deliver mining rig",
    missionDescription: "Install automated drills and processing gear to turn the site into a useful asset."
  },
  {
    level: 4,
    name: "Starter Colony",
    cost: { cash: 15000000, research: 780, scan: 3600 },
    outputMultiplier: 5.4,
    requiredResearch: "habitat_modules",
    requiredPayloadType: "habitat_module",
    missionName: "Deliver habitat module",
    missionDescription: "Deliver pressurized crew prep hardware for the first long-term colony charter."
  }
];

export const COLONY_PAYLOAD_TYPES = new Set(COLONY_TIERS.map((tier) => tier.requiredPayloadType).filter(Boolean));

const PLANET_IDS = new Set(PLANETS.map((planet) => planet.id));
const COLONIZABLE_PLANET_IDS = new Set(PLANETS.filter((planet) => planet.id !== "homeworld" && planet.colony).map((planet) => planet.id));
const MAX_SCAN_REQUIRED = Math.max(...PLANETS.map((planet) => Number(planet.scanRequired ?? 0)));

export function hasInfiniteTestResources(company = {}) {
  return Boolean(company.testResourcesEnabled);
}

export function hasCostBypass(company = {}) {
  return Boolean(company.mode === "sandbox" || company.testResourcesEnabled);
}

export function getEffectiveResearchPoints(company = {}) {
  return hasInfiniteTestResources(company) ? INFINITE_TEST_RESOURCE_AMOUNT : Number(company.researchPoints ?? 0);
}

export function getEffectiveSpendableScan(company = {}) {
  return hasInfiniteTestResources(company) ? INFINITE_TEST_RESOURCE_AMOUNT : Number(company.scanPoints ?? 0);
}

export function getEffectiveScanTotal(company = {}) {
  return hasInfiniteTestResources(company) ? Math.max(MAX_SCAN_REQUIRED, INFINITE_TEST_RESOURCE_AMOUNT) : Number(company.totalScanGenerated ?? company.scanPoints ?? 0);
}

export function normalizePlanetState(discovered = []) {
  if (Array.isArray(discovered)) {
    return [...new Set(discovered.filter((id) => PLANET_IDS.has(id) && id !== "homeworld"))];
  }
  if (discovered && typeof discovered === "object") {
    return Object.entries(discovered)
      .filter(([id, value]) => PLANET_IDS.has(id) && id !== "homeworld" && Boolean(value))
      .map(([id]) => id);
  }
  return [];
}

export function normalizeColonyState(colonies = {}) {
  const normalized = {};
  const entries = Array.isArray(colonies)
    ? colonies.map((colony) => [colony?.planetId, colony])
    : Object.entries(colonies ?? {});

  for (const [planetId, raw] of entries) {
    if (!COLONIZABLE_PLANET_IDS.has(planetId)) continue;
    const tier = getColonyTier(Number(raw?.level ?? raw ?? 0));
    if (!tier) continue;
    normalized[planetId] = {
      planetId,
      level: tier.level,
      foundedAt: Number(raw?.foundedAt ?? Date.now()),
      lastUpgradedAt: Number(raw?.lastUpgradedAt ?? raw?.foundedAt ?? Date.now())
    };
  }

  return normalized;
}

export function normalizeColonyDeliveryState(deliveries = {}) {
  const normalized = {};
  for (const [planetId, raw] of Object.entries(deliveries ?? {})) {
    if (!COLONIZABLE_PLANET_IDS.has(planetId) || !raw || typeof raw !== "object") continue;
    const planetDeliveries = {};
    for (const payloadType of COLONY_PAYLOAD_TYPES) {
      const count = Math.max(0, Math.floor(Number(raw[payloadType] ?? 0)));
      if (count > 0) planetDeliveries[payloadType] = count;
    }
    if (Object.keys(planetDeliveries).length) normalized[planetId] = planetDeliveries;
  }
  return normalized;
}

export function getDiscoveredPlanetSet(company = {}) {
  return new Set(["homeworld", ...normalizePlanetState(company.discoveredPlanets)]);
}

export function processPlanetDiscovery(company = {}) {
  const scanTotal = getEffectiveScanTotal(company);
  const discovered = new Set(normalizePlanetState(company.discoveredPlanets));
  const newlyDiscovered = [];

  for (const planet of PLANETS) {
    if (planet.id === "homeworld") continue;
    if (discovered.has(planet.id)) continue;
    if (scanTotal >= planet.scanRequired) {
      discovered.add(planet.id);
      newlyDiscovered.push(planet);
    }
  }

  company.discoveredPlanets = [...discovered];
  company.planetDiscoveryVersion = PLANET_DISCOVERY_VERSION;
  if (newlyDiscovered.length) {
    company.lastDiscoveredPlanet = newlyDiscovered[newlyDiscovered.length - 1].id;
    company.totalPlanetsDiscovered = company.discoveredPlanets.length;
  }
  return newlyDiscovered;
}

export function getNextPlanetSignal(company = {}) {
  const discovered = getDiscoveredPlanetSet(company);
  const scanTotal = getEffectiveScanTotal(company);
  const next = PLANETS.find((planet) => !discovered.has(planet.id));
  if (!next) {
    return {
      complete: true,
      planet: null,
      label: "All starter signals mapped",
      current: scanTotal,
      target: PLANETS[PLANETS.length - 1]?.scanRequired ?? 0,
      remaining: 0,
      progress: 1
    };
  }

  return {
    complete: false,
    planet: next,
    label: "Unknown Signal",
    current: scanTotal,
    target: next.scanRequired,
    remaining: Math.max(0, next.scanRequired - scanTotal),
    progress: next.scanRequired > 0 ? Math.max(0, Math.min(1, scanTotal / next.scanRequired)) : 1
  };
}

export function getPlanetRegistryView(company = {}) {
  const discovered = getDiscoveredPlanetSet(company);
  const scanTotal = getEffectiveScanTotal(company);
  const colonies = normalizeColonyState(company.colonies);
  const roboticReady = isColonizationResearchReady(company);
  return PLANETS.map((planet) => {
    const isDiscovered = discovered.has(planet.id);
    const progress = planet.scanRequired > 0 ? Math.max(0, Math.min(1, scanTotal / planet.scanRequired)) : 1;
    const colony = getColonyView(company, planet.id, { colonies, isDiscovered, roboticReady });
    return {
      ...planet,
      physical: isDiscovered ? getPhysicalPlanet(planet) : null,
      visualColor: planet.physical?.color ?? "#a78bfa",
      discovered: isDiscovered,
      locked: !isDiscovered,
      progress,
      scanProgress: Math.min(scanTotal, planet.scanRequired),
      remainingScan: Math.max(0, planet.scanRequired - scanTotal),
      colony
    };
  });
}

export function countDiscoveredPlanets(company = {}) {
  return normalizePlanetState(company.discoveredPlanets).length;
}

export function isPlanetDiscovered(company = {}, id) {
  return getDiscoveredPlanetSet(company).has(id);
}

export function getPhysicalPlanet(planet) {
  if (!planet?.physical) return null;
  return {
    ...planet.physical,
    id: planet.id,
    name: planet.name,
    classification: planet.classification,
    distanceLabel: planet.distanceLabel,
    gravityLabel: planet.gravityLabel,
    atmosphereLabel: planet.atmosphereLabel,
    mineralsLabel: planet.mineralsLabel,
    habitabilityLabel: planet.habitabilityLabel,
    description: planet.description,
    isDiscoveredPlanet: planet.id !== "homeworld"
  };
}

export function getDiscoveredPhysicalPlanets(company = {}) {
  const discovered = getDiscoveredPlanetSet(company);
  return PLANETS.filter((planet) => discovered.has(planet.id))
    .map(getPhysicalPlanet)
    .filter(Boolean);
}

export function getColonizablePlanets() {
  return PLANETS.filter((planet) => COLONIZABLE_PLANET_IDS.has(planet.id));
}

export function getPlanetById(id) {
  return PLANETS.find((planet) => planet.id === id) ?? null;
}

export function getColonyTier(level = 0) {
  const safeLevel = Math.floor(Number(level ?? 0));
  return COLONY_TIERS.find((tier) => tier.level === safeLevel) ?? null;
}

export function getNextColonyTier(level = 0) {
  const safeLevel = Math.max(0, Math.floor(Number(level ?? 0)));
  return COLONY_TIERS.find((tier) => tier.level === safeLevel + 1) ?? null;
}

export function isColonizationResearchReady(company = {}) {
  return hasCostBypass(company) || normalizeResearchIds(company.completedResearch).includes("robotic_landers");
}

export function isColonyTierResearchReady(company = {}, tier = null) {
  if (!tier?.requiredResearch) return true;
  return hasCostBypass(company) || normalizeResearchIds(company.completedResearch).includes(tier.requiredResearch);
}

export function getActiveColonyMissionTarget(company = {}) {
  const targetId = String(company.activeColonyMissionTargetId ?? "");
  return COLONIZABLE_PLANET_IDS.has(targetId) ? targetId : "";
}

export function setActiveColonyMissionTarget(company = {}, planetId = "") {
  if (!COLONIZABLE_PLANET_IDS.has(planetId)) return { ok: false, reason: "Choose a discovered offworld planet." };
  if (!isPlanetDiscovered(company, planetId)) return { ok: false, reason: "Discover this planet before targeting payload missions." };
  if (!hasCostBypass(company) && !normalizeResearchIds(company.completedResearch).includes("transfer_planning")) {
    return { ok: false, reason: "Research Transfer Planning before targeting planet payload missions." };
  }
  company.activeColonyMissionTargetId = planetId;
  return { ok: true, planet: getPlanetById(planetId), mission: getNextColonyMissionForPlanet(company, planetId) };
}

export function getColonyDeliveryCount(company = {}, planetId = "", payloadType = "") {
  const deliveries = normalizeColonyDeliveryState(company.colonyDeliveries);
  return Math.max(0, Number(deliveries[planetId]?.[payloadType] ?? 0));
}

export function hasColonyDelivery(company = {}, planetId = "", payloadType = "") {
  if (!payloadType) return true;
  if (hasCostBypass(company)) return true;
  return getColonyDeliveryCount(company, planetId, payloadType) > 0;
}

export function getNextColonyMissionForPlanet(company = {}, planetId = "") {
  const planet = getPlanetById(planetId);
  if (!planet?.colony || planet.id === "homeworld") return null;
  const colony = normalizeColonyState(company.colonies)[planetId] ?? null;
  const currentLevel = Number(colony?.level ?? 0);
  const nextTier = getNextColonyTier(currentLevel);
  if (!nextTier) return null;
  const delivered = hasColonyDelivery(company, planetId, nextTier.requiredPayloadType);
  const researchReady = isColonyTierResearchReady(company, nextTier);
  return {
    planetId,
    planetName: planet.name,
    tier: nextTier,
    requiredPayloadType: nextTier.requiredPayloadType,
    requiredResearch: nextTier.requiredResearch,
    delivered,
    deliveryCount: getColonyDeliveryCount(company, planetId, nextTier.requiredPayloadType),
    researchReady,
    targetActive: getActiveColonyMissionTarget(company) === planetId,
    complete: delivered && researchReady,
    title: `${nextTier.missionName ?? "Deliver payload"} to ${planet.name}`,
    description: nextTier.missionDescription ?? "Deliver the required payload to advance this colony."
  };
}

export function getActiveColonyMissionView(company = {}) {
  const targetId = getActiveColonyMissionTarget(company);
  if (!targetId) return null;
  return getNextColonyMissionForPlanet(company, targetId);
}

export function canRecordColonyPayloadDelivery(company = {}, planetId = "", payloadType = "") {
  if (!COLONIZABLE_PLANET_IDS.has(planetId)) return { ok: false, reason: "No colony target selected." };
  if (!COLONY_PAYLOAD_TYPES.has(payloadType)) return { ok: false, reason: "Payload is not a colony module." };
  if (!isPlanetDiscovered(company, planetId)) return { ok: false, reason: "Target planet is not discovered." };
  const mission = getNextColonyMissionForPlanet(company, planetId);
  if (!mission) return { ok: false, reason: "Colony is already complete." };
  if (mission.requiredPayloadType !== payloadType) return { ok: false, reason: `This colony stage needs ${formatPayloadTypeLabel(mission.requiredPayloadType)}.` };
  if (!mission.researchReady) return { ok: false, reason: "Required colony research is not complete." };
  return { ok: true, mission };
}

export function recordColonyPayloadDelivery(company = {}, planetId = "", payloadType = "") {
  const check = canRecordColonyPayloadDelivery(company, planetId, payloadType);
  if (!check.ok) return check;
  const deliveries = normalizeColonyDeliveryState(company.colonyDeliveries);
  deliveries[planetId] = deliveries[planetId] ?? {};
  deliveries[planetId][payloadType] = Math.max(0, Number(deliveries[planetId][payloadType] ?? 0)) + 1;
  company.colonyDeliveries = deliveries;
  company.lastColonyPayloadDelivery = { planetId, payloadType, deliveredAt: Date.now() };
  return { ok: true, mission: getNextColonyMissionForPlanet(company, planetId), planet: getPlanetById(planetId), payloadType };
}

export function getColonyProductionForPlanet(planetId, level = 0) {
  const planet = getPlanetById(planetId);
  const tier = getColonyTier(level);
  if (!planet?.colony || !tier) return { cash: 0, research: 0, scan: 0 };
  const base = planet.colony.baseOutput ?? {};
  return {
    cash: Number(base.cash ?? 0) * Number(tier.outputMultiplier ?? 1),
    research: Number(base.research ?? 0) * Number(tier.outputMultiplier ?? 1),
    scan: Number(base.scan ?? 0) * Number(tier.outputMultiplier ?? 1)
  };
}

export function getTotalColonyProduction(company = {}) {
  const colonies = normalizeColonyState(company.colonies);
  return Object.values(colonies).reduce((total, colony) => {
    const production = getColonyProductionForPlanet(colony.planetId, colony.level);
    total.cash += production.cash;
    total.research += production.research;
    total.scan += production.scan;
    return total;
  }, { cash: 0, research: 0, scan: 0 });
}

export function getColonyView(company = {}, planetId, context = {}) {
  const planet = getPlanetById(planetId);
  const colonies = context.colonies ?? normalizeColonyState(company.colonies);
  const colony = colonies[planetId] ?? null;
  const level = Number(colony?.level ?? 0);
  const tier = getColonyTier(level);
  const nextTier = getNextColonyTier(level);
  const discovered = context.isDiscovered ?? isPlanetDiscovered(company, planetId);
  const roboticReady = context.roboticReady ?? isColonizationResearchReady(company);
  const production = getColonyProductionForPlanet(planetId, level);
  const nextProduction = nextTier ? getColonyProductionForPlanet(planetId, nextTier.level) : production;
  const afford = nextTier ? canAffordColonyCost(company, nextTier.cost) : { ok: false, missing: {} };
  const colonizable = Boolean(planet?.colony && planet.id !== "homeworld");
  const mission = colonizable ? getNextColonyMissionForPlanet(company, planetId) : null;
  const researchReady = nextTier ? isColonyTierResearchReady(company, nextTier) : true;
  const deliveryReady = nextTier ? hasColonyDelivery(company, planetId, nextTier.requiredPayloadType) : true;
  const targetActive = getActiveColonyMissionTarget(company) === planetId;
  const missingPieces = [];
  if (colonizable && discovered && nextTier) {
    if (!researchReady) missingPieces.push(`Research ${formatResearchLabel(nextTier.requiredResearch)}`);
    if (!deliveryReady) missingPieces.push(`Deliver ${formatPayloadTypeLabel(nextTier.requiredPayloadType)}`);
    if (!afford.ok) missingPieces.push(formatMissingCost(afford.missing));
  }

  return {
    colonizable,
    colonized: Boolean(colony),
    level,
    maxLevel: COLONY_TIERS[COLONY_TIERS.length - 1]?.level ?? 4,
    tierName: tier?.name ?? "Uncolonized",
    nextTierName: nextTier?.name ?? "Max Colony",
    role: planet?.colony?.role ?? "Outpost",
    summary: planet?.colony?.summary ?? "Establish a robotic outpost to begin offworld operations.",
    production,
    nextProduction,
    nextCost: nextTier?.cost ?? null,
    maxed: !nextTier,
    discovered,
    roboticReady,
    researchReady,
    deliveryReady,
    targetActive,
    mission,
    requiredPayloadType: nextTier?.requiredPayloadType ?? "",
    requiredResearch: nextTier?.requiredResearch ?? "",
    deliveryCount: nextTier ? getColonyDeliveryCount(company, planetId, nextTier.requiredPayloadType) : 0,
    affordable: afford.ok,
    missing: afford.missing,
    missingPieces,
    actionLabel: !colonizable
      ? "Home Base"
      : !discovered
        ? "Signal Locked"
        : !nextTier
          ? "Max Colony"
          : !researchReady
            ? `Need ${formatResearchLabel(nextTier.requiredResearch)}`
            : !deliveryReady
              ? `Deliver ${formatPayloadTypeLabel(nextTier.requiredPayloadType)}`
              : colony
                ? `Upgrade to ${nextTier.name}`
                : `Build ${nextTier.name}`,
    canAct: Boolean(colonizable && discovered && nextTier && researchReady && deliveryReady && afford.ok)
  };
}

export function canUpgradeColony(company = {}, planetId) {
  const view = getColonyView(company, planetId);
  if (!view.colonizable) return { ok: false, reason: "Homeworld already has launch operations.", view };
  if (!view.discovered) return { ok: false, reason: "Discover this planet before colonizing it.", view };
  if (view.maxed) return { ok: false, reason: "Colony is already max level.", view };
  if (!view.researchReady) return { ok: false, reason: `Research ${formatResearchLabel(view.requiredResearch)} first.`, view };
  if (!view.deliveryReady) return { ok: false, reason: `Deliver ${formatPayloadTypeLabel(view.requiredPayloadType)} first. Select this planet as the colony target, launch the required payload, reach orbit, then stage it.`, view };
  if (!view.affordable) return { ok: false, reason: formatMissingCost(view.missing), view };
  return { ok: true, view };
}

export function upgradeColony(company = {}, planetId) {
  const check = canUpgradeColony(company, planetId);
  if (!check.ok) return check;
  const colonies = normalizeColonyState(company.colonies);
  const current = colonies[planetId] ?? null;
  const nextTier = getNextColonyTier(current?.level ?? 0);
  if (!nextTier) return { ok: false, reason: "Colony is already max level.", view: check.view };

  spendColonyCost(company, nextTier.cost);
  const now = Date.now();
  colonies[planetId] = {
    planetId,
    level: nextTier.level,
    foundedAt: Number(current?.foundedAt ?? now),
    lastUpgradedAt: now
  };
  company.colonies = colonies;
  company.colonyVersion = COLONY_VERSION;
  company.lastColonizedPlanet = planetId;
  company.totalColoniesBuilt = Object.values(colonies).filter((colony) => Number(colony.level ?? 0) > 0).length;
  return { ok: true, colony: colonies[planetId], tier: nextTier, planet: getPlanetById(planetId), view: getColonyView(company, planetId) };
}

function canAffordColonyCost(company = {}, cost = {}) {
  if (hasCostBypass(company)) return { ok: true, missing: {} };
  const missing = {
    cash: Math.max(0, Number(cost.cash ?? 0) - Number(company.money ?? 0)),
    research: Math.max(0, Number(cost.research ?? 0) - Number(company.researchPoints ?? 0)),
    scan: Math.max(0, Number(cost.scan ?? 0) - Number(company.scanPoints ?? 0))
  };
  return {
    ok: missing.cash <= 0 && missing.research <= 0 && missing.scan <= 0,
    missing
  };
}

function spendColonyCost(company = {}, cost = {}) {
  if (hasCostBypass(company)) return;
  company.money = Math.max(0, Number(company.money ?? 0) - Number(cost.cash ?? 0));
  company.researchPoints = Math.max(0, Number(company.researchPoints ?? 0) - Number(cost.research ?? 0));
  company.scanPoints = Math.max(0, Number(company.scanPoints ?? 0) - Number(cost.scan ?? 0));
}

export function formatPayloadTypeLabel(payloadType = "") {
  const labels = {
    survey_probe: "Survey Probe",
    robotic_lander: "Robotic Lander",
    cargo_pod: "Cargo Pod",
    power_module: "Power Module",
    mining_rig: "Mining Rig",
    habitat_module: "Habitat Module"
  };
  return labels[payloadType] ?? (payloadType.split("_").filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ") || "Payload");
}

function formatResearchLabel(researchId = "") {
  const labels = {
    robotic_landers: "Robotic Landers",
    surface_power_systems: "Surface Power Systems",
    offworld_mining: "Offworld Mining",
    habitat_modules: "Habitat Modules",
    cargo_delivery: "Cargo Delivery Capsules",
    surface_mapping: "Surface Mapping"
  };
  return labels[researchId] ?? researchId.split("_").filter(Boolean).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}

function normalizeResearchIds(completed = []) {
  if (Array.isArray(completed)) return completed.map(String);
  if (completed && typeof completed === "object") {
    return Object.entries(completed)
      .filter(([, value]) => Boolean(value))
      .map(([id]) => id);
  }
  return [];
}

function formatMissingCost(missing = {}) {
  const pieces = [];
  if (missing.cash > 0) pieces.push(`$${Math.ceil(missing.cash).toLocaleString()}`);
  if (missing.research > 0) pieces.push(`${Math.ceil(missing.research).toLocaleString()}R`);
  if (missing.scan > 0) pieces.push(`${Math.ceil(missing.scan).toLocaleString()} Scan`);
  return pieces.length ? `Need ${pieces.join(" + ")}.` : "Not enough resources.";
}
