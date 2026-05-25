import { getPartWorldLength, getPartWorldWidth } from "./dimensions.js";

export class BuilderPreview {
  constructor(canvas, emptyNote = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.emptyNote = emptyNote;
    this.dpr = 1;
  }

  render(parts = []) {
    this.resize();
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height);

    const activeParts = parts.filter((part) => part.active !== false);
    this.emptyNote?.classList.toggle("hidden", activeParts.length > 0);
    if (!activeParts.length) return;

    const lengths = activeParts.map((part) => getPartWorldLength(part));
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    const maxPartWidth = Math.max(...activeParts.map((part) => getPartWorldWidth(part)));
    const availableHeight = height - 70 * this.dpr;
    const availableWidth = width - 125 * this.dpr;
    const scale = Math.min(availableHeight / totalLength, availableWidth / Math.max(maxPartWidth, 1), 1.15 * this.dpr);
    const centerX = width * 0.5;
    let y = height * 0.5 - (totalLength * scale) / 2;

    this.drawCenterLine(ctx, centerX, y, totalLength * scale);
    this.drawPreviewStand(ctx, centerX, y + totalLength * scale, Math.max(maxPartWidth * scale, 44 * this.dpr));

    activeParts.forEach((part, index) => {
      const length = lengths[index] * scale;
      const partWidth = getPartWorldWidth(part) * scale;
      const top = y;
      const left = centerX - partWidth / 2;
      this.drawPart(ctx, part, left, top, partWidth, length);
      this.drawStageBadge(ctx, part, centerX + partWidth / 2 + 10 * this.dpr, top + length / 2);
      y += length;
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const nextWidth = Math.max(1, Math.floor(rect.width * this.dpr));
    const nextHeight = Math.max(1, Math.floor(rect.height * this.dpr));
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
    }
  }

