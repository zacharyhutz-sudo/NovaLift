import { PHYSICS, PLANET, ROCKET } from "./config.js";
import { MISSIONS, STARTING_CASH, evaluateMissions, getMissionChapterProgress, getMissionView, getNextMission, normalizeMissionState } from "./missions.js";
import {
  STARTING_RESEARCH,
  formatResearch,
  getResearchView,
  isResearchComplete,
  normalizeResearchState,
  purchaseResearch as purchaseResearchNode
} from "./research.js";
import {
  COLONY_PAYLOAD_TYPES,
  COLONY_VERSION,
  PLANET_DISCOVERY_VERSION,
  formatPayloadTypeLabel,
  getActiveColonyMissionTarget,
  getActiveColonyMissionView,
  getDiscoveredPhysicalPlanets,
  getNextPlanetSignal,
  getPlanetRegistryView,
  getTotalColonyProduction,
  hasCostBypass,
  hasInfiniteTestResources,
  normalizeColonyDeliveryState,
  normalizeColonyState,
  normalizePlanetState,
  processPlanetDiscovery,
  recordColonyPayloadDelivery,
  setActiveColonyMissionTarget,
  upgradeColony as upgradePlanetColony
} from "./planets.js";
import {
  addProgramXp,
  applyLaunchContractReward,
  claimDailyContract as claimDailyContractReward,
  collectPassiveIncome as collectPassiveBank,
  depositPassiveIncome,
  evaluateLaunchContract,
  finishReadyEngineerProjects,
  getDailyContractsView,
  getEngineerView,
  getPassiveBankView,
  getProgramLevelInfo,
  getRecommendedNextAction,
  normalizeProgressionState,
  recordDailyProgress,
  startEngineerProject as startEngineerProjectInQueue
} from "./progression.js";
import {
  activateNextStage,
  cloneRocket,
  getAltitude,
  getAtmosphereDensity,
  getCircularOrbitSpeed,
  getDistanceToPlanet,
  getDragVector,
  getEscapeSpeed,
  getGravityVector,
  getOrbitStatus,
  getNextStageDescription,
  getRadialVelocity,
  getRocketMass,
  getSpeed,
  getStageFuelSummary,
  getTangentialSpeed,
  makeCommandVesselObject,
  rotateRocket,
  recalculateRocketStats,
  stepDetachedObject,
  stepRocket,
  updateDetachedObjectStatus
} from "./physics.js";

const WORLD_OBJECTS_STORAGE_KEY = "novaliftWorldObjects.v2";
const LEGACY_WORLD_OBJECTS_STORAGE_KEY = "novaliftWorldObjects.v1";
const COMPANY_STORAGE_KEY = "novaliftCompany.v2";
const LEGACY_COMPANY_STORAGE_KEY = "novaliftCompany.v1";
const WORLD_OBJECT_SAVE_INTERVAL = 1.5;
const RECOVERY_REFUND_RATE = 0.55;
const CAREER_LAUNCHES_CHARGE_MONEY = true;
const MAX_PERSISTENT_OBJECTS = 80;
const ECONOMY_SCALE_VERSION = "v0.5.3-20x";
const LEGACY_ECONOMY_MULTIPLIER = 20;
const PAYLOAD_RATE_VERSION = "v0.9.1-physical-planets";
const TEST_RESOURCE_VERSION = "v0.9.6-infinite-resources";
const EARTH_MINE_COST = 100000;
const EARTH_MINE_INCOME_RATE = 1;
const EARTH_MINE_MAX = 10;
const SIGNAL_SCAN_TARGET = 500;
const FLIGHT_TIME_WARP_STEPS = [1, 2, 5, 10, 25];
const MAX_PHYSICS_STEPS_PER_FRAME = 90;

export class Game {
  constructor(input, renderer, rocketTemplate = ROCKET) {
    this.input = input;
    this.renderer = renderer;
    this.rocketTemplate = rocketTemplate;
    this.rocket = cloneRocket(this.rocketTemplate);
    this.objects = this.loadWorldObjects();
    this.company = this.loadCompany();
    this.selectedObjectId = null;
    this.saveTimer = 0;
    this.paused = false;
    this.debug = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.fps = 60;
    this.fpsSmoothed = 60;
    this.stageMessage = "Stage system ready.";
    this.stageMessageTimer = 4;
    this.feedbackEvents = [];
    this.flightStats = this.createFlightStats(this.rocket);
    this.flightTimeScale = 1;
    this.physicsStepBudgetExceeded = false;
  }

  emitFeedback(event = {}) {
    this.feedbackEvents.push({ ...event, createdAt: Date.now() });
  }

  consumeFeedbackEvents() {
    const events = this.feedbackEvents;
    this.feedbackEvents = [];
    return events;
  }

  getRocketWorldEffectPoint(offset = -80) {
    const angle = this.rocket?.angle ?? -Math.PI / 2;
    return {
      x: (this.rocket?.x ?? 0) + Math.cos(angle) * offset,
      y: (this.rocket?.y ?? 0) + Math.sin(angle) * offset
    };
  }

  getActivePlanets() {
    return getDiscoveredPhysicalPlanets(this.company);
  }

  getDominantPlanetFor(body = this.rocket) {
    const planets = this.getActivePlanets();
    if (!planets.length) return PLANET;
    let best = planets[0];
    let bestStrength = -Infinity;
    for (const planet of planets) {
      const dx = (body.x ?? 0) - planet.x;
      const dy = (body.y ?? 0) - planet.y;
      const distanceSq = Math.max(dx * dx + dy * dy, 1);
      const strength = (planet.mu ?? 0) / distanceSq;
      if (strength > bestStrength) {
        bestStrength = strength;
        best = planet;
      }
    }
    return best;
  }


  reset() {
    this.rocket = cloneRocket(this.rocketTemplate);
    this.objects = this.loadWorldObjects();
    this.selectedObjectId = null;
    this.saveTimer = 0;
    this.stageMessage = this.rocket.lastStageMessage ?? "Stage system ready.";
    this.stageMessageTimer = 4;
    this.flightStats = this.createFlightStats(this.rocket);
    this.accumulator = 0;
    if (this.renderer.followRocket) {
      this.renderer.followRocket(this.rocket);
    } else {
      this.renderer.recenterCamera?.(this.rocket, { forceRocket: true });
    }
  }

  setRocketTemplate(rocketTemplate) {
    this.persistActiveCommandVessel("new launch");
    const launchCost = Number(rocketTemplate?.buildStats?.cost ?? 0);
    this.chargeLaunchCost(launchCost);
    this.rocketTemplate = rocketTemplate;
    this.paused = false;
    this.reset();
    this.company.lastMissionReward = 0;
    this.company.lastLaunchCost = launchCost;
    this.company.totalLaunches = (this.company.totalLaunches ?? 0) + 1;
    recordDailyProgress(this.company, "launches", 1);
    addProgramXp(this.company, 3, "Launch committed");
    this.emitFeedback({
      title: "Launch committed",
      message: launchCost > 0 ? `Launch cost: ${formatMoney(launchCost)}.` : "Sandbox launch ready.",
      tone: "launch",
      sound: "launch",
      haptic: "medium",
      worldEffect: { type: "launch", x: this.rocket.x, y: this.rocket.y }
    });
    this.saveCompany();
  }

  canAffordLaunch(cost = 0) {
    if (hasCostBypass(this.company)) return true;
    if (!CAREER_LAUNCHES_CHARGE_MONEY) return true;
    return (this.company.money ?? 0) >= cost;
  }

  chargeLaunchCost(cost = 0) {
    const amount = Math.max(0, Math.round(cost));
    this.company.lastLaunchCost = amount;
    if (hasCostBypass(this.company) || !CAREER_LAUNCHES_CHARGE_MONEY || amount <= 0) return 0;
    this.company.money = Math.max(0, (this.company.money ?? 0) - amount);
    this.company.totalLaunchCosts = (this.company.totalLaunchCosts ?? 0) + amount;
    return amount;
  }

  setEconomyMode(mode) {
    this.company.mode = mode === "sandbox" ? "sandbox" : "career";
    if (this.company.mode === "career" && (this.company.money ?? 0) <= 0) {
      this.company.money = STARTING_CASH;
    }
    this.saveCompany();
  }

  toggleEconomyMode() {
    this.setEconomyMode(this.company.mode === "sandbox" ? "career" : "sandbox");
  }

  setTestResourcesEnabled(enabled) {
    this.company.testResourcesEnabled = Boolean(enabled);
    this.company.testResourceVersion = TEST_RESOURCE_VERSION;
    const discoveries = processPlanetDiscovery(this.company);
    if (this.company.testResourcesEnabled) {
      this.stageMessage = discoveries.length
        ? `Test resources enabled. ${discoveries.map((planet) => planet.name).join(", ")} mapped.`
        : "Test resources enabled: cash, Research, and Scan costs are bypassed.";
      this.stageMessageTimer = 8;
      this.emitFeedback({ title: "Test resources enabled", message: "Infinite cash, Research, and Scan are active for testing.", tone: "info", sound: "select", haptic: "medium" });
    } else {
      this.stageMessage = "Test resources disabled. Career balances are active again.";
      this.stageMessageTimer = 7;
      this.emitFeedback({ title: "Test resources disabled", message: "Career balances are active again.", tone: "info", sound: "select", haptic: "light" });
    }
    this.saveCompany();
  }

  toggleTestResources() {
    this.setTestResourcesEnabled(!this.company.testResourcesEnabled);
  }

  setFlightTimeScale(scale = 1) {
    const next = FLIGHT_TIME_WARP_STEPS.includes(Number(scale)) ? Number(scale) : 1;
    this.flightTimeScale = next;
    this.stageMessage = next > 1
      ? `Flight time warp set to ${next}x. Income and engineer timers remain real-time.`
      : "Flight time warp returned to 1x.";
    this.stageMessageTimer = 5;
    this.emitFeedback({
      title: next > 1 ? `Flight warp ${next}x` : "Flight warp off",
      message: next > 1 ? "Only flight physics are accelerated." : "Back to normal flight speed.",
      tone: "info",
      sound: "select",
      haptic: "light"
    });
  }

  cycleFlightTimeScale() {
    const current = Number(this.flightTimeScale ?? 1);
    const index = FLIGHT_TIME_WARP_STEPS.indexOf(current);
    const next = FLIGHT_TIME_WARP_STEPS[(index + 1) % FLIGHT_TIME_WARP_STEPS.length] ?? 1;
    this.setFlightTimeScale(next);
    return next;
  }

