import { PHYSICS, PLANET, RENDER } from "./config.js";
import { getGravityVector, predictTrajectory } from "./physics.js";
import { getPartWorldLength, getPartWorldWidth, ROCKET_WORLD_LINE } from "./dimensions.js";

function makeStars(count) {
  let seed = 8128;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return Array.from({ length: count }, (_, index) => ({
    x: random(),
    y: random(),
    radius: 0.42 + random() * 1.65,
    alpha: 0.24 + random() * 0.66,
    depth: 0.16 + random() * 0.84,
    twinkle: 0.6 + random() * 2.2,
    phase: random() * Math.PI * 2,
    tint: index % 9 === 0 ? "#bfdbfe" : index % 13 === 0 ? "#ddd6fe" : "#ffffff"
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
    this.camera = { x: 0, y: 0, scale: 1, centerX: 0, centerY: 0, manual: false, mode: "followRocket", targetObjectId: null };
    this.pointers = new Map();
    this.gesture = null;
    this.lastRocket = null;
    this.lastObjects = [];
    this.selectedObjectId = null;
    this.onObjectTap = null;
    this.tapCandidate = null;
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
      const requestRecenter = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.pointers.clear();
        this.gesture = null;
        this.recenterButton.classList.remove("is-active");
        this.recenterCamera();
      };

      this.recenterButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.recenterButton.setPointerCapture?.(event.pointerId);
        this.recenterButton.classList.add("is-active");
      });

      this.recenterButton.addEventListener("pointerup", requestRecenter);
      this.recenterButton.addEventListener("pointercancel", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.recenterButton.classList.remove("is-active");
      });
      this.recenterButton.addEventListener("lostpointercapture", () => {
        this.recenterButton.classList.remove("is-active");
      });
      this.recenterButton.addEventListener("click", requestRecenter);
    }
  }

  handlePointerDown(event) {
    event.preventDefault();
    this.canvas.setPointerCapture?.(event.pointerId);
    const point = this.getCanvasPoint(event);
    this.pointers.set(event.pointerId, point);
    this.tapCandidate = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      moved: false
    };
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
    const point = this.getCanvasPoint(event);
    const wasSinglePointer = this.pointers.size === 1;
    const candidate = this.tapCandidate;
    const moved = candidate
      ? candidate.moved || Math.hypot(point.x - candidate.startX, point.y - candidate.startY) > 8 * this.dpr
      : true;

    this.pointers.delete(event.pointerId);
    if (this.canvas.hasPointerCapture?.(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    if (wasSinglePointer && candidate?.pointerId === event.pointerId && !moved) {
      this.tryTapObjectAt(point.x, point.y);
    }

    this.tapCandidate = null;
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
      if (this.tapCandidate) this.tapCandidate.moved = true;
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
      if (this.tapCandidate) this.tapCandidate.moved = true;
    }

    if (Math.hypot(midpointDx, midpointDy) >= 0.5) {
      this.panCameraByScreenDelta(midpointDx, midpointDy);
      this.setManualCamera(true);
      this.gesture.hasMoved = true;
      if (this.tapCandidate) this.tapCandidate.moved = true;
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
    if (isManual) {
      this.camera.mode = "manual";
    } else if (this.camera.mode === "manual") {
      this.camera.mode = "followRocket";
    }
    this.updateRecenterButton();
  }

  updateRecenterButton() {
    if (!this.recenterButton) return;
    this.recenterButton.classList.toggle("hidden", !this.camera.manual);
  }

  recenterCamera(rocket = this.lastRocket, options = {}) {
    const forceRocket = options?.forceRocket === true;
    const trackedObject = !forceRocket && this.camera.targetObjectId
      ? this.lastObjects.find((object) => object.id === this.camera.targetObjectId && !object.exploded)
      : null;
    if (trackedObject) {
      this.centerOnWorldObject(trackedObject);
      return;
    }

    this.followRocket(rocket, { snap: true });
  }

  followRocket(rocket = this.lastRocket, options = {}) {
    const snap = options?.snap !== false;
    this.camera.mode = "followRocket";
    this.camera.targetObjectId = null;
    this.camera.manual = false;

    if (rocket && snap) {
      const target = this.getAutoCameraTarget(rocket);
      this.camera.x = target.x;
      this.camera.y = target.y;
      this.camera.scale = target.scale;
      this.camera.centerX = target.centerX;
      this.camera.centerY = target.centerY;
    }

    this.updateRecenterButton();
  }

  clearObjectTracking() {
    this.camera.targetObjectId = null;
    if (this.camera.mode === "followObject") {
      this.camera.mode = "followRocket";
    }
    this.camera.manual = false;
    this.updateRecenterButton();
  }

  centerOnWorldObject(object) {
    if (!object) return;
    const target = this.getObjectCameraTarget(object);
    this.camera.x = target.x;
    this.camera.y = target.y;
    this.camera.scale = target.scale;
    this.camera.centerX = target.centerX;
    this.camera.centerY = target.centerY;
    this.camera.mode = "followObject";
    this.camera.targetObjectId = object.id;
    this.camera.manual = false;
    this.updateRecenterButton();
  }

  render(state) {
    const { rocket, debug, objects = [], selectedObjectId = null, planets = [PLANET], activePlanet = PLANET } = state;
    const ctx = this.ctx;

    this.lastRocket = rocket;
    this.lastObjects = objects;
    this.selectedObjectId = selectedObjectId;
    this.updateCamera(rocket);
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawPlanets(ctx, planets);
    this.drawLaunchPad(ctx, PLANET);

    this.drawTrajectory(ctx, predictTrajectory(rocket, activePlanet), activePlanet);
    this.drawDetachedObjects(ctx, objects);
    this.drawSelectedObjectOverlay(ctx, objects);

    if (debug) {
      this.drawDebugVectors(ctx, rocket);
    }

    this.drawRocket(ctx, rocket, state.input.thrusting && rocket.fuel > 0 && !rocket.landed && !rocket.crashed);
    this.drawActiveRocketOverlay(ctx, rocket);
  }

  updateCamera(rocket) {
    if (this.camera.manual || this.camera.mode === "manual") return;

    let target = null;
    if (this.camera.mode === "followObject" && this.camera.targetObjectId) {
      const object = this.lastObjects.find((candidate) => candidate.id === this.camera.targetObjectId && !candidate.exploded);
      if (object) target = this.getObjectCameraTarget(object);
      else {
        this.camera.mode = "followRocket";
        this.camera.targetObjectId = null;
      }
    }

    if (!target) target = this.getAutoCameraTarget(rocket);
    const smoothing = this.camera.mode === "followObject" ? 0.16 : 0.075;

    this.camera.x += (target.x - this.camera.x) * smoothing;
    this.camera.y += (target.y - this.camera.y) * smoothing;
    this.camera.scale += (target.scale - this.camera.scale) * smoothing;
    this.camera.centerX += (target.centerX - this.camera.centerX) * smoothing;
    this.camera.centerY += (target.centerY - this.camera.centerY) * smoothing;
  }

  getAutoCameraTarget(rocket) {
    const distanceFromPlanet = Math.hypot(rocket.x - PLANET.x, rocket.y - PLANET.y);
    const altitude = Math.max(0, distanceFromPlanet - PLANET.radius);
    const isPortrait = this.height >= this.width;
    const usableWidth = this.width;
    const usableHeight = this.height * (isPortrait ? 0.74 : 0.92);

    // Frame the local rocket/surface view first, then zoom out naturally as altitude rises.
    // This keeps the rocket and Earth in the same world scale instead of screen-locking the rocket.
    const localSpan = clamp(2200 + altitude * 1.35, 2200, PLANET.radius * 3.4);
    const scale = clamp(Math.min(usableWidth, usableHeight) / localSpan, RENDER.minScale, RENDER.maxScale);
    const center = this.getDefaultScreenCenter();

    return {
      x: rocket.x,
      y: rocket.y,
      scale,
      centerX: center.x,
      centerY: center.y
    };
  }

  getObjectCameraTarget(object) {
    const center = this.getDefaultScreenCenter();
    const isPortrait = this.height >= this.width;
    const baseScale = isPortrait ? 0.42 : 0.34;
    const objectRadius = Math.max(80, object.collisionRadius ?? 80);
    const minVisibleScale = Math.min(RENDER.manualMaxScale, Math.max(RENDER.minScale, (56 * this.dpr) / objectRadius));
    const scale = clamp(Math.max(this.camera.scale, baseScale, minVisibleScale), RENDER.manualMinScale, RENDER.manualMaxScale);
    return {
      x: object.x,
      y: object.y,
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
    const base = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.34,
      0,
      this.width * 0.5,
      this.height * 0.55,
      Math.max(this.width, this.height) * 0.78
    );
    base.addColorStop(0, "#172554");
    base.addColorStop(0.38, "#071126");
    base.addColorStop(0.76, "#030712");
    base.addColorStop(1, "#01040d");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawNebulaGlow(ctx, this.width * 0.12, this.height * 0.22, this.width * 0.72, "rgba(124, 58, 237, 0.16)");
    this.drawNebulaGlow(ctx, this.width * 0.9, this.height * 0.08, this.width * 0.58, "rgba(14, 165, 233, 0.13)");
    this.drawNebulaGlow(ctx, this.width * 0.72, this.height * 0.78, this.width * 0.54, "rgba(45, 212, 191, 0.08)");

    const time = performance.now() * 0.001;
    const parallaxX = this.camera.x * this.camera.scale * 0.018;
    const parallaxY = this.camera.y * this.camera.scale * 0.018;

    for (const star of this.stars) {
      const sx = wrap(star.x * this.width - parallaxX * star.depth, this.width);
      const sy = wrap(star.y * this.height - parallaxY * star.depth, this.height);
      const twinkle = 0.82 + Math.sin(time * star.twinkle + star.phase) * 0.18;
      ctx.beginPath();
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = star.tint;
      ctx.arc(sx, sy, star.radius * this.dpr * (0.75 + star.depth * 0.55), 0, Math.PI * 2);
      ctx.fill();

      if (star.depth > 0.74 && star.radius > 1.15) {
        ctx.globalAlpha = star.alpha * 0.18;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius * this.dpr * 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawNebulaGlow(ctx, x, y, radius, color) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(0.42, color.replace(/0\.\d+\)/, "0.045)"));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawPlanets(ctx, planets = [PLANET]) {
    const bodies = Array.isArray(planets) && planets.length ? planets : [PLANET];
    bodies
      .slice()
      .sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0))
      .forEach((planet) => {
        this.drawPlanet(ctx, planet);
        this.drawPlanetLabel(ctx, planet);
      });
  }

  drawPlanetLabel(ctx, planet) {
    if (!planet?.name || planet.id === "homeworld") return;
    const center = this.worldToScreen(planet.x, planet.y);
    const radius = planet.radius * this.camera.scale;
    if (center.x < -120 || center.x > this.width + 120 || center.y < -120 || center.y > this.height + 120) return;
    if (radius < 4) return;

    ctx.save();
    const x = center.x;
    const y = center.y + Math.max(radius + 10 * this.dpr, 18 * this.dpr);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(10, 11 * this.dpr)}px ui-sans-serif, system-ui, sans-serif`;
    const label = planet.name;
    const width = Math.min(170 * this.dpr, ctx.measureText(label).width + 22 * this.dpr);
    ctx.fillStyle = "rgba(5, 10, 24, 0.76)";
    ctx.strokeStyle = "rgba(167, 139, 250, 0.32)";
    ctx.lineWidth = Math.max(1, this.dpr);
    roundRect(ctx, x - width / 2, y - 12 * this.dpr, width, 24 * this.dpr, 999);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(237, 233, 254, 0.94)";
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  drawPlanet(ctx, planet) {
    const center = this.worldToScreen(planet.x, planet.y);
    const radius = planet.radius * this.camera.scale;
    const atmosphereRadius = (planet.radius + planet.atmosphereHeight) * this.camera.scale;
    if (radius <= 0) return;

    // v0.5.3: keep the starter planet intentionally simple. A single
    // bluish-green body with sphere shading reads cleaner at every zoom level
    // than the previous land/cloud treatment.
    const glow = ctx.createRadialGradient(center.x, center.y, radius * 0.98, center.x, center.y, atmosphereRadius);
    glow.addColorStop(0, planet.atmosphereColor ?? "rgba(94, 234, 212, 0.18)");
    glow.addColorStop(0.45, planet.atmosphereColor ?? "rgba(94, 234, 212, 0.11)");
    glow.addColorStop(1, "rgba(94, 234, 212, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center.x, center.y, atmosphereRadius, 0, Math.PI * 2);
    ctx.fill();

    if (atmosphereRadius > 8) {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([Math.max(6, 8 * this.dpr), Math.max(8, 12 * this.dpr)]);
      ctx.strokeStyle = "rgba(186, 230, 253, 0.22)";
      ctx.lineWidth = Math.max(1, 1.1 * this.dpr);
      ctx.arc(center.x, center.y, atmosphereRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(103, 232, 249, 0.10)";
      ctx.lineWidth = Math.max(1, 3.2 * this.dpr);
      ctx.arc(center.x, center.y, atmosphereRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const sphere = ctx.createRadialGradient(
      center.x - radius * 0.36,
      center.y - radius * 0.42,
      radius * 0.06,
      center.x + radius * 0.22,
      center.y + radius * 0.26,
      radius * 1.18
    );
    sphere.addColorStop(0, planet.highlightColor ?? "#f8fafc");
    sphere.addColorStop(0.32, planet.color ?? "#2bb6a8");
    sphere.addColorStop(0.72, planet.landColor ?? planet.color ?? "#168f8c");
    sphere.addColorStop(1, planet.shadowColor ?? "#0f172a");
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.clip();

    const shadow = ctx.createLinearGradient(
      center.x - radius * 0.72,
      center.y - radius * 0.48,
      center.x + radius * 0.86,
      center.y + radius * 0.58
    );
    shadow.addColorStop(0, "rgba(255,255,255,0.18)");
    shadow.addColorStop(0.28, "rgba(255,255,255,0.05)");
    shadow.addColorStop(0.64, "rgba(2,6,23,0.08)");
    shadow.addColorStop(1, "rgba(2,6,23,0.42)");
    ctx.fillStyle = shadow;
    ctx.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);

    const rim = ctx.createRadialGradient(
      center.x - radius * 0.18,
      center.y - radius * 0.28,
      radius * 0.52,
      center.x,
      center.y,
      radius
    );
    rim.addColorStop(0, "rgba(255,255,255,0)");
    rim.addColorStop(0.82, "rgba(255,255,255,0.02)");
    rim.addColorStop(1, "rgba(255,255,255,0.16)");
    ctx.fillStyle = rim;
    ctx.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(187, 247, 208, 0.22)";
    ctx.lineWidth = Math.max(1, 1.6 * this.dpr);
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(94, 234, 212, 0.20)";
    ctx.lineWidth = Math.max(1, 1.1 * this.dpr);
    ctx.arc(center.x, center.y, radius + Math.max(2, 6 * this.dpr), 0, Math.PI * 2);
    ctx.stroke();
  }

  drawLaunchPad(ctx, planet) {
    const surface = this.worldToScreen(0, -planet.radius);
    const scale = this.camera.scale;
    if (scale <= 0) return;

    ctx.save();
    ctx.translate(surface.x, surface.y);
    ctx.lineWidth = Math.max(1, 2 * this.dpr);
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.strokeStyle = "rgba(226,232,240,0.46)";
    roundRect(ctx, -72 * scale, -10 * scale, 144 * scale, 18 * scale, 6 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(125,211,252,0.42)";
    ctx.beginPath();
    ctx.moveTo(-52 * scale, 8 * scale);
    ctx.lineTo(-18 * scale, 50 * scale);
    ctx.moveTo(52 * scale, 8 * scale);
    ctx.lineTo(18 * scale, 50 * scale);
    ctx.moveTo(-42 * scale, 28 * scale);
    ctx.lineTo(42 * scale, 28 * scale);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.moveTo(82 * scale, -4 * scale);
    ctx.lineTo(82 * scale, -126 * scale);
    ctx.moveTo(82 * scale, -126 * scale);
    ctx.lineTo(38 * scale, -102 * scale);
    ctx.moveTo(82 * scale, -92 * scale);
    ctx.lineTo(42 * scale, -72 * scale);
    ctx.stroke();
    ctx.restore();
  }

  drawTrajectory(ctx, points, planet = PLANET) {
    if (points.length < 2) return;

    const style = getTrajectoryStyle(points, planet);
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = Math.max(1, style.width * this.dpr);
    ctx.setLineDash(style.dash.map((value) => value * this.dpr));
    ctx.lineCap = "round";
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 8 * this.dpr;
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


  drawDetachedObjects(ctx, objects) {
    if (!objects?.length) return;

    objects.forEach((object) => {
      const screen = this.worldToScreen(object.x, object.y);
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(object.angle ?? 0);
      ctx.scale(this.camera.scale, this.camera.scale);
      ctx.lineWidth = Math.max(ROCKET_WORLD_LINE, 1.25 / Math.max(this.camera.scale, 0.001));

      if (object.id === this.selectedObjectId) {
        this.drawObjectSelectionRing(ctx, object);
      }

      if (object.kind === "payload") {
        this.drawDetachedPayload(ctx, object);
      } else if (object.kind === "vessel") {
        this.drawDetachedCommandPod(ctx, object);
      } else {
        ctx.fillStyle = object.crashed ? "#fb7185" : "rgba(148, 163, 184, 0.9)";
        ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
        roundRect(ctx, -78, -28, 156, 56, 14);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }


  drawSelectedObjectOverlay(ctx, objects) {
    const object = objects.find((candidate) => candidate?.id === this.selectedObjectId && !candidate.exploded);
    if (!object) return;

    const screen = this.worldToScreen(object.x, object.y);
    const pulse = 1 + Math.sin(performance.now() / 220) * 0.08;
    const color = object.kind === "payload" ? "rgba(134, 239, 172, 0.96)" : object.kind === "debris" ? "rgba(251, 146, 60, 0.96)" : "rgba(125, 211, 252, 0.96)";
    const radius = Math.max(34 * this.dpr, Math.min(94 * this.dpr, (object.collisionRadius ?? 80) * this.camera.scale * 2.1)) * pulse;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, 3.2 * this.dpr);
    ctx.setLineDash([9 * this.dpr, 7 * this.dpr]);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * this.dpr;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    const label = object.name ?? (object.kind === "payload" ? "Payload" : "Object");
    ctx.font = `${Math.round(12 * this.dpr)}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(label).width;
    const labelY = screen.y - radius - 22 * this.dpr;
    ctx.fillStyle = "rgba(2, 6, 23, 0.84)";
    roundRect(ctx, screen.x - textWidth / 2 - 10 * this.dpr, labelY - 13 * this.dpr, textWidth + 20 * this.dpr, 26 * this.dpr, 10 * this.dpr);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 1.2 * this.dpr);
    ctx.stroke();
    ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
    ctx.fillText(label, screen.x, labelY);
    ctx.restore();
  }

  drawActiveRocketOverlay(ctx, rocket) {
    if (!rocket || rocket.crashed || rocket.landed) return;
    const screen = this.worldToScreen(rocket.x, rocket.y);
    ctx.save();
    ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";
    ctx.lineWidth = Math.max(1, 1.8 * this.dpr);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(22 * this.dpr, (rocket.collisionRadius ?? 80) * this.camera.scale * 0.36), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  tryTapObjectAt(screenX, screenY) {
    if (!this.onObjectTap || !this.lastObjects?.length) return;

    let best = null;
    for (const object of this.lastObjects) {
      if (!object || object.exploded) continue;
      const screen = this.worldToScreen(object.x, object.y);
      const radius = Math.max(24 * this.dpr, (object.collisionRadius ?? 20) * this.camera.scale);
      const distance = Math.hypot(screen.x - screenX, screen.y - screenY);
      if (distance <= radius && (!best || distance < best.distance)) {
        best = { object, distance };
      }
    }

    if (best) this.onObjectTap(best.object);
  }

  drawObjectSelectionRing(ctx, object) {
    ctx.save();
    const pulse = 1 + Math.sin(performance.now() / 260) * 0.06;
    ctx.strokeStyle = object.kind === "payload" ? "rgba(134, 239, 172, 0.95)" : "rgba(251, 191, 36, 0.95)";
    ctx.lineWidth = Math.max(ROCKET_WORLD_LINE, 2 / Math.max(this.camera.scale, 0.001));
    ctx.setLineDash([12, 10]);
    ctx.shadowColor = object.kind === "payload" ? "rgba(134,239,172,0.72)" : "rgba(251,191,36,0.65)";
    ctx.shadowBlur = 16 / Math.max(this.camera.scale, 0.001);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(74, (object.collisionRadius ?? 12) * 1.6) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawDetachedCommandPod(ctx, object) {
    const crashed = object.crashed;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillStyle = crashed ? "#fb7185" : "rgba(125, 211, 252, 0.92)";
    ctx.beginPath();
    ctx.moveTo(54, 0);
    ctx.bezierCurveTo(30, -38, -38, -42, -68, -8);
    ctx.lineTo(-68, 8);
    ctx.bezierCurveTo(-38, 42, 30, 38, 54, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = crashed ? "rgba(15,23,42,0.25)" : "rgba(219, 234, 254, 0.95)";
    ctx.beginPath();
    ctx.arc(4, -4, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawDetachedPayload(ctx, object) {
    const online = object.online;
    const color = online ? "#86efac" : object.color ?? "#a78bfa";
    if (online) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(performance.now() / 360) * 0.06;
      ctx.fillStyle = "#86efac";
      ctx.beginPath();
      ctx.arc(0, 0, 132, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillStyle = color;

    if ((object.name ?? "").toLowerCase().includes("satellite")) {
      ctx.fillStyle = "rgba(125, 211, 252, 0.92)";
      roundRect(ctx, -36, -26, 72, 52, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = online ? "rgba(134,239,172,0.9)" : "rgba(191,219,254,0.75)";
      roundRect(ctx, -126, -18, 76, 36, 5);
      roundRect(ctx, 50, -18, 76, 36, 5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(-36, 0);
      ctx.moveTo(36, 0);
      ctx.lineTo(50, 0);
      ctx.stroke();
      return;
    }

    roundRect(ctx, -64, -44, 128, 88, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = -1; i <= 1; i += 1) {
      roundRect(ctx, -42 + i * 34, -26, 22, 52, 5);
      ctx.fill();
    }
    ctx.fillStyle = online ? "#bbf7d0" : "#fef3c7";
    ctx.beginPath();
    ctx.arc(44, -24, 8, 0, Math.PI * 2);
    ctx.fill();
  }


  drawAtmosphericStreaks(ctx, rocket) {
    if (rocket.crashed || rocket.landed) return;
    const density = rocket.lastDensity ?? 0;
    const speed = Math.hypot(rocket.vx ?? 0, rocket.vy ?? 0);
    if (density < 0.018 || speed < 155) return;

    const screen = this.worldToScreen(rocket.x, rocket.y);
    const travelAngle = Math.atan2(rocket.vy, rocket.vx);
    const bodyAngle = rocket.angle ?? travelAngle;
    const angleDelta = normalizeAngle(travelAngle - bodyAngle);
    const alignment = Math.abs(Math.cos(angleDelta));
    const crossflow = Math.abs(Math.sin(angleDelta));
    const flowSign = Math.sign(Math.sin(angleDelta)) || 1;
    const intensity = clamp((speed - 155) / 360, 0, 1) * clamp(density * 2.25, 0, 1);
    const bodyRadius = Math.max(12, ((rocket.collisionRadius ?? 92) * this.camera.scale * 0.44));
    const trailLength = (46 + intensity * 110) * this.dpr * (0.9 + crossflow * 0.32);
    const trailWidth = (18 + intensity * 34) * this.dpr * (0.72 + crossflow * 1.08);
    const sideBias = flowSign * trailWidth * 0.34 * crossflow;
    const noseLength = bodyRadius * (0.92 + intensity * 0.7);
    const noseWidth = bodyRadius * (0.62 + crossflow * 0.7);

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(travelAngle);

    // Leading compression glow. This brightens the nose during high-speed re-entry.
    const plasma = ctx.createRadialGradient(bodyRadius * 0.2, 0, 0, bodyRadius * 0.45, 0, noseLength * 1.55);
    plasma.addColorStop(0, `rgba(255, 251, 235, ${0.18 + intensity * 0.18})`);
    plasma.addColorStop(0.22, `rgba(253, 186, 116, ${0.14 + intensity * 0.20})`);
    plasma.addColorStop(0.52, `rgba(251, 146, 60, ${0.08 + intensity * 0.16})`);
    plasma.addColorStop(0.86, `rgba(125, 211, 252, ${0.04 + intensity * 0.08})`);
    plasma.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = plasma;
    ctx.beginPath();
    ctx.ellipse(bodyRadius * 0.46, 0, noseLength, noseWidth, 0, 0, Math.PI * 2);
    ctx.fill();

    // A faint sheath tilts toward the rocket body orientation so angled flight looks different.
    ctx.save();
    ctx.rotate(angleDelta * 0.3);
    ctx.strokeStyle = `rgba(254, 240, 138, ${0.03 + intensity * 0.16})`;
    ctx.lineWidth = Math.max(1, (0.85 + intensity * 1.2) * this.dpr);
    ctx.beginPath();
    ctx.ellipse(bodyRadius * 0.08, 0, noseLength * (0.72 + alignment * 0.1), noseWidth * 0.9, 0, Math.PI * 0.72, Math.PI * 1.28);
    ctx.stroke();
    ctx.restore();

    // The trailing slipstream stretches behind the rocket and becomes wider in crossflow.
    const wake = ctx.createRadialGradient(-trailLength * 0.14, sideBias * 0.14, 0, -trailLength * 0.28, sideBias * 0.14, trailLength * 0.96);
    wake.addColorStop(0, `rgba(186, 230, 253, ${0.06 + intensity * 0.12})`);
    wake.addColorStop(0.42, `rgba(125, 211, 252, ${0.04 + intensity * 0.10})`);
    wake.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = wake;
    ctx.beginPath();
    ctx.ellipse(-trailLength * 0.24, sideBias * 0.12, trailWidth * (1.02 + crossflow * 0.18), trailWidth * (0.40 + alignment * 0.08), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'round';
    const streamOffsets = [-0.92, -0.42, 0, 0.42, 0.92].map((value) => value * trailWidth * 0.32);
    streamOffsets.forEach((offset, index) => {
      const startY = offset * (0.78 + alignment * 0.12) + sideBias * 0.08;
      const endY = offset * (0.24 + crossflow * 0.34) + sideBias * (0.52 + Math.abs(offset) / (trailWidth + 1));
      const alpha = 0.032 + intensity * (0.09 - Math.abs(index - 2) * 0.012);
      ctx.strokeStyle = `rgba(191, 219, 254, ${Math.max(0.018, alpha)})`;
      ctx.lineWidth = Math.max(1, (0.72 + intensity * 0.95 - Math.abs(index - 2) * 0.08) * this.dpr);
      ctx.beginPath();
      ctx.moveTo(-bodyRadius * 0.1, startY);
      ctx.bezierCurveTo(
        -trailLength * 0.24, startY + sideBias * 0.08,
        -trailLength * 0.56, endY,
        -trailLength, endY + sideBias * 0.16
      );
      ctx.stroke();
    });

    if (crossflow > 0.18) {
      ctx.strokeStyle = `rgba(103, 232, 249, ${0.04 + intensity * 0.12})`;
      ctx.lineWidth = Math.max(1, (0.95 + intensity * 1.05) * this.dpr);
      ctx.beginPath();
      ctx.moveTo(bodyRadius * 0.05, sideBias * 0.34);
      ctx.quadraticCurveTo(-trailLength * 0.3, sideBias * 0.85, -trailLength * 0.86, sideBias * 1.08);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawRocket(ctx, rocket, thrusting) {
    const screen = this.worldToScreen(rocket.x, rocket.y);
    const parts = Array.isArray(rocket.parts) && rocket.parts.length > 0 ? rocket.parts.filter((part) => part.active !== false) : null;

    this.drawAtmosphericStreaks(ctx, rocket);

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(rocket.angle);
    // The rocket is now a world-space object. Camera zoom changes its screen size
    // exactly the same way it changes the planet, trajectory, launch pad, and hitboxes.
    ctx.scale(this.camera.scale, this.camera.scale);

    if (parts) {
      this.drawStackedRocketBody(ctx, parts, thrusting, rocket.crashed, rocket);
    } else {
      this.drawFallbackRocketBody(ctx, thrusting, rocket.crashed);
    }

    ctx.restore();

    if (rocket.parachuteState === "deployed") {
      this.drawWorldAlignedParachute(ctx, rocket, parts);
    }

    if (rocket.crashed) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(251, 113, 133, 0.9)";
      ctx.lineWidth = 3 * this.dpr;
      ctx.arc(screen.x, screen.y, Math.max(16 * this.dpr, (rocket.collisionRadius ?? 80) * this.camera.scale * 0.45), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawStackedRocketBody(ctx, parts, thrusting, crashed, rocket = {}) {
    const lengths = parts.map((part) => getPartWorldLength(part));
    const totalLength = lengths.reduce((total, length) => total + length, 0);
    let cursor = totalLength / 2;
    const lineWidth = Math.max(ROCKET_WORLD_LINE, 1.25 / Math.max(this.camera.scale, 0.001));

    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (thrusting) {
      this.drawEngineFlame(ctx, -totalLength / 2 - 22);
    }

    parts.forEach((part, index) => {
      const length = lengths[index];
      const centerX = cursor - length / 2;
      const width = getPartWorldWidth(part);
      const isFirst = index === 0;
      const isLast = index === parts.length - 1;
      cursor -= length;

      ctx.save();
      ctx.fillStyle = crashed ? "#fb7185" : part.color ?? "#e5e7eb";
      ctx.strokeStyle = "rgba(15, 23, 42, 0.92)";
      ctx.lineWidth = lineWidth;

      if (part.type === "aero") {
        this.drawNoseCone(ctx, centerX, length, width, crashed ? "#fb7185" : part.color);
      } else if (part.type === "command") {
        this.drawCommandPod(ctx, centerX, length, width, crashed ? "#fb7185" : part.color, isFirst);
      } else if (part.type === "fuel") {
        this.drawFuelTank(ctx, centerX, length, width, crashed ? "#fb7185" : part.color);
      } else if (part.type === "engine") {
        this.drawEnginePart(ctx, centerX, length, width, crashed ? "#fb7185" : part.color, isLast);
      } else if (part.type === "decoupler") {
        this.drawDecoupler(ctx, centerX, length, width, crashed ? "#fb7185" : part.color);
      } else if (part.type === "payload") {
        this.drawPayloadPart(ctx, centerX, length, width, part, crashed);
      } else if (part.type === "parachute") {
        this.drawPackedParachute(ctx, centerX, length, width, crashed ? "#fb7185" : part.color, part.deployed);
      } else if (part.type === "legs") {
        this.drawLegsPart(ctx, centerX, length, width, crashed ? "#fb7185" : part.color, part.deployed || rocket.landingLegsDeployed);
      } else {
        roundRect(ctx, centerX - length / 2, -width / 2, length, width, 16);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });

    if (rocket.landingLegsDeployed && parts.some((part) => part.type === "legs")) {
      this.drawTailLandingLegs(ctx, -totalLength / 2 + 58, Math.max(...parts.map((part) => getPartWorldWidth(part))));
    }
  }

  drawTailLandingLegs(ctx, tailX, width) {
    ctx.save();
    ctx.strokeStyle = "rgba(226, 232, 240, 0.96)";
    ctx.lineWidth = Math.max(ROCKET_WORLD_LINE, 1.6 / Math.max(this.camera.scale, 0.001));
    ctx.beginPath();
    ctx.moveTo(tailX, -width * 0.38);
    ctx.lineTo(tailX - 118, -width * 1.28);
    ctx.lineTo(tailX - 172, -width * 1.28);
    ctx.moveTo(tailX, width * 0.38);
    ctx.lineTo(tailX - 118, width * 1.28);
    ctx.lineTo(tailX - 172, width * 1.28);
    ctx.stroke();
    ctx.fillStyle = "rgba(148, 163, 184, 0.96)";
    roundRect(ctx, tailX - 184, -width * 1.34, 58, 18, 7);
    roundRect(ctx, tailX - 184, width * 1.22, 58, 18, 7);
    ctx.fill();
    ctx.restore();
  }

  drawNoseCone(ctx, centerX, length, width, color) {
    const left = centerX - length / 2;
    const right = centerX + length / 2;
    ctx.fillStyle = color ?? "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(right, 0);
    ctx.lineTo(left + length * 0.14, -width / 2);
    ctx.lineTo(left, -width / 2);
    ctx.lineTo(left, width / 2);
    ctx.lineTo(left + length * 0.14, width / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.moveTo(right - length * 0.22, -width * 0.18);
    ctx.lineTo(left + length * 0.18, -width * 0.38);
    ctx.lineTo(left + length * 0.18, -width * 0.16);
    ctx.closePath();
    ctx.fill();
  }

  drawCommandPod(ctx, centerX, length, width, color) {
    const left = centerX - length / 2;
    ctx.fillStyle = color ?? "#e5e7eb";
    roundRect(ctx, left, -width / 2, length, width, width * 0.28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#7dd3fc";
    ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
    ctx.beginPath();
    ctx.arc(centerX + length * 0.16, 0, Math.min(20, width * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawFuelTank(ctx, centerX, length, width, color) {
    const left = centerX - length / 2;
    ctx.fillStyle = color ?? "#38bdf8";
    roundRect(ctx, left, -width / 2, length, width, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(ctx, left + length * 0.1, -width * 0.34, length * 0.18, width * 0.68, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.28)";
    ctx.beginPath();
    ctx.moveTo(left + length * 0.18, -width / 2);
    ctx.lineTo(left + length * 0.18, width / 2);
    ctx.moveTo(left + length * 0.82, -width / 2);
    ctx.lineTo(left + length * 0.82, width / 2);
    ctx.stroke();
  }

  drawEnginePart(ctx, centerX, length, width, color) {
    const left = centerX - length / 2;
    const right = centerX + length / 2;
    ctx.fillStyle = color ?? "#f97316";
    roundRect(ctx, left + length * 0.22, -width / 2, length * 0.78, width, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(left + length * 0.24, -width * 0.34);
    ctx.lineTo(left - length * 0.08, -width * 0.48);
    ctx.lineTo(left - length * 0.18, width * 0.48);
    ctx.lineTo(left + length * 0.24, width * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(15,23,42,0.72)";
    ctx.beginPath();
    ctx.ellipse(left - length * 0.1, 0, length * 0.07, width * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(right - length * 0.12, -width * 0.36, length * 0.05, width * 0.72);
  }

  drawDecoupler(ctx, centerX, length, width, color) {
    const left = centerX - length / 2;
    ctx.fillStyle = color ?? "#facc15";
    roundRect(ctx, left, -width / 2, length, width, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.5)";
    ctx.beginPath();
    for (let i = 1; i <= 3; i += 1) {
      const x = left + (length * i) / 4;
      ctx.moveTo(x, -width / 2);
      ctx.lineTo(x, width / 2);
    }
    ctx.stroke();
  }

  drawPayloadPart(ctx, centerX, length, width, part, crashed) {
    const left = centerX - length / 2;
    const isSatellite = part.id?.includes("satellite");
    ctx.fillStyle = crashed ? "#fb7185" : part.color ?? "#a78bfa";
    if (isSatellite) {
      ctx.fillStyle = "#c4b5fd";
      roundRect(ctx, centerX - length * 0.22, -width * 0.28, length * 0.44, width * 0.56, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(125,211,252,0.55)";
      roundRect(ctx, left + length * 0.02, -width * 0.2, length * 0.28, width * 0.4, 5);
      roundRect(ctx, left + length * 0.7, -width * 0.2, length * 0.28, width * 0.4, 5);
      ctx.fill();
      ctx.stroke();
    } else {
      roundRect(ctx, left, -width / 2, length, width, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      for (let i = 0; i < 3; i += 1) {
        roundRect(ctx, left + length * (0.18 + i * 0.23), -width * 0.32, length * 0.13, width * 0.64, 5);
        ctx.fill();
      }
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(left + length * 0.82, -width * 0.27, width * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPackedParachute(ctx, centerX, length, width, color, deployed) {
    const left = centerX - length / 2;
    ctx.fillStyle = color ?? "#f9a8d4";
    roundRect(ctx, left, -width / 2, length, width, 16);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = deployed ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(centerX, 0, width * 0.28, Math.PI, Math.PI * 2);
    ctx.moveTo(centerX - width * 0.28, 0);
    ctx.lineTo(centerX + width * 0.28, 0);
    ctx.stroke();
  }

  drawLegsPart(ctx, centerX, length, width, color, deployed) {
    const left = centerX - length / 2;
    ctx.fillStyle = color ?? "#94a3b8";
    roundRect(ctx, left, -width / 2, length, width, 14);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(226,232,240,0.95)";
    ctx.lineWidth = Math.max(ROCKET_WORLD_LINE, 1.5 / Math.max(this.camera.scale, 0.001));
    ctx.beginPath();
    if (deployed) {
      ctx.moveTo(centerX - length * 0.24, -width * 0.36);
      ctx.lineTo(centerX - length * 0.52, -width * 1.02);
      ctx.lineTo(centerX - length * 0.74, -width * 1.02);
      ctx.moveTo(centerX - length * 0.24, width * 0.36);
      ctx.lineTo(centerX - length * 0.52, width * 1.02);
      ctx.lineTo(centerX - length * 0.74, width * 1.02);
    } else {
      ctx.moveTo(centerX - length * 0.28, -width * 0.38);
      ctx.lineTo(centerX + length * 0.22, -width * 0.38);
      ctx.moveTo(centerX - length * 0.28, width * 0.38);
      ctx.lineTo(centerX + length * 0.22, width * 0.38);
    }
    ctx.stroke();
  }

  drawWorldAlignedParachute(ctx, rocket, parts = null) {
    const activeParts = Array.isArray(parts) && parts.length > 0 ? parts : [];
    const totalLength = activeParts.length
      ? activeParts.map((part) => getPartWorldLength(part)).reduce((total, length) => total + length, 0)
      : 260;

    const upAngle = Math.atan2(rocket.y - PLANET.y, rocket.x - PLANET.x);
    const up = { x: Math.cos(upAngle), y: Math.sin(upAngle) };
    const tangent = { x: -Math.sin(upAngle), y: Math.cos(upAngle) };
    const heading = { x: Math.cos(rocket.angle ?? upAngle), y: Math.sin(rocket.angle ?? upAngle) };

    const attachWorld = {
      x: rocket.x + heading.x * (totalLength / 2 + 12),
      y: rocket.y + heading.y * (totalLength / 2 + 12)
    };
    const canopyWorld = {
      x: rocket.x + up.x * (totalLength / 2 + 285),
      y: rocket.y + up.y * (totalLength / 2 + 285)
    };

    const attach = this.worldToScreen(attachWorld.x, attachWorld.y);
    const canopy = this.worldToScreen(canopyWorld.x, canopyWorld.y);
    const scale = this.camera.scale;
    const radius = 215 * scale;
    const lineWidth = Math.max(1.2 * this.dpr, ROCKET_WORLD_LINE * scale);

    const flatAnchors = [];
    for (let i = -2; i <= 2; i += 1) {
      flatAnchors.push({
        x: canopy.x + tangent.x * i * 48 * scale,
        y: canopy.y + tangent.y * i * 48 * scale
      });
    }

    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    flatAnchors.forEach((anchor, index) => {
      const spread = (index - 2) * 34 * scale;
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(attach.x + tangent.x * spread * 0.16, attach.y + tangent.y * spread * 0.16);
    });
    ctx.stroke();

    ctx.translate(canopy.x, canopy.y);
    ctx.rotate(upAngle);
    ctx.fillStyle = "rgba(249, 168, 212, 0.8)";
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = "rgba(249, 168, 212, 0.28)";
    ctx.shadowBlur = 18 * this.dpr;
    ctx.beginPath();
    // Local +X points opposite gravity, so this cap always opens away from the planet.
    ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(0, -radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.64, -Math.PI / 2, Math.PI / 2);
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(radius * 0.24, 0, 0, radius);
    ctx.stroke();
    ctx.restore();
  }

  drawFallbackRocketBody(ctx, thrusting, crashed) {
    if (thrusting) {
      this.drawEngineFlame(ctx, -110);
    }

    ctx.lineWidth = Math.max(ROCKET_WORLD_LINE, 1.25 / Math.max(this.camera.scale, 0.001));
    ctx.beginPath();
    ctx.fillStyle = crashed ? "#fb7185" : "#e5e7eb";
    ctx.moveTo(118, 0);
    ctx.lineTo(54, -44);
    ctx.lineTo(-108, -42);
    ctx.lineTo(-108, 42);
    ctx.lineTo(54, 44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = "#7dd3fc";
    ctx.arc(22, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(-138, -34, 36, 68);
  }

  drawEngineFlame(ctx, tailX) {
    const time = performance.now();
    const flameLength = 118 + Math.sin(time / 36) * 30;
    ctx.save();
    ctx.shadowColor = "rgba(251, 146, 60, 0.68)";
    ctx.shadowBlur = 30 / Math.max(this.camera.scale, 0.001);
    ctx.beginPath();
    ctx.fillStyle = "rgba(251, 146, 60, 0.86)";
    ctx.moveTo(tailX, -35);
    ctx.lineTo(tailX - flameLength, 0);
    ctx.lineTo(tailX, 35);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(254, 240, 138, 0.92)";
    ctx.moveTo(tailX, -19);
    ctx.lineTo(tailX - flameLength * 0.58, 0);
    ctx.lineTo(tailX, 19);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#fed7aa";
    for (let i = 0; i < 5; i += 1) {
      const drift = ((time / 18 + i * 43) % 150);
      const y = Math.sin(time / 95 + i) * 18 + (i - 2) * 13;
      ctx.beginPath();
      ctx.arc(tailX - 28 - drift, y, 10 + i * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

}


function getTrajectoryStyle(points, planet) {
  const last = points[points.length - 1];
  const altitude = Math.hypot(last.x - planet.x, last.y - planet.y) - planet.radius;
  const distance = Math.hypot(last.x - planet.x, last.y - planet.y);
  let angularTravel = 0;
  let previous = Math.atan2(points[0].y - planet.y, points[0].x - planet.x);
  for (let i = 1; i < points.length; i += 1) {
    const angle = Math.atan2(points[i].y - planet.y, points[i].x - planet.x);
    angularTravel += Math.abs(normalizeAngle(angle - previous));
    previous = angle;
  }

  if (altitude <= 8) return { color: "rgba(251, 113, 133, 0.78)", glow: "rgba(251, 113, 133, 0.4)", width: 1.8, dash: [5, 7] };
  if (distance > (planet.radius + planet.atmosphereHeight) * PHYSICS.trajectoryMaxDistanceMultiplier * 0.72) {
    return { color: "rgba(196, 181, 253, 0.78)", glow: "rgba(167, 139, 250, 0.36)", width: 1.7, dash: [4, 9] };
  }
  if (angularTravel >= Math.PI * 1.65) return { color: "rgba(52, 211, 153, 0.82)", glow: "rgba(52, 211, 153, 0.38)", width: 1.8, dash: [4, 8] };
  return { color: "rgba(251, 191, 36, 0.72)", glow: "rgba(251, 191, 36, 0.28)", width: 1.65, dash: [3, 8] };
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function wrap(value, max) {
  return ((value % max) + max) % max;
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

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
