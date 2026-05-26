import { Game } from "./game.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { PHYSICS } from "./config.js";
import { BuilderPreview } from "./preview.js";
import { FeedbackCenter } from "./feedback.js";
import {
  AVAILABLE_PARTS,
  MAX_STACK_PARTS,
  autoStageStack,
  buildRocketFromStack,
  calculateBuildStats,
  clampStage,
  formatMoney,
  formatStatNumber,
  getPartTypeLabel,
  getStageLabel,
  normalizeStack,
  validateBuild
} from "./builder.js";
import { STARTING_STACK } from "./parts.js";
import { formatResearch, getPartUnlockText, isPartUnlocked } from "./research.js";
import { formatDuration } from "./progression.js";

const canvas = document.querySelector("#gameCanvas");
const recenterCameraButton = document.querySelector("#recenterCamera");
const altitudeEl = document.querySelector("#altitude");
const speedEl = document.querySelector("#speed");
const fuelEl = document.querySelector("#fuel");
const statusEl = document.querySelector("#status");
const fpsEl = document.querySelector("#fps");
const missionResultEl = document.querySelector("#missionResult");
const debugPanelEl = document.querySelector("#debugPanel");
const debugTextEl = document.querySelector("#debugText");
const gameShellEl = document.querySelector("#gameShell");
const toastStackEl = document.querySelector("#toastStack");
const rewardOverlayEl = document.querySelector("#rewardOverlay");
const toggleSoundButton = document.querySelector("#toggleSound");
const toggleTestResourcesButton = document.querySelector("#toggleTestResources");
const cycleTimeWarpButton = document.querySelector("#cycleTimeWarp");
const titleScreenEl = document.querySelector("#titleScreen");
const titleContinueButton = document.querySelector("#titleContinue");
const titleNewCompanyButton = document.querySelector("#titleNewCompany");

const builderScreenEl = document.querySelector("#builderScreen");
const stackListEl = document.querySelector("#stackList");
const partsCatalogEl = document.querySelector("#partsCatalog");
const buildValidationEl = document.querySelector("#buildValidation");
const launchBuiltRocketButton = document.querySelector("#launchBuiltRocket");
const starterBuildButton = document.querySelector("#starterBuild");
const clearBuildButton = document.querySelector("#clearBuild");
const autoStageButton = document.querySelector("#autoStageBuild");
const rebuildRocketButton = document.querySelector("#rebuildRocket");
const partCountLabelEl = document.querySelector("#partCountLabel");
const buildCostEl = document.querySelector("#buildCost");
const buildMassEl = document.querySelector("#buildMass");
const buildFuelEl = document.querySelector("#buildFuel");
const buildTwrEl = document.querySelector("#buildTwr");
const buildBurnEl = document.querySelector("#buildBurn");
const buildDragEl = document.querySelector("#buildDrag");
const buildStagesEl = document.querySelector("#buildStages");
const selectedPartTitleEl = document.querySelector("#selectedPartTitle");
const selectedPartMetaEl = document.querySelector("#selectedPartMeta");
const selectedPartDescriptionEl = document.querySelector("#selectedPartDescription");
const selectedPartUsageEl = document.querySelector("#selectedPartUsage");
const selectedPartMetricsEl = document.querySelector("#selectedPartMetrics");
const builderPreviewCanvas = document.querySelector("#builderPreview");
const builderPreviewEmptyEl = document.querySelector("#builderPreviewEmpty");
const nextStageActionEl = document.querySelector("#nextStageAction");
const companyCashHudEl = document.querySelector("#companyCashHud");
const companyIncomeHudEl = document.querySelector("#companyIncomeHud");
const companyResearchHudEl = document.querySelector("#companyResearchHud");
const companyScanHudEl = document.querySelector("#companyScanHud");
const builderCashEl = document.querySelector("#builderCash");
const builderModeLabelEl = document.querySelector("#builderModeLabel");
const toggleEconomyModeButton = document.querySelector("#toggleEconomyMode");
const missionBoardEl = document.querySelector("#missionBoard");
const missionBoardSummaryEl = document.querySelector("#missionBoardSummary");
const templateDeckEl = document.querySelector("#templateDeck");
const partCategoryTabsEl = document.querySelector("#partCategoryTabs");
const recommendedPartsEl = document.querySelector("#recommendedParts");
const flightSummaryModalEl = document.querySelector("#flightSummaryModal");
const flightSummaryTitleEl = document.querySelector("#flightSummaryTitle");
const flightSummaryBodyEl = document.querySelector("#flightSummaryBody");
const cashInRecoveryButton = document.querySelector("#cashInRecovery");
const flightSummaryBuildButton = document.querySelector("#flightSummaryBuild");
const flightSummaryCloseButton = document.querySelector("#flightSummaryClose");
const objectInspectorEl = document.querySelector("#objectInspector");
const trackerPanelEl = document.querySelector("#orbitTracker");
const trackerListEl = document.querySelector("#trackerList");
const trackerSummaryEl = document.querySelector("#trackerSummary");
const toggleTrackerButton = document.querySelector("#toggleTracker");
const closeTrackerButton = document.querySelector("#closeTracker");
const stageFuelPanelEl = document.querySelector("#stageFuelPanel");
const objectNameEl = document.querySelector("#objectName");
const objectDetailsEl = document.querySelector("#objectDetails");
const explodeObjectButton = document.querySelector("#explodeObject");
const controlObjectButton = document.querySelector("#controlObject");
const sellObjectButton = document.querySelector("#sellObject");
const closeObjectInspectorButton = document.querySelector("#closeObjectInspector");
const builderWorldViewButton = document.querySelector("#builderWorldView");
const builderWorldViewHeroButton = document.querySelector("#builderWorldViewHero");
const builderJumpToPreviewButton = document.querySelector("#builderJumpToPreview");
const builderJumpToMissionsButton = document.querySelector("#builderJumpToMissions");
const builderJumpToResearchButton = document.querySelector("#builderJumpToResearch");
const toggleMissionBoardViewButton = document.querySelector("#toggleMissionBoardView");
const researchSummaryEl = document.querySelector("#researchSummary");
const researchTreeEl = document.querySelector("#researchTree");
const builderRocketSectionEl = document.querySelector("#builderRocketSection");
const builderPartsSectionEl = document.querySelector("#builderPartsSection");
const builderMissionsSectionEl = document.querySelector("#builderMissionsSection");
const builderResearchSectionEl = document.querySelector("#builderResearchSection");
const builderResearchMiniStatusEl = document.querySelector("#builderResearchMiniStatus");
const openResearchLabButton = document.querySelector("#openResearchLab");
const closeResearchLabButton = document.querySelector("#closeResearchLab");
const researchScreenEl = document.querySelector("#researchScreen");
const researchGuideEl = document.querySelector("#researchGuide");
const earthMineCountEl = document.querySelector("#earthMineCount");
const earthMineIncomeEl = document.querySelector("#earthMineIncome");
const earthMineTotalIncomeEl = document.querySelector("#earthMineTotalIncome");
const earthMineStatusEl = document.querySelector("#earthMineStatus");
const buyEarthMineButton = document.querySelector("#buyEarthMine");
const earthMineMiniStatusEl = document.querySelector("#earthMineMiniStatus");
const toggleAdvancedBuilderButton = document.querySelector("#toggleAdvancedBuilder");
const advancedBuilderPanelEl = document.querySelector("#advancedBuilderPanel");
const advancedBuilderLabelEl = document.querySelector("#advancedBuilderLabel");
const simpleRocketSummaryEl = document.querySelector("#simpleRocketSummary");
const orbitalNetworkStatusEl = document.querySelector("#orbitalNetworkStatus");
const orbitalNetworkPayloadsEl = document.querySelector("#orbitalNetworkPayloads");
const orbitalNetworkIncomeEl = document.querySelector("#orbitalNetworkIncome");
const orbitalNetworkResearchEl = document.querySelector("#orbitalNetworkResearch");
const orbitalNetworkScanEl = document.querySelector("#orbitalNetworkScan");
const orbitalNetworkSignalEl = document.querySelector("#orbitalNetworkSignal");
const orbitalNetworkSignalBarEl = document.querySelector("#orbitalNetworkSignalBar");
const planetRegistryStatusEl = document.querySelector("#planetRegistryStatus");
const planetRegistryListEl = document.querySelector("#planetRegistryList");
const planetSignalNameEl = document.querySelector("#planetSignalName");
const planetSignalBarEl = document.querySelector("#planetSignalBar");
const planetSignalStatusEl = document.querySelector("#planetSignalStatus");
const spaceCenterMapEl = document.querySelector("#spaceCenterMap");
const programSummaryEl = document.querySelector("#programSummary");
const recommendedActionCardEl = document.querySelector("#recommendedActionCard");
const passiveBankCardEl = document.querySelector("#passiveBankCard");
const engineerQueueCardEl = document.querySelector("#engineerQueueCard");
const dailyContractListEl = document.querySelector("#dailyContractList");

const EARTH_MINE_COST = 100000;
const EARTH_MINE_INCOME_RATE = 1;
const EARTH_MINE_MAX = 10;
const RESET_STORAGE_KEYS = [
  "novaliftWorldObjects.v2",
  "novaliftWorldObjects.v1",
  "novaliftCompany.v2",
  "novaliftCompany.v1"
];

let builderStack = [];
let screenMode = "builder";
let trackerOpen = false;
let selectedPartId = AVAILABLE_PARTS[0]?.id ?? null;
let activePartCategory = "all";
let missionsExpanded = false;
let builderAdvancedOpen = false;
let lastShownFlightSummaryKey = "";
let lastResearchLiveRenderAt = 0;
let selectedResearchId = null;
const PART_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "core", label: "Core", types: ["command", "decoupler"] },
  { id: "fuel", label: "Fuel", types: ["fuel"] },
  { id: "engine", label: "Engines", types: ["engine"] },
  { id: "payload", label: "Payloads", types: ["payload"] },
  { id: "locked", label: "Research", lockedOnly: true },
  { id: "recovery", label: "Recovery", types: ["parachute", "legs"] },
  { id: "aero", label: "Aero", types: ["aero"] }
];

const ROCKET_TEMPLATES = [
  {
    id: "orbit_starter",
    name: "Starter Orbit",
    description: "A forgiving first orbit build with recovery parts.",
    stack: ["nose_cone_basic", "command_pod_basic", "parachute_basic", "landing_legs_basic", "fuel_tank_small", "fuel_tank_small", "decoupler_basic", "fuel_tank_medium", "engine_basic"]
  },
  {
    id: "sat_launcher",
    name: "Satellite Launcher",
    description: "Payload, upper engine, lower booster, and recovery hardware.",
    stack: ["nose_cone_basic", "satellite_basic", "command_pod_basic", "parachute_basic", "landing_legs_basic", "fuel_tank_small", "engine_vacuum", "decoupler_basic", "fuel_tank_medium", "fuel_tank_medium", "engine_basic"]
  },
  {
    id: "data_center",
    name: "Data Center Rig",
    description: "Heavier payload launcher for orbital revenue attempts.",
    stack: ["nose_cone_basic", "data_center_basic", "command_pod_basic", "parachute_basic", "landing_legs_basic", "fuel_tank_small", "engine_vacuum", "decoupler_basic", "fuel_tank_medium", "fuel_tank_medium", "engine_heavy"]
  },
  {
    id: "explorer_sat",
    name: "Explorer Probe",
    description: "Research-gated exploration payload for the next planet-discovery milestone.",
    requiresResearch: "orbital_surveying",
    stack: ["nose_cone_basic", "exploration_satellite_basic", "command_pod_basic", "parachute_basic", "fuel_tank_small", "engine_skyburner", "decoupler_basic", "fuel_tank_composite", "engine_titan"]
  },
  {
    id: "recovery_test",
    name: "Recovery Test",
    description: "Small vehicle for practicing parachute and landing-leg cash-ins.",
    stack: ["nose_cone_basic", "command_pod_basic", "parachute_basic", "landing_legs_basic", "fuel_tank_small", "engine_basic"]
  }
];
const builderPreview = new BuilderPreview(builderPreviewCanvas, builderPreviewEmptyEl);

const input = new Input();
const renderer = new Renderer(canvas, recenterCameraButton);
const feedback = new FeedbackCenter({ toastRoot: toastStackEl, rewardRoot: rewardOverlayEl, soundToggle: toggleSoundButton });
const initialRocket = buildRocketFromStack(builderStack).rocket;
const game = new Game(input, renderer, initialRocket);

renderBuilder();
renderer.onObjectTap = (object) => {
  feedback.haptic("light");
  feedback.sound("select");
  game.selectObject(object.id);
  renderer.centerOnWorldObject?.(object);
  updateObjectInspector(game.getHudData().selectedObject);
};
game.paused = true;

bindBuilderEvents();
requestAnimationFrame(loop);

function loop(timestamp) {
  game.frame(timestamp);
  updateHud(game.getHudData());
  processFeedbackEvents(game.consumeFeedbackEvents?.());
  requestAnimationFrame(loop);
}