  persistActiveCommandVessel(reason = "left flight", options = {}) {
    if (!this.rocket || this.rocket.archived) return false;
    const keepLanded = Boolean(options.includeLanded);
    if (this.rocket.crashed && !options.includeCrashed) return false;
    if ((this.rocket.crashed || this.rocket.landed) && !keepLanded) return false;
    if (!keepLanded && !this.flightStats?.hasLaunched && getSpeed(this.rocket) < 1) return false;
    const activeParts = Array.isArray(this.rocket.parts)
      ? this.rocket.parts.filter((part) => part.active !== false)
      : [];
    const hasCommandPod = activeParts.some((part) => part.type === "command");
    if (!hasCommandPod) return false;

    const object = makeCommandVesselObject(activeParts, this.rocket, options.name ?? `Command Pod ${this.objects.filter((candidate) => candidate.kind === "vessel").length + 1}`);
    object.statusReason = reason;
    object.landed = Boolean(this.rocket.landed);
    object.crashed = Boolean(this.rocket.crashed);
    if (object.landed) object.status = "landed";
    if (object.crashed) object.status = "crashed";
    this.objects.push(object);
    this.rocket.archived = true;
    this.trimObjects();
    this.saveWorldObjects();
    this.stageMessage = "Previous command pod is now tracked in orbit space.";
    this.stageMessageTimer = 6;
    return true;
  }

  frame(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    let frameTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    frameTime = Math.min(frameTime, PHYSICS.maxFrameTime);

    const instantFps = frameTime > 0 ? 1 / frameTime : 60;
    this.fpsSmoothed += (instantFps - this.fpsSmoothed) * 0.08;
    this.fps = this.fpsSmoothed;

    this.handleGlobalActions();

    if (!this.paused) {
      const timeScale = Math.max(1, Number(this.flightTimeScale ?? 1));
      this.accumulator += frameTime * timeScale;
      let physicsSteps = 0;
      while (this.accumulator >= PHYSICS.fixedDt && physicsSteps < MAX_PHYSICS_STEPS_PER_FRAME) {
        this.updateFlightPhysics(PHYSICS.fixedDt);
        this.accumulator -= PHYSICS.fixedDt;
        physicsSteps += 1;
      }
      this.physicsStepBudgetExceeded = this.accumulator >= PHYSICS.fixedDt;
      if (this.physicsStepBudgetExceeded) this.accumulator = Math.min(this.accumulator, PHYSICS.fixedDt * 2);
      this.updateRealtimeCompanySystems(frameTime);
    } else {
      this.updatePassiveCompanySystems(frameTime);
    }

    this.renderer.render(this.getRenderState());
  }

  handleGlobalActions() {
    if (this.input.consume("reset")) this.reset();
    if (this.input.consume("pause")) this.paused = !this.paused;
    if (this.input.consume("debug")) this.debug = !this.debug;
    if (this.input.consume("warp")) this.cycleFlightTimeScale();
    if (this.input.consume("stage")) this.activateStage();
  }

  activateStage() {
    const result = activateNextStage(this.rocket, this.getDominantPlanetFor(this.rocket));
    let colonyDeliveryMessages = [];
    if (result.objects?.length) {
      this.objects.push(...result.objects);
      colonyDeliveryMessages = this.processColonyPayloadDeliveries(result.objects);
      this.trimObjects();
      this.saveWorldObjects();
    }
    this.stageMessage = [result.message, ...colonyDeliveryMessages].filter(Boolean).join(" ");
    this.stageMessageTimer = 6;
    const effectPoint = this.getRocketWorldEffectPoint(-90);
    this.emitFeedback({
      title: "Stage fired",
      message: result.message,
      tone: result.ok === false ? "warning" : "info",
      sound: result.ok === false ? "error" : "stage",
      haptic: result.ok === false ? "error" : "medium",
      worldEffect: { type: "stage", x: effectPoint.x, y: effectPoint.y }
    });
  }

  createFlightStats(rocket = this.rocket) {
    return {
      hasLaunched: false,
      ended: false,
      outcome: "",
      maxAltitude: Math.max(0, getAltitude(rocket, this.getDominantPlanetFor(rocket))),
      maxSpeed: 0,
      fuelStart: rocket.maxFuel ?? 0,
      fuelUsed: 0,
      recoveryRefund: 0,
      recoveryAvailable: 0,
      researchRewards: 0,
      recoveryCashedIn: false,
      recoveredParts: [],
      missionRewards: 0,
      contractReward: 0,
      contractResearchReward: 0,
      contractStars: 0,
      contractTitle: "",
      tip: ""
    };
  }

  update(dt) {
    this.updateFlightPhysics(dt);
    this.updateRealtimeCompanySystems(dt);
  }

  updateFlightPhysics(dt) {
    const turn = (this.input.isHeld("right") ? 1 : 0) - (this.input.isHeld("left") ? 1 : 0);
    rotateRocket(this.rocket, turn, dt);

    const activePlanet = this.getDominantPlanetFor(this.rocket);
    this.rocket.primaryPlanetId = activePlanet.id ?? "homeworld";
    this.rocket.primaryPlanetName = activePlanet.name ?? "Homeworld";

    stepRocket(
      this.rocket,
      {
        thrusting: this.input.isHeld("thrust")
      },
      dt,
      activePlanet
    );

    this.objects.forEach((object) => {
      const objectPlanet = this.getDominantPlanetFor(object);
      object.primaryPlanetId = objectPlanet.id ?? "homeworld";
      object.primaryPlanetName = objectPlanet.name ?? "Homeworld";
      stepDetachedObject(object, dt, objectPlanet);
    });
    this.trimObjects();
    this.updateFlightStats();
  }

  updateRealtimeCompanySystems(dt) {
    this.updateEngineerProjects();
    this.updateEconomy(dt);
    this.updateMissions();
    this.stageMessageTimer = Math.max(0, this.stageMessageTimer - dt);

    this.saveTimer += dt;
    if (this.saveTimer >= WORLD_OBJECT_SAVE_INTERVAL) {
      this.saveWorldObjects();
      this.saveCompany();
      this.saveTimer = 0;
    }
  }

  trimObjects() {
    this.objects = this.objects
      .filter((object) => object && !object.exploded && !object.crashed)
      .slice(-MAX_PERSISTENT_OBJECTS);

    if (this.selectedObjectId && this.selectedObjectId !== "current-rocket" && !this.objects.some((object) => object.id === this.selectedObjectId)) {
      this.selectedObjectId = null;
    }
  }

  updatePassiveCompanySystems(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.updateEngineerProjects();
    this.updateEconomy(dt);
    this.saveTimer += dt;
    if (this.saveTimer >= WORLD_OBJECT_SAVE_INTERVAL) {
      this.saveWorldObjects();
      this.saveCompany();
      this.saveTimer = 0;
    }
  }

  updateEconomy(dt) {
    const mineCount = clampMineCount(this.company.earthMineCount);
    const mineIncomeRate = mineCount * EARTH_MINE_INCOME_RATE;
    const colonyProduction = getTotalColonyProduction(this.company);
    let orbitalIncomeRate = 0;
    let researchRate = Number(colonyProduction.research ?? 0);
    let scanRate = Number(colonyProduction.scan ?? 0);
    const telemetryOnline = isResearchComplete(this.company, "orbital_telemetry");

    for (const object of this.objects) {
      if (!object || object.crashed || object.exploded) continue;
      updateDetachedObjectStatus(object, this.getDominantPlanetFor(object));
      if (object.kind === "payload" && object.online) {
        const rate = Number(object.incomeRate ?? 0);
        if (rate > 0) {
          orbitalIncomeRate += rate;
          const earned = rate * dt;
          object.revenueEarned = (object.revenueEarned ?? 0) + earned;
        }

        const dataRate = telemetryOnline ? Number(object.researchRate ?? 0) : 0;
        if (dataRate > 0) {
          researchRate += dataRate;
          const dataEarned = dataRate * dt;
          object.researchEarned = (object.researchEarned ?? 0) + dataEarned;
        }

        const surveyRate = Number(object.scanRate ?? 0);
        if (surveyRate > 0) {
          scanRate += surveyRate;
          const scanEarned = surveyRate * dt;
          object.scanEarned = (object.scanEarned ?? 0) + scanEarned;
        }
      }
    }

    const colonyIncomeRate = Number(colonyProduction.cash ?? 0);
    const incomeRate = mineIncomeRate + orbitalIncomeRate + colonyIncomeRate;
    this.company.earthMineCount = mineCount;
    this.company.earthMineIncomePerSecond = mineIncomeRate;
    this.company.orbitalIncomePerSecond = orbitalIncomeRate;
    this.company.colonyIncomePerSecond = colonyIncomeRate;
    this.company.colonyResearchPerSecond = Number(colonyProduction.research ?? 0);
    this.company.colonyScanPerSecond = Number(colonyProduction.scan ?? 0);
    this.company.incomePerSecond = incomeRate;
    this.company.researchPerSecond = researchRate;
    this.company.scanPerSecond = scanRate;
    if (incomeRate > 0 || researchRate > 0 || scanRate > 0) {
      const earned = incomeRate * dt;
      const dataEarned = researchRate * dt;
      const scanEarned = scanRate * dt;
      const deposit = depositPassiveIncome(this.company, { cash: earned, research: dataEarned, scan: scanEarned });
      this.company.totalRevenue = (this.company.totalRevenue ?? 0) + (deposit.accepted.cash ?? 0);
      this.company.totalMineRevenue = (this.company.totalMineRevenue ?? 0) + Math.min(mineIncomeRate * dt, deposit.accepted.cash ?? 0);
    }

    const discoveries = processPlanetDiscovery(this.company);
    if (discoveries.length) {
      const names = discoveries.map((planet) => planet.name).join(", ");
      this.stageMessage = discoveries.length === 1 ? `Planet discovered: ${names}.` : `Planets discovered: ${names}.`;
      this.stageMessageTimer = 10;
      this.emitFeedback({
        title: discoveries.length === 1 ? "Planet discovered" : "Planets discovered",
        message: names,
        tone: "reward",
        sound: "unlock",
        haptic: "success",
        reward: {
          title: discoveries.length === 1 ? `Planet Discovered: ${names}` : "New Planets Discovered",
          subtitle: "Your orbital network revealed a new destination.",
          stats: discoveries.map((planet) => `${planet.name}: ${Math.round((planet.gravity ?? 0) * 100) / 100}g`),
          tone: "reward",
          kicker: "Discovery",
          icon: "◐"
        },
        worldEffect: { type: "unlock", x: this.rocket.x, y: this.rocket.y }
      });
      this.saveCompany();
    }
  }

  canBuyEarthMine() {
    if (clampMineCount(this.company.earthMineCount) >= EARTH_MINE_MAX) return false;
    if (hasCostBypass(this.company)) return true;
    return Number(this.company.money ?? 0) >= EARTH_MINE_COST;
  }

