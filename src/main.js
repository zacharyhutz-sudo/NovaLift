import { Game } from "./game.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { PHYSICS } from "./config.js";
import { BuilderPreview } from "./preview.js";
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
const builderJumpToPreviewButton = document.querySelector("#builderJumpToPreview");
const builderJumpToPartsButton = document.querySelector("#builderJumpToParts");
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

const EARTH_MINE_COST = 100000;
const EARTH_MINE_INCOME_RATE = 1;
const EARTH_MINE_MAX = 10;

let builderStack = [];
let screenMode = "builder";
let trackerOpen = false;
let selectedPartId = AVAILABLE_PARTS[0]?.id ?? null;
let activePartCategory = "all";
let missionsExpanded = false;
let builderAdvancedOpen = false;
let lastShownFlightSummaryKey = "";
let lastResearchLiveRenderAt = 0;
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
const initialRocket = buildRocketFromStack(builderStack).rocket;
const game = new Game(input, renderer, initialRocket);

renderBuilder();
renderer.onObjectTap = (object) => {
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
  requestAnimationFrame(loop);
}

function bindBuilderEvents() {
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
  bindDelegatedActivation(partCategoryTabsEl, "[data-part-category]", (button) => {
    activePartCategory = button.dataset.partCategory || "all";
    renderBuilder();
  });
  bindActivation(toggleEconomyModeButton, () => {
    game.toggleEconomyMode();
    renderBuilder();
  });
  bindActivation(builderWorldViewButton, showWorldView);
  bindActivation(builderJumpToPreviewButton, () => scrollBuilderSection(builderRocketSectionEl));
  bindActivation(builderJumpToPartsButton, () => scrollBuilderSection(builderPartsSectionEl));
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
  bindDelegatedActivation(researchTreeEl, "[data-buy-research]", (button) => {
    game.purchaseResearch(button.dataset.buyResearch);
    renderBuilder();
  });
  bindDelegatedActivation(researchGuideEl, "[data-buy-research]", (button) => {
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
    if (id && id !== "current-rocket") {
      game.controlObject(id);
      renderer.followRocket?.(game.rocket);
      updateObjectInspector(null);
      updateTrackerPanel(game.getHudData().trackedObjects);
    }
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
    handler(button, event);
  };

  container.addEventListener("pointerup", activate);
  container.addEventListener("click", activate);
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
  hideFlightSummaryModal();
  hideResearchLab();
  screenMode = "world";
  trackerOpen = true;
  game.paused = false;
  builderScreenEl.classList.add("hidden");
  gameShellEl.classList.remove("builder-open");
  gameShellEl.classList.add("world-view");
  if (renderer.followRocket) {
    renderer.followRocket(game.rocket);
  } else {
    renderer.recenterCamera?.(game.rocket, { forceRocket: true });
  }
  updateTrackerPanel(game.getHudData().trackedObjects);
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
    return;
  }

  const { rocket } = buildRocketFromStack(builderStack);
  const cost = rocket.buildStats?.cost ?? 0;
  if (!game.canAffordLaunch(cost)) {
    renderBuilder(true);
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
  if (builderCashEl) builderCashEl.textContent = game.company.mode === "sandbox" ? "∞" : formatMoney(game?.company?.money ?? 0);
  if (builderModeLabelEl) builderModeLabelEl.textContent = game.company.mode === "sandbox" ? "Sandbox Mode" : "Career Mode";
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
  renderMissionBoard(hudData);
  renderEarthMines(hudData);
  renderResearchLab(hudData);
  renderOrbitalNetwork(hudData);
  renderPlanetRegistry(hudData);
  renderValidation(validation, highlightErrors, canAfford, stats.cost, lockedParts);

  launchBuiltRocketButton.disabled = !validation.valid || !canAfford || lockedParts.length > 0;
  launchBuiltRocketButton.textContent = lockedParts.length ? "Unlock Parts to Launch" : !validation.valid ? "Fix Rocket to Launch" : !canAfford ? "Not Enough Cash" : game.company.mode === "sandbox" ? "Launch Rocket" : `Launch for ${formatMoney(stats.cost)}`;
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
    const reward = `${formatMoney(nextMission.reward)}${nextMission.researchReward ? ` + ${formatResearch(nextMission.researchReward)}R` : ""}`;
    const template = ROCKET_TEMPLATES.find((candidate) => candidate.id === nextMission.recommendedTemplateId);
    const templateLocked = template?.requiresResearch && !game.company.completedResearch?.includes(template.requiresResearch) && game.company.mode !== "sandbox";
    const chapterText = chapter ? `${chapter.title} · ${chapter.completed}/${chapter.total}` : "Campaign";
    missionBoardEl.innerHTML = `
      <article class="mission-card current-objective">
        <div class="campaign-chip-row">
          <span class="campaign-chip">${escapeHtml(chapterText)}</span>
          <span class="campaign-chip reward-chip">${reward}</span>
        </div>
        <div class="mission-card-top">
          <div>
            <small>Current Objective</small>
            <strong>${escapeHtml(nextMission.title)}</strong>
            <span>${escapeHtml(nextMission.objective)}</span>
          </div>
        </div>
        <div class="mission-progress current-progress">${escapeHtml(nextMission.progress)}</div>
        <div class="mission-action-row">
          <button type="button" data-template="${escapeHtml(nextMission.recommendedTemplateId ?? "")}" ${!template || templateLocked ? "disabled" : ""}>
            Use ${escapeHtml(nextMission.recommendedTemplateLabel ?? template?.name ?? "Recommended Rocket")}
          </button>
          <span>${templateLocked ? "Research required" : "Recommended build"}</span>
        </div>
      </article>
    `;
    return;
  }

  missionBoardEl.innerHTML = missions.map((mission) => {
    const reward = mission.completed ? "✓" : `${formatMoney(mission.reward)}${mission.researchReward ? ` + ${formatResearch(mission.researchReward)}R` : ""}`;
    const chapterLabel = mission.chapterTitle ? `${mission.chapterTitle}` : "Campaign";
    return `
    <article class="mission-card ${mission.completed ? "complete" : ""}">
      <div class="campaign-chip-row">
        <span class="campaign-chip">${escapeHtml(chapterLabel)}</span>
        <span class="campaign-chip reward-chip">${reward}</span>
      </div>
      <div class="mission-card-top">
        <div>
          <strong>${escapeHtml(mission.title)}</strong>
          <span>${escapeHtml(mission.objective)}</span>
        </div>
      </div>
      <div class="mission-progress">${escapeHtml(mission.progress)}</div>
    </article>`;
  }).join("");
}