  drawBackground(ctx, width, height) {
    const gradient = ctx.createRadialGradient(width / 2, height * 0.1, 0, width / 2, height / 2, height * 0.82);
    gradient.addColorStop(0, "rgba(56,189,248,0.2)");
    gradient.addColorStop(0.42, "rgba(15,23,42,0.46)");
    gradient.addColorStop(1, "rgba(2,6,23,0.96)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const floor = ctx.createLinearGradient(0, height * 0.72, 0, height);
    floor.addColorStop(0, "rgba(15,23,42,0)");
    floor.addColorStop(1, "rgba(14,116,144,0.16)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, height * 0.58, width, height * 0.42);

    ctx.strokeStyle = "rgba(125,211,252,0.055)";
    ctx.lineWidth = 1 * this.dpr;
    const gap = 28 * this.dpr;
    for (let x = gap; x < width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = gap; y < height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 2 * this.dpr;
    ctx.beginPath();
    ctx.moveTo(width * 0.16, height);
    ctx.lineTo(width * 0.38, height * 0.64);
    ctx.lineTo(width * 0.62, height * 0.64);
    ctx.lineTo(width * 0.84, height);
    ctx.stroke();
  }


  drawPreviewStand(ctx, centerX, baseY, width) {
    ctx.save();
    const padWidth = Math.max(width * 2.2, 98 * this.dpr);
    ctx.fillStyle = "rgba(15,23,42,0.86)";
    ctx.strokeStyle = "rgba(125,211,252,0.22)";
    ctx.lineWidth = Math.max(1, 1.5 * this.dpr);
    roundRect(ctx, centerX - padWidth / 2, baseY + 12 * this.dpr, padWidth, 14 * this.dpr, 6 * this.dpr);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(226,232,240,0.2)";
    ctx.beginPath();
    ctx.moveTo(centerX + padWidth * 0.48, baseY + 12 * this.dpr);
    ctx.lineTo(centerX + padWidth * 0.48, baseY - 110 * this.dpr);
    ctx.moveTo(centerX + padWidth * 0.48, baseY - 96 * this.dpr);
    ctx.lineTo(centerX + width * 0.7, baseY - 76 * this.dpr);
    ctx.moveTo(centerX + padWidth * 0.48, baseY - 54 * this.dpr);
    ctx.lineTo(centerX + width * 0.66, baseY - 42 * this.dpr);
    ctx.stroke();
    ctx.restore();
  }

  drawCenterLine(ctx, centerX, top, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(125,211,252,0.14)";
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.setLineDash([4 * this.dpr, 7 * this.dpr]);
    ctx.beginPath();
    ctx.moveTo(centerX, top - 16 * this.dpr);
    ctx.lineTo(centerX, top + height + 16 * this.dpr);
    ctx.stroke();
    ctx.restore();
  }

  drawPart(ctx, part, x, y, width, height) {
    ctx.save();
    ctx.lineWidth = Math.max(1, 2 * this.dpr);
    ctx.strokeStyle = "rgba(15,23,42,0.92)";
    ctx.fillStyle = part.color ?? "#e5e7eb";

    if (part.type === "aero") {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height * 0.86);
      ctx.lineTo(x + width * 0.86, y + height);
      ctx.lineTo(x + width * 0.14, y + height);
      ctx.lineTo(x, y + height * 0.86);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y + height * 0.18);
      ctx.lineTo(x + width * 0.32, y + height * 0.78);
      ctx.lineTo(x + width * 0.46, y + height * 0.78);
      ctx.closePath();
      ctx.fill();
    } else if (part.type === "command") {
      roundRect(ctx, x, y, width, height, width * 0.24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height * 0.45, Math.min(width, height) * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (part.type === "fuel") {
      roundRect(ctx, x, y, width, height, width * 0.18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRect(ctx, x + width * 0.18, y + height * 0.1, width * 0.64, height * 0.16, 6 * this.dpr);
      roundRect(ctx, x + width * 0.18, y + height * 0.74, width * 0.64, height * 0.16, 6 * this.dpr);
      ctx.fill();
    } else if (part.type === "engine") {
      roundRect(ctx, x + width * 0.1, y, width * 0.8, height * 0.62, width * 0.14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.moveTo(x + width * 0.22, y + height * 0.55);
      ctx.lineTo(x + width * 0.78, y + height * 0.55);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(15,23,42,0.75)";
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height * 0.88, width * 0.32, height * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (part.type === "decoupler") {
      roundRect(ctx, x, y, width, height, 8 * this.dpr);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(15,23,42,0.45)";
      for (let i = 1; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x, y + (height * i) / 4);
        ctx.lineTo(x + width, y + (height * i) / 4);
        ctx.stroke();
      }
    } else if (part.type === "payload") {
      const satellite = part.id?.includes("satellite");
      if (satellite) {
        ctx.fillStyle = "#c4b5fd";
        roundRect(ctx, x + width * 0.22, y + height * 0.24, width * 0.56, height * 0.52, 10 * this.dpr);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(125,211,252,0.55)";
        roundRect(ctx, x - width * 0.36, y + height * 0.35, width * 0.46, height * 0.3, 5 * this.dpr);
        roundRect(ctx, x + width * 0.9, y + height * 0.35, width * 0.46, height * 0.3, 5 * this.dpr);
        ctx.fill();
        ctx.stroke();
      } else {
        roundRect(ctx, x, y, width, height, 12 * this.dpr);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        for (let i = 0; i < 3; i += 1) {
          roundRect(ctx, x + width * (0.18 + i * 0.22), y + height * 0.18, width * 0.12, height * 0.64, 5 * this.dpr);
          ctx.fill();
        }
      }
    } else if (part.type === "parachute") {
      roundRect(ctx, x, y, width, height, width * 0.16);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height * 0.54, width * 0.28, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else if (part.type === "legs") {
      roundRect(ctx, x, y, width, height, width * 0.16);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(226,232,240,0.9)";
      ctx.beginPath();
      ctx.moveTo(x + width * 0.28, y + height * 0.24);
      ctx.lineTo(x + width * 0.28, y + height * 0.78);
      ctx.moveTo(x + width * 0.72, y + height * 0.24);
      ctx.lineTo(x + width * 0.72, y + height * 0.78);
      ctx.stroke();
    } else {
      roundRect(ctx, x, y, width, height, 10 * this.dpr);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  drawStageBadge(ctx, part, x, y) {
    const label = part.stage === 0 ? "F" : `S${part.stage}`;
    ctx.save();
    ctx.font = `${Math.round(10 * this.dpr)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const radius = 13 * this.dpr;
    ctx.fillStyle = part.stage === 0 ? "rgba(148,163,184,0.2)" : "rgba(56,189,248,0.22)";
    ctx.strokeStyle = part.stage === 0 ? "rgba(148,163,184,0.38)" : "rgba(125,211,252,0.55)";
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    ctx.arc(x + radius, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = part.stage === 0 ? "#cbd5e1" : "#7dd3fc";
    ctx.fillText(label, x + radius, y + 0.5 * this.dpr);
    ctx.restore();
  }
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
