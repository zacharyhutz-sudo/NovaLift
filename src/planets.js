export const PLANET_DISCOVERY_VERSION = "v0.9.6-colony-pass";
export const COLONY_VERSION = "v0.9.6-offworld-outposts";

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
    name: "Robotic Outpost",
    cost: { cash: 2500000, research: 180, scan: 700 },
    outputMultiplier: 1
  },
  {
    level: 2,
    name: "Crew Prep Base",
    cost: { cash: 6500000, research: 360, scan: 1600 },
    outputMultiplier: 2.4
  },
  {
    level: 3,
    name: "Starter Colony",
    cost: { cash: 15000000, research: 700, scan: 3600 },
    outputMultiplier: 5.2
  }
];

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
  return company.mode === "sandbox" || normalizeResearchIds(company.completedResearch).includes("robotic_landers");
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

  return {
    colonizable,
    colonized: Boolean(colony),
    level,
    maxLevel: COLONY_TIERS[COLONY_TIERS.length - 1]?.level ?? 3,
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
    affordable: afford.ok,
    missing: afford.missing,
    actionLabel: !colonizable
      ? "Home Base"
      : !discovered
        ? "Signal Locked"
        : !roboticReady
          ? "Need Robotic Landers"
          : !nextTier
            ? "Max Colony"
            : colony
              ? `Upgrade to ${nextTier.name}`
              : `Establish ${nextTier.name}`,
    canAct: Boolean(colonizable && discovered && roboticReady && nextTier && afford.ok)
  };
}

export function canUpgradeColony(company = {}, planetId) {
  const view = getColonyView(company, planetId);
  if (!view.colonizable) return { ok: false, reason: "Homeworld already has launch operations.", view };
  if (!view.discovered) return { ok: false, reason: "Discover this planet before colonizing it.", view };
  if (!view.roboticReady) return { ok: false, reason: "Research Robotic Landers first.", view };
  if (view.maxed) return { ok: false, reason: "Colony is already max level.", view };
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
