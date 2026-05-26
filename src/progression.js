export const PROGRESSION_VERSION = "v0.9.5";

export const PROGRAM_LEVELS = [
  { level: 1, title: "Backyard Rocketry", xp: 0, cashCap: 6000, researchCap: 40, scanCap: 250 },
  { level: 2, title: "Commercial Launches", xp: 100, cashCap: 18000, researchCap: 90, scanCap: 600 },
  { level: 3, title: "Orbital Infrastructure", xp: 280, cashCap: 50000, researchCap: 180, scanCap: 1400 },
  { level: 4, title: "Exploration Program", xp: 650, cashCap: 125000, researchCap: 360, scanCap: 3000 },
  { level: 5, title: "Planetary Operations", xp: 1250, cashCap: 300000, researchCap: 700, scanCap: 6500 },
  { level: 6, title: "Deep Space Company", xp: 2200, cashCap: 750000, researchCap: 1300, scanCap: 12000 }
];

export const DAILY_CONTRACTS = [
  {
    id: "daily_launches",
    title: "Launch Cadence",
    description: "Launch three rockets today.",
    metric: "launches",
    target: 3,
    reward: { cash: 3500, research: 8, xp: 20 }
  },
  {
    id: "daily_stars",
    title: "Contract Stars",
    description: "Earn six launch contract stars today.",
    metric: "contractStars",
    target: 6,
    reward: { cash: 5500, research: 14, xp: 30 }
  },
  {
    id: "daily_collection",
    title: "Collect Operations",
    description: "Collect stored passive income once today.",
    metric: "collections",
    target: 1,
    reward: { cash: 2000, research: 5, xp: 15 }
  }
];

export const ENGINEER_PROJECTS = [
  {
    id: "ops_console_1",
    name: "Ops Console I",
    lane: "Operations",
    description: "Improves contract planning and unlocks the first reliable company rhythm.",
    cost: 4000,
    durationSeconds: 20,
    xpReward: 25,
    effect: "Program XP reward and smoother early progression."
  },
  {
    id: "storage_yard_1",
    name: "Storage Yard I",
    lane: "Infrastructure",
    description: "Expands passive storage so income can build up between check-ins.",
    cost: 9000,
    durationSeconds: 45,
    xpReward: 35,
    effect: "+$8,000 passive cash cap, +45R cap, +300 Scan cap.",
    storageBonus: { cash: 8000, research: 45, scan: 300 }
  },
  {
    id: "research_lab_1",
    name: "Research Lab I",
    lane: "Research",
    description: "Adds better lab tooling for passive research collection and upgrades.",
    cost: 14000,
    durationSeconds: 75,
    xpReward: 45,
    effect: "+80R passive research cap and +20% research storage breathing room.",
    storageBonus: { research: 80 }
  },
  {
    id: "assembly_bay_1",
    name: "Assembly Bay I",
    lane: "Manufacturing",
    description: "Prepares the space center for larger rocket programs and heavier contracts.",
    cost: 30000,
    durationSeconds: 120,
    xpReward: 65,
    requiredProgramLevel: 2,
    effect: "+$30,000 passive cash cap and stronger mid-game pacing.",
    storageBonus: { cash: 30000 }
  },
  {
    id: "engineering_team_2",
    name: "Engineering Team II",
    lane: "Personnel",
    description: "Expands the company with a second engineer slot for parallel upgrades.",
    cost: 80000,
    durationSeconds: 240,
    xpReward: 100,
    requiredProgramLevel: 3,
    effect: "+1 engineer slot.",
    engineerSlotsBonus: 1
  }
];

export function createDefaultProgressionState() {
  const todayKey = getTodayKey();
  return {
    version: PROGRESSION_VERSION,
    programXp: 0,
    totalContractStars: 0,
    totalLaunchContracts: 0,
    passiveBank: { cash: 0, research: 0, scan: 0 },
    daily: createDailyState(todayKey),
    activeEngineerProjects: [],
    completedEngineerProjects: [],
    lastCompletedEngineerProject: ""
  };
}