  buyEarthMine() {
    const current = clampMineCount(this.company.earthMineCount);
    if (current >= EARTH_MINE_MAX) {
      this.stageMessage = "Earth mine limit reached.";
      this.stageMessageTimer = 5;
      this.emitFeedback({ title: "Mine limit reached", message: "All Earth mine slots are already built.", tone: "warning", sound: "error", haptic: "error" });
      return { ok: false, reason: "Mine limit reached." };
    }

    if (!hasCostBypass(this.company) && Number(this.company.money ?? 0) < EARTH_MINE_COST) {
      this.stageMessage = `Need ${formatMoney(EARTH_MINE_COST)} to buy another Earth mine.`;
      this.stageMessageTimer = 5;
      this.emitFeedback({ title: "Not enough cash", message: `Need ${formatMoney(EARTH_MINE_COST)} to buy another Earth mine.`, tone: "warning", sound: "error", haptic: "error" });
      return { ok: false, reason: "Not enough cash." };
    }

    if (!hasCostBypass(this.company)) {
      this.company.money = Math.max(0, Number(this.company.money ?? 0) - EARTH_MINE_COST);
      this.company.totalMineBuildCosts = (this.company.totalMineBuildCosts ?? 0) + EARTH_MINE_COST;
    }
    this.company.earthMineCount = current + 1;
    this.company.earthMineIncomePerSecond = this.company.earthMineCount * EARTH_MINE_INCOME_RATE;
    this.stageMessage = `Earth mine purchased. Mines now produce ${formatMoney(this.company.earthMineIncomePerSecond)}/sec.`;
    this.stageMessageTimer = 7;
    this.emitFeedback({
      title: "Earth mine purchased",
      message: `Mines now produce ${formatMoney(this.company.earthMineIncomePerSecond)}/sec.`,
      tone: "success",
      sound: "reward",
      haptic: "success"
    });
    this.saveCompany();
    return { ok: true, mineCount: this.company.earthMineCount };
  }

  upgradeColony(planetId) {
    const result = upgradePlanetColony(this.company, planetId);
    if (result.ok) {
      const planetName = result.planet?.name ?? "planet";
      const action = result.tier.level === 1 ? "Outpost established" : "Colony upgraded";
      const production = result.view?.production ?? { cash: 0, research: 0, scan: 0 };
      this.stageMessage = `${action}: ${planetName} is now ${result.tier.name}.`;
      this.stageMessageTimer = 9;
      addProgramXp(this.company, result.tier.level === 1 ? 60 : 40, `${planetName} ${result.tier.name}`);
      this.emitFeedback({
        title: action,
        message: `${planetName} · ${result.tier.name}`,
        tone: "reward",
        sound: "unlock",
        haptic: "success",
        reward: {
          title: `${planetName} ${result.tier.name}`,
          subtitle: result.planet?.colony?.summary ?? "Offworld operations are now online.",
          stats: [
            `${formatMoney(production.cash)}/s`,
            `${formatResearch(production.research, 3)}R/s`,
            `${Math.round(production.scan * 100) / 100} Scan/s`
          ],
          tone: "reward",
          kicker: "Colonization",
          icon: "COL"
        }
      });
      this.updateMissions();
      this.saveCompany();
    } else {
      this.stageMessage = result.reason ?? "Colony unavailable.";
      this.stageMessageTimer = 6;
      this.emitFeedback({ title: "Colony unavailable", message: result.reason ?? "Colony unavailable.", tone: "warning", sound: "error", haptic: "error" });
    }
    return result;
  }

  setColonyMissionTarget(planetId) {
    const result = setActiveColonyMissionTarget(this.company, planetId);
    if (result.ok) {
      const mission = result.mission;
      this.stageMessage = mission
        ? `Colony target set: ${result.planet.name}. Next payload: ${formatPayloadTypeLabel(mission.requiredPayloadType)}.`
        : `Colony target set: ${result.planet.name}.`;
      this.stageMessageTimer = 7;
      this.emitFeedback({
        title: "Colony target set",
        message: mission ? `${result.planet.name} needs ${formatPayloadTypeLabel(mission.requiredPayloadType)}.` : result.planet.name,
        tone: "info",
        sound: "select",
        haptic: "light"
      });
      this.saveCompany();
    } else {
      this.stageMessage = result.reason ?? "Could not set target.";
      this.stageMessageTimer = 5;
      this.emitFeedback({ title: "Target unavailable", message: result.reason ?? "Could not set target.", tone: "warning", sound: "error", haptic: "error" });
    }
    return result;
  }

  processColonyPayloadDeliveries(objects = []) {
    const messages = [];
    const targetId = getActiveColonyMissionTarget(this.company);
    if (!targetId) return messages;

    for (const object of objects) {
      if (!object || object.kind !== "payload" || !object.online || object.colonyDelivered) continue;
      const payloadType = String(object.payloadType || object.payloadRole || "");
      if (!COLONY_PAYLOAD_TYPES.has(payloadType)) continue;

      const result = recordColonyPayloadDelivery(this.company, targetId, payloadType);
      if (!result.ok) {
        messages.push(result.reason ?? `${formatPayloadTypeLabel(payloadType)} is not needed yet.`);
        continue;
      }

      object.colonyDelivered = true;
      object.colonyTargetId = targetId;
      object.colonyTargetName = result.planet?.name ?? "target planet";
      object.statusReason = `delivered to ${object.colonyTargetName}`;
      messages.push(`${formatPayloadTypeLabel(payloadType)} delivered to ${object.colonyTargetName}. Colony stage is ready to build.`);
      this.company.totalColonyPayloadDeliveries = (this.company.totalColonyPayloadDeliveries ?? 0) + 1;
      addProgramXp(this.company, 28, `${object.colonyTargetName} payload delivery`);
      this.emitFeedback({
        title: "Payload delivered",
        message: `${formatPayloadTypeLabel(payloadType)} → ${object.colonyTargetName}`,
        tone: "reward",
        sound: "unlock",
        haptic: "success",
        reward: {
          title: `${object.colonyTargetName} Delivery`,
          subtitle: `${formatPayloadTypeLabel(payloadType)} confirmed by Mission Control.`,
          stats: ["Colony stage ready"],
          tone: "success",
          kicker: "Planetary Mission",
          icon: "OPS"
        }
      });
    }

    if (messages.length) {
      this.updateMissions();
      this.saveCompany();
    }
    return messages;
  }

  updateMissions() {
    const context = this.getMissionContext();
    const { missionState, newlyCompleted } = evaluateMissions(context);
    this.company.missions = missionState;

    if (newlyCompleted.length) {
      const reward = newlyCompleted.reduce((total, mission) => total + (mission.reward ?? 0), 0);
      const researchReward = newlyCompleted.reduce((total, mission) => total + (mission.researchReward ?? 0), 0);
      this.company.money += reward;
      this.company.researchPoints = (this.company.researchPoints ?? 0) + researchReward;
      this.company.totalMissionRewards = (this.company.totalMissionRewards ?? 0) + reward;
      this.company.totalResearchEarned = (this.company.totalResearchEarned ?? 0) + researchReward;
      this.company.lastMissionReward = reward;
      this.company.lastResearchReward = researchReward;
      const xpResult = addProgramXp(this.company, newlyCompleted.length * 35, "Mission complete");
      if (this.flightStats) {
        this.flightStats.missionRewards = (this.flightStats.missionRewards ?? 0) + reward;
        this.flightStats.researchRewards = (this.flightStats.researchRewards ?? 0) + researchReward;
      }
      this.stageMessage = newlyCompleted
        .map((mission) => {
          const researchText = mission.researchReward ? ` +${Math.round(mission.researchReward).toLocaleString()} Research` : "";
          return `Mission complete: ${mission.title} +${formatMoney(mission.reward)}${researchText}.`;
        })
        .join(" ");
      this.stageMessageTimer = 9;
      const completedTitles = newlyCompleted.map((mission) => mission.title).join(", ");
      const stats = [`+${formatMoney(reward)}`];
      if (researchReward > 0) stats.push(`+${Math.round(researchReward).toLocaleString()}R`);
      if (xpResult.added > 0) stats.push(`+${xpResult.added} XP`);
      this.emitFeedback({
        title: newlyCompleted.length === 1 ? "Mission complete" : `${newlyCompleted.length} missions complete`,
        message: completedTitles,
        tone: "reward",
        sound: "reward",
        haptic: "success",
        reward: {
          title: newlyCompleted.length === 1 ? newlyCompleted[0].title : "Mission Chain Complete",
          subtitle: "Rewards added to your space program.",
          stats,
          tone: "success",
          kicker: newlyCompleted.length === 1 ? "Mission Complete" : "Campaign Progress",
          icon: "★"
        },
        worldEffect: { type: "reward", x: this.rocket.x, y: this.rocket.y }
      });
      this.saveCompany();
    }
  }

  getMissionContext() {
    return {
      rocket: this.rocket,
      objects: this.objects,
      company: this.company,
      flightStats: this.flightStats
    };
  }

  updateFlightStats() {
    if (!this.flightStats) this.flightStats = this.createFlightStats(this.rocket);

    const altitude = Math.max(0, getAltitude(this.rocket, this.getDominantPlanetFor(this.rocket)));
    const speed = getSpeed(this.rocket);
    const inFlight = !this.rocket.landed || speed > 0.1 || this.flightStats.hasLaunched;

    if (inFlight) {
      this.flightStats.hasLaunched = true;
      this.flightStats.maxAltitude = Math.max(this.flightStats.maxAltitude, altitude);
      this.flightStats.maxSpeed = Math.max(this.flightStats.maxSpeed, speed);
      this.flightStats.fuelUsed = Math.max(0, (this.flightStats.fuelStart ?? 0) - (this.rocket.fuel ?? 0));
    }

    if (this.flightStats.hasLaunched && !this.flightStats.ended && (this.rocket.crashed || this.rocket.landed)) {
      this.flightStats.ended = true;
      this.flightStats.outcome = this.rocket.crashed ? "Crashed" : "Recovered";
      if (!this.rocket.crashed) {
        const recovery = this.prepareRecoveryRefund();
        this.flightStats.recoveryRefund = recovery.refund;
        this.flightStats.recoveryAvailable = recovery.refund;
        this.flightStats.recoveredParts = recovery.parts;
        recordDailyProgress(this.company, "recoveries", 1);
      }
      this.evaluateFlightContract();
      this.flightStats.tip = this.getFlightTip();
      this.emitFeedback({
        title: this.rocket.crashed ? "Vehicle lost" : "Rocket recovered",
        message: this.rocket.crashed ? "The wreckage has been cleared from the world." : `Recovery value: ${formatMoney(this.flightStats.recoveryAvailable ?? 0)}.`,
        tone: this.rocket.crashed ? "danger" : "success",
        sound: this.rocket.crashed ? "crash" : "reward",
        haptic: this.rocket.crashed ? "heavy" : "success",
        worldEffect: { type: this.rocket.crashed ? "crash" : "landing", x: this.rocket.x, y: this.rocket.y }
      });
      if (this.rocket.crashed) this.removeFinishedActiveRocket("crashed");
    }
  }

