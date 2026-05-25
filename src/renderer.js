import { PLANET, RENDER } from "./config.js";
import { getGravityVector, predictTrajectory } from "./physics.js";
import { getPartWorldLength, getPartWorldWidth, ROCKET_WORLD_LINE } from "./dimensions.js";

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
    const { rocket, debug, objects = [], selectedObjectId = null } = state;
    const ctx = this.ctx;

    this.lastRocket = rocket;
    this.lastObjects = objects;
    this.selectedObjectId = selectedObjectId;
    this.updateCamera(rocket);
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawPlanet(ctx, PLANET);
    this.drawLaunchPad(ctx, PLANET);

    this.drawTrajectory(ctx, predictTrajectory(rocket, PLANET));
    this.drawDetachedObjects(ctx, objects);

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
    ctx.strokeStyle = object.kind === "payload" ? "rgba(134, 239, 172, 0.95)" : "rgba(251, 191, 36, 0.95)";
    ctx.lineWidth = Math.max(ROCKET_WORLD_LINE, 2 / Math.max(this.camera.scale, 0.001));
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(74, (object.collisionRadius ?? 12) * 1.6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawDetachedPayload(ctx, object) {
    const online = object.online;
    const color = online ? "#86efac" : object.color ?? "#a78bfa";
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

  drawRocket(ctx, rocket, thrusting) {
    const screen = this.worldToScreen(rocket.x, rocket.y);
    const parts = Array.isArray(rocket.parts) && rocket.parts.length > 0 ? rocket.parts.filter((part) => part.active !== false) : null;

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

    if (rocket.parachuteState === "deployed") {
      this.drawParachute(ctx, totalLength / 2 + 230, totalLength);
    }

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

  drawParachute(ctx, noseX) {
    ctx.save();
    const canopyRadius = 215;
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.fillStyle = "rgba(249, 168, 212, 0.78)";
    ctx.lineWidth = Math.max(ROCKET_WORLD_LINE, 1.4 / Math.max(this.camera.scale, 0.001));
    ctx.beginPath();
    ctx.arc(noseX, 0, canopyRadius, Math.PI, Math.PI * 2);
    ctx.lineTo(noseX - canopyRadius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    for (let i = -2; i <= 2; i += 1) {
      const anchorY = i * 46;
      ctx.moveTo(noseX + i * 48, 0);
      ctx.lineTo(noseX - 250, anchorY * 0.28);
    }
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
    const flameLength = 118 + Math.sin(performance.now() / 36) * 30;
    ctx.beginPath();
    ctx.fillStyle = "rgba(251, 146, 60, 0.85)";
    ctx.moveTo(tailX, -35);
    ctx.lineTo(tailX - flameLength, 0);
    ctx.lineTo(tailX, 35);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(254, 240, 138, 0.9)";
    ctx.moveTo(tailX, -19);
    ctx.lineTo(tailX - flameLength * 0.58, 0);
    ctx.lineTo(tailX, 19);
    ctx.closePath();
    ctx.fill();
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
