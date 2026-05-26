export const PLANET_DISCOVERY_VERSION = "v0.9.0-planets";

export const PLANET_SCAN_TARGETS = [500, 1200, 2500];

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
    description: "Company headquarters and launch operations."
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
    description: "A mineral-rich rocky world. Best first target for robotic mining."
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
    description: "A low-gravity icy moon that should be easier to land on."
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
    description: "A difficult but valuable future mining and terraforming target."
  }
];

const PLANET_IDS = new Set(PLANETS.map((planet) => planet.id));

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

export function getDiscoveredPlanetSet(company = {}) {
  return new Set(["homeworld", ...normalizePlanetState(company.discoveredPlanets)]);
}

export function processPlanetDiscovery(company = {}) {
  const scanTotal = Number(company.totalScanGenerated ?? company.scanPoints ?? 0);
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
  const scanTotal = Number(company.totalScanGenerated ?? company.scanPoints ?? 0);
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
  const scanTotal = Number(company.totalScanGenerated ?? company.scanPoints ?? 0);
  return PLANETS.map((planet) => {
    const isDiscovered = discovered.has(planet.id);
    const progress = planet.scanRequired > 0 ? Math.max(0, Math.min(1, scanTotal / planet.scanRequired)) : 1;
    return {
      ...planet,
      discovered: isDiscovered,
      locked: !isDiscovered,
      progress,
      scanProgress: Math.min(scanTotal, planet.scanRequired),
      remainingScan: Math.max(0, planet.scanRequired - scanTotal)
    };
  });
}

export function countDiscoveredPlanets(company = {}) {
  return normalizePlanetState(company.discoveredPlanets).length;
}

export function isPlanetDiscovered(company = {}, id) {
  return getDiscoveredPlanetSet(company).has(id);
}
