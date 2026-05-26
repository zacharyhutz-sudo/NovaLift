import { PHYSICS, PLANET, ROCKET } from "./config.js";
import { MISSIONS, STARTING_CASH, evaluateMissions, getMissionView, getNextMission, normalizeMissionState } from "./missions.js";
import {
  STARTING_RESEARCH,
  getResearchView,
  isResearchComplete,
  normalizeResearchState,
  purchaseResearch as purchaseResearchNode
} from "./research.js";
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
    this.flightStats = this.createFlightStats(this.rocket);
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
    this.saveCompany();
  }

  canAffordLaunch(cost = 0) {
    if (this.company.mode === "sandbox") return true;
    if (!CAREER_LAUNCHES_CHARGE_MONEY) return true;
    return (this.company.money ?? 0) >= cost;
  }

  chargeLaunchCost(cost = 0) {
    const amount = Math.max(0, Math.round(cost));
    this.company.lastLaunchCost = amount;
    if (this.company.mode === "sandbox" || !CAREER_LAUNCHES_CHARGE_MONEY || amount <= 0) return 0;
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

  persistActiveCommandVessel(reason = "left flight") {
    if (!this.rocket || this.rocket.archived || this.rocket.crashed || this.rocket.landed) return false;
    if (!this.flightStats?.hasLaunched && getSpeed(this.rocket) < 1) return false;
    const activeParts = Array.isArray(this.rocket.parts)
      ? this.rocket.parts.filter((part) => part.active !== false)
      : [];
    const hasCommandPod = activeParts.some((part) => part.type === "command");
    if (!hasCommandPod) return false;

    const object = makeCommandVesselObject(activeParts, this.rocket, `Command Pod ${this.objects.filter((candidate) => candidate.kind === "vessel").length + 1}`);
    object.statusReason = reason;
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
      this.accumulator += frameTime;
      while (this.accumulator >= PHYSICS.fixedDt) {
        this.update(PHYSICS.fixedDt);
        this.accumulator -= PHYSICS.fixedDt;
      }
    } else {
      this.updatePassiveCompanySystems(frameTime);
    }

    this.renderer.render(this.getRenderState());
  }

  handleGlobalActions() {
    if (this.input.consume("reset")) this.reset();
    if (this.input.consume("pause")) this.paused = !this.paused;
    if (this.input.consume("debug")) this.debug = !this.debug;
    if (this.input.consume("stage")) this.activateStage();
  }

  activateStage() {
    const result = activateNextStage(this.rocket, PLANET);
    if (result.objects?.length) {
      this.objects.push(...result.objects);
      this.trimObjects();
      this.saveWorldObjects();
    }
    this.stageMessage = result.message;
    this.stageMessageTimer = 6;
  }

  createFlightStats(rocket = this.rocket) {
    return {
      hasLaunched: false,
      ended: false,
      outcome: "",
      maxAltitude: Math.max(0, getAltitude(rocket, PLANET)),
      maxSpeed: 0,
      fuelStart: rocket.maxFuel ?? 0,
      fuelUsed: 0,
      recoveryRefund: 0,
      recoveryAvailable: 0,
      researchRewards: 0,
      recoveryCashedIn: false,
      recoveredParts: [],
      missionRewards: 0,
      tip: ""
    };
  }

  update(dt) {
    const turn = (this.input.isHeld("right") ? 1 : 0) - (this.input.isHeld("left") ? 1 : 0);
    if (turn !== 0) rotateRocket(this.rocket, turn, dt);

    stepRocket(
      this.rocket,
      {
        thrusting: this.input.isHeld("thrust")
      },
      dt,
      PLANET
    );

    this.objects.forEach((object) => stepDetachedObject(object, dt, PLANET));
    this.trimObjects();
    this.updateEconomy(dt);
    this.updateFlightStats();
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
      .filter((object) => object && !object.exploded)
      .slice(-MAX_PERSISTENT_OBJECTS);

    if (this.selectedObjectId && !this.objects.some((object) => object.id === this.selectedObjectId)) {
      this.selectedObjectId = null;
    }
  }

  updatePassiveCompanySystems(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.updateEconomy(dt);
    this.saveTimer += dt;
    if (this.saveTimer >= WORLD_OBJECT_SAVE_INTERVAL) {
      this.saveWorldObjects();
      this.saveCompany();
      this.saveTimer = 0;
    }
  }

  updateEconomy(dt) {
    let incomeRate = 0;
    let researchRate = 0;
    const telemetryOnline = isResearchComplete(this.company, "orbital_telemetry");
    for (const object of this.objects) {
      if (!object || object.crashed || object.exploded) continue;
      updateDetachedObjectStatus(object, PLANET);
      if (object.kind === "payload" && object.online) {
        const rate = Number(object.incomeRate ?? 0);
        if (rate > 0) {
          incomeRate += rate;
          const earned = rate * dt;
          object.revenueEarned = (object.revenueEarned ?? 0) + earned;
        }

        const dataRate = telemetryOnline ? Number(object.researchRate ?? 0) : 0;
        if (dataRate > 0) {
          researchRate += dataRate;
          const dataEarned = dataRate * dt;
          object.researchEarned = (object.researchEarned ?? 0) + dataEarned;
        }
      }
    }

    this.company.incomePerSecond = incomeRate;
    this.company.researchPerSecond = researchRate;
    if (incomeRate > 0) {
      const earned = incomeRate * dt;
      this.company.money += earned;
      this.company.totalRevenue += earned;
    }
    if (researchRate > 0) {
      const dataEarned = researchRate * dt;
      this.company.researchPoints = (this.company.researchPoints ?? 0) + dataEarned;
      this.company.totalResearchEarned = (this.company.totalResearchEarned ?? 0) + dataEarned;
    }
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

    const altitude = Math.max(0, getAltitude(this.rocket, PLANET));
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
      }
      this.flightStats.tip = this.getFlightTip();
    }
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
      this.saveCompany();
    }
    this.flightStats.recoveryCashedIn = true;
    this.flightStats.recoveryAvailable = 0;
    return amount;
  }

  getFlightTip() {
    const maxAltitude = this.flightStats?.maxAltitude ?? 0;
    const tangential = getTangentialSpeed(this.rocket, PLANET);
    const circular = getCircularOrbitSpeed(this.rocket, PLANET);

    if (this.rocket.missionComplete || (this.rocket.payloadsOnline ?? 0) > 0) return "Great launch. Payload/orbit objective completed.";
    if (this.rocket.landed && !this.rocket.crashed) return "Nice recovery. Cash in the recovered parts from the flight results popup.";
    if (maxAltitude < PLANET.atmosphereHeight * 0.65) return "Add fuel/thrust or reduce drag to climb out of the lower atmosphere.";
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
    const object = this.objects.find((candidate) => candidate.id === objectId);
    if (!object) return false;

    object.exploded = true;
    object.status = "destroyed";
    this.company.totalDestroyed = (this.company.totalDestroyed ?? 0) + 1;
    this.stageMessage = `${object.name ?? "Object"} destroyed.`;
    this.stageMessageTimer = 6;
    this.trimObjects();
    this.updateMissions();
    this.selectedObjectId = null;
    this.saveWorldObjects();
    this.saveCompany();
    return true;
  }

  purchaseResearch(id) {
    const result = purchaseResearchNode(this.company, id);
    if (result.ok) {
      const unlocked = result.node.unlockText ? ` ${result.node.unlockText}` : "";
      this.stageMessage = `Research complete: ${result.node.name}.${unlocked}`;
      this.stageMessageTimer = 9;
      this.saveCompany();
    } else {
      this.stageMessage = result.reason ?? "Research unavailable.";
      this.stageMessageTimer = 6;
    }
    return result;
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
        money: hasMode ? Math.max(money, 0) : Math.max(money, STARTING_CASH),
        totalRevenue: scaleLegacyMoney(Number(parsed.totalRevenue ?? 0), isLegacyEconomy),
        totalRecovery: scaleLegacyMoney(Number(parsed.totalRecovery ?? 0), isLegacyEconomy),
        totalDestroyed: Number(parsed.totalDestroyed ?? 0),
        totalMissionRewards: scaleLegacyMoney(Number(parsed.totalMissionRewards ?? 0), isLegacyEconomy),
        totalLaunchCosts: scaleLegacyMoney(Number(parsed.totalLaunchCosts ?? 0), isLegacyEconomy),
        researchPoints: Number(parsed.researchPoints ?? STARTING_RESEARCH),
        totalResearchEarned: Number(parsed.totalResearchEarned ?? 0),
        completedResearch: normalizeResearchState(parsed.completedResearch),
        lastResearchReward: Number(parsed.lastResearchReward ?? 0),
        lastResearchPurchase: parsed.lastResearchPurchase ?? "",
        lastRecoveryRefund: scaleLegacyMoney(Number(parsed.lastRecoveryRefund ?? 0), isLegacyEconomy),
        lastMissionReward: scaleLegacyMoney(Number(parsed.lastMissionReward ?? 0), isLegacyEconomy),
        lastLaunchCost: scaleLegacyMoney(Number(parsed.lastLaunchCost ?? 0), isLegacyEconomy),
        missions: normalizeMissionState(parsed.missions),
        incomePerSecond: 0,
        researchPerSecond: 0
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
        money: this.company.money,
        totalRevenue: this.company.totalRevenue,
        totalRecovery: this.company.totalRecovery,
        totalDestroyed: this.company.totalDestroyed,
        totalMissionRewards: this.company.totalMissionRewards ?? 0,
        totalLaunchCosts: this.company.totalLaunchCosts ?? 0,
        researchPoints: this.company.researchPoints ?? 0,
        totalResearchEarned: this.company.totalResearchEarned ?? 0,
        completedResearch: normalizeResearchState(this.company.completedResearch),
        lastResearchReward: this.company.lastResearchReward ?? 0,
        lastResearchPurchase: this.company.lastResearchPurchase ?? "",
        lastRecoveryRefund: this.company.lastRecoveryRefund ?? 0,
        lastMissionReward: this.company.lastMissionReward ?? 0,
        lastLaunchCost: this.company.lastLaunchCost ?? 0,
        missions: normalizeMissionState(this.company.missions)
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
        .filter((object) => object && !object.exploded)
        .map((object) => normalizeStoredObject(object))
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
        .filter((object) => object && !object.exploded)
        .slice(-MAX_PERSISTENT_OBJECTS)
        .map((object) => serializeObject(object));
      storage.setItem(WORLD_OBJECTS_STORAGE_KEY, JSON.stringify(objects));
    } catch (error) {
      console.warn("NovaLift could not save orbital objects.", error);
    }
  }

  getRenderState() {
    return {
      rocket: this.rocket,
      objects: this.objects,
      selectedObjectId: this.selectedObjectId,
      paused: this.paused,
      debug: this.debug,
      input: {
        thrusting: this.input.isHeld("thrust")
      }
    };
  }

  getHudData() {
    const altitude = getAltitude(this.rocket, PLANET);
    const speed = getSpeed(this.rocket);
    const fuelPercent = this.rocket.maxFuel > 0 ? (this.rocket.fuel / this.rocket.maxFuel) * 100 : 0;
    const status = this.paused ? `Paused — ${getOrbitStatus(this.rocket, PLANET)}` : getOrbitStatus(this.rocket, PLANET);
    const density = getAtmosphereDensity(this.rocket, PLANET);
    const drag = getDragVector(this.rocket, PLANET);
    const onlinePayloads = this.objects.filter((object) => object.kind === "payload" && object.online && !object.crashed).length + (this.rocket.payloadsOnline ?? 0);
    const debrisCount = this.objects.filter((object) => object.kind === "debris" && !object.exploded).length;

    return {
      altitude,
      speed,
      fuelPercent,
      stageFuel: getStageFuelSummary(this.rocket),
      status,
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
      nextMission: getNextMission(this.getMissionContext()),
      flightSummary: this.getFlightSummary(),
      selectedObject: this.getSelectedObjectInfo(),
      trackedObjects: this.getTrackedObjects(),
      debugText: this.getDebugText()
    };
  }

  getTrackedObjects() {
    const tracked = [];

    if (this.rocket && !this.rocket.crashed && !this.rocket.landed && Array.isArray(this.rocket.parts)) {
      const hasCommandPod = this.rocket.parts.some((part) => part.active !== false && part.type === "command");
      if (hasCommandPod && (this.flightStats?.hasLaunched || getSpeed(this.rocket) > 1)) {
        tracked.push({
          id: "current-rocket",
          name: "Current Command Pod",
          kind: "vessel",
          category: "command",
          status: getOrbitStatus(this.rocket, PLANET),
          altitude: getAltitude(this.rocket, PLANET),
          speed: getSpeed(this.rocket),
          incomeRate: 0,
          revenueEarned: 0,
          online: false,
          canExplode: false,
          isCurrentRocket: true
        });
      }
    }

    for (const object of this.objects) {
      if (!object || object.exploded) continue;
      const info = objectToInfo(object, this.company);
      tracked.push(info);
    }

    return tracked.sort((a, b) => {
      const order = { payload: 0, vessel: 1, debris: 2 };
      return (order[a.kind] ?? 9) - (order[b.kind] ?? 9) || String(a.name).localeCompare(String(b.name));
    });
  }

  getSelectedObjectInfo() {
    const object = this.getSelectedObject();
    if (!object) return null;
    return objectToInfo(object, this.company);
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
      net: (this.flightStats.missionRewards ?? 0) + (this.flightStats.recoveryCashedIn ? (this.flightStats.recoveryRefund ?? 0) : 0) - (this.company.mode === "sandbox" ? 0 : (this.company.lastLaunchCost ?? 0)),
      tip: this.flightStats.tip
    };
  }

  getDebugText() {
    const gravity = getGravityVector(this.rocket, PLANET);
    const drag = getDragVector(this.rocket, PLANET);
    const stageEvents = (this.rocket.stageEvents ?? []).map((event) => `- ${event.message}`).join("\n") || "None";

    return [
      `Position:      x ${fmt(this.rocket.x)}   y ${fmt(this.rocket.y)}`,
      `Velocity:      x ${fmt(this.rocket.vx)}   y ${fmt(this.rocket.vy)}`,
      `Angle:         ${fmt((this.rocket.angle * 180) / Math.PI)}°`,
      `Distance:      ${fmt(getDistanceToPlanet(this.rocket, PLANET))}`,
      `Altitude:      ${fmt(getAltitude(this.rocket, PLANET))}`,
      `Speed:         ${fmt(getSpeed(this.rocket))}`,
      `Radial vel:    ${fmt(getRadialVelocity(this.rocket, PLANET))}`,
      `Tangential:    ${fmt(getTangentialSpeed(this.rocket, PLANET))}`,
      `Circular req:  ${fmt(getCircularOrbitSpeed(this.rocket, PLANET))}`,
      `Escape req:    ${fmt(getEscapeSpeed(this.rocket, PLANET))}`,
      `Gravity:       ${fmt(gravity.strength)}`,
      `Atmosphere:    ${fmt(getAtmosphereDensity(this.rocket, PLANET) * 100)}%`,
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
      `Research:      ${fmt(this.company.researchPoints ?? 0)} (${fmt(this.company.researchPerSecond ?? 0)}/sec)`,
      `Cash:          ${formatMoney(this.company.money)}`,
      `Mode:          ${this.company.mode}`,
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
    money: STARTING_CASH,
    totalRevenue: 0,
    totalRecovery: 0,
    totalDestroyed: 0,
    totalMissionRewards: 0,
    totalLaunchCosts: 0,
    researchPoints: STARTING_RESEARCH,
    totalResearchEarned: 0,
    completedResearch: normalizeResearchState(),
    incomePerSecond: 0,
    researchPerSecond: 0,
    lastRecoveryRefund: 0,
    lastMissionReward: 0,
    lastResearchReward: 0,
    lastResearchPurchase: "",
    lastLaunchCost: 0,
    missions: normalizeMissionState()
  };
}

