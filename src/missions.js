import { PLANET } from "./config.js";
import { getAltitude, getOrbitStatus, getSpeed } from "./physics.js";

export const STARTING_CASH = 500000;

export const MISSION_CHAPTERS = [
  {
    id: "flight_school",
    title: "Flight School",
    description: "Learn launch, altitude, space, and recovery basics."
  },
  {
    id: "orbit_program",
    title: "Orbit Program",
    description: "Build orbital speed and prove a stable orbit."
  },
  {
    id: "orbital_business",
    title: "Orbital Business",
    description: "Turn orbit into income and infrastructure."
  },
  {
    id: "exploration_program",
    title: "Exploration Program",
    description: "Prepare the company for planet discovery."
  }
];

export const MISSIONS = [
  {
    id: "first_launch",
    chapter: "flight_school",
    chapterOrder: 1,
    title: "First Launch",
    reward: 50000,
    researchReward: 5,
    recommendedTemplateId: "orbit_starter",
    recommendedTemplateLabel: "Starter Orbit",
    description: "Leave the launch pad with any controllable rocket.",
    objective: "Lift off from Homeworld.",
    progressLabel: (ctx) => ctx.flightStats?.hasLaunched ? "Launched" : "On pad",
    isComplete: (ctx) => Boolean(ctx.flightStats?.hasLaunched || getAltitude(ctx.rocket, PLANET) > 25)
  },
  {
    id: "reach_sky",
    chapter: "flight_school",
    chapterOrder: 2,
    title: "Reach the Sky",
    reward: 100000,
    researchReward: 5,
    recommendedTemplateId: "orbit_starter",
    recommendedTemplateLabel: "Starter Orbit",
    description: "Reach 1,500 m above the surface.",
    objective: "Max altitude 1.50 km.",
    progressLabel: (ctx) => `${formatDistance(Math.min(ctx.flightStats?.maxAltitude ?? 0, 1500))} / 1.50 km`,
    isComplete: (ctx) => (ctx.flightStats?.maxAltitude ?? 0) >= 1500
  },
  {
    id: "recover_rocket",
    chapter: "flight_school",
    chapterOrder: 3,
    title: "Recover Rocket",
    reward: 160000,
    researchReward: 10,
    recommendedTemplateId: "recovery_test",
    recommendedTemplateLabel: "Recovery Test",
    description: "Land a command pod safely using parachutes, legs, or careful flying.",
    objective: "Safely recover a rocket.",
    progressLabel: (ctx) => ctx.flightStats?.outcome === "Recovered" ? "Recovered" : "Not recovered yet",
    isComplete: (ctx) => Boolean(ctx.flightStats?.ended && ctx.flightStats?.outcome === "Recovered")
  },
  {
    id: "touch_space",
    chapter: "orbit_program",
    chapterOrder: 1,
    title: "Touch Space",
    reward: 240000,
    researchReward: 10,
    recommendedTemplateId: "orbit_starter",
    recommendedTemplateLabel: "Starter Orbit",
    description: "Climb above Homeworld's atmosphere.",
    objective: `Reach ${formatDistance(PLANET.atmosphereHeight)} altitude.`,
    progressLabel: (ctx) => `${formatDistance(Math.min(ctx.flightStats?.maxAltitude ?? 0, PLANET.atmosphereHeight))} / ${formatDistance(PLANET.atmosphereHeight)}`,
    isComplete: (ctx) => (ctx.flightStats?.maxAltitude ?? 0) >= PLANET.atmosphereHeight
  },
  {
    id: "first_orbit",
    chapter: "orbit_program",
    chapterOrder: 2,
    title: "First Orbit",
    reward: 600000,
    researchReward: 15,
    recommendedTemplateId: "orbit_starter",
    recommendedTemplateLabel: "Starter Orbit",
    description: "Hold a stable orbit long enough for mission control to confirm it.",
    objective: "Hold a stable orbit confirmation.",
    progressLabel: (ctx) => ctx.rocket?.missionComplete ? "Orbit confirmed" : `${(ctx.rocket?.orbitHoldTime ?? 0).toFixed(1)}s hold`,
    isComplete: (ctx) => Boolean(ctx.rocket?.missionComplete || getOrbitStatus(ctx.rocket, PLANET) === "Orbit achieved")
  },
  {
    id: "deploy_satellite",
    chapter: "orbital_business",
    chapterOrder: 1,
    title: "Deploy Satellite",
    reward: 800000,
    researchReward: 20,
    recommendedTemplateId: "sat_launcher",
    recommendedTemplateLabel: "Satellite Launcher",
    description: "Deploy a satellite into stable orbit so it starts generating revenue.",
    objective: "Online satellite in orbit.",
    progressLabel: (ctx) => `${countOnlinePayloads(ctx, "satellite")} online`,
    isComplete: (ctx) => countOnlinePayloads(ctx, "satellite") > 0
  },
  {
    id: "deploy_datacenter",
    chapter: "orbital_business",
    chapterOrder: 2,
    title: "Deploy Data Center",
    reward: 1500000,
    researchReward: 30,
    recommendedTemplateId: "data_center",
    recommendedTemplateLabel: "Data Center Rig",
    description: "Deploy an orbital data center for stronger recurring income.",
    objective: "Online data center in orbit.",
    progressLabel: (ctx) => `${countOnlinePayloads(ctx, "data_center")} online`,
    isComplete: (ctx) => countOnlinePayloads(ctx, "data_center") > 0
  },
  {
    id: "clean_orbit",
    chapter: "orbital_business",
    chapterOrder: 3,
    title: "Clean Orbit",
    reward: 60000,
    researchReward: 10,
    recommendedTemplateId: "recovery_test",
    recommendedTemplateLabel: "Recovery Test",
    description: "Select orbital debris and destroy it to keep space usable.",
    objective: "Destroy one debris object.",
    progressLabel: (ctx) => `${ctx.company?.totalDestroyed ?? 0} destroyed`,
    isComplete: (ctx) => (ctx.company?.totalDestroyed ?? 0) >= 1
  },
  {
    id: "launch_explorer",
    chapter: "exploration_program",
    chapterOrder: 1,
    title: "Launch Explorer",
    reward: 1000000,
    researchReward: 35,
    recommendedTemplateId: "explorer_sat",
    recommendedTemplateLabel: "Explorer Probe",
    description: "Launch an exploration satellite after researching Orbital Surveying.",
    objective: "Online exploration satellite in orbit.",
    progressLabel: (ctx) => `${countOnlinePayloads(ctx, "exploration_satellite")} online`,
    isComplete: (ctx) => countOnlinePayloads(ctx, "exploration_satellite") > 0
  },
  {
    id: "build_orbital_network",
    chapter: "exploration_program",
    chapterOrder: 2,
    title: "Build Orbital Network",
    reward: 700000,
    researchReward: 20,
    recommendedTemplateId: "sat_launcher",
    recommendedTemplateLabel: "Satellite Launcher",
    description: "Keep multiple payloads online so the company has a real orbital network.",
    objective: "Have 3 online payloads.",
    progressLabel: (ctx) => `${countOnlinePayloads(ctx)} / 3 online`,
    isComplete: (ctx) => countOnlinePayloads(ctx) >= 3
  },
  {
    id: "generate_scan_data",
    chapter: "exploration_program",
    chapterOrder: 3,
    title: "Generate Scan Data",
    reward: 900000,
    researchReward: 25,
    recommendedTemplateId: "explorer_sat",
    recommendedTemplateLabel: "Explorer Probe",
    description: "Let exploration satellites gather the first useful survey data.",
    objective: "Generate 100 total Scan.",
    progressLabel: (ctx) => `${Math.floor(ctx.company?.totalScanGenerated ?? 0)} / 100 Scan`,
    isComplete: (ctx) => (ctx.company?.totalScanGenerated ?? 0) >= 100
  },
  {
    id: "detect_unknown_signal",
    chapter: "exploration_program",
    chapterOrder: 4,
    title: "Detect Unknown Signal",
    reward: 1200000,
    researchReward: 40,
    recommendedTemplateId: "explorer_sat",
    recommendedTemplateLabel: "Explorer Probe",
    description: "Accumulate enough scan data to identify the first planet-discovery target.",
    objective: "Reach 500 total Scan.",
    progressLabel: (ctx) => `${Math.floor(ctx.company?.totalScanGenerated ?? 0)} / 500 Scan`,
    isComplete: (ctx) => (ctx.company?.totalScanGenerated ?? 0) >= 500
  },
  {
    id: "discover_first_planet",
    chapter: "exploration_program",
    chapterOrder: 5,
    title: "Discover First Planet",
    reward: 1500000,
    researchReward: 50,
    recommendedTemplateId: "explorer_sat",
    recommendedTemplateLabel: "Explorer Probe",
    description: "Use orbital scan data to reveal the first new world beyond Homeworld.",
    objective: "Discover any planet.",
    progressLabel: (ctx) => `${countDiscoveredPlanets(ctx)} / 1 discovered`,
    isComplete: (ctx) => countDiscoveredPlanets(ctx) >= 1
  },
  {
    id: "survey_brim",
    chapter: "exploration_program",
    chapterOrder: 6,
    title: "Survey Brim",
    reward: 1800000,
    researchReward: 60,
    recommendedTemplateId: "explorer_sat",
    recommendedTemplateLabel: "Explorer Probe",
    description: "Keep scanning after Brim is found so mission control can prepare robotic targets.",
    objective: "Generate 1,000 total Scan after first discovery.",
    progressLabel: (ctx) => `${Math.floor(Math.min(ctx.company?.totalScanGenerated ?? 0, 1000))} / 1000 Scan`,
    isComplete: (ctx) => hasDiscoveredPlanet(ctx, "brim") && (ctx.company?.totalScanGenerated ?? 0) >= 1000
  },
  {
    id: "prepare_probe_mission",
    chapter: "exploration_program",
    chapterOrder: 7,
    title: "Prepare Probe Mission",
    reward: 2200000,
    researchReward: 75,
    recommendedTemplateId: "explorer_sat",
    recommendedTemplateLabel: "Explorer Probe",
    description: "Research robotic landers so the next version can send probes to discovered planets.",
    objective: "Research Robotic Landers.",
    progressLabel: (ctx) => ctx.company?.completedResearch?.includes("robotic_landers") ? "Robotic landers ready" : "Research required",
    isComplete: (ctx) => Boolean(ctx.company?.completedResearch?.includes("robotic_landers"))
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
  const chapterProgress = getMissionChapterProgress(context);
  return MISSIONS.map((mission) => {
    const state = missionState[mission.id] ?? { completed: false, rewardClaimed: false };
    const chapter = getMissionChapter(mission.chapter);
    return {
      ...mission,
      chapterTitle: chapter?.title ?? "Campaign",
      chapterDescription: chapter?.description ?? "Complete missions to advance.",
      chapterProgress: chapterProgress.find((entry) => entry.id === mission.chapter) ?? null,
      completed: Boolean(state.completed),
      rewardClaimed: Boolean(state.rewardClaimed),
      progress: mission.progressLabel(context)
    };
  });
}

export function getNextMission(context) {
  return getMissionView(context).find((mission) => !mission.completed) ?? null;
}

export function getMissionChapter(id) {
  return MISSION_CHAPTERS.find((chapter) => chapter.id === id) ?? null;
}

export function getMissionChapterProgress(context) {
  const missionState = normalizeMissionState(context.company?.missions ?? {});
  return MISSION_CHAPTERS.map((chapter) => {
    const chapterMissions = MISSIONS.filter((mission) => mission.chapter === chapter.id);
    const completed = chapterMissions.filter((mission) => Boolean(missionState[mission.id]?.completed)).length;
    return {
      ...chapter,
      completed,
      total: chapterMissions.length,
      complete: chapterMissions.length > 0 && completed >= chapterMissions.length
    };
  });
}

function countOnlinePayloads(ctx, payloadType = "") {
  return (ctx.objects ?? []).filter((object) =>
    object &&
    object.kind === "payload" &&
    (!payloadType || object.payloadType === payloadType) &&
    object.online &&
    !object.crashed &&
    !object.exploded
  ).length;
}

function countDiscoveredPlanets(ctx) {
  return Array.isArray(ctx.company?.discoveredPlanets) ? ctx.company.discoveredPlanets.length : 0;
}

function hasDiscoveredPlanet(ctx, id) {
  return Array.isArray(ctx.company?.discoveredPlanets) && ctx.company.discoveredPlanets.includes(id);
}

function formatDistance(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${Math.round(value)} m`;
}

export function summarizeMissionReward(mission) {
  if (!mission) return "$0";
  const cash = `$${Math.round(mission.reward).toLocaleString()}`;
  const research = mission.researchReward ? ` + ${Math.round(mission.researchReward).toLocaleString()} Research` : "";
  return `${cash}${research}`;
}

export function getFlightEconomySummary(company = {}, flightStats = null) {
  return {
    launchCost: company.lastLaunchCost ?? 0,
    missionRewards: company.lastMissionReward ?? 0,
    recoveryRefund: flightStats?.recoveryRefund ?? 0,
    incomeThisSession: company.totalRevenue ?? 0
  };
}
