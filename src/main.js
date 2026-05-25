import { Game } from "./game.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { PHYSICS } from "./config.js";

const canvas = document.querySelector("#gameCanvas");
const altitudeEl = document.querySelector("#altitude");
const speedEl = document.querySelector("#speed");
const fuelEl = document.querySelector("#fuel");
const statusEl = document.querySelector("#status");
const fpsEl = document.querySelector("#fps");
const missionResultEl = document.querySelector("#missionResult");
const debugPanelEl = document.querySelector("#debugPanel");
const debugTextEl = document.querySelector("#debugText");

const input = new Input();
const renderer = new Renderer(canvas);
const game = new Game(input, renderer);

function loop(timestamp) {
  game.frame(timestamp);
  updateHud(game.getHudData());
  requestAnimationFrame(loop);
}

function updateHud(data) {
  altitudeEl.textContent = formatDistance(data.altitude);
  speedEl.textContent = `${data.speed.toFixed(1)} m/s`;
  fuelEl.textContent = `${Math.max(0, data.fuelPercent).toFixed(0)}%`;
  statusEl.textContent = data.status;
  fpsEl.textContent = `${Math.round(data.fps)}`;

  if (data.missionComplete) {
    missionResultEl.textContent = "Mission complete: stable orbit achieved.";
    missionResultEl.classList.add("success");
  } else {
    missionResultEl.textContent = `Orbit hold: ${data.orbitHoldTime.toFixed(1)}s / ${PHYSICS.orbitRequiredHoldSeconds.toFixed(1)}s`;
    missionResultEl.classList.remove("success");
  }

  const debugVisible = game.debug;
  debugPanelEl.classList.toggle("hidden", !debugVisible);
  if (debugVisible) debugTextEl.textContent = data.debugText;
}

function formatDistance(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${value.toFixed(0)} m`;
}

requestAnimationFrame(loop);