function renderEarthMines(data = game.getHudData()) {
  if (!earthMineCountEl || !earthMineIncomeEl || !earthMineTotalIncomeEl || !earthMineStatusEl || !buyEarthMineButton) return;
  const company = data.company ?? game.company;
  const count = Math.max(0, Math.min(EARTH_MINE_MAX, Math.floor(Number(company.earthMineCount ?? 0))));
  const mineIncome = count * EARTH_MINE_INCOME_RATE;
  const canBuy = count < EARTH_MINE_MAX && (company.mode === "sandbox" || Number(company.money ?? 0) >= EARTH_MINE_COST);
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
    : company.mode === "sandbox"
      ? `Add Mine (${count}/${EARTH_MINE_MAX})`
      : `Buy Mine for ${formatMoney(EARTH_MINE_COST)}`;
}

function renderOrbitalNetwork(data = game.getHudData()) {
  if (!orbitalNetworkStatusEl || !orbitalNetworkPayloadsEl || !orbitalNetworkIncomeEl || !orbitalNetworkResearchEl || !orbitalNetworkScanEl || !orbitalNetworkSignalEl || !orbitalNetworkSignalBarEl) return;
  const payloads = (data.trackedObjects ?? []).filter((object) => object.kind === "payload" && object.online);
  const signal = data.nextPlanetSignal ?? {};
  const scan = Number(data.company?.totalScanGenerated ?? 0);
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
  const signal = data.nextPlanetSignal ?? {};
  const scan = Number(data.company?.totalScanGenerated ?? 0);
  const scanRate = Number(data.company?.scanPerSecond ?? 0);

  planetRegistryStatusEl.textContent = `${Math.max(0, discovered.length - 1)} discovered`;
  planetRegistryListEl.innerHTML = planets.map((planet) => `
    <article class="planet-card ${planet.discovered ? "discovered" : "locked"}">
      <div>
        <strong>${escapeHtml(planet.discovered ? planet.name : "Unknown Signal")}</strong>
        <span>${escapeHtml(planet.discovered ? planet.classification : `${Math.floor(planet.scanProgress ?? 0)} / ${planet.scanRequired.toLocaleString()} Scan`)}</span>
      </div>
      <div class="planet-tags">
        <span>${escapeHtml(planet.discovered ? planet.distanceLabel : "???")}</span>
        <span>${escapeHtml(planet.discovered ? planet.mineralsLabel : "Minerals ?")}</span>
        <span>${escapeHtml(planet.discovered ? planet.habitabilityLabel : "Hab ?")}</span>
      </div>
    </article>
  `).join("");

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

function renderResearchLab(data) {
  const company = data.company ?? game.company;
  const researchPoints = company.researchPoints ?? 0;
  const researchRate = company.researchPerSecond ?? 0;
  const completed = data.research?.filter((node) => node.complete).length ?? 0;
  const total = data.research?.length ?? 0;
  const miniText = `${formatResearch(researchPoints, researchPoints < 10 ? 1 : 0)}R · ${formatResearchRate(researchRate)}R/sec`;
  if (builderResearchMiniStatusEl) builderResearchMiniStatusEl.textContent = miniText;

  if (!researchSummaryEl || !researchTreeEl) return;

  researchSummaryEl.innerHTML = `
    <div><span>R</span><strong>${formatResearch(researchPoints, researchPoints < 10 ? 1 : 0)}</strong></div>
    <div><span>R/sec</span><strong>${formatResearchRate(researchRate)}</strong></div>
    <div><span>Done</span><strong>${completed}/${total}</strong></div>
  `;

  const nodes = data.research ?? [];
  const nextMission = data.nextMission;
  const nextNode = getRecommendedResearchNode(nodes);
  const telemetryComplete = Boolean(company.completedResearch?.includes("orbital_telemetry"));
  const missionReward = nextMission?.researchReward ?? 0;

  if (researchGuideEl) {
    researchGuideEl.innerHTML = `
      <article class="research-recommend-card research-recommend-card-hero">
        <span>Recommended Next</span>
        <strong>${escapeHtml(nextNode?.name ?? "Tree complete")}</strong>
        <p>${escapeHtml(getResearchRecommendationText(nextNode, researchPoints))}</p>
        ${nextNode?.available ? `<button type="button" data-buy-research="${escapeHtml(nextNode.id)}">Unlock for ${formatResearch(nextNode.cost)}R</button>` : ""}
      </article>
      <div class="research-earn-strip" aria-label="How to earn Research">
        <div><span>Missions</span><strong>+${formatResearch(missionReward)}R next</strong></div>
        <div><span>Telemetry</span><strong>${telemetryComplete ? "Online" : "Unlock first"}</strong></div>
        <div><span>Payloads</span><strong>${formatResearchRate(researchRate)}R/s</strong></div>
      </div>
    `;
  }

  const laneConfig = [
    { id: "propulsion", label: "Propulsion", icon: "P", summary: "Engines and lift" },
    { id: "orbital", label: "Orbital Ops", icon: "O", summary: "Income and infrastructure" },
    { id: "exploration", label: "Exploration", icon: "E", summary: "Survey new worlds" },
    { id: "planetary", label: "Planetary", icon: "R", summary: "Probes and landers" }
  ];

  const nodesByLane = new Map(laneConfig.map((lane) => [lane.id, []]));
  nodes.forEach((node) => {
    const laneId = node.lane && nodesByLane.has(node.lane) ? node.lane : "orbital";
    nodesByLane.get(laneId).push(node);
  });
  laneConfig.forEach((lane) => {
    nodesByLane.get(lane.id).sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0) || a.cost - b.cost);
  });

  researchTreeEl.innerHTML = `
    <section class="research-map-card">
      <div class="research-map-top">
        <span class="eyebrow">Research Path</span>
        <strong>Unlock one node to reach the next.</strong>
        <p>Follow the four lanes below. Completed upgrades glow. Locked upgrades tell you what to finish first.</p>
      </div>
      <div class="research-root">
        <span class="research-root-kicker">Program Start</span>
        <article class="research-root-node">
          <div class="research-root-icon">N</div>
          <strong>Rocket Program</strong>
          <span>${completed}/${total} upgrades online</span>
        </article>
        <div class="research-root-links" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div class="research-lane-grid">
        ${laneConfig.map((lane) => renderResearchLane(lane, nodesByLane.get(lane.id) ?? [], researchPoints)).join("")}
      </div>
    </section>
  `;
}