  removeFinishedActiveRocket(reason = "finished") {
    if (!this.rocket) return false;
    const shouldClear = reason === "crashed" || reason === "recovered" || this.rocket.crashed;
    if (!shouldClear) return false;

    this.rocket.archived = true;
    this.rocket = cloneRocket(this.rocketTemplate);
    if (this.selectedObjectId === "current-rocket") this.selectedObjectId = null;
    this.renderer.followRocket?.(this.rocket, { snap: true });
    return true;
  }

  prepareRecoveryRefund() {
    const activeParts = Array.isArray(this.rocket.parts)
      ? this.rocket.parts.filter((part) => part.active !== false)
      : [];
    const parts = activeParts.map((part) => ({
      name: part.shortName ?? part.name ?? "Recovered Part",
      type: part.type ?? "part",
      cost: Number(part.cost ?? 0),
      refund: Math.round(Number(part.cost ?? 0) * RECOVERY_REFUND_RATE)
    }));
    const refund = parts.reduce((total, part) => total + part.refund, 0);
    return { refund, parts };
  }

  cashInRecovery() {
    if (!this.flightStats?.ended || this.flightStats.outcome !== "Recovered") return 0;
    if (this.flightStats.recoveryCashedIn) return 0;
    const amount = Math.max(0, Math.round(this.flightStats.recoveryAvailable ?? this.flightStats.recoveryRefund ?? 0));
    if (amount > 0) {
      this.company.money += amount;
      this.company.totalRecovery += amount;
      this.company.lastRecoveryRefund = amount;
      this.stageMessage = `Recovered parts cashed in: ${formatMoney(amount)}.`;
      this.stageMessageTimer = 8;
      this.emitFeedback({ title: "Recovery cashed in", message: `+${formatMoney(amount)} returned to cash.`, tone: "success", sound: "reward", haptic: "success" });
      this.saveCompany();
    }
    this.flightStats.recoveryCashedIn = true;
    this.flightStats.recoveryAvailable = 0;
    this.removeFinishedActiveRocket("recovered");
    return amount;
  }

  getFlightTip() {
    const maxAltitude = this.flightStats?.maxAltitude ?? 0;
    const activePlanet = this.getDominantPlanetFor(this.rocket);
    const tangential = getTangentialSpeed(this.rocket, activePlanet);
    const circular = getCircularOrbitSpeed(this.rocket, activePlanet);

    if (this.rocket.missionComplete || (this.rocket.payloadsOnline ?? 0) > 0) return "Great launch. Payload/orbit objective completed.";
    if (this.rocket.landed && !this.rocket.crashed) return "Nice recovery. Cash in the recovered parts from the flight results popup.";
    if (maxAltitude < activePlanet.atmosphereHeight * 0.65) return "Add fuel/thrust or reduce drag to climb out of the lower atmosphere.";
    if (tangential < circular * 0.68) return "You reached space, but need more sideways speed. Start tilting earlier.";
    if (this.rocket.parachuteState === "failed") return "The parachute ripped off. Wait until speed drops before staging recovery.";
    if (this.rocket.crashed && this.rocket.parachuteState !== "deployed") return "Use a parachute and landing legs before touchdown for recovery attempts.";
    return "Raise the low point of your arc above the atmosphere before deploying payloads.";
  }

  selectObject(objectId) {
    const object = this.objects.find((candidate) => candidate.id === objectId && !candidate.exploded);
    this.selectedObjectId = object ? object.id : null;
    return this.getSelectedObject();
  }

  clearSelectedObject() {
    this.selectedObjectId = null;
  }

  getSelectedObject() {
    if (!this.selectedObjectId) return null;
    return this.objects.find((object) => object.id === this.selectedObjectId && !object.exploded) ?? null;
  }

  explodeObject(objectId = this.selectedObjectId) {
    if (objectId === "current-rocket") {
      this.stageMessage = "Current craft destroyed.";
      this.stageMessageTimer = 6;
      this.emitFeedback({ title: "Craft destroyed", message: "Current craft removed from the world.", tone: "danger", sound: "crash", haptic: "heavy", worldEffect: { type: "crash", x: this.rocket.x, y: this.rocket.y } });
      this.company.totalDestroyed = (this.company.totalDestroyed ?? 0) + 1;
      this.rocket = cloneRocket(this.rocketTemplate);
      this.flightStats = this.createFlightStats(this.rocket);
      this.selectedObjectId = null;
      this.renderer.followRocket?.(this.rocket);
      this.saveCompany();
      return true;
    }
    const object = this.objects.find((candidate) => candidate.id === objectId);
    if (!object) return false;

    object.exploded = true;
    object.status = "destroyed";
    this.company.totalDestroyed = (this.company.totalDestroyed ?? 0) + 1;
    this.stageMessage = `${object.name ?? "Object"} destroyed.`;
    this.stageMessageTimer = 6;
    this.emitFeedback({ title: "Object destroyed", message: `${object.name ?? "Object"} removed from the world.`, tone: "danger", sound: "crash", haptic: "heavy", worldEffect: { type: "crash", x: object.x, y: object.y } });
    this.trimObjects();
    this.updateMissions();
    this.selectedObjectId = null;
    this.saveWorldObjects();
    this.saveCompany();
    return true;
  }

  controlObject(objectId = this.selectedObjectId) {
    const object = this.objects.find((candidate) => candidate.id === objectId && !candidate.exploded);
    if (objectId === "current-rocket") return true;
    if (!object || normalizeObjectKind(object) !== "vessel" || !objectContainsPartType(object, "command") || object.crashed) {
      this.stageMessage = "Select a command module to control it.";
      this.stageMessageTimer = 5;
      this.emitFeedback({ title: "Command required", message: "Select a command module to control it.", tone: "warning", sound: "error", haptic: "error" });
      return false;
    }

    this.persistActiveCommandVessel("switched control", { includeLanded: true, name: this.rocket?.landed ? "Launch Pad Rocket" : "Command Pod" });
    this.objects = this.objects.filter((candidate) => candidate.id !== object.id);

    const parts = Array.isArray(object.parts) ? object.parts.map((part) => ({ ...part, active: part.active !== false })) : [];
    this.rocket = cloneRocket({
      ...ROCKET,
      ...object,
      parts,
      landed: Boolean(object.landed),
      crashed: Boolean(object.crashed),
      archived: false,
      parachuteState: object.parachuteState ?? "packed",
      landingLegsDeployed: Boolean(object.landingLegsDeployed),
      nextStage: Number(object.nextStage ?? findNextStage(parts)),
      maxStage: Number(object.maxStage ?? findMaxStage(parts)),
      stageEvents: [],
      lastStageMessage: "Control switched to saved command module.",
      buildStats: {
        cost: Number(object.cost ?? 0),
        partCount: parts.length,
        launchMass: Number(object.mass ?? object.dryMass ?? 0),
        stageCount: Number(object.maxStage ?? findMaxStage(parts))
      }
    });
    recalculateRocketStats(this.rocket);
    this.flightStats = this.createFlightStats(this.rocket);
    this.flightStats.hasLaunched = !this.rocket.landed || getSpeed(this.rocket) > 1;
    this.selectedObjectId = null;
    this.paused = false;
    this.stageMessage = `Control switched to ${object.name ?? "command module"}.`;
    this.stageMessageTimer = 7;
    this.emitFeedback({ title: "Control switched", message: object.name ?? "Command module", tone: "info", sound: "select", haptic: "medium" });
    this.trimObjects();
    this.saveWorldObjects();
    this.saveCompany();
    this.renderer.followRocket?.(this.rocket);
    return true;
  }

  sellObject(objectId = this.selectedObjectId) {
    if (objectId === "current-rocket") return this.sellActiveRocket();
    const object = this.objects.find((candidate) => candidate.id === objectId && !candidate.exploded);
    if (!object) return false;
    if (!object.landed && !object.crashed) {
      this.stageMessage = "Only landed or crashed craft can be sold.";
      this.stageMessageTimer = 5;
      this.emitFeedback({ title: "Cannot sell in flight", message: "Only landed or crashed craft can be sold.", tone: "warning", sound: "error", haptic: "error" });
      return false;
    }
    const refund = getObjectSaleValue(object);
    if (refund > 0 && !hasCostBypass(this.company)) {
      this.company.money = (this.company.money ?? 0) + refund;
      this.company.totalRecovery = (this.company.totalRecovery ?? 0) + refund;
    }
    object.exploded = true;
    this.company.totalSoldObjects = (this.company.totalSoldObjects ?? 0) + 1;
    this.stageMessage = `${object.name ?? "Craft"} sold for ${formatMoney(refund)}.`;
    this.stageMessageTimer = 7;
    this.emitFeedback({ title: "Craft sold", message: `Recovered ${formatMoney(refund)}.`, tone: "success", sound: "reward", haptic: "success" });
    this.selectedObjectId = null;
    this.trimObjects();
    this.saveWorldObjects();
    this.saveCompany();
    return true;
  }

  sellActiveRocket() {
    if (!this.rocket || (!this.rocket.landed && !this.rocket.crashed)) return false;
    const refund = getObjectSaleValue(this.rocket);
    if (refund > 0 && !hasCostBypass(this.company)) {
      this.company.money = (this.company.money ?? 0) + refund;
      this.company.totalRecovery = (this.company.totalRecovery ?? 0) + refund;
    }
    this.company.totalSoldObjects = (this.company.totalSoldObjects ?? 0) + 1;
    this.stageMessage = `Current craft sold for ${formatMoney(refund)}.`;
    this.stageMessageTimer = 7;
    this.emitFeedback({ title: "Craft sold", message: `Recovered ${formatMoney(refund)}.`, tone: "success", sound: "reward", haptic: "success" });
    this.rocket = cloneRocket(this.rocketTemplate);
    this.flightStats = this.createFlightStats(this.rocket);
    this.selectedObjectId = null;
    this.renderer.followRocket?.(this.rocket);
    this.saveCompany();
    return true;
  }

  purchaseResearch(id) {
    const result = purchaseResearchNode(this.company, id);
    if (result.ok) {
      const unlocked = result.node.unlockText ? ` ${result.node.unlockText}` : "";
      recordDailyProgress(this.company, "research", 1);
      const xpResult = addProgramXp(this.company, 20, result.node.name);
      this.stageMessage = `Research complete: ${result.node.name}.${unlocked}`;
      this.stageMessageTimer = 9;
      this.emitFeedback({
        title: "Research complete",
        message: result.node.name,
        tone: "reward",
        sound: "unlock",
        haptic: "success",
        reward: {
          title: result.node.name,
          subtitle: result.node.unlockText ?? "New program capability unlocked.",
          stats: [hasInfiniteTestResources(this.company) ? "Test cost bypassed" : `-${formatResearch(result.node.cost ?? 0)}R`, `+${xpResult.added} XP`],
          tone: "reward",
          kicker: "Program Unlock",
          icon: "✦"
        }
      });
      this.saveCompany();
    } else {
      this.stageMessage = result.reason ?? "Research unavailable.";
      this.stageMessageTimer = 6;
      this.emitFeedback({ title: "Research unavailable", message: result.reason ?? "Research unavailable.", tone: "warning", sound: "error", haptic: "error" });
    }
    return result;
  }

