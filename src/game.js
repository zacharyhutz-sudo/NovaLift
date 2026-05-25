import { PHYSICS, PLANET, ROCKET } from "./config.js";
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
  getRadialVelocity,
  getRocketMass,
  getSpeed,
  getTangentialSpeed,
  rotateRocket,
  stepDetachedObject,
  stepRocket
} from "./physics.js";

export class Game {
  constructor(input, renderer, rocketTemplate = ROCKET) {
    this.input = input;
    this.renderer = renderer;
    this.rocketTemplate = rocketTemplate;
    this.rocket = cloneRocket(this.rocketTemplate);
    this.objects = [];
    this.paused = false;
    this.debug = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.fps = 60;
    this.fpsSmoothed = 60;
    this.stageMessage = "Stage system ready.";
    this.stageMessageTimer = 4;
  }

  reset() {
    this.rocket = cloneRocket(this.rocketTemplate);
    this.objects = [];
    this.stageMessage = this.rocket.lastStageMessage ?? "Stage system ready.";
    this.stageMessageTimer = 4;
    this.accumulator = 0;
    this.renderer.recenterCamera?.(this.rocket);
  }

  setRocketTemplate(rocketTemplate) {
    this.rocketTemplate = rocketTemplate;
    this.paused = false;
    this.reset();
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
    if (result.objects?.length) this.objects.push(...result.objects);
    this.stageMessage = result.message;
    this.stageMessageTimer = 6;
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
    this.objects = this.objects.filter((object) => !object.crashed || object.kind === "payload").slice(-24);
    this.stageMessageTimer = Math.max(0, this.stageMessageTimer - dt);
  }

  getRenderState() {
    return {
      rocket: this.rocket,
      objects: this.objects,
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
    const onlinePayloads = this.objects.filter((object) => object.kind === "payload" && object.online).length + (this.rocket.payloadsOnline ?? 0);

    return {
      altitude,
      speed,
      fuelPercent,
      status,
      fps: this.fps,
      orbitHoldTime: this.rocket.orbitHoldTime,
      missionComplete: this.rocket.missionComplete || onlinePayloads > 0,
      nextStage: this.rocket.nextStage ?? 1,
      maxStage: this.rocket.maxStage ?? 0,
      stageMessage: this.stageMessageTimer > 0 ? this.stageMessage : "",
      atmospherePercent: density * 100,
      dragStrength: drag.strength,
      parachuteState: this.rocket.parachuteState,
      landingLegsDeployed: this.rocket.landingLegsDeployed,
      onlinePayloads,
      debugText: this.getDebugText()
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
      `Detached objs: ${this.objects.length}`,
      `Stage log:\n${stageEvents}`,
      `Debug vectors: green = velocity, yellow = gravity`
    ].join("\n");
  }
}

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}
