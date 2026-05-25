import { PLANET } from "./config.js";
import { getAltitude, getOrbitStatus, getSpeed } from "./physics.js";

export const STARTING_CASH = 25000;

export const MISSIONS = [
  {
    id: "first_launch",
    title: "First Launch",
    reward: 2500,
    description: "Leave the launch pad with any controllable rocket.",
    objective: "Lift off from Homeworld.",
    progressLabel: (ctx) => ctx.flightStats?.hasLaunched ? "Launched" : "On pad",
    isComplete: (ctx) => Boolean(ctx.flightStats?.hasLaunched || getAltitude(ctx.rocket, PLANET) > 25)
  },
  {
    id: "reach_sky",
    title: "Reach the Sky",
    reward: 5000,
    description: "Reach 1,500 m above the surface.",
    objective: "Max altitude 1.50 km.",
    progressLabel: (ctx) => `${formatDistance(Math.min(ctx.flightStats?.maxAltitude ?? 0, 1500))} / 1.50 km`,
    isComplete: (ctx) => (ctx.flightStats?.maxAltitude ?? 0) >= 1500
  },
  {
    id: "touch_space",
    title: "Touch Space",
    reward: 12000,
    description: "Climb above Homeworld's atmosphere.",
    objective: `Reach ${formatDistance(PLANET.atmosphereHeight)} altitude.`,
    progressLabel: (ctx) => `${formatDistance(Math.min(ctx.flightStats?.maxAltitude ?? 0, PLANET.atmosphereHeight))} / ${formatDistance(PLANET.atmosphereHeight)}`,
    isComplete: (ctx) => (ctx.flightStats?.maxAltitude ?? 0) >= PLANET.atmosphereHeight
  },
  {
    id: "first_orbit",
    title: "First Orbit",
    reward: 30000,
    description: "Hold a stable orbit long enough for mission control to confirm it.",
    objective: "Achieve a stable orbit confirmation.",
    progressLabel: (ctx) => ctx.rocket?.missionComplete ? "Orbit confirmed" : `${(ctx.rocket?.orbitHoldTime ?? 0).toFixed(1)}s hold`,
    isComplete: (ctx) => Boolean(ctx.rocket?.missionComplete || getOrbitStatus(ctx.rocket, PLANET) === "Orbit achieved")
  },
  {
    id: "deploy_satellite",
    title: "Deploy Satellite",
    reward: 40000,
    description: "Deploy a satellite into a stable orbit so it starts generating revenue.",
    objective: "Online satellite in orbit.",
    progressLabel: (ctx) => `${countOnlinePayloads(ctx, "satellite")} online`,
    isComplete: (ctx) => countOnlinePayloads(ctx, "satellite") > 0
  },
  {
    id: "deploy_datacenter",
    title: "Deploy Data Center",
    reward: 75000,
    description: "Deploy an orbital data center into a stable orbit for stronger recurring income.",
    objective: "Online data center in orbit.",
    progressLabel: (ctx) => `${countOnlinePayloads(ctx, "data_center")} online`,
    isComplete: (ctx) => countOnlinePayloads(ctx, "data_center") > 0
  },
  {
    id: "recover_rocket",
    title: "Recover Rocket",
    reward: 8000,
    description: "Land a command pod safely using parachutes, legs, or careful flying.",
    objective: "Safely recover a rocket.",
    progressLabel: (ctx) => ctx.flightStats?.outcome === "Recovered" ? "Recovered" : "Not recovered yet",
    isComplete: (ctx) => Boolean(ctx.flightStats?.ended && ctx.flightStats?.outcome === "Recovered")
  },
  {
    id: "clean_orbit",
    title: "Clean Orbit",
    reward: 3000,
    description: "Select orbital debris and explode it to keep space usable.",
    objective: "Destroy one debris object.",
    progressLabel: (ctx) => `${ctx.company?.totalDestroyed ?? 0} destroyed`,
    isComplete: (ctx) => (ctx.company?.totalDestroyed ?? 0) >= 1
  }
];

export function createMissionState() {
  return MISSIONS.reduce((state, mission) => {
    state[mission.id] = { completed: false, rewardClaimed: false, completedAt: null };
    return state;
  }, {});
}

export function normalizeMissionState(state = {}) {
  const baseline = createMissionState();
  for (const [id, entry] of Object.entries(state ?? {})) {
    if (!baseline[id]) continue;
    baseline[id] = {
      ...baseline[id],
      ...entry,
      completed: Boolean(entry?.completed),
      rewardClaimed: Boolean(entry?.rewardClaimed)
    };
  }
  return baseline;
}

export function evaluateMissions(context) {
  const missionState = normalizeMissionState(context.company?.missions ?? {});
  const newlyCompleted = [];

  for (const mission of MISSIONS) {
    const state = missionState[mission.id];
    if (state.completed) continue;
    if (mission.isComplete(context)) {
      state.completed = true;
      state.rewardClaimed = true;
      state.completedAt = Date.now();
      newlyCompleted.push(mission);
    }
  }

  return { missionState, newlyCompleted };
}

export function getMissionView(context) {
  const missionState = normalizeMissionState(context.company?.missions ?? {});
  return MISSIONS.map((mission) => {
    const state = missionState[mission.id] ?? { completed: false, rewardClaimed: false };
    return {
      ...mission,
      completed: Boolean(state.completed),
      rewardClaimed: Boolean(state.rewardClaimed),
      progress: mission.progressLabel(context)
    };
  });
}

export function getNextMission(context) {
  return getMissionView(context).find((mission) => !mission.completed) ?? null;
}

function countOnlinePayloads(ctx, payloadType) {
  return (ctx.objects ?? []).filter((object) =>
    object &&
    object.kind === "payload" &&
    object.payloadType === payloadType &&
    object.online &&
    !object.crashed &&
    !object.exploded
  ).length;
}

function formatDistance(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${Math.round(value)} m`;
}

export function summarizeMissionReward(mission) {
  return mission ? `$${Math.round(mission.reward).toLocaleString()}` : "$0";
}

export function getFlightEconomySummary(company = {}, flightStats = null) {
  return {
    launchCost: company.lastLaunchCost ?? 0,
    missionRewards: company.lastMissionReward ?? 0,
    recoveryRefund: flightStats?.recoveryRefund ?? 0,
    incomeThisSession: company.totalRevenue ?? 0
  };
}