  updateEngineerProjects() {
    const finished = finishReadyEngineerProjects(this.company);
    if (!finished.length) return;
    const names = finished.map((project) => project.name).join(", ");
    this.stageMessage = `Engineer project complete: ${names}.`;
    this.stageMessageTimer = 8;
    this.emitFeedback({
      title: finished.length === 1 ? "Engineer project complete" : "Engineer projects complete",
      message: names,
      tone: "reward",
      sound: "unlock",
      haptic: "success",
      reward: {
        title: finished.length === 1 ? finished[0].name : "Engineering Progress",
        subtitle: finished.length === 1 ? finished[0].effect : names,
        stats: finished.map((project) => `+${Math.round(project.xpReward ?? 0)} XP`),
        tone: "reward",
        kicker: "Engineer Complete",
        icon: "ENG"
      }
    });
    this.saveCompany();
  }

  startEngineerProject(id) {
    const result = startEngineerProjectInQueue(this.company, id);
    if (result.ok) {
      this.stageMessage = `Engineer started: ${result.project.name}.`;
      this.stageMessageTimer = 7;
      this.emitFeedback({ title: "Engineer assigned", message: result.project.name, tone: "info", sound: "select", haptic: "medium" });
      this.saveCompany();
    } else {
      this.stageMessage = result.reason ?? "Project unavailable.";
      this.stageMessageTimer = 5;
      this.emitFeedback({ title: "Project unavailable", message: result.reason ?? "Project unavailable.", tone: "warning", sound: "error", haptic: "error" });
    }
    return result;
  }

  collectPassiveIncome() {
    const result = collectPassiveBank(this.company);
    if (result.ok) {
      const pieces = [];
      if (result.collected.cash > 0) pieces.push(`+${formatMoney(result.collected.cash)}`);
      if (result.collected.research > 0) pieces.push(`+${formatResearch(result.collected.research)}R`);
      if (result.collected.scan > 0) pieces.push(`+${Math.round(result.collected.scan).toLocaleString()} Scan`);
      this.stageMessage = `Collected operations: ${pieces.join(" · ")}.`;
      this.stageMessageTimer = 7;
      this.emitFeedback({ title: "Operations collected", message: pieces.join(" · "), tone: "success", sound: "reward", haptic: "success" });
      this.saveCompany();
    } else {
      this.emitFeedback({ title: "Nothing to collect", message: result.reason ?? "Passive storage is empty.", tone: "info", sound: "select", haptic: "light" });
    }
    return result;
  }

  claimDailyContract(id) {
    const result = claimDailyContractReward(this.company, id);
    if (result.ok) {
      const reward = result.reward ?? {};
      const stats = [];
      if (reward.cash) stats.push(`+${formatMoney(reward.cash)}`);
      if (reward.research) stats.push(`+${formatResearch(reward.research)}R`);
      if (reward.xp) stats.push(`+${Math.round(reward.xp)} XP`);
      this.stageMessage = `Daily claimed: ${result.contract.title}.`;
      this.stageMessageTimer = 7;
      this.emitFeedback({
        title: "Daily contract claimed",
        message: result.contract.title,
        tone: "reward",
        sound: "reward",
        haptic: "success",
        reward: {
          title: result.contract.title,
          subtitle: "Daily rewards added to your program.",
          stats,
          tone: "success",
          kicker: "Daily Contract",
          icon: "DAY"
        }
      });
      this.saveCompany();
    } else {
      this.emitFeedback({ title: "Daily unavailable", message: result.reason ?? "Daily contract unavailable.", tone: "warning", sound: "error", haptic: "error" });
    }
    return result;
  }

  evaluateFlightContract() {
    if (!this.flightStats || this.flightStats.contractEvaluated) return null;
    this.flightStats.contractEvaluated = true;
    const contract = evaluateLaunchContract(this.company, this.flightStats, this.getMissionContext());
    const result = applyLaunchContractReward(this.company, contract);
    this.flightStats.contractTitle = contract.title;
    this.flightStats.contractStars = contract.starsEarned;
    this.flightStats.contractReward = result.reward?.cash ?? 0;
    this.flightStats.contractResearchReward = result.reward?.research ?? 0;
    if (result.ok) {
      this.flightStats.missionRewards = (this.flightStats.missionRewards ?? 0) + (result.reward?.cash ?? 0);
      this.flightStats.researchRewards = (this.flightStats.researchRewards ?? 0) + (result.reward?.research ?? 0);
      this.emitFeedback({
        title: `${contract.starsEarned}/3 contract stars`,
        message: contract.title,
        tone: "reward",
        sound: "reward",
        haptic: "success",
        reward: {
          title: contract.title,
          subtitle: contract.stars.map((star) => `${star.complete ? "DONE" : "MISS"}: ${star.label}`).join(" · "),
          stats: [`${contract.starsEarned}/3 Stars`, `+${formatMoney(result.reward?.cash ?? 0)}`, `+${formatResearch(result.reward?.research ?? 0)}R`, `+${Math.round(result.reward?.xp ?? 0)} XP`],
          tone: "success",
          kicker: "Launch Contract",
          icon: "3S"
        }
      });
    }
    return contract;
  }