export function normalizeProgressionState(progress = {}) {
  const defaults = createDefaultProgressionState();
  const todayKey = getTodayKey();
  const normalized = {
    ...defaults,
    ...progress,
    version: PROGRESSION_VERSION,
    programXp: Math.max(0, Number(progress.programXp ?? defaults.programXp)),
    totalContractStars: Math.max(0, Number(progress.totalContractStars ?? 0)),
    totalLaunchContracts: Math.max(0, Number(progress.totalLaunchContracts ?? 0)),
    passiveBank: normalizePassiveBank(progress.passiveBank ?? defaults.passiveBank),
    daily: normalizeDailyState(progress.daily, todayKey),
    activeEngineerProjects: normalizeEngineerQueue(progress.activeEngineerProjects),
    completedEngineerProjects: normalizeCompletedProjects(progress.completedEngineerProjects),
    lastCompletedEngineerProject: String(progress.lastCompletedEngineerProject ?? "")
  };
  return normalized;
}

export function syncProgressionState(company = {}) {
  company.progression = normalizeProgressionState(company.progression);
  trimPassiveBankToCaps(company);
  return company.progression;
}

export function getProgramLevelInfo(company = {}) {
  const progression = syncProgressionState(company);
  const xp = Number(progression.programXp ?? 0);
  let current = PROGRAM_LEVELS[0];
  for (const level of PROGRAM_LEVELS) {
    if (xp >= level.xp) current = level;
  }
  const next = PROGRAM_LEVELS.find((level) => level.xp > xp) ?? null;
  const previousXp = current.xp;
  const nextXp = next?.xp ?? Math.max(current.xp + 1, xp);
  const progress = next ? clamp((xp - previousXp) / Math.max(1, nextXp - previousXp), 0, 1) : 1;
  return {
    ...current,
    xp,
    nextLevel: next?.level ?? current.level,
    nextTitle: next?.title ?? "Max Program Level",
    nextXp,
    xpIntoLevel: Math.max(0, xp - previousXp),
    xpForNext: Math.max(0, nextXp - previousXp),
    xpRemaining: next ? Math.max(0, nextXp - xp) : 0,
    progress,
    isMaxLevel: !next
  };
}

export function getEngineerSlots(company = {}) {
  const progression = syncProgressionState(company);
  const completed = new Set(progression.completedEngineerProjects);
  let slots = 1;
  for (const project of ENGINEER_PROJECTS) {
    if (completed.has(project.id)) slots += Number(project.engineerSlotsBonus ?? 0);
  }
  return Math.max(1, Math.min(4, slots));
}

export function getStorageCaps(company = {}) {
  const level = getProgramLevelInfo(company);
  const progression = syncProgressionState(company);
  const completed = new Set(progression.completedEngineerProjects);
  const caps = {
    cash: Number(level.cashCap ?? 6000),
    research: Number(level.researchCap ?? 40),
    scan: Number(level.scanCap ?? 250)
  };
  for (const project of ENGINEER_PROJECTS) {
    if (!completed.has(project.id)) continue;
    const bonus = project.storageBonus ?? {};
    caps.cash += Number(bonus.cash ?? 0);
    caps.research += Number(bonus.research ?? 0);
    caps.scan += Number(bonus.scan ?? 0);
  }
  return caps;
}

export function addProgramXp(company = {}, amount = 0, reason = "") {
  const progression = syncProgressionState(company);
  const xp = Math.max(0, Math.round(Number(amount ?? 0)));
  if (xp <= 0) return { added: 0, leveledUp: false, levelBefore: getProgramLevelInfo(company), levelAfter: getProgramLevelInfo(company), reason };
  const before = getProgramLevelInfo(company);
  progression.programXp = Number(progression.programXp ?? 0) + xp;
  const after = getProgramLevelInfo(company);
  return { added: xp, leveledUp: after.level > before.level, levelBefore: before, levelAfter: after, reason };
}

export function depositPassiveIncome(company = {}, income = {}) {
  const caps = getStorageCaps(company);
  const progression = syncProgressionState(company);
  const bank = progression.passiveBank;
  const accepted = { cash: 0, research: 0, scan: 0 };
  for (const key of ["cash", "research", "scan"]) {
    const amount = Math.max(0, Number(income[key] ?? 0));
    const room = Math.max(0, Number(caps[key] ?? 0) - Number(bank[key] ?? 0));
    const stored = Math.min(room, amount);
    bank[key] = Number(bank[key] ?? 0) + stored;
    accepted[key] = stored;
  }
  return { accepted, bank: { ...bank }, caps };
}

