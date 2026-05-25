export const STARTING_BUDGET = Infinity;

export const STAGE_MIN = 0;
export const STAGE_MAX = 6;

export const AVAILABLE_PARTS = [
  {
    id: "data_center_basic",
    name: "Orbital Data Center",
    shortName: "Data Center",
    type: "payload",
    stageAction: "deployPayload",
    cost: 80000,
    incomeRate: 360,
    dryMass: 2.2,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    dragArea: 1.35,
    width: 1.35,
    color: "#a78bfa",
    description: "A starter orbital payload. Stage it in orbit to detach it and generate recurring data-center revenue."
  },
  {
    id: "satellite_basic",
    name: "Small Satellite",
    shortName: "Satellite",
    type: "payload",
    stageAction: "deployPayload",
    cost: 44000,
    incomeRate: 140,
    dryMass: 0.8,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    dragArea: 0.85,
    width: 1.1,
    color: "#c4b5fd",
    description: "A lighter detachable payload. It earns modest recurring revenue when deployed into stable orbit."
  },
  {
    id: "nose_cone_basic",
    name: "Basic Nose Cone",
    shortName: "Nose Cone",
    type: "aero",
    cost: 7000,
    dryMass: 0.18,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    dragArea: -0.45,
    width: 0.85,
    color: "#e2e8f0",
    description: "Reduces atmospheric drag when placed near the top of the rocket."
  },
  {
    id: "command_pod_basic",
    name: "Basic Command Pod",
    shortName: "Command Pod",
    type: "command",
    cost: 20000,
    dryMass: 1.1,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    dragArea: 0.7,
    width: 1,
    color: "#e5e7eb",
    description: "Required. Gives the rocket a controllable brain."
  },
  {
    id: "parachute_basic",
    name: "Recovery Parachute",
    shortName: "Parachute",
    type: "parachute",
    stageAction: "deployParachute",
    cost: 14000,
    dryMass: 0.25,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    dragArea: 0.45,
    deployedDragArea: 620,
    safeDeploySpeed: 235,
    width: 1,
    color: "#f9a8d4",
    description: "Stage inside atmosphere to slow descent. It should bring a normal rocket down to a safe landing speed if deployed below its safe speed."
  },
  {
    id: "landing_legs_basic",
    name: "Landing Legs",
    shortName: "Landing Legs",
    type: "legs",
    stageAction: "deployLegs",
    cost: 18000,
    dryMass: 0.45,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    dragArea: 0.65,
    width: 1.25,
    color: "#94a3b8",
    description: "Stage before touchdown to increase the safe landing speed."
  },
  {
    id: "fuel_tank_small",
    name: "Small Fuel Tank",
    shortName: "Small Tank",
    type: "fuel",
    cost: 13000,
    dryMass: 0.65,
    fuelCapacity: 281.25,
    thrust: 0,
    fuelUse: 0,
    dragArea: 0.65,
    width: 1,
    color: "#38bdf8",
    description: "Light tank with 25% more fuel capacity. Good for upper stages and small orbital launches."
  },
  {
    id: "fuel_tank_medium",
    name: "Medium Fuel Tank",
    shortName: "Med Tank",
    type: "fuel",
    cost: 24000,
    dryMass: 1.05,
    fuelCapacity: 437.5,
    thrust: 0,
    fuelUse: 0,
    dragArea: 0.85,
    width: 1.1,
    color: "#0ea5e9",
    description: "Balanced fuel storage with 25% more capacity for most early rockets."
  },
  {
    id: "decoupler_basic",
    name: "Basic Decoupler",
    shortName: "Decoupler",
    type: "decoupler",
    stageAction: "decoupleBelow",
    cost: 11000,
    dryMass: 0.22,
    fuelCapacity: 0,
    thrust: 0,
    fuelUse: 0,
    dragArea: 0.35,
    width: 1.05,
    color: "#facc15",
    description: "Stage to drop this part and everything below it. Great for shedding empty tanks and engines."
  },
  {
    id: "engine_vacuum",
    name: "Vacuum Engine",
    shortName: "Vac Engine",
    type: "engine",
    cost: 62000,
    dryMass: 1.05,
    fuelCapacity: 0,
    thrust: 123.75,
    fuelUse: 6.1,
    dragArea: 0.7,
    width: 1,
    color: "#fdba74",
    description: "Lower thrust, better fuel use. Best after the lower stage separates."
  },
  {
    id: "engine_basic",
    name: "Basic Engine",
    shortName: "Basic Engine",
    type: "engine",
    cost: 50000,
    dryMass: 1.35,
    fuelCapacity: 0,
    thrust: 165,
    fuelUse: 9.2,
    dragArea: 0.8,
    width: 1.05,
    color: "#f97316",
    description: "Reliable starter engine. Efficient enough for first orbit attempts."
  },
  {
    id: "engine_heavy",
    name: "Heavy Engine",
    shortName: "Heavy Engine",
    type: "engine",
    cost: 84000,
    dryMass: 2.1,
    fuelCapacity: 0,
    thrust: 270,
    fuelUse: 15.4,
    dragArea: 1.05,
    width: 1.25,
    color: "#fb923c",
    description: "More thrust for heavy payloads, but burns fuel quickly."
  }
];

// stage 0 = passive/active during flight. Stage 1+ is activated by the Stage button.
export const STARTING_STACK = [
  { id: "nose_cone_basic", stage: 0 },
  { id: "data_center_basic", stage: 2 },
  { id: "command_pod_basic", stage: 0 },
  { id: "parachute_basic", stage: 3 },
  { id: "landing_legs_basic", stage: 3 },
  { id: "fuel_tank_small", stage: 0 },
  { id: "engine_vacuum", stage: 0 },
  { id: "decoupler_basic", stage: 1 },
  { id: "fuel_tank_medium", stage: 0 },
  { id: "fuel_tank_medium", stage: 0 },
  { id: "engine_basic", stage: 0 }
];

export function getPartById(id) {
  const part = AVAILABLE_PARTS.find((candidate) => candidate.id === id);
  if (!part) throw new Error(`Unknown rocket part: ${id}`);
  return part;
}
