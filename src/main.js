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
const closeObjectInspectorButton = document.querySelector("#closeObjectInspector");
const builderWorldViewButton = document.querySelector("#builderWorldView");
const builderJumpToPreviewButton = document.querySelector("#builderJumpToPreview");
const builderJumpToPartsButton = document.querySelector("#builderJumpToParts");
const builderJumpToMissionsButton = document.querySelector("#builderJumpToMissions");
const toggleMissionBoardViewButton = document.querySelector("#toggleMissionBoardView");
const builderRocketSectionEl = document.querySelector("#builderRocketSection");
const builderPartsSectionEl = document.querySelector("#builderPartsSection");
const builderMissionsSectionEl = document.querySelector("#builderMissionsSection");

let builderStack = [];
let screenMode = "builder";
let trackerOpen = false;
let selectedPartId = AVAILABLE_PARTS[0]?.id ?? null;
let activePartCategory = "all";
let missionsExpanded = false;
let lastShownFlightSummaryKey = "";
const PART_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "core", label: "Core", types: ["command", "decoupler"] },
  { id: "fuel", label: "Fuel", types: ["fuel"] },
  { id: "engine", label: "Engines", types: ["engine"] },
  { id: "payload", label: "Payloads", types: ["payload"] },
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
    const template = ROCKET_TEMPLATES.find((candidate) => candidate.id === button.dataset.template);
    if (!template) return;
    builderStack = autoStageStack(template.stack.map((id) => ({ id, stage: 0 })));
    selectedPartId = builderStack[0]?.id ?? selectedPartId;
    renderBuilder();
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
  bindActivation(toggleMissionBoardViewButton, () => {
    missionsExpanded = !missionsExpanded;
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
    updateObjectInspector(null);
  });
  bindActivation(explodeObjectButton, () => {
    game.explodeObject();
    updateObjectInspector(null);
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
      game.clearSelectedObject();
      renderer.recenterCamera?.(game.rocket);
      updateObjectInspector(null);
      return;
    }
    const object = game.selectObject(id);
    if (object) renderer.centerOnWorldObject?.(object);
    updateObjectInspector(game.getHudData().selectedObject);
  });
}

function bindActivation(element, handler) {
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
  game.persistActiveCommandVessel?.("builder opened");
  screenMode = "builder";
  trackerOpen = false;
  game.paused = true;
  game.clearSelectedObject();
  updateObjectInspector(null);
  builderScreenEl.classList.remove("hidden");
  gameShellEl.classList.add("builder-open");
  gameShellEl.classList.remove("world-view");
  renderBuilder();
}

function hideBuilder() {
  screenMode = "flight";
  builderScreenEl.classList.add("hidden");
  gameShellEl.classList.remove("builder-open");
  gameShellEl.classList.remove("world-view");
}

function showWorldView() {
  hideFlightSummaryModal();
  screenMode = "world";
  trackerOpen = true;
  game.paused = false;
  builderScreenEl.classList.add("hidden");
  gameShellEl.classList.remove("builder-open");
  gameShellEl.classList.add("world-view");
  renderer.recenterCamera?.(game.rocket);
  updateTrackerPanel(game.getHudData().trackedObjects);
}