export function collectPassiveIncome(company = {}) {
  const progression = syncProgressionState(company);
  const bank = normalizePassiveBank(progression.passiveBank);
  const collected = {
    cash: Math.floor(bank.cash),
    research: Math.floor(bank.research),
    scan: Math.floor(bank.scan)
  };
  if (collected.cash <= 0 && collected.research <= 0 && collected.scan <= 0) return { ok: false, reason: "Nothing to collect.", collected };

  company.money = Number(company.money ?? 0) + collected.cash;
  company.researchPoints = Number(company.researchPoints ?? 0) + collected.research;
  company.scanPoints = Number(company.scanPoints ?? 0) + collected.scan;
  company.totalScanGenerated = Number(company.totalScanGenerated ?? 0) + collected.scan;
  company.totalResearchEarned = Number(company.totalResearchEarned ?? 0) + collected.research;
  progression.passiveBank = {
    cash: Math.max(0, bank.cash - collected.cash),
    research: Math.max(0, bank.research - collected.research),
    scan: Math.max(0, bank.scan - collected.scan)
  };
  recordDailyProgress(company, "collections", 1);
  return { ok: true, collected };
}

export function getPassiveBankView(company = {}) {
  const caps = getStorageCaps(company);
  const progression = syncProgressionState(company);
  const bank = normalizePassiveBank(progression.passiveBank);
  return {
    bank,
    caps,
    fill: {
      cash: caps.cash > 0 ? clamp(bank.cash / caps.cash, 0, 1) : 0,
      research: caps.research > 0 ? clamp(bank.research / caps.research, 0, 1) : 0,
      scan: caps.scan > 0 ? clamp(bank.scan / caps.scan, 0, 1) : 0
    },
    hasCollectable: bank.cash >= 1 || bank.research >= 1 || bank.scan >= 1
  };
}

export function recordDailyProgress(company = {}, metric = "", amount = 1) {
  const progression = syncProgressionState(company);
  const todayKey = getTodayKey();
  if (progression.daily?.dateKey !== todayKey) progression.daily = createDailyState(todayKey);
  const safeAmount = Math.max(0, Number(amount ?? 0));
  progression.daily.stats[metric] = Number(progression.daily.stats[metric] ?? 0) + safeAmount;
  return progression.daily.stats[metric];
}

export function getDailyContractsView(company = {}) {
  const progression = syncProgressionState(company);
  const stats = progression.daily.stats ?? {};
  const claimed = new Set(progression.daily.claimed ?? []);
  return DAILY_CONTRACTS.map((contract) => {
    const progress = Math.max(0, Number(stats[contract.metric] ?? 0));
    const target = Math.max(1, Number(contract.target ?? 1));
    const complete = progress >= target;
    const isClaimed = claimed.has(contract.id);
    return {
      ...contract,
      progress,
      target,
      percent: clamp(progress / target, 0, 1),
      complete,
      claimed: isClaimed,
      claimable: complete && !isClaimed
    };
  });
}

export function claimDailyContract(company = {}, id) {
  const view = getDailyContractsView(company);
  const contract = view.find((candidate) => candidate.id === id);
  if (!contract) return { ok: false, reason: "Unknown daily contract." };
  if (contract.claimed) return { ok: false, reason: "Already claimed." };
  if (!contract.complete) return { ok: false, reason: "Daily contract is not complete." };
  const reward = contract.reward ?? {};
  company.money = Number(company.money ?? 0) + Number(reward.cash ?? 0);
  company.researchPoints = Number(company.researchPoints ?? 0) + Number(reward.research ?? 0);
  company.totalResearchEarned = Number(company.totalResearchEarned ?? 0) + Number(reward.research ?? 0);
  const xpResult = addProgramXp(company, reward.xp ?? 0, contract.title);
  const progression = syncProgressionState(company);
  progression.daily.claimed = [...new Set([...(progression.daily.claimed ?? []), contract.id])];
  return { ok: true, contract, reward, xpResult };
}