function scaleLegacyMoney(value, shouldScale) {
  if (!Number.isFinite(value)) return 0;
  return shouldScale ? value * LEGACY_ECONOMY_MULTIPLIER : value;
}

function normalizeStoredObject(object) {
  const isLegacyEconomy = object?.economyScaleVersion !== ECONOMY_SCALE_VERSION;
  const normalized = {
    ...object,
    kind: normalizeObjectKind(object),
    x: Number(object.x ?? 0),
    y: Number(object.y ?? 0),
    vx: Number(object.vx ?? 0),
    vy: Number(object.vy ?? 0),
    angle: Number(object.angle ?? 0),
    dryMass: Number(object.dryMass ?? object.mass ?? 1),
    fuel: 0,
    maxFuel: 0,
    fuelMassPerUnit: Number(object.fuelMassPerUnit ?? ROCKET.fuelMassPerUnit),
    mass: Number(object.mass ?? object.dryMass ?? 1),
    dragArea: Number(object.dragArea ?? 1),
    collisionRadius: Number(object.collisionRadius ?? 10),
    economyScaleVersion: ECONOMY_SCALE_VERSION,
    cost: scaleLegacyMoney(Number(object.cost ?? 0), isLegacyEconomy),
    recoveryValue: scaleLegacyMoney(Number(object.recoveryValue ?? 0), isLegacyEconomy),
    incomeRate: object.incomeRate == null
      ? inferIncomeRate(object)
      : scaleLegacyMoney(Number(object.incomeRate), isLegacyEconomy),
    researchRate: object.researchRate == null ? inferResearchRate(object) : Number(object.researchRate),
    revenueEarned: Number(object.revenueEarned ?? 0),
    researchEarned: Number(object.researchEarned ?? 0),
    parts: Array.isArray(object.parts) ? object.parts.map((part) => ({ ...part, active: part.active !== false })) : [],
    online: Boolean(object.online),
    crashed: Boolean(object.crashed),
    landed: Boolean(object.landed),
    exploded: Boolean(object.exploded),
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
    fuel: 0,
    maxFuel: 0,
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
    revenueEarned: object.revenueEarned ?? 0,
    researchEarned: object.researchEarned ?? 0,
    online: Boolean(object.online),
    crashed: Boolean(object.crashed),
    landed: Boolean(object.landed),
    exploded: Boolean(object.exploded)
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
  const existing = String(object?.payloadType ?? "").toLowerCase();
  if (existing.includes("data")) return "data_center";
  if (existing.includes("exploration")) return "exploration_satellite";
  if (existing.includes("satellite")) return "satellite";

  const text = `${object?.name ?? ""} ${object?.id ?? ""}`.toLowerCase();
  const parts = Array.isArray(object?.parts) ? object.parts : [];
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
  if (kind === "payload" && payloadType === "satellite") return "Small Satellite";
  if (kind === "payload") return "Payload";
  if (kind === "vessel") return "Command Pod";
  return "Orbital Debris";
}

function inferIncomeRate(object) {
  if (normalizeObjectKind(object) !== "payload") return 0;
  const payloadType = inferPayloadType(object);
  const name = `${object.name ?? ""} ${object.payloadType ?? ""}`.toLowerCase();
  if (payloadType === "data_center" || name.includes("data")) return 360;
  if (payloadType === "exploration_satellite" || name.includes("exploration")) return 80;
  if (payloadType === "satellite" || name.includes("satellite")) return 140;
  return 100;
}

function inferResearchRate(object) {
  if (normalizeObjectKind(object) !== "payload") return 0;
  const payloadType = inferPayloadType(object);
  const name = `${object.name ?? ""} ${object.payloadType ?? ""}`.toLowerCase();
  if (payloadType === "data_center" || name.includes("data")) return 0.28;
  if (payloadType === "exploration_satellite" || name.includes("exploration")) return 0.9;
  if (payloadType === "satellite" || name.includes("satellite")) return 0.16;
  return 0.1;
}

function objectToInfo(object, company = {}) {
  const kind = normalizeObjectKind(object);
  const payloadType = inferPayloadType(object);
  const onlinePayload = kind === "payload" && object.online;
  const telemetryOnline = company.mode === "sandbox" || isResearchComplete(company, "orbital_telemetry");
  const baseResearchRate = onlinePayload ? Number(object.researchRate ?? 0) : 0;
  return {
    id: object.id,
    name: object.name ?? defaultObjectName(kind, payloadType),
    kind,
    payloadType,
    category: kind === "payload" ? payloadType : kind === "vessel" ? "command" : "debris",
    status: object.status ?? "unknown",
    offlineReason: object.offlineReason ?? "",
    altitude: getAltitude(object, PLANET),
    speed: getSpeed(object),
    incomeRate: onlinePayload ? Number(object.incomeRate ?? 0) : 0,
    researchRate: telemetryOnline ? baseResearchRate : 0,
    baseResearchRate,
    researchUnlocked: telemetryOnline,
    revenueEarned: Number(object.revenueEarned ?? 0),
    researchEarned: Number(object.researchEarned ?? 0),
    cost: Number(object.cost ?? 0),
    online: Boolean(object.online),
    canExplode: kind === "debris" && !object.crashed && !object.exploded
  };
}

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "$0";
  return `$${Math.round(value).toLocaleString()}`;
}
