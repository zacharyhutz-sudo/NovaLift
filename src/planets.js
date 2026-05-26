export const PLANET_DISCOVERY_VERSION = "v0.9.1-physical-planets";

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
      physical: isDiscovered ? getPhysicalPlanet(planet) : null,
      visualColor: planet.physical?.color ?? "#a78bfa",
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