export function getAvailableEngineerProjects(company = {}) {
  const progression = syncProgressionState(company);
  const completed = new Set(progression.completedEngineerProjects);
  const active = new Set(progression.activeEngineerProjects.map((project) => project.id));
  const level = getProgramLevelInfo(company).level;
  return ENGINEER_PROJECTS.map((project) => {
    const complete = completed.has(project.id);
    const activeProject = progression.activeEngineerProjects.find((candidate) => candidate.id === project.id) ?? null;
    const activeNow = Boolean(activeProject);
    const requiredLevel = Number(project.requiredProgramLevel ?? 1);
    const locked = level < requiredLevel;
    const affordable = Number(company.money ?? 0) >= Number(project.cost ?? 0) || hasCostBypass(company);
    return {
      ...project,
      complete,
      active: activeNow,
      activeProject,
      locked,
      affordable,
      canStart: !complete && !activeNow && !locked && affordable && progression.activeEngineerProjects.length < getEngineerSlots(company),
      remainingMs: activeProject ? Math.max(0, Number(activeProject.finishAt ?? 0) - Date.now()) : 0
    };
  });
}

export function startEngineerProject(company = {}, id) {
  const project = getAvailableEngineerProjects(company).find((candidate) => candidate.id === id);
  if (!project) return { ok: false, reason: "Unknown engineer project." };
  if (project.complete) return { ok: false, reason: "Project already complete." };
  if (project.active) return { ok: false, reason: "Project already in progress." };
  if (project.locked) return { ok: false, reason: `Requires Program Level ${project.requiredProgramLevel}.` };
  const slots = getEngineerSlots(company);
  const queueState = syncProgressionState(company);
  if (queueState.activeEngineerProjects.length >= slots) return { ok: false, reason: "All engineers are busy." };
  if (!hasCostBypass(company) && Number(company.money ?? 0) < Number(project.cost ?? 0)) return { ok: false, reason: "Not enough cash." };
  if (!hasCostBypass(company)) company.money = Math.max(0, Number(company.money ?? 0) - Number(project.cost ?? 0));
  const now = Date.now();
  queueState.activeEngineerProjects.push({
    id: project.id,
    startedAt: now,
    finishAt: now + Math.max(1, Number(project.durationSeconds ?? 1)) * 1000
  });
  return { ok: true, project };
}

export function finishReadyEngineerProjects(company = {}) {
  const progression = normalizeProgressionState(company.progression ?? {});
  company.progression = progression;
  const now = Date.now();
  const completed = new Set(progression.completedEngineerProjects);
  const finished = [];
  const stillActive = [];
  for (const active of progression.activeEngineerProjects ?? []) {
    if (Number(active.finishAt ?? 0) <= now) {
      const project = ENGINEER_PROJECTS.find((candidate) => candidate.id === active.id);
      if (project && !completed.has(project.id)) {
        completed.add(project.id);
        finished.push(project);
        progression.programXp = Number(progression.programXp ?? 0) + Math.max(0, Math.round(Number(project.xpReward ?? 0)));
        progression.lastCompletedEngineerProject = project.id;
      }
    } else {
      stillActive.push(active);
    }
  }
  progression.completedEngineerProjects = [...completed];
  progression.activeEngineerProjects = stillActive;
  trimPassiveBankToCaps(company);
  return finished;
}

export function getEngineerView(company = {}) {
  const finished = finishReadyEngineerProjects(company);
  const progression = syncProgressionState(company);
  return {
    slots: getEngineerSlots(company),
    active: progression.activeEngineerProjects.map((active) => {
      const project = ENGINEER_PROJECTS.find((candidate) => candidate.id === active.id) ?? { id: active.id, name: "Unknown Project", durationSeconds: 1 };
      const now = Date.now();
      const totalMs = Math.max(1, Number(active.finishAt ?? now) - Number(active.startedAt ?? now - 1));
      const remainingMs = Math.max(0, Number(active.finishAt ?? now) - now);
      return {
        ...project,
        startedAt: active.startedAt,
        finishAt: active.finishAt,
        remainingMs,
        progress: clamp(1 - remainingMs / totalMs, 0, 1),
        ready: remainingMs <= 0
      };
    }),
    projects: getAvailableEngineerProjects(company),
    finished
  };
}