function scrollBuilderSection(section) {
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function launchBuiltRocket() {
  const { valid } = validateBuild(builderStack);
  if (!valid) {
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
  lastShownFlightSummaryKey = "";
  hideFlightSummaryModal();
  game.paused = false;
  hideBuilder();
}

function renderBuilder(highlightErrors = false) {
  builderStack = normalizeStack(builderStack);
  const validation = validateBuild(builderStack);
  const stats = validation.stats;
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

  renderStackList(stats.parts);
  builderPreview.render(stats.parts);
  renderTemplateDeck();
  renderPartCategoryTabs();
  renderRecommendedParts(game.getHudData().nextMission);
  renderPartsCatalog(game.getHudData().nextMission);
  renderSelectedPart();
  renderMissionBoard(game.getHudData());
  renderValidation(validation, highlightErrors, canAfford, stats.cost);

  launchBuiltRocketButton.disabled = !validation.valid || !canAfford;
  launchBuiltRocketButton.textContent = !validation.valid ? "Fix Rocket to Launch" : !canAfford ? "Not Enough Cash" : game.company.mode === "sandbox" ? "Launch Rocket" : `Launch for ${formatMoney(stats.cost)}`;
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
        <article class="stack-item ${part.id === selectedPartId ? "selected" : ""}" data-select-stack-part="${escapeHtml(part.id)}" data-index="${index}" style="--part-color: ${escapeHtml(part.color)}">
          <div class="stack-index">${index === 0 ? "Top" : index + 1}</div>
          <div class="part-swatch" aria-hidden="true"></div>
          <div class="stack-info">
            <strong>${escapeHtml(part.shortName ?? part.name)}</strong>
            <span>${getPartTypeLabel(part.type)} · ${formatMoney(part.cost)} · ${escapeHtml(getStageLabel(part.stage))}</span>
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
  templateDeckEl.innerHTML = ROCKET_TEMPLATES.map((template) => `
    <button type="button" class="template-card" data-template="${escapeHtml(template.id)}">
      <strong>${escapeHtml(template.name)}</strong>
      <span>${escapeHtml(template.description)}</span>
    </button>
  `).join("");
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
  const visibleParts = AVAILABLE_PARTS.filter((part) => !category.types || category.types.includes(part.type));
  partsCatalogEl.innerHTML = visibleParts.map(
    (part) => {
      const isRecommended = recommended.has(part.id);
      const canAdd = builderStack.length < MAX_STACK_PARTS;
      const canAddThree = canAdd && builderStack.length <= MAX_STACK_PARTS - 3 && ["fuel", "engine"].includes(part.type);
      return `
      <article class="part-card ${part.id === selectedPartId ? "selected" : ""} ${isRecommended ? "recommended" : ""}" data-select-part="${escapeHtml(part.id)}" style="--part-color: ${escapeHtml(part.color)}">
        <div class="part-card-top">
          <div class="part-icon ${getPartIconClass(part)}" aria-hidden="true"><span></span></div>
          <div>
            <h3>${escapeHtml(part.name)}</h3>
            <p>${getPartTypeLabel(part.type)} · ${formatMoney(part.cost)}${isRecommended ? " · Recommended" : ""}</p>
          </div>
        </div>
        <p class="part-description">${escapeHtml(part.description)}</p>
        <div class="part-metrics">
          <span>Mass ${formatStatNumber(part.dryMass)}t</span>
          ${part.fuelCapacity ? `<span>Fuel ${Math.round(part.fuelCapacity)}</span>` : ""}
          ${part.thrust ? `<span>Thrust ${Math.round(part.thrust)}</span>` : ""}
          ${part.incomeRate ? `<span>Income ${formatMoney(part.incomeRate)}/s</span>` : ""}
          <span>Drag ${formatStatNumber(part.dragArea ?? 0, 1)}</span>
          ${part.stageAction ? `<span>Staged</span>` : ""}
        </div>
        <div class="part-card-actions">
          <button type="button" data-add-part="${escapeHtml(part.id)}" data-add-count="1" ${!canAdd ? "disabled" : ""}>Add</button>
          ${canAddThree ? `<button type="button" data-add-part="${escapeHtml(part.id)}" data-add-count="3">+3</button>` : ""}
        </div>
      </article>
    `;
    }
  ).join("");
}


function renderSelectedPart() {
  const part = AVAILABLE_PARTS.find((candidate) => candidate.id === selectedPartId) ?? AVAILABLE_PARTS[0];
  if (!part) return;

  selectedPartTitleEl.textContent = part.name;
  selectedPartMetaEl.textContent = `${getPartTypeLabel(part.type)} · ${formatMoney(part.cost)}`;
  selectedPartDescriptionEl.textContent = part.description;
  selectedPartUsageEl.textContent = getPartUsageTip(part);
  selectedPartMetricsEl.innerHTML = [
    `Mass ${formatStatNumber(part.dryMass)}t`,
    part.fuelCapacity ? `Fuel ${Math.round(part.fuelCapacity)}` : "",
    part.thrust ? `Thrust ${Math.round(part.thrust)}` : "",
    part.incomeRate ? `Income ${formatMoney(part.incomeRate)}/s` : "",
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

function renderValidation(validation, highlightErrors, canAfford = true, cost = 0) {
  const messages = [];

  validation.errors.forEach((message) => messages.push({ type: "error", message }));
  validation.warnings.forEach((message) => messages.push({ type: "warning", message }));
  if (!canAfford) messages.push({ type: "error", message: `Not enough cash for this launch. Cost: ${formatMoney(cost)}.` });

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
  missionBoardSummaryEl.textContent = `${completed}/${missions.length} complete · Rewards ${formatMoney(data.company?.totalMissionRewards ?? 0)}`;

  if (toggleMissionBoardViewButton) toggleMissionBoardViewButton.textContent = missionsExpanded ? "Show Less" : "View All";
  const visibleMissions = missionsExpanded
    ? missions
    : [
        ...missions.filter((mission) => !mission.completed).slice(0, 3),
        ...missions.filter((mission) => mission.completed).slice(0, Math.max(0, 3 - missions.filter((mission) => !mission.completed).slice(0, 3).length))
      ];
  missionBoardEl.innerHTML = visibleMissions.map((mission) => `
    <article class="mission-card ${mission.completed ? "complete" : ""}">
      <div class="mission-card-top">
        <div>
          <strong>${escapeHtml(mission.title)}</strong>
          <span>${escapeHtml(mission.objective)}</span>
        </div>
        <b>${mission.completed ? "✓" : formatMoney(mission.reward)}</b>
      </div>
      <p>${escapeHtml(mission.description)}</p>
      <div class="mission-progress">${escapeHtml(mission.progress)}</div>
    </article>
  `).join("");
}


function updateHud(data) {
  altitudeEl.textContent = formatDistance(data.altitude);
  speedEl.textContent = `${data.speed.toFixed(1)} m/s`;
  fuelEl.textContent = `${Math.max(0, data.fuelPercent).toFixed(0)}%`;
  statusEl.textContent = screenMode === "builder" ? "Build" : screenMode === "world" ? "World" : compactStatus(data.status);
  statusEl.title = data.status;
  fpsEl.textContent = `${Math.round(data.fps)}`;
  if (companyCashHudEl) companyCashHudEl.textContent = data.company?.mode === "sandbox" ? "∞" : formatMoney(data.company?.money ?? 0);
  if (companyIncomeHudEl) companyIncomeHudEl.textContent = `${formatMoney(data.company?.incomePerSecond ?? 0)}/s`;
  gameShellEl.classList.toggle("income-active", (data.company?.incomePerSecond ?? 0) > 0);
  if (builderCashEl) builderCashEl.textContent = data.company?.mode === "sandbox" ? "∞" : formatMoney(data.company?.money ?? 0);
  if (builderModeLabelEl) builderModeLabelEl.textContent = data.company?.mode === "sandbox" ? "Sandbox Mode" : "Career Mode";
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
    missionResultEl.textContent = `World view: ${data.savedOrbitalObjects} payloads · ${data.debrisCount} debris · ${formatMoney(data.company?.incomePerSecond ?? 0)}/s income. Use Track to inspect objects.`;
    missionResultEl.classList.toggle("success", (data.company?.incomePerSecond ?? 0) > 0);
  } else if (data.stageMessage) {
    missionResultEl.textContent = data.stageMessage;
    missionResultEl.classList.toggle("success", data.stageMessage.includes("Mission complete"));
  } else if (data.missionComplete) {
    missionResultEl.textContent = data.onlinePayloads > 0 ? `Payload online: ${data.onlinePayloads} active · ${formatMoney(data.company?.incomePerSecond ?? 0)}/s income · ${data.debrisCount} debris.` : "Mission complete: stable orbit achieved.";
    missionResultEl.classList.add("success");
  } else if (data.flightSummary) {
    const refundText = data.flightSummary.recoveryRefund > 0 ? ` Refund ${formatMoney(data.flightSummary.recoveryRefund)}.` : "";
    const rewardText = data.flightSummary.missionReward > 0 ? ` Missions ${formatMoney(data.flightSummary.missionReward)}.` : "";
    const netText = data.company?.mode === "sandbox" ? "" : ` Net ${formatMoney(data.flightSummary.net)}.`;
    missionResultEl.textContent = `${data.flightSummary.outcome}: max ${formatDistance(data.flightSummary.maxAltitude)}, ${data.flightSummary.maxSpeed.toFixed(0)} m/s.${refundText}${rewardText}${netText} ${data.flightSummary.tip}`;
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

  trackerSummaryEl.textContent = `${payloads.length} payloads · ${vessels.length} command pods · ${debris.length} debris · ${formatMoney(income)}/s`;

  if (!objects.length) {
    trackerListEl.innerHTML = `<div class="tracker-empty">No orbital objects yet. Deploy a satellite or data center to start earning income.</div>`;
    return;
  }

  trackerListEl.innerHTML = objects.map((object) => {
    const onlineClass = object.online ? " online" : "";
    const selectedClass = game.selectedObjectId === object.id ? " selected" : "";
    const income = object.incomeRate > 0 ? `${formatMoney(object.incomeRate)}/s` : "—";
    const actionText = object.isCurrentRocket ? "Center" : "Select";
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
        </div>
        <button type="button" class="mini-button" data-track-object="${escapeHtml(object.id)}">${actionText}</button>
      </article>
    `;
  }).join("");
}

function getTrackedTypeLabel(info) {
  if (info.kind === "payload" && info.payloadType === "data_center") return "Data Center";
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
    ["Income", info.incomeRate > 0 ? `${formatMoney(info.incomeRate)}/s` : "—"],
    ["Earned", formatMoney(info.revenueEarned ?? 0)]
  ]
    .map(([label, value]) => `<div class="object-detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
  explodeObjectButton.classList.toggle("hidden", !info.canExplode);
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