function renderResearchLane(lane, nodes = [], researchPoints = 0) {
  const completeCount = nodes.filter((node) => node.complete).length;
  return `
    <section class="research-flow-lane">
      <div class="research-flow-lane-head">
        <div class="research-flow-lane-icon">${escapeHtml(lane.icon)}</div>
        <div>
          <h3>${escapeHtml(lane.label)}</h3>
          <p>${escapeHtml(lane.summary)}</p>
        </div>
        <span>${completeCount}/${nodes.length}</span>
      </div>
      <div class="research-flow-stack">
        ${nodes.map((node, index) => renderResearchFlowNode(node, researchPoints, index < nodes.length - 1)).join("")}
      </div>
    </section>
  `;
}

function renderResearchFlowNode(node, researchPoints = 0, showConnector = false) {
  const statusClass = node.complete ? "complete" : node.locked ? "locked" : node.available ? "available" : "waiting";
  const statusText = getResearchNodeStatusText(node, researchPoints);
  const buttonText = getResearchNodeButtonText(node);
  return `
    <article class="research-flow-node ${statusClass} ${showConnector ? "has-connector" : ""}">
      <div class="research-flow-node-top">
        <div class="research-flow-node-icon">${escapeHtml(node.icon ?? "N")}</div>
        <div class="research-flow-node-copy">
          <strong>${escapeHtml(node.treeName ?? node.name)}</strong>
          <span>${escapeHtml(statusText)}</span>
        </div>
        <b>${node.complete ? "✓" : `${formatResearch(node.cost)}R`}</b>
      </div>
      <small>${escapeHtml(node.shortUnlockText ?? node.unlockText ?? node.description ?? "")}</small>
      <div class="research-flow-node-actions">
        <button type="button" data-buy-research="${escapeHtml(node.id)}" ${node.available ? "" : "disabled"}>${escapeHtml(buttonText)}</button>
      </div>
    </article>
  `;
}