export function evaluateLaunchContract(company = {}, flightStats = {}, context = {}) {
  const level = getProgramLevelInfo(company).level;
  const maxAltitude = Number(flightStats.maxAltitude ?? 0);
  const maxSpeed = Number(flightStats.maxSpeed ?? 0);
  const recovered = flightStats.outcome === "Recovered";
  const missionComplete = Boolean(context.rocket?.missionComplete || (context.rocket?.payloadsOnline ?? 0) > 0);
  const contract = level >= 3
    ? {
        title: "Orbital Delivery",
        description: "Prove you can deliver orbital value.",
        stars: [
          { label: "Reach space", complete: maxAltitude >= 80000 },
          { label: "Sustain high speed", complete: maxSpeed >= 850 },
          { label: "Complete payload/orbit objective", complete: missionComplete }
        ],
        rewardPerStar: { cash: 4500, research: 8, xp: 10 }
      }
    : level >= 2
      ? {
          title: "Edge of Space Contract",
          description: "Push your launch program toward orbit.",
          stars: [
            { label: "Reach 25 km", complete: maxAltitude >= 25000 },
            { label: "Reach 80 km", complete: maxAltitude >= 80000 },
            { label: "Recover or complete objective", complete: recovered || missionComplete }
          ],
          rewardPerStar: { cash: 3000, research: 6, xp: 8 }
        }
      : {
          title: "Training Flight",
          description: "Build launch discipline and early momentum.",
          stars: [
            { label: "Clear 1 km", complete: maxAltitude >= 1000 },
            { label: "Reach 10 km", complete: maxAltitude >= 10000 },
            { label: "Recover or clear 30 km", complete: recovered || maxAltitude >= 30000 }
          ],
          rewardPerStar: { cash: 1600, research: 4, xp: 6 }
        };
  const stars = contract.stars.filter((star) => star.complete).length;
  const reward = {
    cash: Math.round(stars * contract.rewardPerStar.cash),
    research: Math.round(stars * contract.rewardPerStar.research),
    xp: Math.round(stars * contract.rewardPerStar.xp)
  };
  return { ...contract, starsEarned: stars, reward };
}

export function applyLaunchContractReward(company = {}, contract = {}) {
  const stars = Math.max(0, Number(contract.starsEarned ?? 0));
  if (stars <= 0) return { ok: false, reward: { cash: 0, research: 0, xp: 0 } };
  const reward = contract.reward ?? { cash: 0, research: 0, xp: 0 };
  company.money = Number(company.money ?? 0) + Number(reward.cash ?? 0);
  company.researchPoints = Number(company.researchPoints ?? 0) + Number(reward.research ?? 0);
  company.totalResearchEarned = Number(company.totalResearchEarned ?? 0) + Number(reward.research ?? 0);
  company.totalMissionRewards = Number(company.totalMissionRewards ?? 0) + Number(reward.cash ?? 0);
  const progression = syncProgressionState(company);
  progression.totalContractStars = Number(progression.totalContractStars ?? 0) + stars;
  progression.totalLaunchContracts = Number(progression.totalLaunchContracts ?? 0) + 1;
  recordDailyProgress(company, "contractStars", stars);
  const xpResult = addProgramXp(company, reward.xp ?? 0, contract.title);
  return { ok: true, reward, xpResult };
}

export function getRecommendedNextAction(company = {}, context = {}) {
  const progression = syncProgressionState(company);
  const daily = getDailyContractsView(company);
  const claimableDaily = daily.find((contract) => contract.claimable);
  if (claimableDaily) {
    return { tone: "reward", title: "Claim Daily Contract", body: `${claimableDaily.title} is complete. Claim the reward.`, action: "Claim", target: "daily" };
  }
  const bank = getPassiveBankView(company);
  if (bank.hasCollectable && (bank.fill.cash > 0.45 || bank.fill.research > 0.45 || bank.fill.scan > 0.45)) {
    return { tone: "income", title: "Collect Stored Income", body: "Your passive storage has useful cash, research, or scan data waiting.", action: "Collect", target: "bank" };
  }
  const engineer = getEngineerView(company);
  if (engineer.active.length < engineer.slots) {
    const project = engineer.projects.find((candidate) => candidate.canStart) ?? engineer.projects.find((candidate) => !candidate.complete && !candidate.active && !candidate.locked);
    if (project) {
      return { tone: "engineer", title: "Start Engineer Project", body: `${project.name}: ${project.effect}`, action: "Start", target: "engineer" };
    }
  }
  const research = context.research ?? [];
  const readyResearch = research.find((node) => node.available);
  if (readyResearch) {
    return { tone: "research", title: "Research Ready", body: `${readyResearch.name} is affordable and unlocked.`, action: "Research", target: "research" };
  }
  if (context.nextMission) {
    return { tone: "mission", title: "Next Launch Goal", body: `${context.nextMission.title}: ${context.nextMission.objective}`, action: "Launch", target: "missions" };
  }
  return { tone: "info", title: "Grow the Program", body: "Launch contracts, collect income, and keep engineers busy.", action: "Review", target: "missions" };
}

