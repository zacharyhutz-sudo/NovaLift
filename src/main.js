import { Game } from "./game.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { PHYSICS } from "./config.js";
import {
  AVAILABLE_PARTS,
  MAX_STACK_PARTS,
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

let builderStack = normalizeStack(STARTING_STACK);
let screenMode = "builder";
let selectedPartId = STARTING_STACK[0]?.id ?? AVAILABLE_PARTS[0]?.id ?? null;

renderBuilder();

const input = new Input();
const renderer = new Renderer(canvas, recenterCameraButton);
const initialRocket = buildRocketFromStack(builderStack).rocket;
const game = new Game(input, renderer, initialRocket);
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
  bindActivation(rebuildRocketButton, showBuilder);

  bindDelegatedActivation(partsCatalogEl, "[data-add-part]", (button) => {
    if (builderStack.length >= MAX_STACK_PARTS) return;
    const part = AVAILABLE_PARTS.find((candidate) => candidate.id === button.dataset.addPart);
    selectedPartId = button.dataset.addPart;
    builderStack.push({ id: button.dataset.addPart, stage: getDefaultStageForPart(part) });
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
  screenMode = "builder";
  game.paused = true;
  builderScreenEl.classList.remove("hidden");
  gameShellEl.classList.add("builder-open");
  renderBuilder();
}

function hideBuilder() {
  screenMode = "flight";
  builderScreenEl.classList.add("hidden");
  gameShellEl.classList.remove("builder-open");
}

function launchBuiltRocket() {
  const { valid } = validateBuild(builderStack);
  if (!valid) {
    renderBuilder(true);
    return;
  }

  const { rocket } = buildRocketFromStack(builderStack);
  game.setRocketTemplate(rocket);
  game.paused = false;
  hideBuilder();
}

function renderBuilder(highlightErrors = false) {
  builderStack = normalizeStack(builderStack);
  const validation = validateBuild(builderStack);
  const stats = validation.stats;

  buildCostEl.textContent = formatMoney(stats.cost);
  buildMassEl.textContent = `${formatStatNumber(stats.launchMass)}t`;
  buildFuelEl.textContent = Math.round(stats.fuelCapacity).toLocaleString();
  buildTwrEl.textContent = formatStatNumber(stats.twr, 2);
  buildBurnEl.textContent = stats.burnTime > 0 ? `${formatStatNumber(stats.burnTime, 0)}s` : "0s";
  buildDragEl.textContent = formatStatNumber(stats.dragArea, 1);
  buildStagesEl.textContent = String(stats.stageCount);

  renderStackList(stats.parts);
  renderPartsCatalog();
  renderSelectedPart();
  renderValidation(validation, highlightErrors);

  launchBuiltRocketButton.disabled = !validation.valid;
  launchBuiltRocketButton.textContent = validation.valid ? "Launch Rocket" : "Fix Rocket to Launch";
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
            <button type="button" data-stack-action="remove" data-index="${index}">×</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPartsCatalog() {
  partsCatalogEl.innerHTML = AVAILABLE_PARTS.map(
    (part) => `
      <article class="part-card ${part.id === selectedPartId ? "selected" : ""}" data-select-part="${escapeHtml(part.id)}" style="--part-color: ${escapeHtml(part.color)}">
        <div class="part-card-top">
          <div class="part-swatch" aria-hidden="true"></div>
          <div>
            <h3>${escapeHtml(part.name)}</h3>
            <p>${getPartTypeLabel(part.type)} · ${formatMoney(part.cost)}</p>
          </div>
        </div>
        <p class="part-description">${escapeHtml(part.description)}</p>
        <div class="part-metrics">
          <span>Mass ${formatStatNumber(part.dryMass)}t</span>
          ${part.fuelCapacity ? `<span>Fuel ${Math.round(part.fuelCapacity)}</span>` : ""}
          ${part.thrust ? `<span>Thrust ${Math.round(part.thrust)}</span>` : ""}
          <span>Drag ${formatStatNumber(part.dragArea ?? 0, 1)}</span>
          ${part.stageAction ? `<span>Staged</span>` : ""}
        </div>
        <button type="button" data-add-part="${escapeHtml(part.id)}" ${builderStack.length >= MAX_STACK_PARTS ? "disabled" : ""}>Add</button>
      </article>
    `
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

function renderValidation(validation, highlightErrors) {
  const messages = [];

  validation.errors.forEach((message) => messages.push({ type: "error", message }));
  validation.warnings.forEach((message) => messages.push({ type: "warning", message }));

  if (messages.length === 0) {
    buildValidationEl.innerHTML = `<div class="validation-message success">Rocket is launch capable. Budget is infinite for this prototype.</div>`;
    return;
  }

  buildValidationEl.innerHTML = messages
    .map(
      ({ type, message }) => `<div class="validation-message ${type} ${highlightErrors && type === "error" ? "pulse" : ""}">${escapeHtml(message)}</div>`
    )
    .join("");
}

function updateHud(data) {
  altitudeEl.textContent = formatDistance(data.altitude);
  speedEl.textContent = `${data.speed.toFixed(1)} m/s`;
  fuelEl.textContent = `${Math.max(0, data.fuelPercent).toFixed(0)}%`;
  statusEl.textContent = screenMode === "builder" ? "Build" : compactStatus(data.status);
  statusEl.title = data.status;
  fpsEl.textContent = `${Math.round(data.fps)}`;

  if (screenMode === "builder") {
    missionResultEl.textContent = "Build a staged rocket, then launch.";
    missionResultEl.classList.remove("success");
  } else if (data.missionComplete) {
    missionResultEl.textContent = data.onlinePayloads > 0 ? `Payload online: ${data.onlinePayloads} deployed.` : "Mission complete: stable orbit achieved.";
    missionResultEl.classList.add("success");
  } else if (data.stageMessage) {
    missionResultEl.textContent = data.stageMessage;
    missionResultEl.classList.remove("success");
  } else if (data.flightSummary) {
    missionResultEl.textContent = `${data.flightSummary.outcome}: max ${formatDistance(data.flightSummary.maxAltitude)}, ${data.flightSummary.maxSpeed.toFixed(0)} m/s. ${data.flightSummary.tip}`;
    missionResultEl.classList.toggle("success", data.flightSummary.outcome === "Recovered");
  } else {
    missionResultEl.textContent = `Stage ${data.nextStage}/${Math.max(data.maxStage, data.nextStage - 1)} · Orbit hold ${data.orbitHoldTime.toFixed(1)}s/${PHYSICS.orbitRequiredHoldSeconds.toFixed(0)}s · ATM ${data.atmospherePercent.toFixed(0)}%`;
    missionResultEl.classList.remove("success");
  }

  const debugVisible = game.debug;
  debugPanelEl.classList.toggle("hidden", !debugVisible);
  gameShellEl.classList.toggle("debug-active", debugVisible);
  if (debugVisible) debugTextEl.textContent = data.debugText;
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
    ["Chute failed", "Chute fail"]
  ]);

  return labels.get(status) ?? status;
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