  loadCompany() {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return createDefaultCompany();
      const raw = storage.getItem(COMPANY_STORAGE_KEY) ?? storage.getItem(LEGACY_COMPANY_STORAGE_KEY);
      if (!raw) return createDefaultCompany();
      const parsed = JSON.parse(raw);
      const hasMode = typeof parsed.mode === "string";
      const isLegacyEconomy = parsed.economyScaleVersion !== ECONOMY_SCALE_VERSION;
      const money = scaleLegacyMoney(Number(parsed.money ?? STARTING_CASH), isLegacyEconomy);
      const company = {
        ...createDefaultCompany(),
        ...parsed,
        economyScaleVersion: ECONOMY_SCALE_VERSION,
        mode: hasMode && parsed.mode === "sandbox" ? "sandbox" : "career",
        testResourcesEnabled: Boolean(parsed.testResourcesEnabled),
        testResourceVersion: parsed.testResourceVersion ?? "",
        money: hasMode ? Math.max(money, 0) : Math.max(money, STARTING_CASH),
        totalRevenue: scaleLegacyMoney(Number(parsed.totalRevenue ?? 0), isLegacyEconomy),
        totalRecovery: scaleLegacyMoney(Number(parsed.totalRecovery ?? 0), isLegacyEconomy),
        totalDestroyed: Number(parsed.totalDestroyed ?? 0),
        totalLaunches: Number(parsed.totalLaunches ?? 0),
        totalMissionRewards: scaleLegacyMoney(Number(parsed.totalMissionRewards ?? 0), isLegacyEconomy),
        totalLaunchCosts: scaleLegacyMoney(Number(parsed.totalLaunchCosts ?? 0), isLegacyEconomy),
        earthMineCount: clampMineCount(parsed.earthMineCount),
        earthMineIncomePerSecond: clampMineCount(parsed.earthMineCount) * EARTH_MINE_INCOME_RATE,
        totalMineRevenue: Number(parsed.totalMineRevenue ?? 0),
        totalMineBuildCosts: scaleLegacyMoney(Number(parsed.totalMineBuildCosts ?? 0), isLegacyEconomy),
        researchPoints: Number(parsed.researchPoints ?? STARTING_RESEARCH),
        totalResearchEarned: Number(parsed.totalResearchEarned ?? 0),
        completedResearch: normalizeResearchState(parsed.completedResearch),
        lastResearchReward: Number(parsed.lastResearchReward ?? 0),
        lastResearchPurchase: parsed.lastResearchPurchase ?? "",
        scanPoints: Number(parsed.scanPoints ?? 0),
        totalScanGenerated: Number(parsed.totalScanGenerated ?? 0),
        scanPerSecond: 0,
        discoveredPlanets: normalizePlanetState(parsed.discoveredPlanets),
        colonies: normalizeColonyState(parsed.colonies),
        colonyDeliveries: normalizeColonyDeliveryState(parsed.colonyDeliveries),
        colonyVersion: parsed.colonyVersion ?? COLONY_VERSION,
        activeColonyMissionTargetId: parsed.activeColonyMissionTargetId ?? "",
        totalColoniesBuilt: Object.keys(normalizeColonyState(parsed.colonies)).length,
        totalColonyPayloadDeliveries: Number(parsed.totalColonyPayloadDeliveries ?? 0),
        lastColonyPayloadDelivery: parsed.lastColonyPayloadDelivery ?? null,
        lastColonizedPlanet: parsed.lastColonizedPlanet ?? "",
        colonyIncomePerSecond: 0,
        colonyResearchPerSecond: 0,
        colonyScanPerSecond: 0,
        totalPlanetsDiscovered: normalizePlanetState(parsed.discoveredPlanets).length,
        lastDiscoveredPlanet: parsed.lastDiscoveredPlanet ?? "",
        planetDiscoveryVersion: PLANET_DISCOVERY_VERSION,
        lastRecoveryRefund: scaleLegacyMoney(Number(parsed.lastRecoveryRefund ?? 0), isLegacyEconomy),
        lastMissionReward: scaleLegacyMoney(Number(parsed.lastMissionReward ?? 0), isLegacyEconomy),
        lastLaunchCost: scaleLegacyMoney(Number(parsed.lastLaunchCost ?? 0), isLegacyEconomy),
        missions: normalizeMissionState(parsed.missions),
        progression: normalizeProgressionState(parsed.progression),
        incomePerSecond: 0,
        earthMineIncomePerSecond: clampMineCount(parsed.earthMineCount) * EARTH_MINE_INCOME_RATE,
        orbitalIncomePerSecond: 0,
        researchPerSecond: 0,
        scanPerSecond: 0
      };
      return backfillMissionResearchRewards(company);
    } catch (error) {
      console.warn("NovaLift could not load company state.", error);
      return createDefaultCompany();
    }
  }

  saveCompany() {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return;
      storage.setItem(COMPANY_STORAGE_KEY, JSON.stringify({
        economyScaleVersion: ECONOMY_SCALE_VERSION,
        mode: this.company.mode,
        testResourcesEnabled: Boolean(this.company.testResourcesEnabled),
        testResourceVersion: this.company.testResourceVersion ?? "",
        money: this.company.money,
        totalRevenue: this.company.totalRevenue,
        totalRecovery: this.company.totalRecovery,
        totalDestroyed: this.company.totalDestroyed,
        totalLaunches: this.company.totalLaunches ?? 0,
        totalMissionRewards: this.company.totalMissionRewards ?? 0,
        totalLaunchCosts: this.company.totalLaunchCosts ?? 0,
        earthMineCount: clampMineCount(this.company.earthMineCount),
        totalMineRevenue: this.company.totalMineRevenue ?? 0,
        totalMineBuildCosts: this.company.totalMineBuildCosts ?? 0,
        researchPoints: this.company.researchPoints ?? 0,
        totalResearchEarned: this.company.totalResearchEarned ?? 0,
        completedResearch: normalizeResearchState(this.company.completedResearch),
        lastResearchReward: this.company.lastResearchReward ?? 0,
        lastResearchPurchase: this.company.lastResearchPurchase ?? "",
        scanPoints: this.company.scanPoints ?? 0,
        totalScanGenerated: this.company.totalScanGenerated ?? 0,
        discoveredPlanets: normalizePlanetState(this.company.discoveredPlanets),
        colonies: normalizeColonyState(this.company.colonies),
        colonyDeliveries: normalizeColonyDeliveryState(this.company.colonyDeliveries),
        colonyVersion: this.company.colonyVersion ?? COLONY_VERSION,
        activeColonyMissionTargetId: this.company.activeColonyMissionTargetId ?? "",
        totalColoniesBuilt: Object.keys(normalizeColonyState(this.company.colonies)).length,
        totalColonyPayloadDeliveries: this.company.totalColonyPayloadDeliveries ?? 0,
        lastColonyPayloadDelivery: this.company.lastColonyPayloadDelivery ?? null,
        lastColonizedPlanet: this.company.lastColonizedPlanet ?? "",
        totalPlanetsDiscovered: normalizePlanetState(this.company.discoveredPlanets).length,
        lastDiscoveredPlanet: this.company.lastDiscoveredPlanet ?? "",
        planetDiscoveryVersion: PLANET_DISCOVERY_VERSION,
        lastRecoveryRefund: this.company.lastRecoveryRefund ?? 0,
        lastMissionReward: this.company.lastMissionReward ?? 0,
        lastLaunchCost: this.company.lastLaunchCost ?? 0,
        missions: normalizeMissionState(this.company.missions),
        progression: normalizeProgressionState(this.company.progression)
      }));
    } catch (error) {
      console.warn("NovaLift could not save company state.", error);
    }
  }

  loadWorldObjects() {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return [];
      const raw = storage.getItem(WORLD_OBJECTS_STORAGE_KEY) ?? storage.getItem(LEGACY_WORLD_OBJECTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((object) => object && !object.exploded && !object.crashed)
        .map((object) => normalizeStoredObject(object))
        .filter((object) => object && !object.exploded && !object.crashed)
        .slice(-MAX_PERSISTENT_OBJECTS);
    } catch (error) {
      console.warn("NovaLift could not load saved orbital objects.", error);
      return [];
    }
  }

  saveWorldObjects() {
    try {
      const storage = globalThis.localStorage;
      if (!storage) return;
      const objects = this.objects
        .filter((object) => object && !object.exploded && !object.crashed)
        .slice(-MAX_PERSISTENT_OBJECTS)
        .map((object) => serializeObject(object));
      storage.setItem(WORLD_OBJECTS_STORAGE_KEY, JSON.stringify(objects));
    } catch (error) {
      console.warn("NovaLift could not save orbital objects.", error);
    }
  }

  getRenderState() {
    const activePlanet = this.getDominantPlanetFor(this.rocket);
    return {
      rocket: this.rocket,
      objects: this.objects,
      planets: this.getActivePlanets(),
      activePlanet,
      selectedObjectId: this.selectedObjectId,
      paused: this.paused,
      debug: this.debug,
      flightTimeScale: this.flightTimeScale ?? 1,
      input: {
        thrusting: this.input.isHeld("thrust")
      }
    };
  }

  getHudData() {
    const activePlanet = this.getDominantPlanetFor(this.rocket);
    const altitude = getAltitude(this.rocket, activePlanet);
    const speed = getSpeed(this.rocket);
    const fuelPercent = this.rocket.maxFuel > 0 ? (this.rocket.fuel / this.rocket.maxFuel) * 100 : 0;
    const orbitStatus = getOrbitStatus(this.rocket, activePlanet);
    const warpLabel = Number(this.flightTimeScale ?? 1) > 1 ? ` · ${this.flightTimeScale}x warp` : "";
    const status = this.paused ? `Paused — ${orbitStatus}` : `${orbitStatus}${warpLabel}`;
    const density = getAtmosphereDensity(this.rocket, activePlanet);
    const drag = getDragVector(this.rocket, activePlanet);
    const onlinePayloads = this.objects.filter((object) => object.kind === "payload" && object.online && !object.crashed).length + (this.rocket.payloadsOnline ?? 0);
    const debrisCount = this.objects.filter((object) => object.kind === "debris" && !object.exploded).length;

    return {
      altitude,
      speed,
      fuelPercent,
      stageFuel: getStageFuelSummary(this.rocket),
      activePlanet,
      status,
      flightTimeScale: this.flightTimeScale ?? 1,
      physicsStepBudgetExceeded: Boolean(this.physicsStepBudgetExceeded),
      fps: this.fps,
      orbitHoldTime: this.rocket.orbitHoldTime,
      missionComplete: this.rocket.missionComplete || onlinePayloads > 0,
      nextStage: this.rocket.nextStage ?? 1,
      maxStage: this.rocket.maxStage ?? 0,
      nextStageDescription: getNextStageDescription(this.rocket),
      stageMessage: this.stageMessageTimer > 0 ? this.stageMessage : "",
      atmospherePercent: density * 100,
      dragStrength: drag.strength,
      parachuteState: this.rocket.parachuteState,
      landingLegsDeployed: this.rocket.landingLegsDeployed,
      onlinePayloads,
      savedOrbitalObjects: this.objects.filter((object) => object.kind === "payload" && !object.crashed).length,
      debrisCount,
      objectCount: this.objects.length,
      company: { ...this.company },
      research: getResearchView(this.company),
      missions: getMissionView(this.getMissionContext()),
      missionChapters: getMissionChapterProgress(this.getMissionContext()),
      nextMission: getNextMission(this.getMissionContext()),
      planets: getPlanetRegistryView(this.company),
      nextPlanetSignal: getNextPlanetSignal(this.company),
      activeColonyMission: getActiveColonyMissionView(this.company),
      programLevel: getProgramLevelInfo(this.company),
      dailyContracts: getDailyContractsView(this.company),
      engineer: getEngineerView(this.company),
      passiveBank: getPassiveBankView(this.company),
      recommendedAction: getRecommendedNextAction(this.company, { research: getResearchView(this.company), nextMission: getNextMission(this.getMissionContext()) }),
      flightSummary: this.getFlightSummary(),
      selectedObject: this.getSelectedObjectInfo(),
      trackedObjects: this.getTrackedObjects(),
      debugText: this.getDebugText()
    };
  }

  getTrackedObjects() {
    const tracked = [];

    if (this.rocket && Array.isArray(this.rocket.parts)) {
      const hasCommandPod = this.rocket.parts.some((part) => part.active !== false && part.type === "command");
      if (hasCommandPod && (this.flightStats?.hasLaunched || getSpeed(this.rocket) > 1 || this.rocket.landed || this.rocket.crashed)) {
        const saleValue = getObjectSaleValue(this.rocket);
        tracked.push({
          id: "current-rocket",
          name: this.rocket.landed ? "Current Rocket on Pad" : this.rocket.crashed ? "Crashed Current Rocket" : "Current Command Pod",
          kind: "vessel",
          category: "command",
          status: getOrbitStatus(this.rocket, this.getDominantPlanetFor(this.rocket)),
          altitude: getAltitude(this.rocket, this.getDominantPlanetFor(this.rocket)),
          speed: getSpeed(this.rocket),
          incomeRate: 0,
          researchRate: 0,
          baseResearchRate: 0,
          scanRate: 0,
          revenueEarned: 0,
          researchEarned: 0,
          scanEarned: 0,
          online: false,
          canControl: true,
          canSell: Boolean((this.rocket.landed || this.rocket.crashed) && saleValue > 0),
          saleValue,
          canExplode: true,
          isCurrentRocket: true,
          isCommandCenter: true
        });
      }
    }

    for (const object of this.objects) {
      if (!object || object.exploded) continue;
      const info = objectToInfo(object, this.company, this.getDominantPlanetFor(object));
      tracked.push(info);
    }

    return tracked.sort((a, b) => {
      const order = { payload: 0, vessel: 1, debris: 2 };
      return (order[a.kind] ?? 9) - (order[b.kind] ?? 9) || String(a.name).localeCompare(String(b.name));
    });
  }

  getSelectedObjectInfo() {
    if (this.selectedObjectId === "current-rocket") {
      return this.getTrackedObjects().find((object) => object.id === "current-rocket") ?? null;
    }
    const object = this.getSelectedObject();
    if (!object) return null;
    return objectToInfo(object, this.company, this.getDominantPlanetFor(object));
  }

  getFlightSummary() {
    if (!this.flightStats?.ended) return null;
    return {
      outcome: this.flightStats.outcome,
      maxAltitude: this.flightStats.maxAltitude,
      maxSpeed: this.flightStats.maxSpeed,
      fuelUsed: this.flightStats.fuelUsed,
      recoveryRefund: this.flightStats.recoveryRefund ?? 0,
      recoveryAvailable: this.flightStats.recoveryAvailable ?? 0,
      recoveryCashedIn: Boolean(this.flightStats.recoveryCashedIn),
      recoveredParts: this.flightStats.recoveredParts ?? [],
      launchCost: this.company.lastLaunchCost ?? 0,
      missionReward: this.flightStats.missionRewards ?? 0,
      researchReward: this.flightStats.researchRewards ?? 0,
      contractReward: this.flightStats.contractReward ?? 0,
      contractResearchReward: this.flightStats.contractResearchReward ?? 0,
      contractStars: this.flightStats.contractStars ?? 0,
      contractTitle: this.flightStats.contractTitle ?? "",
      net: (this.flightStats.missionRewards ?? 0) + (this.flightStats.recoveryCashedIn ? (this.flightStats.recoveryRefund ?? 0) : 0) - (this.company.mode === "sandbox" ? 0 : (this.company.lastLaunchCost ?? 0)),
      tip: this.flightStats.tip
    };
  }

  getDebugText() {
    const activePlanet = this.getDominantPlanetFor(this.rocket);
    const gravity = getGravityVector(this.rocket, activePlanet);
    const drag = getDragVector(this.rocket, activePlanet);
    const stageEvents = (this.rocket.stageEvents ?? []).map((event) => `- ${event.message}`).join("\n") || "None";

    return [
      `Primary body:  ${activePlanet.name ?? "Homeworld"}`,
      `Position:      x ${fmt(this.rocket.x)}   y ${fmt(this.rocket.y)}`,
      `Velocity:      x ${fmt(this.rocket.vx)}   y ${fmt(this.rocket.vy)}`,
      `Angle:         ${fmt((this.rocket.angle * 180) / Math.PI)}°`,
      `Distance:      ${fmt(getDistanceToPlanet(this.rocket, activePlanet))}`,
      `Altitude:      ${fmt(getAltitude(this.rocket, activePlanet))}`,
      `Speed:         ${fmt(getSpeed(this.rocket))}`,
      `Radial vel:    ${fmt(getRadialVelocity(this.rocket, activePlanet))}`,
      `Tangential:    ${fmt(getTangentialSpeed(this.rocket, activePlanet))}`,
      `Circular req:  ${fmt(getCircularOrbitSpeed(this.rocket, activePlanet))}`,
      `Escape req:    ${fmt(getEscapeSpeed(this.rocket, activePlanet))}`,
      `Gravity:       ${fmt(gravity.strength)}`,
      `Atmosphere:    ${fmt(getAtmosphereDensity(this.rocket, activePlanet) * 100)}%`,
      `Drag accel:    ${fmt(drag.strength)}`,
      `Drag area:     ${fmt(this.rocket.dragArea)}`,
      `Mass:          ${fmt(getRocketMass(this.rocket))}`,
      `Fuel:          ${fmt(this.rocket.fuel)} / ${this.rocket.maxFuel}`,
      `Active parts:  ${this.rocket.parts?.filter((part) => part.active !== false).length ?? 0}`,
      `Next stage:    ${this.rocket.nextStage ?? 1} / ${this.rocket.maxStage ?? 0}`,
      `Parachute:     ${this.rocket.parachuteState ?? "none"}`,
      `Landing legs:  ${this.rocket.landingLegsDeployed ? "deployed" : "stowed"}`,
      `Payloads:      ${this.objects.filter((object) => object.kind === "payload" && object.online).length}`,
      `Debris:        ${this.objects.filter((object) => object.kind === "debris").length}`,
      `Income:        ${formatMoney(this.company.incomePerSecond)}/sec`,
      `Earth mines:   ${clampMineCount(this.company.earthMineCount)} / ${EARTH_MINE_MAX} (${formatMoney(this.company.earthMineIncomePerSecond ?? 0)}/sec)`,
      `Orbital income:${formatMoney(this.company.orbitalIncomePerSecond ?? 0)}/sec`,
      `Research:      ${fmt(this.company.researchPoints ?? 0)} (${fmt(this.company.researchPerSecond ?? 0)}/sec)`,
      `Scan:          ${fmt(this.company.scanPoints ?? 0)} (${fmt(this.company.scanPerSecond ?? 0)}/sec)`,
      `Planets:       ${normalizePlanetState(this.company.discoveredPlanets).length} discovered`,
      `Colonies:      ${Object.keys(normalizeColonyState(this.company.colonies)).length} (${formatMoney(this.company.colonyIncomePerSecond ?? 0)}/sec)`,
      `Cash:          ${formatMoney(this.company.money)}`,
      `Mode:          ${this.company.mode}${hasInfiniteTestResources(this.company) ? " + test resources" : ""}`,
      `Flight warp:   ${this.flightTimeScale ?? 1}x (economy real-time)`,
      `Mission rewards: ${formatMoney(this.company.totalMissionRewards ?? 0)}`,
      `Launch costs:  ${formatMoney(this.company.totalLaunchCosts ?? 0)}`,
      `World objects: ${this.objects.length}`,
      `Selected:      ${this.selectedObjectId ?? "none"}`,
      `Stage log:\n${stageEvents}`,
      `Debug vectors: green = velocity, yellow = gravity`
    ].join("\n");
  }
}

