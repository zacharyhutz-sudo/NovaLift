import { PHYSICS, PLANET, ROCKET } from "./config.js";
import {
  cloneRocket,
  getAltitude,
  getCircularOrbitSpeed,
  getDistanceToPlanet,
  getEscapeSpeed,
  getGravityVector,
  getOrbitStatus,
  getRadialVelocity,
  getRocketMass,
  getSpeed,
  getTangentialSpeed,
  rotateRocket,
  stepRocket
} from "./physics.js";

export class Game {
  constructor(input, renderer) {
    this.input = input;
    this.renderer = renderer;
    this.rocket = cloneRocket(ROCKET);
    this.paused = false;
    this.debug = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.fps = 60;
    this.fpsSmoothed = 60;
  }

  reset() {
    this.rocket = cloneRocket(ROCKET);
    this.accumulator = 0;
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
  }

  getRenderState() {
    return {
      rocket: this.rocket,
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
    const fuelPercent = (this.rocket.fuel / this.rocket.maxFuel) * 100;
    const status = this.paused ? `Paused — ${getOrbitStatus(this.rocket, PLANET)}` : getOrbitStatus(this.rocket, PLANET);

    return {
      altitude,
      speed,
      fuelPercent,
      status,
      fps: this.fps,
      orbitHoldTime: this.rocket.orbitHoldTime,
      missionComplete: this.rocket.missionComplete,
      debugText: this.getDebugText()
    };
  }

  getDebugText() {
    const gravity = getGravityVector(this.rocket, PLANET);

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
      `Mass:          ${fmt(getRocketMass(this.rocket))}`,
      `Fuel:          ${fmt(this.rocket.fuel)} / ${this.rocket.maxFuel}`,
      `Landed:        ${this.rocket.landed}`,
      `Crashed:       ${this.rocket.crashed}`,
      `Debug vectors: green = velocity, yellow = gravity`
    ].join("\n");
  }
}

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}