function bindBuilderEvents() {
  bindActivation(titleContinueButton, hideTitleScreen);
  bindActivation(titleNewCompanyButton, startNewCompanyFromTitle);
  bindActivation(launchBuiltRocketButton, launchBuiltRocket);
  bindActivation(starterBuildButton, () => {
    builderStack = normalizeStack(STARTING_STACK);
    renderBuilder();
  });
  bindActivation(clearBuildButton, () => {
    builderStack = [];
    renderBuilder();
  });
  bindActivation(autoStageButton, () => {
    builderStack = autoStageStack(builderStack);
    renderBuilder();
  });
  bindDelegatedActivation(templateDeckEl, "[data-template]", (button) => {
    applyRocketTemplate(button.dataset.template);
  });
  bindDelegatedActivation(missionBoardEl, "[data-template]", (button) => {
    applyRocketTemplate(button.dataset.template, { scrollToRocket: true });
  });
  bindDelegatedActivation(missionBoardEl, "[data-edit-rocket]", () => {
    builderAdvancedOpen = true;
    renderBuilder();
    setTimeout(() => advancedBuilderPanelEl?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  });
  bindDelegatedActivation(missionBoardEl, "[data-launch-now]", () => {
    launchBuiltRocket();
  });
  bindDelegatedActivation(partCategoryTabsEl, "[data-part-category]", (button) => {
    activePartCategory = button.dataset.partCategory || "all";
    renderBuilder();
  });
  bindActivation(toggleEconomyModeButton, () => {
    game.toggleEconomyMode();
    renderBuilder();
  });
  bindActivation(toggleTestResourcesButton, () => {
    game.toggleTestResources();
    renderBuilder();
    updateHud(game.getHudData());
  });
  bindActivation(cycleTimeWarpButton, () => {
    game.cycleFlightTimeScale();
    updateHud(game.getHudData());
  });
  bindActivation(builderWorldViewButton, showWorldView);
  bindActivation(builderWorldViewHeroButton, showWorldView);
  bindActivation(builderJumpToPreviewButton, () => scrollBuilderSection(builderRocketSectionEl));
  bindActivation(builderJumpToMissionsButton, () => scrollBuilderSection(builderMissionsSectionEl));
  bindActivation(builderJumpToResearchButton, showResearchLab);
  bindActivation(openResearchLabButton, showResearchLab);
  bindActivation(toggleAdvancedBuilderButton, () => {
    builderAdvancedOpen = !builderAdvancedOpen;
    renderBuilder();
    if (builderAdvancedOpen) setTimeout(() => advancedBuilderPanelEl?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  });
  bindActivation(closeResearchLabButton, hideResearchLab);
  bindActivation(buyEarthMineButton, () => {
    game.buyEarthMine();
    renderBuilder();
  });
  bindActivation(toggleMissionBoardViewButton, () => {
    missionsExpanded = !missionsExpanded;
    renderBuilder();
  });
  bindDelegatedActivation(passiveBankCardEl, "[data-collect-passive]", () => {
    game.collectPassiveIncome();
    renderBuilder();
  });
  bindDelegatedActivation(dailyContractListEl, "[data-claim-daily]", (button) => {
    game.claimDailyContract(button.dataset.claimDaily);
    renderBuilder();
  });
  bindDelegatedActivation(engineerQueueCardEl, "[data-start-project]", (button) => {
    game.startEngineerProject(button.dataset.startProject);
    renderBuilder();
  });
  bindDelegatedActivation(recommendedActionCardEl, "[data-recommended-target]", (button) => {
    handleRecommendedAction(button.dataset.recommendedTarget);
  });
  bindDelegatedActivation(spaceCenterMapEl, "[data-space-center-target]", (button) => {
    handleRecommendedAction(button.dataset.spaceCenterTarget);
  });
  bindDelegatedActivation(planetRegistryListEl, "[data-colony-action]", (button) => {
    game.upgradeColony(button.dataset.colonyAction);
    renderBuilder();
    updateHud(game.getHudData());
  });
  bindDelegatedActivation(researchTreeEl, "[data-buy-research]", (button) => {
    selectedResearchId = button.dataset.buyResearch || selectedResearchId;
    game.purchaseResearch(button.dataset.buyResearch);
    renderBuilder();
  });
  bindDelegatedActivation(researchTreeEl, "[data-select-research]", (button, event) => {
    if (event?.target?.closest?.("[data-buy-research]")) return;
    selectedResearchId = button.dataset.selectResearch || selectedResearchId;
    renderBuilder();
  });
  bindDelegatedActivation(researchTreeEl, "[data-research-lane-jump]", (button) => {
    scrollToResearchLane(button.dataset.researchLaneJump);
  });
  bindDelegatedActivation(researchGuideEl, "[data-buy-research]", (button) => {
    selectedResearchId = button.dataset.buyResearch || selectedResearchId;
    game.purchaseResearch(button.dataset.buyResearch);
    renderBuilder();
  });
  bindActivation(rebuildRocketButton, showBuilder);
  bindActivation(toggleTrackerButton, () => {
    trackerOpen = !trackerOpen;
    updateTrackerPanel(game.getHudData().trackedObjects);
  });
  bindActivation(closeTrackerButton, () => {
    trackerOpen = false;
    updateTrackerPanel(game.getHudData().trackedObjects);
  });
  bindActivation(closeObjectInspectorButton, () => {
    game.clearSelectedObject();
    renderer.clearObjectTracking?.();
    renderer.followRocket?.(game.rocket, { snap: false });
    updateObjectInspector(null);
  });
  bindActivation(controlObjectButton, () => {
    const id = game.selectedObjectId;
    if (!id || id === "current-rocket") return;
    game.controlObject(id);
    renderer.followRocket?.(game.rocket);
    updateObjectInspector(null);
    updateTrackerPanel(game.getHudData().trackedObjects);
  });
  bindActivation(sellObjectButton, () => {
    const id = game.selectedObjectId;
    if (id) {
      game.sellObject(id);
      renderer.followRocket?.(game.rocket);
      updateObjectInspector(null);
      updateTrackerPanel(game.getHudData().trackedObjects);
      renderBuilder();
    }
  });
  bindActivation(explodeObjectButton, () => {
    const id = game.selectedObjectId;
    if (!id) return;
    game.explodeObject(id);
    renderer.followRocket?.(game.rocket);
    updateObjectInspector(null);
    updateTrackerPanel(game.getHudData().trackedObjects);
  });
  bindActivation(cashInRecoveryButton, () => {
    game.cashInRecovery();
    updateFlightSummaryModal(game.getHudData().flightSummary, true);
  });
  bindActivation(flightSummaryBuildButton, () => {
    hideFlightSummaryModal();
    showBuilder();
  });
  bindActivation(flightSummaryCloseButton, () => {
    hideFlightSummaryModal();
  });

  bindDelegatedActivation(partsCatalogEl, "[data-add-part]", (button) => {
    if (builderStack.length >= MAX_STACK_PARTS) return;
    const part = AVAILABLE_PARTS.find((candidate) => candidate.id === button.dataset.addPart);
    if (!part || !isPartUnlocked(part, game.company)) return;
    const count = Math.max(1, Number(button.dataset.addCount ?? 1));
    selectedPartId = button.dataset.addPart;
    for (let i = 0; i < count && builderStack.length < MAX_STACK_PARTS; i++) {
      builderStack.push({ id: button.dataset.addPart, stage: getDefaultStageForPart(part) });
    }
    renderBuilder();
  });

  bindDelegatedActivation(partsCatalogEl, "[data-select-part]", (card, event) => {
    if (event.target.closest("button")) return;
    selectedPartId = card.dataset.selectPart;
    renderBuilder();
  });

  bindDelegatedActivation(stackListEl, "[data-select-stack-part]", (item, event) => {
    if (event.target.closest("button")) return;
    const index = Number(item.dataset.index);
    selectedPartId = builderStack[index]?.id ?? selectedPartId;
    renderBuilder();
  });

  bindDelegatedActivation(stackListEl, "[data-stack-action]", (button) => {
    const index = Number(button.dataset.index);
    const action = button.dataset.stackAction;

    if (action === "remove") {
      builderStack.splice(index, 1);
    }

    if (action === "duplicate" && builderStack[index] && builderStack.length < MAX_STACK_PARTS) {
      builderStack.splice(index + 1, 0, { ...builderStack[index] });
    }

    if (action === "up" && index > 0) {
      [builderStack[index - 1], builderStack[index]] = [builderStack[index], builderStack[index - 1]];
    }

    if (action === "down" && index < builderStack.length - 1) {
      [builderStack[index + 1], builderStack[index]] = [builderStack[index], builderStack[index + 1]];
    }

    if (action === "stageDown") {
      builderStack[index].stage = clampStage((builderStack[index].stage ?? 0) - 1);
    }

    if (action === "stageUp") {
      builderStack[index].stage = clampStage((builderStack[index].stage ?? 0) + 1);
    }

    renderBuilder();
  });
}


if (trackerListEl) {
  bindDelegatedActivation(trackerListEl, "[data-track-object]", (button) => {
    const id = button.dataset.trackObject;
    const action = button.dataset.trackAction ?? "inspect";
    if (action === "control" && id && id !== "current-rocket") {
      game.controlObject(id);
      renderer.followRocket?.(game.rocket);
      updateObjectInspector(null);
      updateTrackerPanel(game.getHudData().trackedObjects);
      return;
    }
    if (action === "destroy" && id) {
      game.explodeObject(id);
      renderer.followRocket?.(game.rocket);
      updateObjectInspector(null);
      updateTrackerPanel(game.getHudData().trackedObjects);
      return;
    }
    if (id === "current-rocket") {
      game.selectedObjectId = "current-rocket";
      if (renderer.followRocket) {
        renderer.followRocket(game.rocket);
      } else {
        renderer.recenterCamera?.(game.rocket, { forceRocket: true });
      }
      const info = game.getHudData().trackedObjects.find((object) => object.id === "current-rocket") ?? null;
      updateObjectInspector(info);
      return;
    }
    const object = game.selectObject(id);
    if (object) renderer.centerOnWorldObject?.(object);
    updateObjectInspector(game.getHudData().selectedObject);
  });
}

function bindActivation(element, handler) {
  if (!element) return;
  let lastPointerActivation = 0;
  const activate = (event) => {
    if (element.disabled) return;
    if (event.type === "click" && performance.now() - lastPointerActivation < 450) return;
    if (event.type === "pointerup") lastPointerActivation = performance.now();
    event.preventDefault?.();
    event.stopPropagation?.();
    feedback.tap();
    handler(event);
  };

  element.addEventListener("pointerup", activate);
  element.addEventListener("click", activate);
}

function bindDelegatedActivation(container, selector, handler) {
  if (!container) return;
  let lastPointerActivation = 0;
  const activate = (event) => {
    const button = event.target.closest(selector);
    if (!button || !container.contains(button) || button.disabled) return;
    if (event.type === "click" && performance.now() - lastPointerActivation < 450) return;
    if (event.type === "pointerup") lastPointerActivation = performance.now();
    event.preventDefault?.();
    event.stopPropagation?.();
    feedback.tap();
    handler(button, event);
  };

  container.addEventListener("pointerup", activate);
  container.addEventListener("click", activate);
}

function hideTitleScreen() {
  if (!titleScreenEl) return;
  titleScreenEl.classList.add("hidden");
  gameShellEl.classList.remove("title-open");
  feedback.toast({ title: "Mission Control online", message: "Launchpad is ready.", tone: "info", duration: 2000 });
}

function startNewCompanyFromTitle() {
  const shouldReset = window.confirm("Start a new NovaLift company? This clears your saved company, rockets, and orbital objects on this device.");
  if (!shouldReset) return;
  try {
    RESET_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in some browser privacy modes.
  }
  window.location.reload();
}

function showBuilder() {
  hideFlightSummaryModal();
  hideResearchLab();
  game.persistActiveCommandVessel?.("builder opened");
  screenMode = "builder";
  trackerOpen = false;
  builderAdvancedOpen = false;
  game.paused = true;
  game.clearSelectedObject();
  renderer.clearObjectTracking?.();
  updateObjectInspector(null);
  builderScreenEl.classList.remove("hidden");
  gameShellEl.classList.add("builder-open");
  gameShellEl.classList.remove("world-view");
  renderBuilder();
}

function hideBuilder() {
  hideResearchLab();
  screenMode = "flight";
  builderScreenEl.classList.add("hidden");
  gameShellEl.classList.remove("builder-open");
  gameShellEl.classList.remove("world-view");
}

function showWorldView() {
  feedback.toast({ title: "World view", message: "Tracking active vessels, payloads, and debris.", tone: "info", duration: 2200 });
  hideFlightSummaryModal();
  hideResearchLab();
  screenMode = "world";
  trackerOpen = true;
  game.paused = false;
  builderScreenEl.classList.add("hidden");
  gameShellEl.classList.remove("builder-open");
  gameShellEl.classList.add("world-view");
  focusBestWorldViewTarget();
  updateTrackerPanel(game.getHudData().trackedObjects);
}

function focusBestWorldViewTarget() {
  const data = game.getHudData();
  const selected = data.selectedObject;
  const objects = data.trackedObjects ?? [];
  const target = selected
    ?? objects.find((object) => object.id === "current-rocket")
    ?? objects.find((object) => object.kind === "payload" && object.online)
    ?? objects[0]
    ?? null;

  if (!target) {
    renderer.followRocket?.(game.rocket);
    return;
  }

  game.selectedObjectId = target.id;
  if (target.id === "current-rocket") {
    renderer.followRocket?.(game.rocket);
    renderer.recenterCamera?.(game.rocket, { forceRocket: true });
  } else {
    const object = game.selectObject(target.id);
    if (object) renderer.centerOnWorldObject?.(object);
  }
  updateObjectInspector(game.getHudData().selectedObject);
}

function showResearchLab() {
  hideFlightSummaryModal();
  screenMode = "builder";
  trackerOpen = false;
  game.paused = true;
  game.clearSelectedObject();
  renderer.clearObjectTracking?.();
  updateObjectInspector(null);
  builderScreenEl.classList.remove("hidden");
  gameShellEl.classList.add("builder-open");
  gameShellEl.classList.remove("world-view");
  researchScreenEl?.classList.remove("hidden");
  renderBuilder();
}

function hideResearchLab() {
  researchScreenEl?.classList.add("hidden");
}

function scrollBuilderSection(section) {
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function launchBuiltRocket() {
  const { valid } = validateBuild(builderStack);
  const lockedParts = getLockedStackParts();
  if (!valid || lockedParts.length) {
    builderAdvancedOpen = true;
    renderBuilder(true);
    feedback.handle({ title: "Rocket not ready", message: lockedParts.length ? "Unlock or remove locked parts before launch." : "Fix the highlighted build issues before launch.", tone: "warning", sound: "error", haptic: "error", toast: true });
    return;
  }

  const { rocket } = buildRocketFromStack(builderStack);
  const cost = rocket.buildStats?.cost ?? 0;
  if (!game.canAffordLaunch(cost)) {
    renderBuilder(true);
    feedback.handle({ title: "Not enough cash", message: `This launch costs ${formatMoney(cost)}.`, tone: "warning", sound: "error", haptic: "error", toast: true });
    return;
  }
  game.setRocketTemplate(rocket);
  if (renderer.followRocket) {
    renderer.followRocket(game.rocket);
  } else {
    renderer.recenterCamera?.(game.rocket, { forceRocket: true });
  }
  lastShownFlightSummaryKey = "";
  hideFlightSummaryModal();
  game.paused = false;
  hideBuilder();
}

function applyRocketTemplate(templateId, options = {}) {
  const template = ROCKET_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template || (template.requiresResearch && !game.company.completedResearch?.includes(template.requiresResearch) && game.company.mode !== "sandbox")) return false;
  builderStack = autoStageStack(template.stack.map((id) => ({ id, stage: 0 })));
  selectedPartId = builderStack[0]?.id ?? selectedPartId;
  renderBuilder();
  if (options.scrollToRocket) setTimeout(() => scrollBuilderSection(builderRocketSectionEl), 0);
  return true;
}

function renderBuilder(highlightErrors = false) {
  builderStack = normalizeStack(builderStack);
  const validation = validateBuild(builderStack);
  const stats = validation.stats;
  const lockedParts = getLockedStackParts();
  const canAfford = game.canAffordLaunch(stats.cost);

  buildCostEl.textContent = formatMoney(stats.cost);
  if (builderCashEl) builderCashEl.textContent = formatCashBalance(game.company);
  if (builderModeLabelEl) builderModeLabelEl.textContent = formatCompanyMode(game.company);
  updateTestResourceToggle(game.company);
  buildMassEl.textContent = `${formatStatNumber(stats.launchMass)}t`;
  buildFuelEl.textContent = Math.round(stats.fuelCapacity).toLocaleString();
  buildTwrEl.textContent = formatStatNumber(stats.twr, 2);
  buildBurnEl.textContent = stats.burnTime > 0 ? `${formatStatNumber(stats.burnTime, 0)}s` : "0s";
  buildDragEl.textContent = formatStatNumber(stats.dragArea, 1);
  buildStagesEl.textContent = String(stats.stageCount);
  if (simpleRocketSummaryEl) {
    const twrLabel = stats.twr >= 1.6 ? "Strong" : stats.twr >= 1.05 ? "Good" : stats.twr > 0 ? "Weak" : "No thrust";
    simpleRocketSummaryEl.textContent = `${stats.count} parts · ${twrLabel} TWR`;
  }
  if (advancedBuilderPanelEl) advancedBuilderPanelEl.classList.toggle("hidden", !builderAdvancedOpen);
  if (toggleAdvancedBuilderButton) {
    toggleAdvancedBuilderButton.setAttribute("aria-expanded", String(builderAdvancedOpen));
    toggleAdvancedBuilderButton.classList.toggle("open", builderAdvancedOpen);
  }
  if (advancedBuilderLabelEl) advancedBuilderLabelEl.textContent = builderAdvancedOpen ? "Hide" : `${builderStack.length}/${MAX_STACK_PARTS} parts`;

  renderStackList(stats.parts);
  builderPreview.render(stats.parts);
  renderTemplateDeck();
  renderPartCategoryTabs();
  renderRecommendedParts(game.getHudData().nextMission);
  renderPartsCatalog(game.getHudData().nextMission);
  renderSelectedPart();
  const hudData = game.getHudData();
  renderProgressionDashboard(hudData);
  renderMissionBoard(hudData);
  renderEarthMines(hudData);
  renderResearchLab(hudData);
  renderOrbitalNetwork(hudData);
  renderPlanetRegistry(hudData);
  renderValidation(validation, highlightErrors, canAfford, stats.cost, lockedParts);

  launchBuiltRocketButton.disabled = !validation.valid || !canAfford || lockedParts.length > 0;
  launchBuiltRocketButton.textContent = lockedParts.length ? "Unlock Parts to Launch" : !validation.valid ? "Fix Rocket to Launch" : !canAfford ? "Not Enough Cash" : hasCostBypass(game.company) ? "Launch Rocket" : `Launch for ${formatMoney(stats.cost)}`;
  builderScreenEl?.classList.toggle("rocket-ready", validation.valid && canAfford && lockedParts.length === 0);
  builderScreenEl?.classList.toggle("rocket-needs-work", !validation.valid || lockedParts.length > 0);
  partCountLabelEl.textContent = `${builderStack.length}/${MAX_STACK_PARTS} parts`;
}

function renderStackList(parts) {
  if (!parts.length) {
    stackListEl.innerHTML = `<div class="empty-stack">No parts yet. Add a command pod, fuel tank, and engine.</div>`;
    return;
  }

  stackListEl.innerHTML = parts
    .map(
      (part, index) => `
        <article class="stack-item ${part.id === selectedPartId ? "selected" : ""} ${isPartUnlocked(part, game.company) ? "" : "locked"}" data-select-stack-part="${escapeHtml(part.id)}" data-index="${index}" style="--part-color: ${escapeHtml(part.color)}">
          <div class="stack-index">${index === 0 ? "Top" : index + 1}</div>
          <div class="part-swatch" aria-hidden="true"></div>
          <div class="stack-info">
            <strong>${escapeHtml(part.shortName ?? part.name)}</strong>
            <span>${getPartTypeLabel(part.type)} · ${formatMoney(part.cost)} · ${escapeHtml(getStageLabel(part.stage))}${isPartUnlocked(part, game.company) ? "" : " · Locked"}</span>
          </div>
          <div class="stage-buttons" aria-label="Stage controls">
            <button type="button" data-stack-action="stageDown" data-index="${index}" ${part.stage <= 0 ? "disabled" : ""}>−</button>
            <strong>${part.stage === 0 ? "F" : part.stage}</strong>
            <button type="button" data-stack-action="stageUp" data-index="${index}" ${part.stage >= 6 ? "disabled" : ""}>+</button>
          </div>
          <div class="stack-buttons">
            <button type="button" data-stack-action="up" data-index="${index}" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-stack-action="down" data-index="${index}" ${index === parts.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" data-stack-action="duplicate" data-index="${index}" ${builderStack.length >= MAX_STACK_PARTS ? "disabled" : ""}>⧉</button>
            <button type="button" data-stack-action="remove" data-index="${index}">×</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTemplateDeck() {
  if (!templateDeckEl) return;
  templateDeckEl.innerHTML = ROCKET_TEMPLATES.map((template) => {
    const locked = template.requiresResearch && !game.company.completedResearch?.includes(template.requiresResearch) && game.company.mode !== "sandbox";
    const stats = calculateBuildStats(template.stack.map((id) => ({ id, stage: 0 })));
    const label = locked ? "Locked" : `${formatMoney(stats.cost)} · ${stats.count} parts`;
    return `
    <button type="button" class="template-card ${locked ? "locked" : ""}" data-template="${escapeHtml(template.id)}" ${locked ? "disabled" : ""}>
      <strong>${escapeHtml(template.name)}</strong>
      <span>${escapeHtml(label)}</span>
    </button>`;
  }).join("");
}

function renderPartCategoryTabs() {
  if (!partCategoryTabsEl) return;
  partCategoryTabsEl.innerHTML = PART_CATEGORIES.map((category) => `
    <button type="button" class="category-tab ${category.id === activePartCategory ? "active" : ""}" data-part-category="${escapeHtml(category.id)}">${escapeHtml(category.label)}</button>
  `).join("");
}

function renderRecommendedParts(nextMission) {
  if (!recommendedPartsEl) return;
  const ids = getRecommendedPartIds(nextMission);
  if (!ids.length) {
    recommendedPartsEl.textContent = "Pick a mission above to see helpful part recommendations.";
    return;
  }
  const names = ids
    .map((id) => AVAILABLE_PARTS.find((part) => part.id === id)?.shortName)
    .filter(Boolean)
    .join(", ");
  recommendedPartsEl.textContent = `Recommended for ${nextMission.title}: ${names}`;
}

function renderPartsCatalog(nextMission = null) {
  const category = PART_CATEGORIES.find((candidate) => candidate.id === activePartCategory) ?? PART_CATEGORIES[0];
  const recommended = new Set(getRecommendedPartIds(nextMission));
  const visibleParts = AVAILABLE_PARTS.filter((part) => {
    const unlocked = isPartUnlocked(part, game.company);
    if (category.lockedOnly) return !unlocked || part.requiresResearch;
    return !category.types || category.types.includes(part.type);
  });
  partsCatalogEl.innerHTML = visibleParts.map(
    (part) => {
      const isRecommended = recommended.has(part.id);
      const unlocked = isPartUnlocked(part, game.company);
      const lockText = getPartUnlockText(part, game.company);
      const canAdd = unlocked && builderStack.length < MAX_STACK_PARTS;
      const canAddThree = canAdd && builderStack.length <= MAX_STACK_PARTS - 3 && ["fuel", "engine"].includes(part.type);
      return `
      <article class="part-card ${part.id === selectedPartId ? "selected" : ""} ${isRecommended ? "recommended" : ""} ${unlocked ? "" : "locked"}" data-select-part="${escapeHtml(part.id)}" style="--part-color: ${escapeHtml(part.color)}">
        <div class="part-card-top">
          <div class="part-icon ${getPartIconClass(part)}" aria-hidden="true"><span></span></div>
          <div>
            <h3>${escapeHtml(part.shortName ?? part.name)}</h3>
            <p>${escapeHtml(getCompactPartLine(part, unlocked, isRecommended, lockText))}</p>
          </div>
        </div>
        <div class="part-metrics compact-metrics">
          ${getCompactPartMetrics(part).map((metric) => `<span>${escapeHtml(metric)}</span>`).join("")}
        </div>
        <div class="part-card-actions">
          <button type="button" data-add-part="${escapeHtml(part.id)}" data-add-count="1" ${!canAdd ? "disabled" : ""}>${unlocked ? "+ Add" : "Locked"}</button>
          ${canAddThree ? `<button type="button" data-add-part="${escapeHtml(part.id)}" data-add-count="3">+3</button>` : ""}
        </div>
      </article>
    `;
    }
  ).join("");
}

function getCompactPartLine(part, unlocked, isRecommended, lockText) {
  if (!unlocked) return lockText;
  if (isRecommended) return `${formatMoney(part.cost)} · Recommended`;
  return `${getPartTypeLabel(part.type)} · ${formatMoney(part.cost)}`;
}

function getCompactPartMetrics(part) {
  if (part.incomeRate) return [`${formatMoneyRate(part.incomeRate)}/s`, part.researchRate ? getPartResearchMetric(part) : "Payload"];
  if (part.thrust) return [`Thrust ${Math.round(part.thrust)}`, `Use ${formatStatNumber(part.fuelUse ?? 0, 1)}/s`];
  if (part.fuelCapacity) return [`Fuel ${Math.round(part.fuelCapacity)}`, `${formatStatNumber(part.dryMass)}t`];
  if (part.type === "parachute") return ["Recovery", `Safe ${Math.round(part.safeDeploySpeed ?? 0)} m/s`];
  if (part.type === "legs") return ["Landing", `${formatMoney(part.cost)}`];
  if (part.type === "aero") return ["Less drag", `${formatMoney(part.cost)}`];
  if (part.type === "command") return ["Required", `${formatMoney(part.cost)}`];
  if (part.type === "decoupler") return ["Stage split", `${formatMoney(part.cost)}`];
  return [`${formatStatNumber(part.dryMass)}t`, `${formatMoney(part.cost)}`];
}


function renderSelectedPart() {
  const part = AVAILABLE_PARTS.find((candidate) => candidate.id === selectedPartId) ?? AVAILABLE_PARTS[0];
  if (!part) return;

  const unlocked = isPartUnlocked(part, game.company);
  selectedPartTitleEl.textContent = part.name;
  selectedPartMetaEl.textContent = `${getPartTypeLabel(part.type)} · ${formatMoney(part.cost)}${unlocked ? "" : " · Locked"}`;
  selectedPartDescriptionEl.textContent = unlocked ? part.description : getPartUnlockText(part, game.company);
  selectedPartUsageEl.textContent = unlocked ? getPartUsageTip(part) : "Complete the required research to add this part to a career rocket.";
  selectedPartMetricsEl.innerHTML = [
    `Mass ${formatStatNumber(part.dryMass)}t`,
    part.fuelCapacity ? `Fuel ${Math.round(part.fuelCapacity)}` : "",
    part.thrust ? `Thrust ${Math.round(part.thrust)}` : "",
    part.incomeRate ? `Income ${formatMoneyRate(part.incomeRate)}/s` : "",
    part.researchRate ? getPartResearchMetric(part) : "",
    `Drag ${formatStatNumber(part.dragArea ?? 0, 1)}`,
    part.stageAction ? `Default ${getStageLabel(getDefaultStageForPart(part))}` : "Flight part"
  ]
    .filter(Boolean)
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");
}

function getPartUsageTip(part) {
  const tips = {
    payload: "Use it near the top of the rocket. Give it a numbered stage so it can detach after you reach a stable orbit.",
    aero: "Place this at the very top. It lowers drag while climbing through the atmosphere.",
    command: "Keep one command pod in the stack. It represents control and should usually sit below payloads and nose cones.",
    parachute: "Assign it to a late stage. Deploy only inside atmosphere and only after slowing below its safe speed.",
    legs: "Assign to a late stage. Deploy before touchdown so the rocket can survive a slower, upright landing.",
    fuel: "Place tanks above the engine they feed. More fuel increases burn time, but also adds mass.",
    decoupler: "Put it between an upper craft and lower booster. When staged, it drops itself and every part below it.",
    engine: "Place a launch engine at the bottom. More thrust improves lift, but burns fuel faster."
  };
  return tips[part.type] ?? "Add it to the stack, then use stage controls if it has an action.";
}

function renderValidation(validation, highlightErrors, canAfford = true, cost = 0, lockedParts = []) {
  const messages = [];

  validation.errors.forEach((message) => messages.push({ type: "error", message }));
  validation.warnings.forEach((message) => messages.push({ type: "warning", message }));
  if (!canAfford) messages.push({ type: "error", message: `Not enough cash for this launch. Cost: ${formatMoney(cost)}.` });
  lockedParts.forEach((part) => messages.push({ type: "error", message: `${part.shortName ?? part.name} is locked. ${getPartUnlockText(part, game.company)}.` }));

  if (messages.length === 0) {
    buildValidationEl.innerHTML = `<div class="validation-message success">Rocket is launch capable. ${game.company.mode === "sandbox" ? "Sandbox mode ignores part costs." : `Career launch cost: ${formatMoney(cost)}.`}</div>`;
    return;
  }

  buildValidationEl.innerHTML = messages
    .map(
      ({ type, message }) => `<div class="validation-message ${type} ${highlightErrors && type === "error" ? "pulse" : ""}">${escapeHtml(message)}</div>`
    )
    .join("");
}

function renderProgressionDashboard(data = game.getHudData()) {
  renderSpaceCenterMap(data);
  renderProgramSummary(data);
  renderRecommendedAction(data);
  renderPassiveBank(data);
  renderEngineerQueue(data);
  renderDailyContracts(data);
}

function renderSpaceCenterMap(data = game.getHudData()) {
  if (!spaceCenterMapEl) return;
  const company = data.company ?? {};
  const engineer = data.engineer ?? { active: [], slots: 1 };
  const bank = data.passiveBank ?? { fill: {} };
  const daily = data.dailyContracts ?? [];
  const planets = data.planets ?? [];
  const completedDaily = daily.filter((contract) => contract.claimable).length;
  const maxBankFill = Math.max(bank.fill?.cash ?? 0, bank.fill?.research ?? 0, bank.fill?.scan ?? 0);
  const discovered = planets.filter((planet) => planet.discovered).length;
  const colonies = Number(company.totalColoniesBuilt ?? 0);
  const nextMission = data.nextMission ?? {};
  const facilities = [
    {
      id: "mission-control",
      title: "Mission Control",
      subtitle: nextMission.title ? `Next: ${nextMission.title}` : "Campaign clear",
      status: data.missionComplete ? "Objective complete" : "Flight plan ready",
      metric: `${Math.round(data.altitude ?? 0).toLocaleString()} m peak target`,
      target: "missions",
      state: data.missionComplete ? "ready" : "active",
      badge: "MC"
    },
    {
      id: "engineering-bay",
      title: "Engineering Bay",
      subtitle: `${engineer.active?.length ?? 0}/${engineer.slots ?? 1} engineers assigned`,
      status: engineer.active?.length ? "Construction underway" : "Crew idle",
      metric: engineer.active?.[0]?.assignedEngineer?.name ? `${engineer.active[0].assignedEngineer.name} on ${engineer.active[0].name}` : "Start an upgrade",
      target: "engineer",
      state: engineer.active?.length ? "active" : "needs-attention",
      badge: "EN"
    },
    {
      id: "contract-office",
      title: "Contract Office",
      subtitle: completedDaily ? `${completedDaily} reward ready` : "Daily clients waiting",
      status: completedDaily ? "Ready to claim" : "Build reputation",
      metric: `${daily.filter((contract) => contract.claimed).length}/${daily.length} claimed today`,
      target: "daily",
      state: completedDaily ? "ready" : "idle",
      badge: "CO"
    },
    {
      id: "storage-yard",
      title: "Storage Yard",
      subtitle: maxBankFill > 0.9 ? "Almost full" : maxBankFill > 0.35 ? "Resources waiting" : "Room available",
      status: bank.hasCollectable ? "Collectable" : "Empty",
      metric: `${Math.round(maxBankFill * 100)}% capacity`,
      target: "bank",
      state: maxBankFill > 0.9 ? "ready" : bank.hasCollectable ? "active" : "idle",
      badge: "SY"
    },
    {
      id: "research-lab",
      title: "Research Lab",
      subtitle: `${formatResearchBalance(company)} available`,
      status: `${formatResearchRate(company.researchPerSecond ?? 0)}R/s`,
      metric: "Unlock parts and systems",
      target: "research",
      state: (data.research ?? []).some((node) => node.available) ? "ready" : "idle",
      badge: "RL"
    },
    {
      id: "planetary-ops",
      title: "Planetary Ops",
      subtitle: `${discovered} mapped · ${colonies} colonies`,
      status: colonies ? "Offworld online" : "Awaiting first outpost",
      metric: `${formatScanRate(company.scanPerSecond ?? 0)}/s Scan`,
      target: "planets",
      state: colonies ? "active" : discovered > 1 ? "ready" : "locked",
      badge: "PO"
    }
  ];

  spaceCenterMapEl.innerHTML = `
    <div class="space-center-intro">
      <div>
        <span class="eyebrow">Space Center</span>
        <strong>Run the company from facilities, not just numbers.</strong>
        <p>Tap a facility to jump to the work happening there.</p>
      </div>
      <span class="space-center-mode">${escapeHtml(formatCompanyMode(company))}</span>
    </div>
    <div class="facility-grid">
      ${facilities.map(renderFacilityCard).join("")}
    </div>
  `;
}

function renderFacilityCard(facility) {
  return `
    <button type="button" class="facility-card state-${escapeHtml(facility.state)}" data-space-center-target="${escapeHtml(facility.target)}">
      <span class="facility-badge">${escapeHtml(facility.badge)}</span>
      <span class="facility-copy">
        <strong>${escapeHtml(facility.title)}</strong>
        <em>${escapeHtml(facility.subtitle)}</em>
        <small>${escapeHtml(facility.status)} · ${escapeHtml(facility.metric)}</small>
      </span>
    </button>
  `;
}

function renderProgramSummary(data = game.getHudData()) {
  if (!programSummaryEl) return;
  const level = data.programLevel ?? {};
  const progress = Math.round((level.progress ?? 0) * 100);
  programSummaryEl.innerHTML = `
    <div class="program-level-badge">
      <span>Program Level</span>
      <strong>${escapeHtml(String(level.level ?? 1))}</strong>
    </div>
    <div class="program-level-copy">
      <div><span>${escapeHtml(level.title ?? "Space Program")}</span><strong>${escapeHtml(level.isMaxLevel ? "Max Level" : `${level.xpRemaining ?? 0} XP to Level ${level.nextLevel ?? 2}`)}</strong></div>
      <div class="program-xp-track" aria-label="Program XP progress"><span style="width:${progress}%"></span></div>
      <small>${Math.round(level.xp ?? 0).toLocaleString()} XP · ${progress}% through this level</small>
    </div>
  `;
}

function renderRecommendedAction(data = game.getHudData()) {
  if (!recommendedActionCardEl) return;
  const action = data.recommendedAction ?? {};
  recommendedActionCardEl.className = `recommended-action-card tone-${escapeHtml(action.tone ?? "info")}`;
  recommendedActionCardEl.innerHTML = `
    <div>
      <span class="eyebrow">Recommended Next Action</span>
      <strong>${escapeHtml(action.title ?? "Grow the Program")}</strong>
      <p>${escapeHtml(action.body ?? "Launch, collect, and upgrade to keep the company moving.")}</p>
    </div>
    <button type="button" data-recommended-target="${escapeHtml(action.target ?? "missions")}">${escapeHtml(action.action ?? "Review")}</button>
  `;
}

function handleRecommendedAction(target = "missions") {
  if (target === "bank") {
    game.collectPassiveIncome();
    renderBuilder();
    return;
  }
  if (target === "daily") {
    dailyContractListEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (target === "engineer") {
    engineerQueueCardEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (target === "research") {
    showResearchLab();
    return;
  }
  if (target === "planets") {
    scrollBuilderSection(document.querySelector("#builderPlanetSection"));
    return;
  }
  if (target === "missions" || target === "launch") {
    scrollBuilderSection(builderMissionsSectionEl);
    return;
  }
  scrollBuilderSection(builderMissionsSectionEl);
}

function renderPassiveBank(data = game.getHudData()) {
  if (!passiveBankCardEl) return;
  const view = data.passiveBank ?? {};
  const bank = view.bank ?? {};
  const caps = view.caps ?? {};
  const fill = view.fill ?? {};
  passiveBankCardEl.innerHTML = `
    <div class="progression-panel-top">
      <div><span class="system-icon income-icon" aria-hidden="true">IN</span></div>
      <div><strong>Storage Yard</strong><span>Cash crates, research binders, and scan drives wait here.</span></div>
      <button type="button" data-collect-passive ${view.hasCollectable ? "" : "disabled"}>Collect</button>
    </div>
    ${renderBankResource("Cash", formatMoney(bank.cash ?? 0), formatMoney(caps.cash ?? 0), fill.cash ?? 0)}
    ${renderBankResource("Research", `${formatResearch(bank.research ?? 0)}R`, `${formatResearch(caps.research ?? 0)}R`, fill.research ?? 0)}
    ${renderBankResource("Scan", Math.floor(bank.scan ?? 0).toLocaleString(), Math.floor(caps.scan ?? 0).toLocaleString(), fill.scan ?? 0)}
  `;
}

function renderBankResource(label, value, cap, fill) {
  const percent = Math.round(clampNumber(Number(fill ?? 0) * 100, 0, 100));
  return `
    <div class="bank-resource">
      <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)} / ${escapeHtml(cap)}</strong></div>
      <div class="bank-track"><span style="width:${percent}%"></span></div>
    </div>
  `;
}

function renderEngineerQueue(data = game.getHudData()) {
  if (!engineerQueueCardEl) return;
  const engineer = data.engineer ?? { slots: 1, active: [], projects: [] };
  const active = engineer.active ?? [];
  const nextProjects = (engineer.projects ?? []).filter((project) => !project.complete && !project.active).slice(0, 3);
  engineerQueueCardEl.innerHTML = `
    <div class="progression-panel-top">
      <div><span class="system-icon engineer-icon" aria-hidden="true">EN</span></div>
      <div><strong>Engineering Bay</strong><span>${active.length}/${engineer.slots ?? 1} working · named crew</span></div>
    </div>
    ${renderEngineerCrewStrip(engineer.crew ?? [], active)}
    <div class="engineer-active-list">
      ${active.length ? active.map(renderActiveEngineerProject).join("") : `<p class="empty-note">No engineer project active. Start one to keep progression moving between launches.</p>`}
    </div>
    <div class="engineer-project-list">
      ${nextProjects.map(renderAvailableEngineerProject).join("")}
    </div>
  `;
}

function renderEngineerCrewStrip(crew = [], active = []) {
  if (!crew.length) return "";
  const busy = new Map(active.map((project) => [project.assignedEngineerId, project]));
  return `
    <div class="engineer-crew-strip">
      ${crew.map((engineer) => {
        const project = busy.get(engineer.id);
        return `
          <div class="engineer-crew-card ${project ? "busy" : "idle"}">
            <span>${escapeHtml(engineer.name?.slice(0, 1) ?? "E")}</span>
            <strong>${escapeHtml(engineer.name ?? "Engineer")}</strong>
            <small>${project ? `On ${escapeHtml(project.name)}` : escapeHtml(engineer.role ?? "Available")}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderActiveEngineerProject(project) {
  const percent = Math.round((project.progress ?? 0) * 100);
  return `
    <article class="engineer-project active">
      <div><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(project.assignedEngineer?.name ?? "Engineer")} in ${escapeHtml(project.facility ?? project.lane ?? "Engineering")} · ${escapeHtml(project.effect ?? "Project in progress")}</span></div>
      <em>${formatDuration(project.remainingMs ?? 0)}</em>
      <div class="engineer-track"><span style="width:${percent}%"></span></div>
    </article>
  `;
}

function renderAvailableEngineerProject(project) {
  return `
    <article class="engineer-project ${project.locked ? "locked" : project.affordable ? "" : "unaffordable"}">
      <div><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(project.facility ?? project.lane ?? "Space Center")} · ${escapeHtml(project.effect ?? project.description ?? "Engineer project")}</span></div>
      <div class="engineer-project-actions">
        <small>${formatDuration((project.durationSeconds ?? 0) * 1000)} · ${formatMoney(project.cost ?? 0)}</small>
        <button type="button" data-start-project="${escapeHtml(project.id)}" ${project.canStart ? "" : "disabled"}>${project.complete ? "Done" : project.locked ? `Lvl ${project.requiredProgramLevel}` : project.affordable ? "Start" : "Need Cash"}</button>
      </div>
    </article>
  `;
}

function renderDailyContracts(data = game.getHudData()) {
  if (!dailyContractListEl) return;
  const contracts = data.dailyContracts ?? [];
  dailyContractListEl.innerHTML = `
    <div class="progression-panel-top">
      <div><span class="system-icon daily-icon" aria-hidden="true">DY</span></div>
      <div><strong>Contract Office</strong><span>Client requests with clear rewards.</span></div>
    </div>
    <div class="daily-contract-stack">
      ${contracts.map(renderDailyContract).join("")}
    </div>
  `;
}

function renderDailyContract(contract) {
  const percent = Math.round((contract.percent ?? 0) * 100);
  const reward = contract.reward ?? {};
  const rewardText = [
    reward.cash ? formatMoney(reward.cash) : "",
    reward.research ? `${formatResearch(reward.research)}R` : "",
    reward.xp ? `${reward.xp} XP` : ""
  ].filter(Boolean).join(" · ");
  return `
    <article class="daily-contract ${contract.claimed ? "claimed" : contract.claimable ? "claimable" : ""}">
      <div class="daily-contract-copy">
        <strong>${escapeHtml(contract.client ? `${contract.client}: ${contract.title}` : contract.title)}</strong>
        <span>${escapeHtml(contract.flavor ?? contract.description)}</span>
        <small>${escapeHtml(rewardText)}</small>
      </div>
      <div class="daily-contract-progress">
        <em>${Math.min(Math.floor(contract.progress ?? 0), contract.target ?? 1)}/${contract.target ?? 1}</em>
        <div class="daily-track"><span style="width:${percent}%"></span></div>
      </div>
      <button type="button" data-claim-daily="${escapeHtml(contract.id)}" ${contract.claimable ? "" : "disabled"}>${contract.claimed ? "Claimed" : contract.claimable ? "Claim" : "Progress"}</button>
    </article>
  `;
}

function renderMissionBoard(data) {
  if (!missionBoardEl || !missionBoardSummaryEl) return;
  const missions = data.missions ?? [];
  const completed = missions.filter((mission) => mission.completed).length;
  const nextMission = data.nextMission ?? missions.find((mission) => !mission.completed) ?? missions[missions.length - 1];
  const chapter = nextMission?.chapterProgress ?? data.missionChapters?.find((candidate) => !candidate.complete) ?? data.missionChapters?.[0];

  missionBoardSummaryEl.textContent = chapter
    ? `${chapter.title} ${chapter.completed}/${chapter.total}`
    : `${completed}/${missions.length} complete`;

  if (toggleMissionBoardViewButton) toggleMissionBoardViewButton.textContent = missionsExpanded ? "Show Less" : "View All";
  missionBoardEl.classList.toggle("expanded", missionsExpanded);

  if (!missionsExpanded && nextMission) {
    const reward = getMissionRewardLabel(nextMission);
    const template = ROCKET_TEMPLATES.find((candidate) => candidate.id === nextMission.recommendedTemplateId);
    const templateLocked = template?.requiresResearch && !game.company.completedResearch?.includes(template.requiresResearch) && game.company.mode !== "sandbox";
    const chapterText = chapter ? `${chapter.title} · ${chapter.completed}/${chapter.total}` : "Campaign";
    const progressPercent = getMissionProgressPercent(nextMission);
    const currentValidation = validateBuild(builderStack);
    const currentLockedParts = getLockedStackParts();
    const canAffordCurrent = game.canAffordLaunch(currentValidation.stats.cost);
    const launchReady = currentValidation.valid && canAffordCurrent && currentLockedParts.length === 0;
    missionBoardEl.innerHTML = `
      <article class="mission-card current-objective">
        <div class="mission-card-top objective-topline">
          <div class="mission-emblem" aria-hidden="true">${escapeHtml(getChapterIcon(nextMission.chapter))}</div>
          <div>
            <small>${escapeHtml(chapterText)}</small>
            <strong>${escapeHtml(nextMission.title)}</strong>
            <span>${escapeHtml(nextMission.objective)}</span>
          </div>
        </div>
        <div class="campaign-chip-row objective-chip-row">
          <span class="campaign-chip">${escapeHtml(getMissionStatusLabel(nextMission))}</span>
          <span class="campaign-chip reward-chip">${escapeHtml(reward)}</span>
        </div>
        <div class="mission-progress-block" aria-label="Mission progress">
          <div class="mission-progress-copy">
            <span>${escapeHtml(nextMission.progress)}</span>
            <strong>${Math.round(progressPercent)}%</strong>
          </div>
          <div class="mission-progress-track"><span style="width: ${progressPercent.toFixed(1)}%"></span></div>
        </div>
        <div class="mission-action-row objective-actions">
          <button type="button" data-template="${escapeHtml(nextMission.recommendedTemplateId ?? "")}" ${!template || templateLocked ? "disabled" : ""}>
            Use ${escapeHtml(nextMission.recommendedTemplateLabel ?? template?.name ?? "Suggested Build")}
          </button>
          <button type="button" data-edit-rocket>Edit Rocket</button>
          <button type="button" data-launch-now ${launchReady ? "" : "disabled"}>${launchReady ? "Launch Now" : "Build First"}</button>
        </div>
        <p class="objective-hint">${templateLocked ? "Unlock the suggested build through research, or edit your current rocket below." : launchReady ? "Your rocket is ready. Launch when you are." : "Use the suggested build or edit your rocket to meet this goal."}</p>
      </article>
    `;
    return;
  }

  missionBoardEl.innerHTML = renderCampaignRoad(missions, data.missionChapters ?? [], nextMission);
}

function renderCampaignRoad(missions = [], chapters = [], nextMission = null) {
  if (!missions.length) return `<p class="empty-note">No campaign missions available.</p>`;
  const chapterList = chapters.length
    ? chapters
    : [...new Map(missions.map((mission) => [mission.chapter, {
        id: mission.chapter,
        title: mission.chapterTitle ?? "Campaign",
        description: mission.chapterDescription ?? "Complete missions to advance.",
        completed: missions.filter((candidate) => candidate.chapter === mission.chapter && candidate.completed).length,
        total: missions.filter((candidate) => candidate.chapter === mission.chapter).length,
        complete: missions.filter((candidate) => candidate.chapter === mission.chapter).every((candidate) => candidate.completed)
      }])).values()];

  return `
    <div class="campaign-road">
      ${chapterList.map((chapter) => {
        const chapterMissions = missions.filter((mission) => mission.chapter === chapter.id);
        const isCurrent = Boolean(nextMission && nextMission.chapter === chapter.id && !chapter.complete);
        const isLocked = !chapter.complete && !isCurrent && chapterMissions.every((mission) => !mission.completed) && missions.findIndex((mission) => mission.id === chapterMissions[0]?.id) > missions.findIndex((mission) => mission.id === nextMission?.id);
        const progress = chapter.total > 0 ? Math.round((chapter.completed / chapter.total) * 100) : 0;
        return `
          <section class="campaign-chapter-card ${chapter.complete ? "complete" : isCurrent ? "current" : isLocked ? "locked" : ""}">
            <div class="campaign-chapter-head">
              <div class="chapter-badge" aria-hidden="true">${escapeHtml(getChapterIcon(chapter.id))}</div>
              <div>
                <span>${escapeHtml(chapter.complete ? "Chapter Complete" : isCurrent ? "Current Chapter" : "Upcoming Chapter")}</span>
                <strong>${escapeHtml(chapter.title)}</strong>
                <p>${escapeHtml(chapter.description ?? "Complete missions to advance.")}</p>
              </div>
              <b>${chapter.completed}/${chapter.total}</b>
            </div>
            <div class="chapter-progress-track" aria-hidden="true"><span style="width:${progress}%"></span></div>
            <div class="mission-road-list">
              ${chapterMissions.map((mission, index) => {
                const missionProgress = getMissionProgressPercent(mission);
                const isNext = nextMission?.id === mission.id;
                return `
                  <article class="mission-road-node ${mission.completed ? "complete" : isNext ? "next" : ""}">
                    <div class="mission-node-index">${mission.completed ? "✓" : String(index + 1).padStart(2, "0")}</div>
                    <div class="mission-node-copy">
                      <strong>${escapeHtml(mission.title)}</strong>
                      <span>${escapeHtml(mission.objective)}</span>
                      <div class="mission-node-progress"><span style="width:${missionProgress.toFixed(1)}%"></span></div>
                    </div>
                    <div class="mission-node-reward">${escapeHtml(mission.completed ? "Claimed" : getMissionRewardLabel(mission))}</div>
                  </article>`;
              }).join("")}
            </div>
          </section>`;
      }).join("")}
    </div>`;
}

function getChapterIcon(id = "") {
  const icons = {
    flight_school: "01",
    orbit_program: "02",
    orbital_business: "03",
    exploration_program: "04",
    colonization_program: "05"
  };
  return icons[id] ?? "NL";
}

function getMissionStatusLabel(mission) {
  if (!mission) return "Mission";
  if (mission.completed) return "Complete";
  return mission.chapterTitle ? `${mission.chapterTitle}` : "Next Mission";
}

function getMissionRewardLabel(mission) {
  if (!mission) return "$0";
  return `${formatMoney(mission.reward)}${mission.researchReward ? ` + ${formatResearch(mission.researchReward)}R` : ""}`;
}

function renderEarthMines(data = game.getHudData()) {
  if (!earthMineCountEl || !earthMineIncomeEl || !earthMineTotalIncomeEl || !earthMineStatusEl || !buyEarthMineButton) return;
  const company = data.company ?? game.company;
  const count = Math.max(0, Math.min(EARTH_MINE_MAX, Math.floor(Number(company.earthMineCount ?? 0))));
  const mineIncome = count * EARTH_MINE_INCOME_RATE;
  const canBuy = count < EARTH_MINE_MAX && (hasCostBypass(company) || Number(company.money ?? 0) >= EARTH_MINE_COST);
  const remaining = Math.max(0, EARTH_MINE_MAX - count);
  if (earthMineMiniStatusEl) earthMineMiniStatusEl.textContent = `${formatMoneyRate(mineIncome)}/s · ${remaining} left`;

  earthMineCountEl.textContent = `${count}/${EARTH_MINE_MAX}`;
  earthMineIncomeEl.textContent = `${formatMoneyRate(mineIncome)}/s`;
  earthMineTotalIncomeEl.textContent = formatMoney(company.totalMineRevenue ?? 0);
  earthMineStatusEl.textContent = count >= EARTH_MINE_MAX
    ? "Mine limit reached."
    : canBuy
      ? `${remaining} left · +${formatMoneyRate(EARTH_MINE_INCOME_RATE)}/s each`
      : `Need ${formatMoney(Math.max(0, EARTH_MINE_COST - Number(company.money ?? 0)))} more cash.`;
  buyEarthMineButton.disabled = !canBuy;
  buyEarthMineButton.textContent = count >= EARTH_MINE_MAX
    ? "All Mines Built"
    : hasCostBypass(company)
      ? `Add Mine (${count}/${EARTH_MINE_MAX})`
      : `Buy Mine for ${formatMoney(EARTH_MINE_COST)}`;
}

function renderOrbitalNetwork(data = game.getHudData()) {
  if (!orbitalNetworkStatusEl || !orbitalNetworkPayloadsEl || !orbitalNetworkIncomeEl || !orbitalNetworkResearchEl || !orbitalNetworkScanEl || !orbitalNetworkSignalEl || !orbitalNetworkSignalBarEl) return;
  const payloads = (data.trackedObjects ?? []).filter((object) => object.kind === "payload" && object.online);
  const signal = data.nextPlanetSignal ?? {};
  const scan = Number(signal.current ?? data.company?.totalScanGenerated ?? 0);
  const scanRate = Number(data.company?.scanPerSecond ?? 0);
  const target = Number(signal.target ?? 500);
  const progress = Number(signal.progress ?? (target > 0 ? scan / target : 1));
  orbitalNetworkPayloadsEl.textContent = String(payloads.length);
  orbitalNetworkIncomeEl.textContent = `${formatMoneyRate(data.company?.orbitalIncomePerSecond ?? 0)}/s`;
  orbitalNetworkResearchEl.textContent = `${formatResearchRate(data.company?.researchPerSecond ?? 0)}R/s`;
  orbitalNetworkScanEl.textContent = `${formatScanRate(scanRate)}/s`;
  orbitalNetworkSignalEl.textContent = signal.complete
    ? "All signals mapped"
    : `${Math.floor(scan).toLocaleString()} / ${target.toLocaleString()} Scan`;
  orbitalNetworkSignalBarEl.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
  orbitalNetworkStatusEl.textContent = signal.complete
    ? "Registry mapped"
    : scan >= target
      ? "Signal locked"
      : scanRate > 0
        ? `Scanning +${formatScanRate(scanRate)}/s`
        : payloads.some((object) => object.payloadType === "exploration_satellite")
          ? "Explorer offline"
          : "Needs Explorer";
}

function renderPlanetRegistry(data = game.getHudData()) {
  if (!planetRegistryStatusEl || !planetRegistryListEl || !planetSignalNameEl || !planetSignalBarEl || !planetSignalStatusEl) return;
  const planets = data.planets ?? [];
  const discovered = planets.filter((planet) => planet.discovered);
  const colonized = planets.filter((planet) => planet.colony?.colonized);
  const signal = data.nextPlanetSignal ?? {};
  const scan = Number(signal.current ?? data.company?.totalScanGenerated ?? 0);
  const scanRate = Number(data.company?.scanPerSecond ?? 0);

  planetRegistryStatusEl.textContent = `${Math.max(0, discovered.length - 1)} discovered · ${colonized.length} colonies`;
  planetRegistryListEl.innerHTML = planets.map((planet) => {
    const progress = Math.round(Math.max(0, Math.min(1, Number(planet.progress ?? 0))) * 100);
    const color = planet.visualColor ?? "#a78bfa";
    const colony = planet.colony ?? {};
    const colonyHtml = renderColonyPanel(planet, colony);
    return `
      <article class="planet-card ${planet.discovered ? "discovered" : "locked"} ${colony.colonized ? "colonized" : ""}" style="--planet-color: ${escapeHtml(color)}">
        <div class="planet-orb" aria-hidden="true"><span></span></div>
        <div class="planet-card-copy">
          <strong>${escapeHtml(planet.discovered ? planet.name : "Unknown Signal")}</strong>
          <span>${escapeHtml(planet.discovered ? planet.classification : `${Math.floor(planet.scanProgress ?? 0)} / ${planet.scanRequired.toLocaleString()} Scan`)}</span>
          ${planet.discovered ? `<p>${escapeHtml(planet.description ?? "Mapped destination.")}</p>` : `<div class="planet-card-progress"><span style="width:${progress}%"></span></div>`}
          ${colonyHtml}
        </div>
        <div class="planet-tags">
          <span>${escapeHtml(planet.discovered ? planet.distanceLabel : "???")}</span>
          <span>${escapeHtml(planet.discovered ? planet.mineralsLabel : "Minerals ?")}</span>
          <span>${escapeHtml(planet.discovered ? planet.habitabilityLabel : "Hab ?")}</span>
        </div>
      </article>`;
  }).join("");

  if (signal.complete) {
    planetSignalNameEl.textContent = "Survey Complete";
    planetSignalStatusEl.textContent = "All starter planetary signals are mapped.";
    planetSignalBarEl.style.width = "100%";
    return;
  }

  planetSignalNameEl.textContent = "Unknown Signal";
  planetSignalBarEl.style.width = `${Math.round(Math.max(0, Math.min(1, Number(signal.progress ?? 0))) * 100)}%`;
  planetSignalStatusEl.textContent = scanRate > 0
    ? `${Math.floor(scan).toLocaleString()} / ${Number(signal.target ?? 0).toLocaleString()} Scan · +${formatScanRate(scanRate)}/s`
    : `Need exploration satellite Scan to reach ${Number(signal.target ?? 0).toLocaleString()}.`;
}

function renderColonyPanel(planet, colony = {}) {
  if (!planet.discovered || !colony.colonizable) return "";
  const production = colony.production ?? {};
  const nextProduction = colony.nextProduction ?? production;
  const cost = colony.nextCost;
  const outputText = colony.colonized
    ? `${formatMoneyRate(production.cash ?? 0)}/s · ${formatResearchRate(production.research ?? 0)}R/s · ${formatScanRate(production.scan ?? 0)}/s Scan`
    : `Projected: ${formatMoneyRate(nextProduction.cash ?? 0)}/s · ${formatResearchRate(nextProduction.research ?? 0)}R/s · ${formatScanRate(nextProduction.scan ?? 0)}/s Scan`;
  const costText = cost ? formatColonyCost(cost) : "Fully upgraded";
  const statusText = colony.colonized
    ? `Level ${colony.level}/${colony.maxLevel} · ${escapeHtml(colony.tierName)}`
    : escapeHtml(colony.role ?? "Robotic Outpost");
  const button = colony.maxed
    ? `<button type="button" class="mini-button colony-action-button" disabled>Max Colony</button>`
    : `<button type="button" class="mini-button colony-action-button" data-colony-action="${escapeHtml(planet.id)}" ${colony.canAct ? "" : "disabled"}>${escapeHtml(colony.actionLabel)}</button>`;

  return `
    <div class="colony-panel ${colony.colonized ? "online" : "offline"}">
      <div class="colony-copy">
        <span>${statusText}</span>
        <strong>${escapeHtml(outputText)}</strong>
        <small>${escapeHtml(colony.canAct || colony.maxed ? costText : colony.actionLabel)}${cost && !colony.canAct && colony.roboticReady ? ` · ${escapeHtml(costText)}` : ""}</small>
      </div>
      ${button}
    </div>`;
}

function renderResearchLab(data) {
  const company = data.company ?? game.company;
  const researchPoints = company.testResourcesEnabled ? 999999999 : (company.researchPoints ?? 0);
  const researchRate = company.researchPerSecond ?? 0;
  const nodes = data.research ?? [];
  const completed = nodes.filter((node) => node.complete).length;
  const total = nodes.length;
  const miniText = `${formatResearch(researchPoints, researchPoints < 10 ? 1 : 0)}R · ${formatResearchRate(researchRate)}R/sec`;
  if (builderResearchMiniStatusEl) builderResearchMiniStatusEl.textContent = miniText;

  if (!researchSummaryEl || !researchTreeEl) return;

  const nextMission = data.nextMission;
  const nextNode = getRecommendedResearchNode(nodes);
  const selectedNode = getSelectedResearchNode(nodes, nextNode);
  const telemetryComplete = Boolean(company.completedResearch?.includes("orbital_telemetry"));
  const missionReward = nextMission?.researchReward ?? 0;
  const labLevel = Math.max(1, completed + 1);

  researchSummaryEl.innerHTML = `
    <div><span>Research Points</span><strong>${formatResearch(researchPoints, researchPoints < 10 ? 1 : 0)}</strong></div>
    <div><span>Data Rate</span><strong>${formatResearchRate(researchRate)}R/s</strong></div>
    <div><span>Lab Level</span><strong>${labLevel}</strong></div>
    <div><span>Progress</span><strong>${completed}/${total}</strong></div>
  `;

  if (researchGuideEl) {
    researchGuideEl.innerHTML = renderRpgRecommendedCard(nextNode, {
      researchPoints,
      researchRate,
      missionReward,
      telemetryComplete
    });
  }

  const laneConfig = getResearchLanes();
  const nodesByLane = getResearchNodesByLane(nodes, laneConfig);

  researchTreeEl.innerHTML = `
    <section class="research-rpg-card">
      <div class="research-rpg-map-top">
        <div>
          <span class="eyebrow">Skill Progression</span>
          <strong>Upgrade your space program through four research paths.</strong>
          <p>Tap a node to inspect it. Ready nodes glow. Locked nodes show what the program needs next.</p>
        </div>
        <div class="research-rpg-core" aria-label="Rocket Program Core">
          <span>NL</span>
          <strong>Rocket Program</strong>
          <em>${completed}/${total} online</em>
        </div>
      </div>
      <div class="research-lane-jumps research-rpg-tabs" aria-label="Jump to a research path">
        ${laneConfig.map((lane) => renderResearchLaneJump(lane, nodesByLane.get(lane.id) ?? [])).join("")}
      </div>
      <div class="research-rpg-lanes">
        ${laneConfig.map((lane) => renderResearchLane(lane, nodesByLane.get(lane.id) ?? [], selectedNode, researchPoints)).join("")}
      </div>
      ${renderSelectedResearchPanel(selectedNode, researchPoints)}
      ${renderResearchLegend()}
    </section>
  `;
}

function getResearchLanes() {
  return [
    { id: "propulsion", label: "Propulsion", icon: "PX", summary: "Engines, tanks, and lift systems" },
    { id: "orbital", label: "Orbital Ops", icon: "OO", summary: "Telemetry, payloads, and data" },
    { id: "exploration", label: "Exploration", icon: "EX", summary: "Survey tools and planet discovery" },
    { id: "planetary", label: "Planetary Systems", icon: "PS", summary: "Registry, transfer, and lander prep" }
  ];
}

function getResearchNodesByLane(nodes = [], laneConfig = getResearchLanes()) {
  const nodesByLane = new Map(laneConfig.map((lane) => [lane.id, []]));
  nodes.forEach((node) => {
    const laneId = node.lane && nodesByLane.has(node.lane) ? node.lane : "orbital";
    nodesByLane.get(laneId).push(node);
  });
  laneConfig.forEach((lane) => {
    nodesByLane.get(lane.id).sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0) || a.cost - b.cost);
  });
  return nodesByLane;
}

function renderRpgRecommendedCard(node, context = {}) {
  const researchPoints = context.researchPoints ?? 0;
  const researchRate = context.researchRate ?? 0;
  const missionReward = context.missionReward ?? 0;
  const telemetryComplete = Boolean(context.telemetryComplete);
  const lane = getResearchLane(node?.lane);
  const tier = getResearchTier(node);
  if (!node) {
    return `
      <article class="research-rpg-hero tier-legendary lane-orbital">
        <div class="research-rpg-hero-icon"><span>OK</span></div>
        <div class="research-rpg-hero-copy">
          <span class="research-rpg-kicker">Research Complete</span>
          <strong>All current upgrades are online.</strong>
          <p>Your current research program is fully upgraded for this version.</p>
        </div>
      </article>
    `;
  }
  return `
    <article class="research-rpg-hero tier-${escapeHtml(tier)} lane-${escapeHtml(lane.id)}">
      <div class="research-rpg-hero-icon"><span>${escapeHtml(node.icon ?? lane.icon)}</span></div>
      <div class="research-rpg-hero-copy">
        <span class="research-rpg-kicker">Recommended</span>
        <strong>${escapeHtml(node.name)}</strong>
        <p>${escapeHtml(getResearchRecommendationText(node, researchPoints))}</p>
        <div class="research-rpg-tags">
          <span>${escapeHtml(getTierLabel(tier))}</span>
          <span>${escapeHtml(lane.label)}</span>
          <span>Tier ${getResearchTierNumber(node)}</span>
        </div>
      </div>
      <div class="research-rpg-hero-effect">
        <span>${escapeHtml(node.effectLabel ?? "Program Upgrade")}</span>
        <strong>${node.available ? "Ready" : node.waitingForPoints ? `${formatResearch(Math.max(0, node.cost - researchPoints))}R short` : "Locked"}</strong>
      </div>
      <button type="button" data-buy-research="${escapeHtml(node.id)}" ${node.available ? "" : "disabled"}>Research ${formatResearch(node.cost)}R</button>
      <div class="research-earn-strip research-rpg-earn" aria-label="How to earn Research">
        <div><span>Missions</span><strong>+${formatResearch(missionReward)}R next</strong></div>
        <div><span>Telemetry</span><strong>${telemetryComplete ? "Online" : "Unlock first"}</strong></div>
        <div><span>Payloads</span><strong>${formatResearchRate(researchRate)}R/s</strong></div>
      </div>
    </article>
  `;
}

function renderResearchLaneJump(lane, nodes = []) {
  const completeCount = nodes.filter((node) => node.complete).length;
  return `
    <button type="button" class="research-lane-jump lane-${escapeHtml(lane.id)}" data-research-lane-jump="${escapeHtml(lane.id)}">
      <span>${escapeHtml(lane.icon)}</span>
      <strong>${escapeHtml(lane.label)}</strong>
      <em>${completeCount}/${nodes.length}</em>
    </button>
  `;
}

function renderResearchLane(lane, nodes = [], selectedNode = null, researchPoints = 0) {
  const completeCount = nodes.filter((node) => node.complete).length;
  return `
    <section id="research-lane-${escapeHtml(lane.id)}" class="research-rpg-lane lane-${escapeHtml(lane.id)}" tabindex="-1">
      <div class="research-rpg-lane-head">
        <div class="research-rpg-lane-emblem">${escapeHtml(lane.icon)}</div>
        <div>
          <h3>${escapeHtml(lane.label)}</h3>
          <p>${escapeHtml(lane.summary)}</p>
        </div>
        <span>${completeCount}/${nodes.length}</span>
      </div>
      <div class="research-rpg-path">
        ${nodes.map((node, index) => renderResearchFlowNode(node, selectedNode, researchPoints, index < nodes.length - 1)).join("")}
      </div>
    </section>
  `;
}

function scrollToResearchLane(laneId) {
  if (!laneId) return;
  const lane = document.getElementById(`research-lane-${laneId}`);
  if (!lane) return;
  lane.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  lane.classList.add("research-lane-pulse");
  window.setTimeout(() => lane.classList.remove("research-lane-pulse"), 900);
}

function renderResearchFlowNode(node, selectedNode = null, researchPoints = 0, showConnector = false) {
  const statusClass = node.complete ? "complete" : node.locked ? "locked" : node.available ? "available" : "waiting";
  const tier = getResearchTier(node);
  const isSelected = selectedNode?.id === node.id;
  const isRecommended = getRecommendedResearchNode(game.getHudData().research ?? [])?.id === node.id;
  return `
    <div class="research-rpg-node-wrap ${showConnector ? "has-connector" : ""}">
      <button type="button" class="research-rpg-node ${statusClass} tier-${escapeHtml(tier)} ${isSelected ? "selected" : ""} ${isRecommended ? "recommended" : ""}" data-select-research="${escapeHtml(node.id)}" aria-pressed="${isSelected ? "true" : "false"}">
        <span class="research-rpg-node-ring"><span>${escapeHtml(node.icon ?? "NL")}</span></span>
        <span class="research-rpg-node-status">${escapeHtml(getResearchNodeStatusText(node, researchPoints))}</span>
        <strong>${escapeHtml(node.treeName ?? node.name)}</strong>
        <em>${escapeHtml(getTierLabel(tier))} · Tier ${getResearchTierNumber(node)}</em>
      </button>
    </div>
  `;
}

function renderSelectedResearchPanel(node, researchPoints = 0) {
  if (!node) return "";
  const lane = getResearchLane(node.lane);
  const tier = getResearchTier(node);
  const prerequisites = node.prerequisites ?? [];
  const pointShortfall = Math.max(0, Number(node.cost ?? 0) - researchPoints);
  const requirementRows = [
    ...prerequisites.map((id) => {
      const met = !(node.missingPrerequisites ?? []).includes(id);
      const label = node.missingPrerequisiteNames?.find((name) => name === id) ?? getResearchPrerequisiteLabel(id);
      return `<li class="${met ? "met" : "unmet"}"><span>${met ? "Met" : "Need"}</span><strong>${escapeHtml(label)}</strong></li>`;
    }),
    `<li class="${pointShortfall <= 0 ? "met" : "unmet"}"><span>${pointShortfall <= 0 ? "Met" : "Need"}</span><strong>${pointShortfall <= 0 ? `${formatResearch(node.cost)}R available` : `${formatResearch(pointShortfall)}R more`}</strong></li>`
  ].join("");

  return `
    <article class="research-selected-upgrade tier-${escapeHtml(tier)} lane-${escapeHtml(lane.id)}">
      <div class="research-selected-icon"><span>${escapeHtml(node.icon ?? lane.icon)}</span></div>
      <div class="research-selected-copy">
        <span class="research-rpg-kicker">Selected Upgrade</span>
        <h3>${escapeHtml(node.name)}</h3>
        <div class="research-rpg-tags">
          <span>${escapeHtml(lane.label)}</span>
          <span>${escapeHtml(getTierLabel(tier))}</span>
          <span>Tier ${getResearchTierNumber(node)}</span>
        </div>
        <p>${escapeHtml(node.description ?? node.unlockText ?? "Upgrade your research program.")}</p>
        <small>${escapeHtml(node.unlockText ?? node.shortUnlockText ?? "Adds a new program capability.")}</small>
      </div>
      <div class="research-selected-effects">
        <span>Effect</span>
        <strong>${escapeHtml(node.effectLabel ?? node.shortUnlockText ?? "Program Upgrade")}</strong>
        <ul>${requirementRows}</ul>
        <button type="button" data-buy-research="${escapeHtml(node.id)}" ${node.available ? "" : "disabled"}>${escapeHtml(getResearchNodeButtonText(node))}</button>
      </div>
    </article>
  `;
}

function renderResearchLegend() {
  return `
    <div class="research-rpg-legend" aria-label="Research legend">
      <span class="tier-common">Common</span>
      <span class="tier-uncommon">Uncommon</span>
      <span class="tier-rare">Rare</span>
      <span class="tier-epic">Epic</span>
      <span class="tier-legendary">Legendary</span>
      <em>DONE Researched</em>
      <em>READY Available</em>
      <em>LOCKED Requires another node</em>
    </div>
  `;
}

function getSelectedResearchNode(nodes = [], nextNode = null) {
  const selected = nodes.find((node) => node.id === selectedResearchId);
  const fallback = nextNode
    ?? nodes.find((node) => node.available)
    ?? nodes.find((node) => node.waitingForPoints && !node.locked)
    ?? nodes.find((node) => node.complete)
    ?? nodes[0]
    ?? null;
  selectedResearchId = selected?.id ?? fallback?.id ?? null;
  return selected ?? fallback;
}

function getResearchLane(laneId) {
  return getResearchLanes().find((lane) => lane.id === laneId) ?? getResearchLanes()[1];
}

function getResearchTier(node = {}) {
  if (node?.tier) return node.tier;
  const cost = Number(node?.cost ?? 0);
  if (cost >= 220) return "epic";
  if (cost >= 120) return "rare";
  if (cost >= 55) return "uncommon";
  return "common";
}

function getTierLabel(tier = "common") {
  const labels = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };
  return labels[tier] ?? "Common";
}

function getResearchTierNumber(node = {}) {
  return Math.max(1, Number(node.laneOrder ?? 1));
}

function getResearchPrerequisiteLabel(id) {
  const view = game.getHudData().research ?? [];
  return view.find((node) => node.id === id)?.name ?? id;
}

function getResearchNodeStatusText(node, researchPoints = 0) {
  if (node.complete) return "DONE";
  if (node.locked) return "LOCKED";
  if (node.available) return "READY";
  return `${formatResearch(Math.max(0, node.cost - researchPoints))}R short`;
}

function getResearchNodeButtonText(node) {
  if (node.complete) return "Researched";
  if (node.locked) return "Locked";
  if (node.available) return `Research ${formatResearch(node.cost)}R`;
  return "Need Research";
}

function getRecommendedResearchNode(nodes = []) {
  return nodes.find((node) => node.available)
    ?? nodes.find((node) => node.waitingForPoints && !node.locked)
    ?? nodes.find((node) => !node.complete)
    ?? null;
}

function getResearchRecommendationText(node, researchPoints = 0) {
  if (!node) return "You have finished the current research tree.";
  if (node.complete) return "Already researched.";
  if (node.locked) return `Finish ${node.missingPrerequisiteNames.join(", ")} first.`;
  if (node.available) return `${node.unlockText ?? "This upgrade is ready."}`;
  return `Earn ${formatResearch(Math.max(0, node.cost - researchPoints))} more R from missions or payload data.`;
}

function getPartResearchMetric(part) {
  const telemetryComplete = game.company.mode === "sandbox" || game.company.completedResearch?.includes("orbital_telemetry");
  if (!part.researchRate) return "";
  return telemetryComplete
    ? `Research ${formatResearchRate(part.researchRate)}/s`
    : "Research after Orbital Telemetry";
}

function processFeedbackEvents(events = []) {
  if (!Array.isArray(events) || events.length === 0) return;
  events.forEach((event) => {
    feedback.handle(event);
    if (event.worldEffect) renderer.addWorldEffect?.(event.worldEffect.type, event.worldEffect.x, event.worldEffect.y, event.worldEffect);
  });
}

function updateTimeWarpControl(data = {}) {
  if (!cycleTimeWarpButton) return;
  const scale = Number(data.flightTimeScale ?? 1);
  cycleTimeWarpButton.textContent = `Warp ${scale}x`;
  cycleTimeWarpButton.classList.toggle("is-active", scale > 1);
  cycleTimeWarpButton.setAttribute("aria-pressed", String(scale > 1));
  cycleTimeWarpButton.title = scale > 1
    ? "Flight physics are sped up. Income, scan, research, and engineer timers remain real-time."
    : "Cycle flight-only time warp. Shortcut: T or period.";
}

function updateHud(data) {
  altitudeEl.textContent = formatDistance(data.altitude);
  speedEl.textContent = `${data.speed.toFixed(1)} m/s`;
  fuelEl.textContent = `${Math.max(0, data.fuelPercent).toFixed(0)}%`;
  statusEl.textContent = screenMode === "builder" ? "Build" : screenMode === "world" ? "World" : compactStatus(data.status);
  statusEl.title = data.status;
  fpsEl.textContent = `${Math.round(data.fps)}`;
  if (companyCashHudEl) companyCashHudEl.textContent = formatCashBalance(data.company);
  if (companyIncomeHudEl) companyIncomeHudEl.textContent = `${formatMoneyRate(data.company?.incomePerSecond ?? 0)}/s`;
  if (companyResearchHudEl) companyResearchHudEl.textContent = formatResearchBalance(data.company);
  if (companyScanHudEl) companyScanHudEl.textContent = formatScanBalance(data.company, data.nextPlanetSignal);
  updateTestResourceToggle(data.company);
  updateTimeWarpControl(data);
  if (screenMode === "builder" && researchScreenEl && !researchScreenEl.classList.contains("hidden") && performance.now() - lastResearchLiveRenderAt > 500) {
    lastResearchLiveRenderAt = performance.now();
    renderResearchLab(data);
  }
  gameShellEl.classList.toggle("income-active", (data.company?.incomePerSecond ?? 0) > 0);
  if (builderCashEl) builderCashEl.textContent = formatCashBalance(data.company);
  if (builderModeLabelEl) builderModeLabelEl.textContent = formatCompanyMode(data.company);
  if (screenMode === "builder") {
    renderProgressionDashboard(data);
    renderEarthMines(data);
    renderOrbitalNetwork(data);
    renderPlanetRegistry(data);
  }
  if (nextStageActionEl) nextStageActionEl.textContent = screenMode === "builder" ? "Build a rocket first" : screenMode === "world" ? "Viewing persistent orbit network" : data.nextStageDescription;
  updateStageFuelPanel(data.stageFuel ?? []);
  updateObjectInspector(data.selectedObject);
  updateTrackerPanel(data.trackedObjects ?? []);
  updateFlightSummaryModal(data.flightSummary);

  if (screenMode === "builder") {
    const next = data.nextMission;
    missionResultEl.textContent = next ? `Next mission: ${next.title} — ${next.objective}` : "All starter missions complete. Keep expanding your orbital network.";
    missionResultEl.classList.remove("success");
  } else if (screenMode === "world") {
    missionResultEl.textContent = `World view: ${data.savedOrbitalObjects} payloads · ${data.debrisCount} debris · ${formatMoneyRate(data.company?.incomePerSecond ?? 0)}/s · ${formatScanRate(data.company?.scanPerSecond ?? 0)}/s Scan · ${data.company?.totalColoniesBuilt ?? 0} colonies. Use Track to inspect objects.`;
    missionResultEl.classList.toggle("success", (data.company?.incomePerSecond ?? 0) > 0);
  } else if (data.stageMessage) {
    missionResultEl.textContent = data.stageMessage;
    missionResultEl.classList.toggle("success", data.stageMessage.includes("Mission complete"));
  } else if (data.missionComplete) {
    missionResultEl.textContent = data.onlinePayloads > 0 ? `Payload online: ${data.onlinePayloads} active · ${formatMoneyRate(data.company?.incomePerSecond ?? 0)}/s income · ${data.debrisCount} debris.` : "Mission complete: stable orbit achieved.";
    missionResultEl.classList.add("success");
  } else if (data.flightSummary) {
    const refundText = data.flightSummary.recoveryRefund > 0 ? ` Refund ${formatMoney(data.flightSummary.recoveryRefund)}.` : "";
    const rewardText = data.flightSummary.missionReward > 0 ? ` Missions ${formatMoney(data.flightSummary.missionReward)}.` : "";
    const researchText = data.flightSummary.researchReward > 0 ? ` Research +${formatResearch(data.flightSummary.researchReward)}.` : "";
    const netText = data.company?.mode === "sandbox" ? "" : ` Net ${formatMoney(data.flightSummary.net)}.`;
    missionResultEl.textContent = `${data.flightSummary.outcome}: max ${formatDistance(data.flightSummary.maxAltitude)}, ${data.flightSummary.maxSpeed.toFixed(0)} m/s.${refundText}${rewardText}${researchText}${netText} ${data.flightSummary.tip}`;
    missionResultEl.classList.toggle("success", data.flightSummary.outcome === "Recovered" || data.flightSummary.missionReward > 0);
  } else {
    missionResultEl.textContent = `${data.nextStageDescription} · Orbit hold ${data.orbitHoldTime.toFixed(1)}s/${PHYSICS.orbitRequiredHoldSeconds.toFixed(0)}s · ATM ${data.atmospherePercent.toFixed(0)}%`;
    missionResultEl.classList.remove("success");
  }

  const debugVisible = game.debug;
  debugPanelEl.classList.toggle("hidden", !debugVisible);
  gameShellEl.classList.toggle("debug-active", debugVisible);
  if (debugVisible) debugTextEl.textContent = data.debugText;
}

function updateStageFuelPanel(stageFuel = []) {
  if (!stageFuelPanelEl) return;
  const visible = screenMode === "flight" && stageFuel.length > 0;
  stageFuelPanelEl.classList.toggle("hidden", !visible);
  if (!visible) {
    stageFuelPanelEl.innerHTML = "";
    return;
  }

  stageFuelPanelEl.innerHTML = stageFuel
    .map((stage) => {
      const percent = Math.max(0, Math.min(100, stage.percent ?? 0));
      const label = escapeHtml(stage.label ?? `Stage ${stage.stage}`);
      const engineLabel = stage.engineCount ? (stage.engineActive ? "active" : "standby") : "tank";
      return `
        <div class="stage-fuel-row ${stage.engineActive ? "active" : "standby"}">
          <div class="stage-fuel-meta">
            <strong>${label}</strong>
            <span>${Math.round(percent)}% · ${engineLabel}</span>
          </div>
          <div class="stage-fuel-track" aria-hidden="true"><span style="width:${percent}%"></span></div>
        </div>
      `;
    })
    .join("");
}

function updateTrackerPanel(objects = []) {
  if (!trackerPanelEl || !trackerListEl || !trackerSummaryEl || !toggleTrackerButton) return;

  const visible = trackerOpen && screenMode !== "builder";
  trackerPanelEl.classList.toggle("hidden", !visible);
  toggleTrackerButton.setAttribute("aria-expanded", String(visible));
  toggleTrackerButton.classList.toggle("is-active", visible);

  if (!visible) return;

  const payloads = objects.filter((object) => object.kind === "payload");
  const vessels = objects.filter((object) => object.kind === "vessel");
  const debris = objects.filter((object) => object.kind === "debris");
  const income = payloads.reduce((total, object) => total + (object.incomeRate ?? 0), 0);
  const research = payloads.reduce((total, object) => total + (object.researchRate ?? 0), 0);
  const scan = payloads.reduce((total, object) => total + (object.scanRate ?? 0), 0);

  trackerSummaryEl.textContent = `${payloads.length} payloads · ${vessels.length} command pods · ${debris.length} debris · ${formatMoneyRate(income)}/s · ${formatResearchRate(research)}R/s · ${formatScanRate(scan)}/s Scan`;

  if (!objects.length) {
    trackerListEl.innerHTML = `<div class="tracker-empty">No orbital objects yet. Deploy a satellite or data center to start earning income.</div>`;
    return;
  }

  const groups = [
    { label: "Payloads", objects: payloads },
    { label: "Command Pods", objects: vessels },
    { label: "Debris", objects: debris }
  ].filter((group) => group.objects.length);

  trackerListEl.innerHTML = groups.map((group) => `
    <div class="tracker-group">
      <div class="tracker-group-title">${escapeHtml(group.label)}</div>
      ${group.objects.map((object) => renderTrackerItem(object)).join("")}
    </div>
  `).join("");
}

function renderTrackerItem(object) {
  const onlineClass = object.online ? " online" : "";
  const selectedClass = game.selectedObjectId === object.id ? " selected" : "";
  const income = object.incomeRate > 0 ? `${formatMoneyRate(object.incomeRate)}/s` : "—";
  const research = object.researchRate > 0
    ? `${formatResearchRate(object.researchRate)}R/s`
    : object.baseResearchRate > 0 && !object.researchUnlocked
      ? "Telemetry locked"
      : "—";
  const scan = object.scanRate > 0 ? `${formatScanRate(object.scanRate)}/s Scan` : "—";
  const inspectText = object.isCurrentRocket ? "Track Current" : object.canControl ? "Inspect" : "Track";
  const controlButton = object.canControl && !object.isCurrentRocket
    ? `<button type="button" class="mini-button tracker-control-button" data-track-object="${escapeHtml(object.id)}" data-track-action="control">Control</button>`
    : "";
  const destroyButton = object.canExplode
    ? `<button type="button" class="mini-button tracker-destroy-button" data-track-object="${escapeHtml(object.id)}" data-track-action="destroy">Destroy</button>`
    : "";
  return `
    <article class="tracker-item ${escapeHtml(object.kind)}${onlineClass}${selectedClass}">
      <div class="tracker-icon" aria-hidden="true">${escapeHtml(getTrackedObjectIcon(object))}</div>
      <div class="tracker-main">
        <strong>${escapeHtml(object.name)}</strong>
        <span>${escapeHtml(getTrackedTypeLabel(object))} · ${escapeHtml(titleCase(object.status))}</span>
      </div>
      <div class="tracker-metrics">
        <span><b>Alt</b>${formatDistance(object.altitude)}</span>
        <span><b>Spd</b>${object.speed.toFixed(0)} m/s</span>
        <span><b>$</b>${income}</span>
        <span><b>R</b>${research}</span>
        <span><b>Scan</b>${scan}</span>
      </div>
      <div class="tracker-actions">
        <button type="button" class="mini-button" data-track-object="${escapeHtml(object.id)}" data-track-action="inspect">${inspectText}</button>
        ${controlButton}
        ${destroyButton}
      </div>
    </article>
  `;
}

function getTrackedObjectIcon(object) {
  if (object.kind === "payload" && object.payloadType === "exploration_satellite") return "✦";
  if (object.kind === "payload" && object.payloadType === "data_center") return "▣";
  if (object.kind === "payload") return "◇";
  if (object.kind === "vessel") return "◉";
  return "◆";
}

function getTrackedTypeLabel(info) {
  if (info.kind === "payload" && info.payloadType === "data_center") return "Data Center";
  if (info.kind === "payload" && info.payloadType === "exploration_satellite") return "Exploration Satellite";
  if (info.kind === "payload" && info.payloadType === "satellite") return "Satellite";
  if (info.kind === "payload") return "Payload";
  if (info.kind === "vessel") return "Command Pod";
  return "Debris";
}

function updateFlightSummaryModal(summary, force = false) {
  if (!flightSummaryModalEl || !flightSummaryTitleEl || !flightSummaryBodyEl || !cashInRecoveryButton) return;
  if (!summary || screenMode === "builder") return;

  const key = `${summary.outcome}-${Math.round(summary.maxAltitude)}-${Math.round(summary.maxSpeed)}-${summary.recoveryCashedIn}`;
  if (!force && lastShownFlightSummaryKey === key && !flightSummaryModalEl.classList.contains("hidden")) return;
  if (!force && lastShownFlightSummaryKey === key) return;

  lastShownFlightSummaryKey = key;
  const recoveredParts = summary.recoveredParts ?? [];
  const canCashIn = summary.outcome === "Recovered" && !summary.recoveryCashedIn && (summary.recoveryAvailable ?? 0) > 0;
  flightSummaryTitleEl.textContent = summary.outcome === "Recovered" ? "Successful Recovery" : summary.outcome === "Crashed" ? "Vehicle Lost" : "Flight Complete";
  const partsHtml = recoveredParts.length
    ? `<div class="result-parts">${recoveredParts.slice(0, 8).map((part) => `<div><span>${escapeHtml(part.name)}</span><strong>${formatMoney(part.refund)}</strong></div>`).join("")}</div>`
    : `<p class="result-note">No recoverable parts.</p>`;

  flightSummaryBodyEl.innerHTML = `
    <div class="result-grid">
      <div><span>Max Altitude</span><strong>${formatDistance(summary.maxAltitude)}</strong></div>
      <div><span>Max Speed</span><strong>${summary.maxSpeed.toFixed(0)} m/s</strong></div>
      <div><span>Mission Rewards</span><strong>${formatMoney(summary.missionReward)}</strong></div>
      <div><span>Research Earned</span><strong>${formatResearch(summary.researchReward ?? 0)}R</strong></div>
      <div><span>Contract Stars</span><strong>${summary.contractStars ?? 0}/3</strong></div>
      <div><span>Launch Contract</span><strong>${escapeHtml(summary.contractTitle || "—")}</strong></div>
      <div><span>Launch Cost</span><strong>${summary.launchCost ? formatMoney(summary.launchCost) : "Sandbox"}</strong></div>
      <div><span>Recovery</span><strong>${summary.recoveryCashedIn ? "Cashed in" : formatMoney(summary.recoveryAvailable ?? summary.recoveryRefund ?? 0)}</strong></div>
      <div><span>Net</span><strong>${formatMoney(summary.net)}</strong></div>
    </div>
    <h3>Recovered Parts</h3>
    ${partsHtml}
    <p class="result-tip">${escapeHtml(summary.tip ?? "Review the launch and build the next rocket.")}</p>
  `;
  cashInRecoveryButton.disabled = !canCashIn;
  cashInRecoveryButton.textContent = summary.recoveryCashedIn ? "Recovery Cashed In" : canCashIn ? `Cash In ${formatMoney(summary.recoveryAvailable)}` : "No Recovery Value";
  flightSummaryModalEl.classList.remove("hidden");
}

function hideFlightSummaryModal() {
  if (flightSummaryModalEl) flightSummaryModalEl.classList.add("hidden");
}

function updateObjectInspector(info) {
  if (!objectInspectorEl || !objectNameEl || !objectDetailsEl || !explodeObjectButton) return;
  if (!info || screenMode === "builder") {
    objectInspectorEl.classList.add("hidden");
    return;
  }

  objectInspectorEl.classList.remove("hidden");
  objectNameEl.textContent = info.name;
  objectDetailsEl.innerHTML = [
    ["Type", getTrackedTypeLabel(info)],
    ["Status", titleCase(info.status)],
    ["Altitude", formatDistance(info.altitude)],
    ["Speed", `${info.speed.toFixed(1)} m/s`],
    ["Income", info.incomeRate > 0 ? `${formatMoneyRate(info.incomeRate)}/s` : "—"],
    ["Research", info.researchRate > 0 ? `${formatResearchRate(info.researchRate)}R/s` : info.baseResearchRate > 0 && !info.researchUnlocked ? "Needs Orbital Telemetry" : "—"],
    ["Scan", info.scanRate > 0 ? `${formatScanRate(info.scanRate)}/s` : "—"],
    ["Earned", formatMoney(info.revenueEarned ?? 0)],
    ["Data", `${formatResearch(info.researchEarned ?? 0, 1)}R`],
    ["Survey", `${Math.floor(info.scanEarned ?? 0).toLocaleString()} Scan`],
    ["Sale", info.canSell ? formatMoney(info.saleValue ?? 0) : "—"]
  ]
    .map(([label, value]) => `<div class="object-detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
  if (controlObjectButton) controlObjectButton.classList.toggle("hidden", !info.canControl || info.isCurrentRocket);
  if (sellObjectButton) {
    sellObjectButton.classList.toggle("hidden", !info.canSell);
    sellObjectButton.textContent = info.canSell ? `Sell for ${formatMoney(info.saleValue ?? 0)}` : "Sell";
  }
  explodeObjectButton.classList.toggle("hidden", !info.canExplode);
  explodeObjectButton.textContent = info.isCurrentRocket || info.kind === "vessel" ? "Destroy Craft" : info.kind === "payload" ? "Destroy Payload" : "Destroy Debris";
}


function getMissionProgressPercent(mission) {
  if (!mission) return 0;
  if (mission.completed) return 100;
  const progress = String(mission.progress ?? "").trim();
  const lower = progress.toLowerCase();
  if (["launched", "recovered", "orbit confirmed", "robotic landers ready"].some((token) => lower.includes(token))) return 100;

  const fraction = progress.match(/([\d,.]+)\s*(km|m)?\s*\/\s*([\d,.]+)\s*(km|m|scan|online|destroyed|discovered)?/i);
  if (fraction) {
    let current = Number(fraction[1].replaceAll(",", ""));
    let target = Number(fraction[3].replaceAll(",", ""));
    const currentUnit = (fraction[2] ?? "").toLowerCase();
    const targetUnit = (fraction[4] ?? "").toLowerCase();
    if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
      if (currentUnit === "km") current *= 1000;
      if (targetUnit === "km") target *= 1000;
      return clampNumber((current / target) * 100, 0, 100);
    }
  }

  const count = progress.match(/([\d,.]+)\s+(online|destroyed|discovered)/i);
  if (count) return Number(count[1].replaceAll(",", "")) > 0 ? 100 : 0;
  return 0;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function titleCase(value) {
  return String(value ?? "")
    .split(" ")
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : word)
    .join(" ");
}

function compactStatus(status) {
  if (status.startsWith("Paused")) return "Paused";

  const labels = new Map([
    ["Orbit achieved", "Orbit"],
    ["Payload online", "Online"],
    ["Stable orbit likely", "Stable"],
    ["Almost orbital", "Almost"],
    ["Climbing through atmosphere", "Climb"],
    ["Suborbital arc", "Suborbit"],
    ["Ready on pad", "Ready"],
    ["Escaping", "Escape"],
    ["Crashed", "Crash"],
    ["Impact", "Impact"],
    ["Descending", "Descent"],
    ["Chute deployed", "Chute"],
    ["Descent safe", "Safe"],
    ["Chute failed", "Chute fail"]
  ]);

  return labels.get(status) ?? status;
}


function getLockedStackParts() {
  return normalizeStack(builderStack)
    .map((entry) => AVAILABLE_PARTS.find((part) => part.id === entry.id))
    .filter((part) => part && !isPartUnlocked(part, game.company));
}

function getRecommendedPartIds(nextMission) {
  const id = nextMission?.id ?? "";
  if (id === "deploy_satellite") return ["satellite_basic", "decoupler_basic", "fuel_tank_small", "engine_vacuum", "engine_basic"];
  if (id === "deploy_datacenter") return ["data_center_basic", "decoupler_basic", "fuel_tank_medium", "engine_vacuum", "engine_heavy"];
  if (id === "recover_rocket") return ["command_pod_basic", "parachute_basic", "landing_legs_basic", "fuel_tank_small", "engine_basic"];
  if (id === "first_orbit" || id === "touch_space") return ["nose_cone_basic", "command_pod_basic", "fuel_tank_medium", "decoupler_basic", "engine_basic"];
  return ["command_pod_basic", "fuel_tank_small", "engine_basic"];
}

function getPartIconClass(part) {
  const subtype = part.id?.includes("satellite") ? " satellite" : part.id?.includes("data_center") ? " data-center" : "";
  return `type-${part.type}${subtype}`;
}

function getDefaultStageForPart(part) {
  if (!part?.stageAction) return 0;
  if (part.stageAction === "decoupleBelow") return 1;
  if (part.stageAction === "deployPayload") return 2;
  return 3;
}

function hasCostBypass(company = {}) {
  return Boolean(company?.mode === "sandbox" || company?.testResourcesEnabled);
}

function formatCompanyMode(company = {}) {
  if (company?.mode === "sandbox" && company?.testResourcesEnabled) return "Sandbox · Infinite $/R/S";
  if (company?.testResourcesEnabled) return "Career · Infinite $/R/S";
  if (company?.mode === "sandbox") return "Sandbox Mode";
  return "Career Mode";
}

function formatCashBalance(company = {}) {
  return hasCostBypass(company) ? "∞" : formatMoney(company?.money ?? 0);
}

function formatResearchBalance(company = {}) {
  return company?.testResourcesEnabled ? "∞R" : `${formatResearch(company?.researchPoints ?? 0, 0)}R`;
}

function formatScanBalance(company = {}, signal = null) {
  if (company?.testResourcesEnabled) return "∞";
  return `${Math.floor(signal?.current ?? company?.totalScanGenerated ?? 0).toLocaleString()}`;
}

function updateTestResourceToggle(company = {}) {
  if (!toggleTestResourcesButton) return;
  const active = Boolean(company?.testResourcesEnabled);
  toggleTestResourcesButton.classList.toggle("is-active", active);
  toggleTestResourcesButton.setAttribute("aria-pressed", String(active));
  toggleTestResourcesButton.textContent = active ? "∞ $/R/S" : "TEST";
  toggleTestResourcesButton.title = active ? "Disable infinite cash, Research, and Scan" : "Enable infinite cash, Research, and Scan";
}

function formatColonyCost(cost = {}) {
  const pieces = [];
  if (cost.cash) pieces.push(formatMoney(cost.cash));
  if (cost.research) pieces.push(`${formatResearch(cost.research)}R`);
  if (cost.scan) pieces.push(`${Math.round(cost.scan).toLocaleString()} Scan`);
  return pieces.join(" · ");
}

function formatScanRate(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.0001) return "0";
  if (Math.abs(amount) < 1) return amount.toFixed(2);
  if (Math.abs(amount) < 10) return amount.toFixed(1);
  return Math.round(amount).toLocaleString();
}

function formatMoneyRate(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0";
  const decimals = Math.abs(amount) > 0 && Math.abs(amount) < 10 && !Number.isInteger(amount) ? 1 : 0;
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`;
}

function formatResearchRate(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount < 0.01) return formatResearch(amount, 4);
  if (amount < 1) return formatResearch(amount, 3);
  return formatResearch(amount, 2);
}

function formatDistance(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${value.toFixed(0)} m`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
