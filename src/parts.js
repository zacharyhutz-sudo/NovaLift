export const STARTING_BUDGET = Infinity;

export const AVAILABLE_PARTS = [
  {
    id: "data_center_basic",
    name: "Orbital Data Center",
    shortName: "Data Center",
    type: "payload",
    cost: 4000,
    dryMass: 2.2,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    color: "#a78bfa",
    description: "A starter payload for future orbital income contracts. Heavy, but useful."
  },
  {
    id: "command_pod_basic",
    name: "Basic Command Pod",
    shortName: "Command Pod",
    type: "command",
    cost: 1000,
    dryMass: 1.1,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    color: "#e5e7eb",
    description: "Required. Gives the rocket a controllable brain and a nose cone."
  },
  {
    id: "fuel_tank_small",
    name: "Small Fuel Tank",
    shortName: "Small Tank",
    type: "fuel",
    cost: 650,
    dryMass: 0.65,
    fuelCapacity: 450,
    thrust: 0,
    fuelUse: 0,
    color: "#38bdf8",
    description: "Light tank. Good for small test flights and keeping mass low."
  },
  {
    id: "fuel_tank_medium",
    name: "Medium Fuel Tank",
    shortName: "Med Tank",
    type: "fuel",
    cost: 1200,
    dryMass: 1.05,
    fuelCapacity: 700,
    thrust: 0,
    fuelUse: 0,
    color: "#0ea5e9",
    description: "Balanced fuel storage. Two of these roughly matches the v0.1 sandbox fuel load."
  },
  {
    id: "engine_basic",
    name: "Basic Engine",
    shortName: "Basic Engine",
    type: "engine",
    cost: 2500,
    dryMass: 1.35,
    fuelCapacity: 0,
    thrust: 220,
    fuelUse: 9.2,
    color: "#f97316",
    description: "Reliable starter engine. Efficient enough for first orbit attempts."
  },
  {
    id: "engine_heavy",
    name: "Heavy Engine",
    shortName: "Heavy Engine",
    type: "engine",
    cost: 4200,
    dryMass: 2.1,
    fuelCapacity: 0,
    thrust: 360,
    fuelUse: 15.4,
    color: "#fb923c",
    description: "More thrust for heavy payloads, but burns fuel quickly."
  }
];

export const STARTING_STACK = [
  "data_center_basic",
  "command_pod_basic",
  "fuel_tank_medium",
  "fuel_tank_medium",
  "engine_basic"
];

export function getPartById(id) {
  const part = AVAILABLE_PARTS.find((candidate) => candidate.id === id);
  if (!part) throw new Error(`Unknown rocket part: ${id}`);
  return part;
}