function backfillMissionResearchRewards(company = {}) {
  const missions = normalizeMissionState(company.missions);
  const expectedMissionResearch = MISSIONS.reduce((total, mission) => {
    const state = missions[mission.id];
    return state?.completed ? total + Number(mission.researchReward ?? 0) : total;
  }, 0);
  const currentTotalResearch = Number(company.totalResearchEarned ?? 0);
  const missingResearch = Math.max(0, expectedMissionResearch - currentTotalResearch);

  if (missingResearch > 0) {
    company.researchPoints = Number(company.researchPoints ?? 0) + missingResearch;
    company.totalResearchEarned = currentTotalResearch + missingResearch;
    company.lastResearchReward = missingResearch;
  }

  company.missions = missions;
  return company;
}

function createDefaultCompany() {
  return {
    economyScaleVersion: ECONOMY_SCALE_VERSION,
    mode: "career",
    testResourcesEnabled: false,
    testResourceVersion: "",
    money: STARTING_CASH,
    totalRevenue: 0,
    totalRecovery: 0,
    totalDestroyed: 0,
    totalLaunches: 0,
    totalMissionRewards: 0,
    totalLaunchCosts: 0,
    earthMineCount: 0,
    earthMineIncomePerSecond: 0,
    orbitalIncomePerSecond: 0,
    totalMineRevenue: 0,
    totalMineBuildCosts: 0,
    researchPoints: STARTING_RESEARCH,
    totalResearchEarned: 0,
    completedResearch: normalizeResearchState(),
    incomePerSecond: 0,
    earthMineIncomePerSecond: 0,
    orbitalIncomePerSecond: 0,
    researchPerSecond: 0,
    scanPoints: 0,
    totalScanGenerated: 0,
    scanPerSecond: 0,
    discoveredPlanets: normalizePlanetState(),
    colonies: normalizeColonyState(),
    colonyDeliveries: normalizeColonyDeliveryState(),
    colonyVersion: COLONY_VERSION,
    activeColonyMissionTargetId: "",
    totalColoniesBuilt: 0,
    totalColonyPayloadDeliveries: 0,
    lastColonyPayloadDelivery: null,
    lastColonizedPlanet: "",
    colonyIncomePerSecond: 0,
    colonyResearchPerSecond: 0,
    colonyScanPerSecond: 0,
    totalPlanetsDiscovered: 0,
    lastDiscoveredPlanet: "",
    planetDiscoveryVersion: PLANET_DISCOVERY_VERSION,
    lastRecoveryRefund: 0,
    lastMissionReward: 0,
    lastResearchReward: 0,
    lastResearchPurchase: "",
    lastLaunchCost: 0,
    progression: normalizeProgressionState(),
    missions: normalizeMissionState()
  };
}

function scaleLegacyMoney(value, shouldScale) {
  if (!Number.isFinite(value)) return 0;
  return shouldScale ? value * LEGACY_ECONOMY_MULTIPLIER : value;
}

function clampMineCount(value) {
  const count = Math.floor(Number(value ?? 0));
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(EARTH_MINE_MAX, count));
}

function normalizeStoredObject(object) {
  const isLegacyEconomy = object?.economyScaleVersion !== ECONOMY_SCALE_VERSION;
  const payloadRates = getCurrentPayloadRates(object);
  const shouldRefreshPayloadRates = normalizeObjectKind(object) === "payload" && object?.payloadRateVersion !== PAYLOAD_RATE_VERSION;
  const normalized = {
    ...object,
    kind: normalizeObjectKind(object),
    x: Number(object.x ?? 0),
    y: Number(object.y ?? 0),
    vx: Number(object.vx ?? 0),
    vy: Number(object.vy ?? 0),
    angle: Number(object.angle ?? 0),
    dryMass: Number(object.dryMass ?? object.mass ?? 1),
    fuel: Number(object.fuel ?? 0),
    maxFuel: Number(object.maxFuel ?? 0),
    fuelMassPerUnit: Number(object.fuelMassPerUnit ?? ROCKET.fuelMassPerUnit),
    mass: Number(object.mass ?? object.dryMass ?? 1),
    dragArea: Number(object.dragArea ?? 1),
    collisionRadius: Number(object.collisionRadius ?? 10),
    economyScaleVersion: ECONOMY_SCALE_VERSION,
    payloadRateVersion: PAYLOAD_RATE_VERSION,
    cost: scaleLegacyMoney(Number(object.cost ?? 0), isLegacyEconomy),
    recoveryValue: scaleLegacyMoney(Number(object.recoveryValue ?? 0), isLegacyEconomy),
    incomeRate: shouldRefreshPayloadRates || object.incomeRate == null
      ? payloadRates.incomeRate
      : Number(object.incomeRate),
    researchRate: shouldRefreshPayloadRates || object.researchRate == null
      ? payloadRates.researchRate
      : Number(object.researchRate),
    scanRate: shouldRefreshPayloadRates || object.scanRate == null
      ? payloadRates.scanRate
      : Number(object.scanRate),
    payloadRole: object.payloadRole ?? payloadRates.payloadRole ?? inferPayloadType(object),
    revenueEarned: Number(object.revenueEarned ?? 0),
    researchEarned: Number(object.researchEarned ?? 0),
    scanEarned: Number(object.scanEarned ?? 0),
    parts: Array.isArray(object.parts) ? object.parts.map((part) => ({ ...part, active: part.active !== false })) : [],
    online: Boolean(object.online),
    crashed: Boolean(object.crashed),
    landed: Boolean(object.landed),
    exploded: Boolean(object.exploded),
    colonyDelivered: Boolean(object.colonyDelivered),
    colonyTargetId: object.colonyTargetId ?? "",
    colonyTargetName: object.colonyTargetName ?? "",
    status: object.status ?? "drifting",
    offlineReason: object.offlineReason ?? ""
  };

  normalized.payloadType = inferPayloadType(normalized);
  if (normalized.kind === "payload" && (!normalized.incomeRate || normalized.incomeRate <= 0)) {
    normalized.incomeRate = inferIncomeRate(normalized);
  }
  if (!normalized.crashed) updateDetachedObjectStatus(normalized, PLANET);
  return normalized;
}

function serializeObject(object) {
  return {
    economyScaleVersion: ECONOMY_SCALE_VERSION,
    payloadRateVersion: PAYLOAD_RATE_VERSION,
    id: object.id,
    name: object.name,
    kind: object.kind,
    payloadType: object.payloadType,
    x: object.x,
    y: object.y,
    vx: object.vx,
    vy: object.vy,
    angle: object.angle,
    dryMass: object.dryMass,
    fuel: Number(object.fuel ?? 0),
    maxFuel: Number(object.maxFuel ?? 0),
    fuelMassPerUnit: object.fuelMassPerUnit,
    mass: object.mass,
    dragArea: object.dragArea,
    collisionRadius: object.collisionRadius,
    color: object.color,
    parts: Array.isArray(object.parts) ? object.parts.map((part) => ({ ...part })) : [],
    status: object.status,
    offlineReason: object.offlineReason ?? "",
    cost: object.cost ?? 0,
    recoveryValue: object.recoveryValue ?? 0,
    incomeRate: object.incomeRate ?? 0,
    researchRate: object.researchRate ?? 0,
    scanRate: object.scanRate ?? 0,
    payloadRole: object.payloadRole ?? "",
    revenueEarned: object.revenueEarned ?? 0,
    researchEarned: object.researchEarned ?? 0,
    scanEarned: object.scanEarned ?? 0,
    online: Boolean(object.online),
    crashed: Boolean(object.crashed),
    landed: Boolean(object.landed),
    exploded: Boolean(object.exploded),
    colonyDelivered: Boolean(object.colonyDelivered),
    colonyTargetId: object.colonyTargetId ?? "",
    colonyTargetName: object.colonyTargetName ?? ""
  };
}

