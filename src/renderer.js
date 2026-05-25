import { PLANET, RENDER } from "./config.js";
import { getGravityVector, predictTrajectory } from "./physics.js";

function makeStars(count) {
  let seed = 8128;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    radius: 0.45 + random() * 1.35,
    alpha: 0.28 + random() * 0.62
  }));
}

export class Renderer {
  constructor(canvas, recenterButton = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.recenterButton = recenterButton;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.camera = { x: 0, y: 0, scale: 1, centerX: 0, centerY: 0, manual: false };
    this.pointers = new Map();
    this.gesture = null;
    this.lastRocket = null;
    this.stars = makeStars(RENDER.starCount);

    this.resize();
    this.bindCameraControls();
    this.updateRecenterButton();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this.width = Math.floor(this.canvas.clientWidth * this.dpr);
    this.height = Math.floor(this.canvas.clientHeight * this.dpr);
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const target = this.getDefaultScreenCenter();
    this.camera.centerX = target.x;
    this.camera.centerY = target.y;
  }

  bindCameraControls() {
    this.canvas.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    this.canvas.addEventListener("pointerup", (event) => this.handlePointerUp(event));
    this.canvas.addEventListener("pointercancel", (event) => this.handlePointerUp(event));
    this.canvas.addEventListener("lostpointercapture", (event) => this.handlePointerUp(event));

    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const point = this.getCanvasPoint(event);
        const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
        this.zoomCameraAt(point.x, point.y, zoomFactor);
        this.setManualCamera(true);
      },
      { passive: false }
    );

    if (this.recenterButton) {
      this.recenterButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.recenterCamera();
      });
    }
  }

  handlePointerDown(event) {
    event.preventDefault();
    this.canvas.setPointerCapture?.(event.pointerId);
    const point = this.getCanvasPoint(event);
    this.pointers.set(event.pointerId, point);
    this.resetGesture();
  }

  handlePointerMove(event) {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    this.pointers.set(event.pointerId, this.getCanvasPoint(event));

    const points = Array.from(this.pointers.values());
    if (points.length === 1) {
      this.handleDragGesture(points[0]);
      return;
    }

    if (points.length >= 2) {
      this.handlePinchGesture(points[0], points[1]);
    }
  }

  handlePointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    this.pointers.delete(event.pointerId);
    if (this.canvas.hasPointerCapture?.(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.resetGesture();
  }

  resetGesture() {
    const points = Array.from(this.pointers.values());

    if (points.length === 1) {
      this.gesture = {
        type: "drag",
        lastX: points[0].x,
        lastY: points[0].y,
        hasMoved: false
      };
      return;
    }

    if (points.length >= 2) {
      const pinch = getPinchInfo(points[0], points[1]);
      this.gesture = {
        type: "pinch",
        lastDistance: pinch.distance,
        lastMidX: pinch.midX,
        lastMidY: pinch.midY,
        hasMoved: false
      };
      return;
    }

    this.gesture = null;
  }

  handleDragGesture(point) {
    if (!this.gesture || this.gesture.type !== "drag") this.resetGesture();
    if (!this.gesture) return;

    const dx = point.x - this.gesture.lastX;
    const dy = point.y - this.gesture.lastY;
    const distance = Math.hypot(dx, dy);

    if (distance >= RENDER.cameraDragDeadzonePx || this.gesture.hasMoved) {
      this.panCameraByScreenDelta(dx, dy);
      this.setManualCamera(true);
      this.gesture.hasMoved = true;
    }

    this.gesture.lastX = point.x;
    this.gesture.lastY = point.y;
  }

  handlePinchGesture(first, second) {
    const pinch = getPinchInfo(first, second);
    if (!this.gesture || this.gesture.type !== "pinch") this.resetGesture();
    if (!this.gesture || this.gesture.type !== "pinch") return;

    const midpointDx = pinch.midX - this.gesture.lastMidX;
    const midpointDy = pinch.midY - this.gesture.lastMidY;
    const distanceDelta = Math.abs(pinch.distance - this.gesture.lastDistance);

    if (distanceDelta >= 0.5) {
      const zoomFactor = pinch.distance / Math.max(this.gesture.lastDistance, 1);
      this.zoomCameraAt(pinch.midX, pinch.midY, zoomFactor);
      this.setManualCamera(true);
      this.gesture.hasMoved = true;
    }

    if (Math.hypot(midpointDx, midpointDy) >= 0.5) {
      this.panCameraByScreenDelta(midpointDx, midpointDy);
      this.setManualCamera(true);
      this.gesture.hasMoved = true;
    }

    this.gesture.lastDistance = pinch.distance;
    this.gesture.lastMidX = pinch.midX;
    this.gesture.lastMidY = pinch.midY;
  }

  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * this.dpr,
      y: (event.clientY - rect.top) * this.dpr
    };
  }

  screenToWorld(x, y) {
    return {
      x: (x - this.camera.centerX) / this.camera.scale + this.camera.x,
      y: (y - this.camera.centerY) / this.camera.scale + this.camera.y
    };
  }

  panCameraByScreenDelta(dx, dy) {
    this.camera.x -= dx / this.camera.scale;
    this.camera.y -= dy / this.camera.scale;
  }

  zoomCameraAt(screenX, screenY, factor) {
    const worldBefore = this.screenToWorld(screenX, screenY);
    const nextScale = clamp(this.camera.scale * factor, RENDER.manualMinScale, RENDER.manualMaxScale);

    this.camera.scale = nextScale;
    this.camera.x = worldBefore.x - (screenX - this.camera.centerX) / this.camera.scale;
    this.camera.y = worldBefore.y - (screenY - this.camera.centerY) / this.camera.scale;
  }

  setManualCamera(isManual) {
    this.camera.manual = isManual;
    this.updateRecenterButton();
  }

  updateRecenterButton() {
    if (!this.recenterButton) return;
    this.recenterButton.classList.toggle("hidden", !this.camera.manual);
  }

  recenterCamera(rocket = this.lastRocket) {
    if (rocket) {
      const target = this.getAutoCameraTarget(rocket);
      this.camera.x = target.x;
      this.camera.y = target.y;
      this.camera.scale = target.scale;
      this.camera.centerX = target.centerX;
      this.camera.centerY = target.centerY;
    }

    this.setManualCamera(false);
  }

  render(state) {
    const { rocket, debug } = state;
    const ctx = this.ctx;

    this.lastRocket = rocket;
    this.updateCamera(rocket);
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawPlanet(ctx, PLANET);
    this.drawLaunchPad(ctx, PLANET);

    this.drawTrajectory(ctx, predictTrajectory(rocket, PLANET));

    if (debug) {
      this.drawDebugVectors(ctx, rocket);
    }

    this.drawRocket(ctx, rocket, state.input.thrusting && rocket.fuel > 0 && !rocket.landed && !rocket.crashed);
  }

  updateCamera(rocket) {
    if (this.camera.manual) return;

    const target = this.getAutoCameraTarget(rocket);
    const smoothing = 0.075;

    this.camera.x += (target.x - this.camera.x) * smoothing;
    this.camera.y += (target.y - this.camera.y) * smoothing;
    this.camera.scale += (target.scale - this.camera.scale) * smoothing;
    this.camera.centerX += (target.centerX - this.camera.centerX) * smoothing;
    this.camera.centerY += (target.centerY - this.camera.centerY) * smoothing;
  }

  getAutoCameraTarget(rocket) {
    const distanceFromPlanet = Math.hypot(rocket.x - PLANET.x, rocket.y - PLANET.y);
    const isPortrait = this.height >= this.width;
    const usableWidth = this.width;
    const usableHeight = this.height * (isPortrait ? 0.74 : 1);
    const scale = clamp(
      Math.min(usableWidth, usableHeight) / Math.max(PLANET.radius * 2.9, distanceFromPlanet * 2.1),
      RENDER.minScale,
      RENDER.maxScale
    );
    const center = this.getDefaultScreenCenter();

    return {
      x: rocket.x * (isPortrait ? 0.42 : 0.36),
      y: rocket.y * (isPortrait ? 0.54 : 0.36),
      scale,
      centerX: center.x,
      centerY: center.y
    };
  }

  getDefaultScreenCenter() {
    return {
      x: this.width / 2,
      y: this.height >= this.width ? this.height * 0.62 : this.height / 2
    };
  }

  worldToScreen(x, y) {
    return {
      x: (x - this.camera.x) * this.camera.scale + this.camera.centerX,
      y: (y - this.camera.y) * this.camera.scale + this.camera.centerY
    };
  }

  drawBackground(ctx) {
    const gradient = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.42,
      0,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.72
    );
    gradient.addColorStop(0, "#172554");
    gradient.addColorStop(0.42, "#050816");
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      ctx.beginPath();
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.arc(star.x * this.width, star.y * this.height, star.radius * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPlanet(ctx, planet) {
    const center = this.worldToScreen(planet.x, planet.y);
    const radius = planet.radius * this.camera.scale;
    const atmosphereRadius = (planet.radius + planet.atmosphereHeight) * this.camera.scale;

    ctx.beginPath();
    ctx.fillStyle = planet.atmosphereColor;
    ctx.arc(center.x, center.y, atmosphereRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = planet.color;
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = planet.landColor;
    for (let i = 0; i < 9; i++) {
      const angle = i * 0.8;
      const landX = center.x + Math.cos(angle) * radius * 0.48;
      const landY = center.y + Math.sin(angle * 1.7) * radius * 0.43;
      ctx.beginPath();
      ctx.ellipse(landX, landY, radius * 0.22, radius * 0.08, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 2 * this.dpr;
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawLaunchPad(ctx, planet) {
    const surface = this.worldToScreen(0, -planet.radius);
    const scale = this.camera.scale;

    ctx.save();
    ctx.translate(surface.x, surface.y);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, 2 * this.dpr);
    ctx.beginPath();
    ctx.moveTo(-32 * scale, 0);
    ctx.lineTo(32 * scale, 0);
    ctx.moveTo(-22 * scale, 0);
    ctx.lineTo(-10 * scale, 13 * scale);
    ctx.moveTo(22 * scale, 0);
    ctx.lineTo(10 * scale, 13 * scale);
    ctx.stroke();
    ctx.restore();
  }

  drawTrajectory(ctx, points) {
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = "rgba(125, 211, 252, 0.72)";
    ctx.lineWidth = Math.max(1, 1.65 * this.dpr);
    ctx.setLineDash([3 * this.dpr, 8 * this.dpr]);
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = this.worldToScreen(point.x, point.y);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  drawDebugVectors(ctx, rocket) {
    if (rocket.crashed || rocket.landed) return;
    const origin = this.worldToScreen(rocket.x, rocket.y);
    const gravity = getGravityVector(rocket, PLANET);

    this.drawVector(ctx, origin, {
      x: rocket.vx * RENDER.velocityVectorScale,
      y: rocket.vy * RENDER.velocityVectorScale
    }, "rgba(134, 239, 172, 0.85)");

    this.drawVector(ctx, origin, {
      x: gravity.x * RENDER.gravityVectorScale,
      y: gravity.y * RENDER.gravityVectorScale
    }, "rgba(251, 191, 36, 0.85)");
  }

  drawVector(ctx, origin, vector, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1, 2 * this.dpr);

    const end = {
      x: origin.x + vector.x * this.camera.scale,
      y: origin.y + vector.y * this.camera.scale
    };
    const angle = Math.atan2(end.y - origin.y, end.x - origin.x);

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - Math.cos(angle - 0.45) * 9 * this.dpr, end.y - Math.sin(angle - 0.45) * 9 * this.dpr);
    ctx.lineTo(end.x - Math.cos(angle + 0.45) * 9 * this.dpr, end.y - Math.sin(angle + 0.45) * 9 * this.dpr);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawRocket(ctx, rocket, thrusting) {
    const screen = this.worldToScreen(rocket.x, rocket.y);
    const scale = Math.max(0.55, this.camera.scale);

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(rocket.angle);
    ctx.scale(scale, scale);

    if (thrusting) {
      const flameLength = 18 + Math.sin(performance.now() / 36) * 5;
      ctx.beginPath();
      ctx.fillStyle = "rgba(251, 146, 60, 0.85)";
      ctx.moveTo(-18, -5);
      ctx.lineTo(-18 - flameLength, 0);
      ctx.lineTo(-18, 5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(254, 240, 138, 0.9)";
      ctx.moveTo(-18, -3);
      ctx.lineTo(-18 - flameLength * 0.58, 0);
      ctx.lineTo(-18, 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.beginPath();
    ctx.fillStyle = rocket.crashed ? "#fb7185" : "#e5e7eb";
    ctx.moveTo(20, 0);
    ctx.lineTo(8, -8);
    ctx.lineTo(-18, -7);
    ctx.lineTo(-18, 7);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#7dd3fc";
    ctx.arc(4, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(-22, -6, 5, 12);

    ctx.restore();

    if (rocket.crashed) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(251, 113, 133, 0.9)";
      ctx.lineWidth = 3 * this.dpr;
      ctx.arc(screen.x, screen.y, 28 * this.camera.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function getPinchInfo(first, second) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;

  return {
    distance: Math.hypot(dx, dy),
    midX: (first.x + second.x) / 2,
    midY: (first.y + second.y) / 2
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