function getResearchNodeStatusText(node, researchPoints = 0) {
  if (node.complete) return "Complete";
  if (node.locked) return `Needs ${node.missingPrerequisiteNames.join(", ")}`;
  if (node.available) return "Ready to unlock";
  return `${formatResearch(Math.max(0, node.cost - researchPoints))}R short`;
}

function getResearchNodeButtonText(node) {
  if (node.complete) return "Done";
  if (node.locked) return "Locked";
  if (node.available) return `Unlock`;
  return "Need R";
}

function getRecommendedResearchNode(nodes = []) {
  return nodes.find((node) => node.available)
    ?? nodes.find((node) => node.waitingForPoints && !node.locked)
    ?? nodes.find((node) => !node.complete)
    ?? null;
}

function getResearchRecommendationText(node, researchPoints = 0) {
  if (!node) return "You have finished the current research tree.";
  if (node.complete) return "Already complete.";
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

function updateHud(data) {
  altitudeEl.textContent = formatDistance(data.altitude);
  speedEl.textContent = `${data.speed.toFixed(1)} m/s`;
  fuelEl.textContent = `${Math.max(0, data.fuelPercent).toFixed(0)}%`;
  statusEl.textContent = screenMode === "builder" ? "Build" : screenMode === "world" ? "World" : compactStatus(data.status);
  statusEl.title = data.status;
  fpsEl.textContent = `${Math.round(data.fps)}`;
  if (companyCashHudEl) companyCashHudEl.textContent = data.company?.mode === "sandbox" ? "∞" : formatMoney(data.company?.money ?? 0);
  if (companyIncomeHudEl) companyIncomeHudEl.textContent = `${formatMoneyRate(data.company?.incomePerSecond ?? 0)}/s`;
  if (companyResearchHudEl) companyResearchHudEl.textContent = `${formatResearch(data.company?.researchPoints ?? 0, 0)}R`;
  if (companyScanHudEl) companyScanHudEl.textContent = `${Math.floor(data.company?.totalScanGenerated ?? 0).toLocaleString()}`;
  if (screenMode === "builder" && researchScreenEl && !researchScreenEl.classList.contains("hidden") && performance.now() - lastResearchLiveRenderAt > 500) {
    lastResearchLiveRenderAt = performance.now();
    renderResearchLab(data);
  }
  gameShellEl.classList.toggle("income-active", (data.company?.incomePerSecond ?? 0) > 0);
  if (builderCashEl) builderCashEl.textContent = data.company?.mode === "sandbox" ? "∞" : formatMoney(data.company?.money ?? 0);
  if (builderModeLabelEl) builderModeLabelEl.textContent = data.company?.mode === "sandbox" ? "Sandbox Mode" : "Career Mode";
  if (screenMode === "builder") {
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
    missionResultEl.textContent = `World view: ${data.savedOrbitalObjects} payloads · ${data.debrisCount} debris · ${formatMoneyRate(data.company?.incomePerSecond ?? 0)}/s · ${formatScanRate(data.company?.scanPerSecond ?? 0)}/s Scan. Use Track to inspect objects.`;
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

  trackerListEl.innerHTML = objects.map((object) => {
    const onlineClass = object.online ? " online" : "";
    const selectedClass = game.selectedObjectId === object.id ? " selected" : "";
    const income = object.incomeRate > 0 ? `${formatMoneyRate(object.incomeRate)}/s` : "—";
    const research = object.researchRate > 0
      ? `${formatResearchRate(object.researchRate)}R/s`
      : object.baseResearchRate > 0 && !object.researchUnlocked
        ? "Telemetry locked"
        : "—";
    const scan = object.scanRate > 0 ? `${formatScanRate(object.scanRate)}/s Scan` : "—";
    const actionText = object.canControl && !object.isCurrentRocket ? "Inspect" : object.isCurrentRocket ? "Inspect" : "Select";
    return `
      <article class="tracker-item ${escapeHtml(object.kind)}${onlineClass}${selectedClass}">
        <div class="tracker-main">
          <strong>${escapeHtml(object.name)}</strong>
          <span>${escapeHtml(getTrackedTypeLabel(object))} · ${escapeHtml(titleCase(object.status))}</span>
        </div>
        <div class="tracker-metrics">
          <span>${formatDistance(object.altitude)}</span>
          <span>${object.speed.toFixed(0)} m/s</span>
          <span>${income}</span>
          <span>${research}</span>
          <span>${scan}</span>
        </div>
        <button type="button" class="mini-button" data-track-object="${escapeHtml(object.id)}">${actionText}</button>
      </article>
    `;
  }).join("");
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