function normalizeObjectKind(object) {
  const rawKind = String(object?.kind ?? "").toLowerCase();
  const payloadType = inferPayloadType(object);

  // Payload evidence wins over legacy debris labels. Earlier builds could save a
  // deployed data center as debris, so we normalize those back into revenue objects.
  if (["payload", "satellite", "data_center", "datacenter", "data center"].includes(rawKind) || payloadType) return "payload";
  if (["vessel", "command", "command_pod", "command pod"].includes(rawKind)) return "vessel";
  if (objectContainsPartType(object, "command")) return "vessel";
  return "debris";
}

function inferPayloadType(object) {
  const existing = String(object?.payloadType ?? object?.payloadRole ?? "").toLowerCase();
  if (existing.includes("survey_probe")) return "survey_probe";
  if (existing.includes("robotic_lander")) return "robotic_lander";
  if (existing.includes("cargo_pod")) return "cargo_pod";
  if (existing.includes("power_module")) return "power_module";
  if (existing.includes("mining_rig")) return "mining_rig";
  if (existing.includes("habitat_module")) return "habitat_module";
  if (existing.includes("data")) return "data_center";
  if (existing.includes("exploration")) return "exploration_satellite";
  if (existing.includes("satellite")) return "satellite";

  const text = `${object?.name ?? ""} ${object?.id ?? ""}`.toLowerCase();
  const parts = Array.isArray(object?.parts) ? object.parts : [];
  if (text.includes("survey") || parts.some((part) => part.payloadRole === "survey_probe" || part.id?.includes("survey_probe") || /survey/i.test(part.name ?? ""))) return "survey_probe";
  if (text.includes("lander") || parts.some((part) => part.payloadRole === "robotic_lander" || part.id?.includes("robotic_lander") || /lander/i.test(part.name ?? ""))) return "robotic_lander";
  if (text.includes("cargo") || parts.some((part) => part.payloadRole === "cargo_pod" || part.id?.includes("cargo_pod") || /cargo/i.test(part.name ?? ""))) return "cargo_pod";
  if (text.includes("power") || parts.some((part) => part.payloadRole === "power_module" || part.id?.includes("power_module") || /power/i.test(part.name ?? ""))) return "power_module";
  if (text.includes("mining") || parts.some((part) => part.payloadRole === "mining_rig" || part.id?.includes("mining_rig") || /mining/i.test(part.name ?? ""))) return "mining_rig";
  if (text.includes("habitat") || parts.some((part) => part.payloadRole === "habitat_module" || part.id?.includes("habitat_module") || /habitat/i.test(part.name ?? ""))) return "habitat_module";
  if (text.includes("data") || parts.some((part) => part.id?.includes("data_center") || /data/i.test(part.name ?? ""))) return "data_center";
  if (text.includes("exploration") || parts.some((part) => part.id?.includes("exploration_satellite") || /exploration/i.test(part.name ?? ""))) return "exploration_satellite";
  if (text.includes("satellite") || parts.some((part) => part.id?.includes("satellite") || /satellite/i.test(part.name ?? ""))) return "satellite";
  if (parts.some((part) => part.type === "payload")) return "payload";
  return "";
}

function objectContainsPartType(object, type) {
  return Array.isArray(object?.parts) && object.parts.some((part) => part.type === type);
}

function defaultObjectName(kind, payloadType) {
  if (kind === "payload" && payloadType === "data_center") return "Orbital Data Center";
  if (kind === "payload" && payloadType === "exploration_satellite") return "Exploration Satellite";
  if (kind === "payload" && payloadType === "survey_probe") return "Survey Probe";
  if (kind === "payload" && payloadType === "robotic_lander") return "Robotic Lander";
  if (kind === "payload" && payloadType === "cargo_pod") return "Cargo Pod";
  if (kind === "payload" && payloadType === "power_module") return "Power Module";
  if (kind === "payload" && payloadType === "mining_rig") return "Mining Rig";
  if (kind === "payload" && payloadType === "habitat_module") return "Habitat Module";
  if (kind === "payload" && payloadType === "satellite") return "Small Satellite";
  if (kind === "payload") return "Payload";
  if (kind === "vessel") return "Command Pod";
  return "Orbital Debris";
}

function inferIncomeRate(object) {
  return getCurrentPayloadRates(object).incomeRate;
}

function inferResearchRate(object) {
  return getCurrentPayloadRates(object).researchRate;
}

function getCurrentPayloadRates(object) {
  const partId = inferPayloadPartId(object);
  if (["survey_probe_basic", "robotic_lander_payload", "cargo_pod_payload", "power_module_payload", "mining_rig_payload", "habitat_module_payload"].includes(partId)) {
    return { incomeRate: 0, researchRate: partId === "survey_probe_basic" ? 0.012 : 0, scanRate: partId === "survey_probe_basic" ? 0.1 : 0, payloadRole: inferPayloadType(object) || "payload" };
  }
  if (partId === "data_center_efficient") return { incomeRate: 15.2, researchRate: 0.011, scanRate: 0, payloadRole: "data" };
  if (partId === "exploration_satellite_basic") return { incomeRate: 1.6, researchRate: 0.018, scanRate: 0.18, payloadRole: "exploration" };
  if (partId === "satellite_basic") return { incomeRate: 2.8, researchRate: 0.0032, scanRate: 0, payloadRole: "comms" };
  if (partId === "data_center_basic") return { incomeRate: 7.2, researchRate: 0.0056, scanRate: 0, payloadRole: "data" };
  return normalizeObjectKind(object) === "payload" ? { incomeRate: 2, researchRate: 0.002, scanRate: 0, payloadRole: "payload" } : { incomeRate: 0, researchRate: 0, scanRate: 0, payloadRole: "" };
}

function inferPayloadPartId(object) {
  const parts = Array.isArray(object?.parts) ? object.parts : [];
  const ids = parts.map((part) => String(part.id ?? "").toLowerCase());
  if (ids.includes("survey_probe_basic")) return "survey_probe_basic";
  if (ids.includes("robotic_lander_payload")) return "robotic_lander_payload";
  if (ids.includes("cargo_pod_payload")) return "cargo_pod_payload";
  if (ids.includes("power_module_payload")) return "power_module_payload";
  if (ids.includes("mining_rig_payload")) return "mining_rig_payload";
  if (ids.includes("habitat_module_payload")) return "habitat_module_payload";
  if (ids.includes("data_center_efficient")) return "data_center_efficient";
  if (ids.includes("exploration_satellite_basic")) return "exploration_satellite_basic";
  if (ids.includes("satellite_basic")) return "satellite_basic";
  if (ids.includes("data_center_basic")) return "data_center_basic";

  const text = `${object?.name ?? ""} ${object?.id ?? ""} ${object?.payloadType ?? ""}`.toLowerCase();
  if (text.includes("survey")) return "survey_probe_basic";
  if (text.includes("lander")) return "robotic_lander_payload";
  if (text.includes("cargo")) return "cargo_pod_payload";
  if (text.includes("power")) return "power_module_payload";
  if (text.includes("mining")) return "mining_rig_payload";
  if (text.includes("habitat")) return "habitat_module_payload";
  if (text.includes("efficient") || text.includes("cloud")) return "data_center_efficient";
  if (text.includes("exploration") || text.includes("explorer")) return "exploration_satellite_basic";
  if (text.includes("data") || text.includes("center") || text.includes("dc")) return "data_center_basic";
  if (text.includes("satellite") || text.includes("sat")) return "satellite_basic";
  return "";
}

function objectToInfo(object, company = {}, planet = PLANET) {
  const kind = normalizeObjectKind(object);
  const payloadType = inferPayloadType(object);
  const onlinePayload = kind === "payload" && object.online;
  const telemetryOnline = company.mode === "sandbox" || isResearchComplete(company, "orbital_telemetry");
  const baseResearchRate = onlinePayload ? Number(object.researchRate ?? 0) : 0;
  const scanRate = onlinePayload ? Number(object.scanRate ?? 0) : 0;
  return {
    id: object.id,
    name: object.name ?? defaultObjectName(kind, payloadType),
    kind,
    payloadType,
    category: kind === "payload" ? payloadType : kind === "vessel" ? "command" : "debris",
    status: object.status ?? "unknown",
    primaryPlanetName: object.primaryPlanetName ?? planet.name ?? "Homeworld",
    offlineReason: object.offlineReason ?? "",
    altitude: getAltitude(object, planet),
    speed: getSpeed(object),
    incomeRate: onlinePayload ? Number(object.incomeRate ?? 0) : 0,
    researchRate: telemetryOnline ? baseResearchRate : 0,
    baseResearchRate,
    researchUnlocked: telemetryOnline,
    scanRate,
    payloadRole: object.payloadRole ?? payloadType,
    revenueEarned: Number(object.revenueEarned ?? 0),
    researchEarned: Number(object.researchEarned ?? 0),
    scanEarned: Number(object.scanEarned ?? 0),
    cost: Number(object.cost ?? 0),
    online: Boolean(object.online),
    canControl: kind === "vessel" && objectContainsPartType(object, "command") && !object.exploded && !object.crashed,
    canSell: Boolean((object.landed || object.crashed) && getObjectSaleValue(object) > 0),
    saleValue: getObjectSaleValue(object),
    canExplode: kind === "debris" || kind === "vessel" || kind === "payload",
    isCommandCenter: kind === "vessel" && objectContainsPartType(object, "command")
  };
}

function findMaxStage(parts = []) {
  return parts.reduce((max, part) => Math.max(max, Number(part.stage ?? 0)), 0);
}

function findNextStage(parts = []) {
  const stages = [...new Set(parts.map((part) => Number(part.stage ?? 0)).filter((stage) => stage > 0))].sort((a, b) => a - b);
  return stages[0] ?? 1;
}

function getObjectSaleValue(object = {}) {
  const base = Number(object.recoveryValue ?? 0) || (Array.isArray(object.parts) ? object.parts.reduce((total, part) => total + Number(part.cost ?? 0), 0) * 0.45 : Number(object.cost ?? 0) * 0.35);
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.round(base * (object.crashed ? 0.35 : 0.7));
}

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "$0";
  return `$${Math.round(value).toLocaleString()}`;
}
