export const STARTING_RESEARCH = 0;

export const RESEARCH_TREE = [
  {
    id: "orbital_telemetry",
    lane: "orbital",
    laneOrder: 1,
    icon: "T",
    treeName: "Telemetry",
    category: "Orbital Infrastructure",
    name: "Orbital Telemetry",
    cost: 20,
    description: "Turns online satellites and data centers into a steady source of research data. Priced as the first early-game research purchase so the opening mission rewards cannot dead-end progression.",
    unlockText: "Payloads begin producing Research/sec.",
    shortUnlockText: "+ Passive R from payloads"
  },
  {
    id: "vacuum_engine_design",
    lane: "propulsion",
    laneOrder: 1,
    icon: "V",
    treeName: "Vacuum Engine",
    category: "Propulsion",
    name: "Vacuum Engine Design",
    cost: 35,
    description: "Unlocks a more capable upper-stage engine for orbital missions.",
    unlockText: "Unlocks the Skyburner Engine.",
    shortUnlockText: "Unlocks Skyburner Engine",
    unlockPartIds: ["engine_skyburner"]
  },
  {
    id: "composite_tanks",
    lane: "orbital",
    laneOrder: 2,
    icon: "F",
    treeName: "Composite Tanks",
    category: "Fuel Systems",
    name: "Composite Tanks",
    cost: 55,
    prerequisites: ["orbital_telemetry"],
    description: "Unlocks a lighter, larger tank for longer burns without making stacks much taller.",
    unlockText: "Unlocks the Composite Fuel Tank.",
    shortUnlockText: "Unlocks Composite Tank",
    unlockPartIds: ["fuel_tank_composite"]
  },
  {
    id: "cloud_processing",
    lane: "orbital",
    laneOrder: 3,
    icon: "D",
    treeName: "Cloud Processing",
    category: "Orbital Infrastructure",
    name: "Cloud Processing",
    cost: 75,
    prerequisites: ["orbital_telemetry"],
    description: "Improves orbital computing revenue and research output.",
    unlockText: "Unlocks the Efficient Data Center.",
    shortUnlockText: "Unlocks Efficient Data Center",
    unlockPartIds: ["data_center_efficient"]
  },
  {
    id: "heavy_lift_engineering",
    lane: "propulsion",
    laneOrder: 2,
    icon: "H",
    treeName: "Heavy Lift",
    category: "Propulsion",
    name: "Heavy Lift Engineering",
    cost: 90,
    prerequisites: ["vacuum_engine_design"],
    description: "Unlocks a premium launch engine for heavier payloads and future interplanetary flights.",
    unlockText: "Unlocks the Titan Engine.",
    shortUnlockText: "Unlocks Titan Engine",
    unlockPartIds: ["engine_titan"]
  },
  {
    id: "orbital_surveying",
    lane: "exploration",
    laneOrder: 1,
    icon: "S",
    treeName: "Surveying",
    category: "Exploration",
    name: "Orbital Surveying",
    cost: 95,
    prerequisites: ["orbital_telemetry"],
    description: "Unlocks exploration satellites. These are the first step toward discovering planets.",
    unlockText: "Unlocks the Exploration Satellite.",
    shortUnlockText: "Unlocks Exploration Satellite",
    unlockPartIds: ["exploration_satellite_basic"]
  },
  {
    id: "deep_space_scanning",
    lane: "exploration",
    laneOrder: 2,
    icon: "X",
    treeName: "Deep Space",
    category: "Exploration",
    name: "Deep Space Scanning",
    cost: 150,
    prerequisites: ["orbital_surveying", "cloud_processing"],
    description: "Prototype research for the next milestone: discovering planets from orbit.",
    unlockText: "Future hook: planet discovery scans.",
    shortUnlockText: "Future: planet discovery"
  }
];

export function normalizeResearchState(completed = []) {
  const ids = new Set(RESEARCH_TREE.map((node) => node.id));
  if (Array.isArray(completed)) {
    return [...new Set(completed.filter((id) => ids.has(id)))];
  }
  if (completed && typeof completed === "object") {
    return Object.entries(completed)
      .filter(([id, value]) => ids.has(id) && Boolean(value))
      .map(([id]) => id);
  }
  return [];
}

export function getCompletedResearchSet(company = {}) {
  return new Set(normalizeResearchState(company.completedResearch));
}

export function isResearchComplete(company = {}, id) {
  return getCompletedResearchSet(company).has(id);
}

export function getResearchNode(id) {
  return RESEARCH_TREE.find((node) => node.id === id) ?? null;
}

export function getResearchView(company = {}) {
  const completed = getCompletedResearchSet(company);
  const availablePoints = Number(company.researchPoints ?? 0);

  return RESEARCH_TREE.map((node) => {
    const prerequisites = node.prerequisites ?? [];
    const missingPrerequisites = prerequisites.filter((id) => !completed.has(id));
    const complete = completed.has(node.id);
    const locked = !complete && missingPrerequisites.length > 0;
    const affordable = availablePoints >= node.cost;
    const available = !complete && !locked && affordable;
    const waitingForPoints = !complete && !locked && !affordable;

    return {
      ...node,
      complete,
      locked,
      available,
      waitingForPoints,
      affordable,
      missingPrerequisites,
      missingPrerequisiteNames: missingPrerequisites.map((id) => getResearchNode(id)?.name ?? id)
    };
  });
}

export function canPurchaseResearch(company = {}, id) {
  const node = getResearchNode(id);
  if (!node) return { ok: false, reason: "Unknown research." };
  const completed = getCompletedResearchSet(company);
  if (completed.has(id)) return { ok: false, reason: "Research already complete." };
  const missing = (node.prerequisites ?? []).filter((prerequisite) => !completed.has(prerequisite));
  if (missing.length) {
    return {
      ok: false,
      reason: `Requires ${missing.map((missingId) => getResearchNode(missingId)?.name ?? missingId).join(", ")}.`
    };
  }
  if (Number(company.researchPoints ?? 0) < node.cost) return { ok: false, reason: `Need ${formatResearch(node.cost)} Research.` };
  return { ok: true, reason: "Ready." };
}

export function purchaseResearch(company = {}, id) {
  const check = canPurchaseResearch(company, id);
  if (!check.ok) return { ok: false, reason: check.reason, node: getResearchNode(id) };
  const node = getResearchNode(id);
  const completed = normalizeResearchState(company.completedResearch);
  company.researchPoints = Math.max(0, Number(company.researchPoints ?? 0) - node.cost);
  company.completedResearch = [...completed, node.id];
  company.lastResearchPurchase = node.id;
  return { ok: true, node };
}

export function isPartUnlocked(part = {}, company = {}) {
  if (company.mode === "sandbox") return true;
  const required = part.requiresResearch;
  if (!required) return true;
  return isResearchComplete(company, required);
}

export function getPartUnlockText(part = {}, company = {}) {
  if (isPartUnlocked(part, company)) return "Unlocked";
  const node = getResearchNode(part.requiresResearch);
  return node ? `Research required: ${node.name}` : "Research required";
}

export function formatResearch(value, decimals = 0) {
  if (!Number.isFinite(value)) return "0";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}