function normalizePassiveBank(bank = {}) {
  return {
    cash: Math.max(0, Number(bank.cash ?? 0)),
    research: Math.max(0, Number(bank.research ?? 0)),
    scan: Math.max(0, Number(bank.scan ?? 0))
  };
}

function createDailyState(dateKey) {
  return {
    dateKey,
    stats: { launches: 0, contractStars: 0, collections: 0, recoveries: 0, research: 0 },
    claimed: []
  };
}

function normalizeDailyState(daily = {}, todayKey = getTodayKey()) {
  if (!daily || daily.dateKey !== todayKey) return createDailyState(todayKey);
  return {
    dateKey: todayKey,
    stats: {
      launches: Math.max(0, Number(daily.stats?.launches ?? 0)),
      contractStars: Math.max(0, Number(daily.stats?.contractStars ?? 0)),
      collections: Math.max(0, Number(daily.stats?.collections ?? 0)),
      recoveries: Math.max(0, Number(daily.stats?.recoveries ?? 0)),
      research: Math.max(0, Number(daily.stats?.research ?? 0))
    },
    claimed: Array.isArray(daily.claimed) ? [...new Set(daily.claimed.map(String))] : []
  };
}

function normalizeEngineerQueue(queue = []) {
  if (!Array.isArray(queue)) return [];
  return queue
    .filter((item) => item && ENGINEER_PROJECTS.some((project) => project.id === item.id))
    .map((item) => ({ id: String(item.id), startedAt: Number(item.startedAt ?? Date.now()), finishAt: Number(item.finishAt ?? Date.now()) }))
    .slice(0, 4);
}

function normalizeCompletedProjects(projects = []) {
  const validIds = new Set(ENGINEER_PROJECTS.map((project) => project.id));
  if (!Array.isArray(projects)) return [];
  return [...new Set(projects.filter((id) => validIds.has(id)))];
}

function trimPassiveBankToCaps(company = {}) {
  const progression = company.progression ?? createDefaultProgressionState();
  const caps = getStorageCapsWithoutSync(company);
  const bank = normalizePassiveBank(progression.passiveBank);
  progression.passiveBank = {
    cash: Math.min(bank.cash, caps.cash),
    research: Math.min(bank.research, caps.research),
    scan: Math.min(bank.scan, caps.scan)
  };
  company.progression = progression;
}

function getStorageCapsWithoutSync(company = {}) {
  const xp = Number(company.progression?.programXp ?? 0);
  let level = PROGRAM_LEVELS[0];
  for (const candidate of PROGRAM_LEVELS) if (xp >= candidate.xp) level = candidate;
  const completed = new Set(Array.isArray(company.progression?.completedEngineerProjects) ? company.progression.completedEngineerProjects : []);
  const caps = { cash: level.cashCap, research: level.researchCap, scan: level.scanCap };
  for (const project of ENGINEER_PROJECTS) {
    if (!completed.has(project.id)) continue;
    caps.cash += Number(project.storageBonus?.cash ?? 0);
    caps.research += Number(project.storageBonus?.research ?? 0);
    caps.scan += Number(project.storageBonus?.scan ?? 0);
  }
  return caps;
}

export function getTodayKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function formatDuration(ms = 0) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms ?? 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function hasCostBypass(company = {}) {
  return Boolean(company.mode === "sandbox" || company.testResourcesEnabled);
}
