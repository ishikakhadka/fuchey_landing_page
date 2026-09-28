// Fuchey 3D device — ported from public/fuchey_animation.html (the 3D showcase)
// and trimmed down for the landing page hero: one device at a time, idle float,
// drag to turn (with momentum), tap to hop, and a spin transition when the
// edition changes. The yeti only appears on the device screen.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import yetiUrl from "../assets/yeti.png";

const yeti = new Image();
yeti.src = yetiUrl;

/* ---------- math helpers ---------- */
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => {
  x = clamp(x);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const lerp = (a, b, f) => a + (b - a) * f;
const rnd = (i) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/* ---------- 2D drawing helpers ---------- */
function mkCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function wordmarkTex(color, w = 1024, h = 160) {
  const c = mkCanvas(w, h);
  const x = c.getContext("2d");
  x.fillStyle = color;
  x.font = "400 104px Michroma, Arial Black, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  try {
    x.letterSpacing = "14px";
  } catch {
    /* older browsers */
  }
  x.fillText("FUCHEY", w / 2, h / 2 + 4);
  return tex(c);
}

// The yeti sprite as a crisp pixel-art decal (back emblem, lanyard charm).
function yetiTex(glow) {
  const c = mkCanvas(384, 384);
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  if (glow) {
    x.shadowColor = glow;
    x.shadowBlur = 18;
  }
  if (yeti.complete && yeti.naturalWidth) x.drawImage(yeti, 12, 12, 360, 360);
  const t = tex(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

function iconTex(kind, color) {
  const c = mkCanvas(128, 128);
  const x = c.getContext("2d");
  x.strokeStyle = color;
  x.lineWidth = 11;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.beginPath();
  if (kind === "l") {
    x.moveTo(74, 40);
    x.lineTo(50, 64);
    x.lineTo(74, 88);
  } else if (kind === "r") {
    x.moveTo(54, 40);
    x.lineTo(78, 64);
    x.lineTo(54, 88);
  } else {
    x.arc(64, 64, 24, 0, TAU);
  }
  x.stroke();
  return tex(c);
}

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function roundedPlane(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 12);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  }
  return g;
}

function makeShadowTex() {
  const c = mkCanvas(256, 256);
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.5, "rgba(0,0,0,.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ---------- screen content ---------- */
const SW = 480;
const SH = 520;

// One loop of on-screen scenes per edition (seconds).
const LOOP = { companion: 13, dev: 14 };
const SCENE_CUTS = [3.3, 5.8, 8.3, 12];
// Button presses that line up with the on-screen UI: [time, buttonIndex].
const PRESSES = {
  companion: [
    [9.6, 2],
    [10.8, 1],
  ],
  dev: [
    [9.4, 2],
    [10.6, 1],
  ],
};

const COL = {
  ink: "#EAF4FA",
  muted: "#7F97AC",
  good: "#5EE2A0",
  bad: "#FF8A8A",
  cyan: "#45E3FF",
  violet: "#9B86FF",
  coral: "#F08A64",
  panel: "rgba(255,255,255,.06)",
  panel2: "rgba(255,255,255,.1)",
};

const F = {
  ui: (w, s) => `${w} ${s}px Sora, Segoe UI, sans-serif`,
  mono: (w, s) => `${w} ${s}px "JetBrains Mono", Menlo, monospace`,
};

const usd = (b) =>
  "≈ $" +
  (b * 100.509).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const hsh = (i, n = 4) => {
  let s = "";
  for (let k = 0; k < n; k++) s += B58[Math.floor(rnd(i * 7 + k) * 58)];
  return s;
};

function logLine(i) {
  const slot = 291847112 + Math.floor(i / 5) * 3;
  switch (i % 5) {
    case 0:
      return ["slot " + slot.toLocaleString("en-US"), COL.muted];
    case 1:
      return ["✓ confirmed  " + hsh(i) + "…" + hsh(i + 3), COL.good];
    case 2:
      return ["invoke  Token Program [1]", COL.violet];
    case 3:
      return ["transfer  " + (0.05 + rnd(i) * 2).toFixed(3) + " SOL", COL.ink];
    default:
      return [
        "compute  " +
          Math.floor(2000 + rnd(i) * 9000).toLocaleString("en-US") +
          " CU",
        COL.muted,
      ];
  }
}

function screenPainters() {
  function screenBg(x, dev) {
    const g = x.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, dev ? "#0B1526" : "#0E1B2D");
    g.addColorStop(1, dev ? "#050A14" : "#08111F");
    x.fillStyle = g;
    x.fillRect(0, 0, SW, SH);
    if (dev) {
      x.strokeStyle = "rgba(69,227,255,.05)";
      x.lineWidth = 1;
      for (let i = 0; i < SW; i += 32) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i, SH);
        x.stroke();
      }
      for (let j = 0; j < SH; j += 32) {
        x.beginPath();
        x.moveTo(0, j);
        x.lineTo(SW, j);
        x.stroke();
      }
    }
  }

  function statusBar(x, dev) {
    const g = x.createLinearGradient(20, 24, 44, 48);
    g.addColorStop(0, dev ? COL.cyan : "#8FD3E8");
    g.addColorStop(1, dev ? COL.violet : "#5C8FB0");
    x.fillStyle = g;
    x.beginPath();
    x.arc(36, 38, 12, 0, TAU);
    x.fill();
    x.fillStyle = "#0B1526";
    x.fillRect(29, 33, 14, 2.5);
    x.fillRect(29, 37, 14, 2.5);
    x.fillRect(29, 41, 14, 2.5);
    x.fillStyle = COL.ink;
    x.font = F.ui(600, 21);
    x.textBaseline = "middle";
    x.textAlign = "left";
    x.fillText("SOL", 58, 39);
    x.strokeStyle = COL.muted;
    x.lineWidth = 2;
    x.beginPath();
    x.roundRect(404, 29, 40, 20, 4);
    x.stroke();
    x.fillStyle = COL.muted;
    x.fillRect(445, 35, 3, 8);
    x.fillStyle = dev ? COL.cyan : COL.good;
    x.fillRect(408, 33, 26, 12);
  }

  // The pixel yeti lives on the device screen only, as in the showcase.
  function drawMascot(x, cx, bottom, size, o = {}) {
    if (!yeti.complete || !yeti.naturalWidth) return;
    const sq = o.squash || 0;
    const w = size * (1 + sq * 0.06);
    const h = size * (1 - sq * 0.06);
    const top = bottom - h;
    x.imageSmoothingEnabled = false;
    x.drawImage(yeti, cx - w / 2, top, w, h);
    if (o.scarf) {
      x.fillStyle = COL.coral;
      x.beginPath();
      x.roundRect(cx - w * 0.23, top + h * 0.37, w * 0.46, h * 0.07, h * 0.03);
      x.fill();
      x.fillStyle = "#D8704E";
      x.fillRect(cx + w * 0.08, top + h * 0.42, w * 0.08, h * 0.15);
      x.fillStyle = "#FFD3BF";
      for (let i = 0; i < 4; i++) {
        x.fillRect(cx - w * 0.2 + i * w * 0.11, top + h * 0.385, w * 0.035, h * 0.025);
      }
    }
    x.imageSmoothingEnabled = true;
  }

  function heart(x, cx, cy, s, c) {
    x.fillStyle = c;
    x.beginPath();
    x.moveTo(cx, cy + s * 0.35);
    x.bezierCurveTo(cx - s * 0.9, cy - s * 0.25, cx - s * 0.35, cy - s * 0.85, cx, cy - s * 0.35);
    x.bezierCurveTo(cx + s * 0.35, cy - s * 0.85, cx + s * 0.9, cy - s * 0.25, cx, cy + s * 0.35);
    x.fill();
  }

  function chip(x, px, py, text, fg, bg) {
    x.font = F.ui(600, 15);
    const w = x.measureText(text).width + 24;
    x.fillStyle = bg;
    x.beginPath();
    x.roundRect(px, py, w, 28, 14);
    x.fill();
    x.fillStyle = fg;
    x.textBaseline = "middle";
    x.fillText(text, px + 12, py + 14.5);
    return w;
  }

  function balance(x, cx, y, bal, align = "center") {
    x.textAlign = align;
    x.textBaseline = "alphabetic";
    x.fillStyle = COL.ink;
    const n = bal.toFixed(2);
    x.font = F.ui(600, 48);
    const w1 = x.measureText(n).width;
    x.font = F.ui(400, 24);
    const w2 = x.measureText(" SOL").width;
    const left = align === "center" ? cx - (w1 + w2) / 2 : cx;
    x.textAlign = "left";
    x.font = F.ui(600, 48);
    x.fillText(n, left, y);
    x.font = F.ui(400, 24);
    x.fillStyle = COL.muted;
    x.fillText(" SOL", left + w1, y);
  }

  function sceneFade(x, u, len, rgb) {
    const fade = [0, ...SCENE_CUTS, len].reduce(
      (m, b) => Math.max(m, 1 - Math.abs(u - b) / 0.14),
      0,
    );
    if (fade > 0) {
      x.fillStyle = `rgba(${rgb},${fade * 0.9})`;
      x.fillRect(0, 0, SW, SH);
    }
  }

  function drawCompanion(x, u, at) {
    screenBg(x, false);
    const scarf = u >= 10.8;
    const bob = Math.sin(at * 2.4) * 4;
    const breathe = (Math.sin(at * 2.4) + 1) / 2;

    if (u < 3.3 || u >= 12) {
      statusBar(x, false);
      drawMascot(x, 240, 338 + bob, 212, { squash: breathe, scarf });
      const bal = 12.92 - (scarf ? 0 : 0.5);
      balance(x, 240, 408, bal);
      x.font = F.ui(400, 21);
      x.fillStyle = COL.muted;
      x.textAlign = "center";
      x.fillText(usd(bal), 240, 442);
      heart(x, 44, 488, 22, COL.coral);
      x.textAlign = "left";
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 17);
      x.fillText("Happy", 64, 494);
      x.textAlign = "right";
      x.fillStyle = COL.muted;
      x.fillText("Lv 7", 444, 494);
    } else if (u < 5.8) {
      const l = u - 3.3;
      statusBar(x, false);
      const jumpT = l - 0.55;
      const jump =
        jumpT > 0 && jumpT < 1.8
          ? Math.abs(Math.sin(jumpT * 6.5)) * 38 * (1 - jumpT / 1.8)
          : 0;
      const cx = 240;
      const cy = 250;
      if (jumpT > 0) {
        for (let i = 0; i < 18; i++) {
          const a = rnd(i) * TAU;
          const sp = 90 + rnd(i + 9) * 170;
          const d = Math.min(jumpT, 1.6) * sp;
          const al = clamp(1 - jumpT / 1.6);
          if (al <= 0) continue;
          x.globalAlpha = al;
          x.fillStyle = i % 3 ? COL.good : "#BDF7D8";
          const s = 4 + rnd(i + 3) * 5;
          x.fillRect(
            cx + Math.cos(a) * d - s / 2,
            cy + Math.sin(a) * d * 0.8 - s / 2 - jumpT * 20,
            s,
            s,
          );
        }
        x.globalAlpha = 1;
      }
      drawMascot(x, cx, 350 + bob - jump, 180, {
        squash: jump > 2 ? -0.6 : breathe,
      });
      const b = 12.42 + 0.5 * ease((l - 0.7) / 1.1);
      balance(x, 240, 408, b);
      x.font = F.ui(400, 21);
      x.fillStyle = COL.muted;
      x.textAlign = "center";
      x.fillText(usd(b), 240, 442);
      const ty =
        lerp(-90, 64, ease((l - 0.2) / 0.45)) -
        lerp(0, 170, ease((l - 2.1) / 0.35));
      x.fillStyle = "rgba(18,40,36,.96)";
      x.strokeStyle = "rgba(94,226,160,.5)";
      x.lineWidth = 1.5;
      x.beginPath();
      x.roundRect(36, ty, 408, 66, 18);
      x.fill();
      x.stroke();
      x.fillStyle = COL.good;
      x.beginPath();
      x.arc(72, ty + 33, 15, 0, TAU);
      x.fill();
      x.fillStyle = "#0B2019";
      x.fillRect(64, ty + 31, 16, 4);
      x.fillRect(70, ty + 25, 4, 16);
      x.textAlign = "left";
      x.fillStyle = COL.muted;
      x.font = F.ui(400, 15);
      x.fillText("Received · just now", 100, ty + 27);
      x.fillStyle = COL.good;
      x.font = F.ui(600, 22);
      x.fillText("+0.50 SOL", 100, ty + 53);
      x.fillStyle = COL.muted;
      x.font = F.ui(400, 17);
      x.fillText("Fuchey is thrilled", 36, 494);
    } else if (u < 8.3) {
      const l = u - 5.8;
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 24);
      x.textAlign = "left";
      x.textBaseline = "alphabetic";
      x.fillText("Mood", 36, 52);
      chip(x, 112, 31, "Happy", COL.coral, "rgba(240,138,100,.16)");
      for (let i = 0; i < 5; i++) {
        const p = (l * 0.55 + rnd(i)) % 1;
        const hx = 150 + rnd(i + 4) * 180 + Math.sin((l + i) * 3) * 10;
        const hy = 300 - p * 200;
        x.globalAlpha = Math.sin(p * Math.PI);
        heart(x, hx, hy, 14 + rnd(i + 2) * 12, COL.coral);
      }
      x.globalAlpha = 1;
      drawMascot(x, 240, 330 + bob, 196, { squash: breathe });
      x.font = F.ui(600, 26);
      x.fillStyle = COL.ink;
      x.textAlign = "left";
      x.fillText("Lv 7", 36, 388);
      const xp = Math.round(lerp(1180, 1320, ease((l - 0.5) / 1.4)));
      x.font = F.ui(400, 18);
      x.fillStyle = COL.muted;
      x.textAlign = "right";
      x.fillText(xp.toLocaleString("en-US") + " / 1,600 XP", 444, 388);
      x.fillStyle = COL.panel2;
      x.beginPath();
      x.roundRect(36, 404, 408, 14, 7);
      x.fill();
      const g = x.createLinearGradient(36, 0, 444, 0);
      g.addColorStop(0, "#8FD3E8");
      g.addColorStop(1, COL.coral);
      x.fillStyle = g;
      x.beginPath();
      x.roundRect(36, 404, 408 * (xp / 1600), 14, 7);
      x.fill();
      x.textAlign = "left";
      x.font = F.ui(400, 17);
      x.fillStyle = COL.muted;
      x.fillText("12-day streak", 36, 466);
      x.textAlign = "right";
      x.fillText("3 tx today", 444, 466);
      x.fillStyle = COL.ink;
      x.textAlign = "left";
      x.font = F.ui(600, 17);
      x.fillText("+140 XP from wallet activity", 36, 500);
    } else if (u < 9.6) {
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 24);
      x.textAlign = "left";
      x.fillText("Wallet", 36, 52);
      drawMascot(x, 420, 72, 54);
      const rows = [
        ["Received", "+0.50 SOL", "12:34 PM", COL.good, "+"],
        ["Sent", "−0.20 SOL", "10:12 AM", COL.bad, "−"],
        ["Collected", "Frost Scarf", "Yesterday", COL.coral, "★"],
      ];
      rows.forEach((r, i) => {
        const y = 88 + i * 132;
        x.fillStyle = COL.panel;
        x.beginPath();
        x.roundRect(28, y, 424, 116, 18);
        x.fill();
        x.fillStyle = r[3];
        x.beginPath();
        x.arc(70, y + 40, 16, 0, TAU);
        x.fill();
        x.fillStyle = "#0B1526";
        x.font = F.ui(600, 20);
        x.textAlign = "center";
        x.fillText(r[4], 70, y + 47);
        x.textAlign = "left";
        x.fillStyle = COL.ink;
        x.font = F.ui(600, 22);
        x.fillText(r[0], 100, y + 48);
        x.fillStyle = r[3];
        x.fillText(r[1], 100, y + 84);
        x.fillStyle = COL.muted;
        x.font = F.ui(400, 17);
        x.textAlign = "right";
        x.fillText(r[2], 430, y + 84);
      });
    } else if (u < 10.8) {
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 24);
      x.textAlign = "left";
      x.fillText("Wardrobe", 36, 52);
      x.fillStyle = COL.muted;
      x.font = F.ui(400, 16);
      x.textAlign = "right";
      x.fillText("3 items", 444, 52);
      const items = [
        ["Frost Scarf", "Rare"],
        ["Beanie", "Common"],
        ["Snow Globe", "Epic"],
      ];
      items.forEach((it, i) => {
        const px = 28 + i * 146;
        const py = 92;
        const sel = i === 0;
        x.fillStyle = sel ? "rgba(143,211,232,.14)" : COL.panel;
        x.beginPath();
        x.roundRect(px, py, 132, 190, 16);
        x.fill();
        if (sel) {
          x.strokeStyle = "#8FD3E8";
          x.lineWidth = 3;
          x.stroke();
        }
        const cx = px + 66;
        const cy = py + 74;
        if (i === 0) {
          x.fillStyle = COL.coral;
          x.beginPath();
          x.roundRect(cx - 40, cy - 12, 80, 22, 11);
          x.fill();
          x.fillStyle = "#D8704E";
          x.fillRect(cx + 10, cy + 6, 16, 34);
        }
        if (i === 1) {
          x.fillStyle = "#8FB4D8";
          x.beginPath();
          x.arc(cx, cy + 12, 36, Math.PI, 0);
          x.fill();
          x.fillStyle = "#EAF4FA";
          x.beginPath();
          x.arc(cx, cy - 30, 9, 0, TAU);
          x.fill();
          x.fillStyle = "#6E95BA";
          x.fillRect(cx - 38, cy + 8, 76, 12);
        }
        if (i === 2) {
          x.fillStyle = "rgba(180,220,240,.35)";
          x.beginPath();
          x.arc(cx, cy - 4, 32, 0, TAU);
          x.fill();
          x.fillStyle = "#EAF4FA";
          for (let k = 0; k < 6; k++)
            x.fillRect(cx - 20 + rnd(k) * 40, cy - 26 + rnd(k + 7) * 36, 3, 3);
          x.fillStyle = "#6E5A4A";
          x.fillRect(cx - 28, cy + 24, 56, 12);
        }
        x.textAlign = "center";
        x.fillStyle = COL.ink;
        x.font = F.ui(600, 16);
        x.fillText(it[0], cx, py + 150);
        x.fillStyle = i === 2 ? COL.violet : i === 0 ? "#8FD3E8" : COL.muted;
        x.font = F.ui(400, 14);
        x.fillText(it[1], cx, py + 174);
      });
      drawMascot(x, 240, 500, 170, { squash: breathe });
    } else {
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 24);
      x.textAlign = "left";
      x.fillText("Wardrobe", 36, 52);
      const l2 = u - 10.8;
      const pop = 1 + 0.08 * Math.sin(clamp(l2 / 0.5) * Math.PI);
      for (let i = 0; i < 10; i++) {
        const a = rnd(i + 20) * TAU;
        const d = ease(l2 / 0.8) * 150;
        x.globalAlpha = clamp(1 - l2 / 1.0);
        x.fillStyle = i % 2 ? "#8FD3E8" : COL.coral;
        x.fillRect(240 + Math.cos(a) * d, 260 + Math.sin(a) * d, 6, 6);
      }
      x.globalAlpha = 1;
      drawMascot(x, 240, 392 + bob, 250 * pop, { scarf: true, squash: breathe });
      x.textAlign = "center";
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 24);
      x.fillText("Frost Scarf equipped", 240, 448);
      x.fillStyle = COL.muted;
      x.font = F.ui(400, 17);
      x.fillText("Fuchey looks cosy", 240, 480);
    }

    sceneFade(x, u, LOOP.companion, "5,10,20");
  }

  function drawDev(x, u, at) {
    screenBg(x, true);

    if (u < 3.3) {
      statusBar(x, true);
      chip(x, 356, 74, "+3.2% 24h", COL.good, "rgba(94,226,160,.14)");
      balance(x, 32, 122, 12.42, "left");
      x.font = F.ui(400, 20);
      x.fillStyle = COL.muted;
      x.textAlign = "left";
      x.fillText(usd(12.42), 34, 156);
      const top = 196;
      const bot = 388;
      const L = 28;
      const R = 452;
      x.strokeStyle = "rgba(127,151,172,.14)";
      x.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        const y = top + (k * (bot - top)) / 3;
        x.beginPath();
        x.moveTo(L, y);
        x.lineTo(R, y);
        x.stroke();
      }
      const N = 44;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const v =
          0.35 + (i / N) * 0.4 + Math.sin(i * 0.55) * 0.08 + (rnd(i) - 0.5) * 0.12;
        pts.push([L + ((R - L) * i) / (N - 1), bot - (bot - top) * clamp(v, 0.05, 0.95)]);
      }
      const n = Math.max(2, Math.floor(clamp(0.15 + u / 2.2) * N));
      const g = x.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, "rgba(69,227,255,.28)");
      g.addColorStop(1, "rgba(69,227,255,0)");
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(pts[0][0], bot);
      for (let i = 0; i < n; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.lineTo(pts[n - 1][0], bot);
      x.closePath();
      x.fill();
      x.strokeStyle = COL.cyan;
      x.lineWidth = 3;
      x.shadowColor = COL.cyan;
      x.shadowBlur = 12;
      x.beginPath();
      for (let i = 0; i < n; i++)
        i ? x.lineTo(pts[i][0], pts[i][1]) : x.moveTo(pts[i][0], pts[i][1]);
      x.stroke();
      x.shadowBlur = 0;
      const e = pts[n - 1];
      x.fillStyle = "#fff";
      x.beginPath();
      x.arc(e[0], e[1], 5, 0, TAU);
      x.fill();
      x.font = F.mono(400, 15);
      x.fillStyle = COL.muted;
      x.textAlign = "left";
      x.fillText(
        "slot " + (291847112 + Math.floor(at * 2.5)).toLocaleString("en-US"),
        32,
        428,
      );
      heart(x, 40, 482, 18, COL.cyan);
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 16);
      x.fillText("Focused", 58, 488);
      drawMascot(x, 392, 512 + Math.sin(at * 2.4) * 3, 118);
    } else if (u < 5.8) {
      const l = u - 3.3;
      x.fillStyle = COL.cyan;
      x.font = F.mono(500, 22);
      x.textAlign = "left";
      x.fillText("›_ Live logs", 30, 50);
      const pulse = 0.5 + 0.5 * Math.sin(at * 6);
      x.fillStyle = `rgba(255,110,110,${0.5 + pulse * 0.5})`;
      x.beginPath();
      x.arc(380, 43, 6, 0, TAU);
      x.fill();
      x.fillStyle = COL.ink;
      x.font = F.mono(500, 15);
      x.fillText("LIVE", 394, 49);
      const count = Math.floor(l / 0.22) + 8;
      const lh = 30;
      const start = Math.max(0, count - 14);
      x.save();
      x.beginPath();
      x.rect(0, 78, SW, SH - 78);
      x.clip();
      for (let i = start; i < count; i++) {
        const [t, c] = logLine(i);
        x.fillStyle = c;
        x.font = F.mono(400, 17);
        x.fillText(t, 30, 108 + (i - start) * lh);
      }
      x.restore();
      if (Math.floor(at * 2) % 2 === 0) {
        x.fillStyle = COL.cyan;
        x.fillRect(30, 108 + (count - start) * lh - 18, 11, 20);
      }
    } else if (u < 8.3) {
      const l = u - 5.8;
      const hi = Math.floor(l / 0.6) % 4;
      x.fillStyle = COL.cyan;
      x.font = F.mono(500, 22);
      x.textAlign = "left";
      x.fillText("</> Developer Tools", 30, 50);
      ["Transactions", "Programs", "dApp Browser", "Logs"].forEach((n, i) => {
        const y = 84 + i * 104;
        x.fillStyle = i === hi ? "rgba(69,227,255,.14)" : COL.panel;
        x.beginPath();
        x.roundRect(26, y, 428, 86, 16);
        x.fill();
        if (i === hi) {
          x.strokeStyle = "rgba(69,227,255,.7)";
          x.lineWidth = 2;
          x.stroke();
        }
        x.strokeStyle = i === hi ? COL.cyan : COL.muted;
        x.lineWidth = 2.5;
        x.beginPath();
        x.roundRect(48, y + 27, 32, 32, 8);
        x.stroke();
        x.fillStyle = COL.ink;
        x.font = F.ui(600, 21);
        x.fillText(n, 98, y + 51);
        x.strokeStyle = COL.muted;
        x.beginPath();
        x.moveTo(420, y + 33);
        x.lineTo(430, y + 43);
        x.lineTo(420, y + 53);
        x.stroke();
      });
    } else if (u < 10.6) {
      const focus = u >= 9.4 ? 1 : 0;
      x.fillStyle = COL.cyan;
      x.font = F.mono(500, 22);
      x.textAlign = "left";
      x.fillText("Signature request", 30, 50);
      x.fillStyle = COL.panel;
      x.beginPath();
      x.roundRect(26, 78, 428, 262, 18);
      x.fill();
      [
        ["From", "my-dapp · localhost"],
        ["Action", "Transfer"],
        ["Amount", "0.25 SOL"],
        ["Network fee", "0.000005 SOL"],
      ].forEach((r, i) => {
        const y = 124 + i * 58;
        x.fillStyle = COL.muted;
        x.font = F.ui(400, 18);
        x.textAlign = "left";
        x.fillText(r[0], 50, y);
        x.fillStyle = COL.ink;
        x.font = F.ui(600, 19);
        x.textAlign = "right";
        x.fillText(r[1], 430, y);
      });
      ["Reject", "Approve"].forEach((n, i) => {
        const px = 26 + i * 222;
        const on = i === focus;
        x.fillStyle = on ? (i ? COL.cyan : COL.bad) : "rgba(255,255,255,.05)";
        x.beginPath();
        x.roundRect(px, 372, 206, 74, 18);
        x.fill();
        if (!on) {
          x.strokeStyle = "rgba(255,255,255,.18)";
          x.lineWidth = 2;
          x.stroke();
        }
        x.fillStyle = on ? "#06121E" : COL.ink;
        x.font = F.ui(600, 22);
        x.textAlign = "center";
        x.fillText(n, px + 103, 418);
      });
      x.fillStyle = COL.muted;
      x.font = F.mono(400, 15);
      x.textAlign = "center";
      x.fillText("Press ● to confirm on device", 240, 488);
    } else if (u < 12) {
      const l = u - 10.6;
      const p = ease(l / 0.5);
      x.strokeStyle = COL.good;
      x.lineWidth = 8;
      x.lineCap = "round";
      x.beginPath();
      x.arc(240, 196, 78, -Math.PI / 2, -Math.PI / 2 + TAU * p);
      x.stroke();
      const q = ease((l - 0.35) / 0.35);
      if (q > 0) {
        x.beginPath();
        x.moveTo(204, 198);
        x.lineTo(lerp(204, 230, clamp(q * 2)), lerp(198, 224, clamp(q * 2)));
        if (q > 0.5)
          x.lineTo(lerp(230, 280, (q - 0.5) * 2), lerp(224, 168, (q - 0.5) * 2));
        x.stroke();
      }
      x.lineCap = "butt";
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 30);
      x.textAlign = "center";
      x.fillText("Signed", 240, 330);
      x.fillStyle = COL.muted;
      x.font = F.mono(400, 17);
      x.fillText("tx 5Kq2…8fWz · confirmed", 240, 368);
      drawMascot(x, 240, 508 + Math.sin(at * 2.4) * 3, 112);
    } else {
      const l = u - 12;
      const glow = 0.6 + 0.4 * Math.sin(at * 2);
      x.shadowColor = COL.cyan;
      x.shadowBlur = 24 * glow;
      drawMascot(x, 240, 290 + Math.sin(at * 2.4) * 4, 230);
      x.shadowBlur = 0;
      const full = "Solana";
      const n = Math.min(full.length, Math.floor(l / 0.16));
      x.fillStyle = COL.ink;
      x.font = F.ui(600, 32);
      x.textAlign = "center";
      x.fillText("Building on", 240, 376);
      const typed = full.slice(0, n);
      x.fillStyle = COL.cyan;
      x.font = F.mono(500, 34);
      const w = x.measureText(typed).width;
      x.fillText(typed, 240, 426);
      if (Math.floor(at * 2.2) % 2 === 0) x.fillRect(240 + w / 2 + 4, 402, 16, 28);
    }

    sceneFade(x, u, LOOP.dev, "3,7,14");
  }

  return { companion: drawCompanion, dev: drawDev };
}

/* ---------- device builder ---------- */
function std(color, o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    ...o,
  });
}

function decal(w, h, map, o = {}) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      roughness: 0.6,
      metalness: 0,
      depthWrite: false,
      ...o,
    }),
  );
}

function buildDevice(kind, shadowTex) {
  const dev = kind === "dev";
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const W = 1.0;
  const H = dev ? 1.62 : 1.52;
  const D = dev ? 0.4 : 0.36;
  const M = dev
    ? {
        shell: std("#1D2533", { metalness: 0.55, roughness: 0.42, clearcoat: 0.2 }),
        armor: std("#121821", { metalness: 0.35, roughness: 0.55 }),
        panel: std("#252F3E", { metalness: 0.5, roughness: 0.38 }),
        cap: std("#1A212C", { metalness: 0.5, roughness: 0.35 }),
        socket: std("#0B0F16", { roughness: 0.6 }),
        screw: std("#A3B0BE", { metalness: 1, roughness: 0.28 }),
        led: new THREE.MeshBasicMaterial({ color: new THREE.Color("#45E3FF"), toneMapped: false }),
        led2: new THREE.MeshBasicMaterial({ color: new THREE.Color("#8A6BFF"), toneMapped: false }),
        rope: std("#10151E", { roughness: 0.8, clearcoat: 0 }),
        port: std("#05070B", { roughness: 0.7 }),
      }
    : {
        shell: std("#44718E", { roughness: 0.55 }),
        face: std("#EEF1EC", { roughness: 0.42, clearcoat: 0.6 }),
        cap: std("#3F6B88", { roughness: 0.45, clearcoat: 0.5 }),
        socket: std("#D9E0E0", { roughness: 0.5 }),
        screw: std("#35607C", { metalness: 0.3, roughness: 0.4 }),
        rope: std("#2A4A63", { roughness: 0.85, clearcoat: 0 }),
        port: std("#0B1017", { roughness: 0.7 }),
      };

  let front;
  if (!dev) {
    body.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, 0.2), M.shell));
    const fd = D * 0.55;
    const face = new THREE.Mesh(new RoundedBoxGeometry(W - 0.09, H - 0.09, fd, 6, 0.17), M.face);
    front = D / 2 + 0.02;
    face.position.z = front - fd / 2;
    body.add(face);
    const sb = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.2, 0.1, 4, 0.02), M.cap);
    sb.position.set(W / 2 + 0.028, 0.3, 0);
    body.add(sb);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.042, 20, 48, Math.PI), M.shell);
    handle.position.set(0, H / 2 - 0.03, -0.02);
    body.add(handle);
  } else {
    body.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 5, 0.09), M.shell));
    const panel = new THREE.Mesh(new RoundedBoxGeometry(W - 0.16, H - 0.2, 0.06, 4, 0.025), M.panel);
    front = D / 2 + 0.028;
    panel.position.z = front - 0.03;
    body.add(panel);
    [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ].forEach(([sx, sy]) => {
      const a = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.27, D + 0.05, 4, 0.07), M.armor);
      a.position.set(sx * (W / 2 - 0.1), sy * (H / 2 - 0.1), 0);
      body.add(a);
      [1, -1].forEach((sz) => {
        const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 20), M.screw);
        sc.rotation.x = Math.PI / 2;
        sc.position.set(sx * (W / 2 - 0.085), sy * (H / 2 - 0.085), sz * ((D + 0.05) / 2 + 0.004));
        body.add(sc);
      });
    });
    [-1, 1].forEach((s) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.42, 0.012), M.led);
      l.position.set(s * 0.43, 0.25, front + 0.004);
      body.add(l);
    });
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.46, 0.05), M.led);
    side.position.set(W / 2 + 0.003, -0.05, 0);
    body.add(side);
    const side2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.05), M.led2);
    side2.position.set(W / 2 + 0.003, -0.36, 0);
    body.add(side2);
    const sb = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.18, 0.1, 4, 0.02), M.cap);
    sb.position.set(-W / 2 - 0.022, 0.28, 0);
    body.add(sb);
    for (let i = 0; i < 5; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.02), M.socket);
      v.position.set(-0.14 + i * 0.07, H / 2 - 0.035, front - 0.005);
      body.add(v);
    }
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.012), M.led);
    strip.position.set(0, -0.18, front + 0.004);
    body.add(strip);
  }

  /* screen */
  const sw = dev ? 0.66 : 0.62;
  const sh = (sw * SH) / SW;
  const sy = dev ? 0.27 : 0.25;
  const bezel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(sw + 0.07, sh + 0.07, 0.07), {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 3,
      curveSegments: 10,
    }),
    std("#070B12", { roughness: 0.3, clearcoat: 0.8 }),
  );
  bezel.position.set(0, sy, front - 0.004);
  body.add(bezel);
  const sc = mkCanvas(SW, SH);
  const sctx = sc.getContext("2d");
  const stex = tex(sc);
  const screen = new THREE.Mesh(
    roundedPlane(sw, sh, 0.045),
    new THREE.MeshBasicMaterial({ map: stex, toneMapped: false }),
  );
  screen.position.set(0, sy, front + 0.0205);
  body.add(screen);
  const glass = new THREE.Mesh(
    roundedPlane(sw + 0.05, sh + 0.05, 0.06),
    new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      depthWrite: false,
    }),
  );
  glass.position.set(0, sy, front + 0.024);
  body.add(glass);

  /* buttons */
  const by = dev ? -0.4 : -0.37;
  const buttons = [];
  [
    ["l", -0.28, 0.085],
    ["c", 0, 0.1],
    ["r", 0.28, 0.085],
  ].forEach(([k, bx, r]) => {
    const g = new THREE.Group();
    g.position.set(bx, by, front);
    body.add(g);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.024, r + 0.03, 0.02, 48), M.socket);
    sock.rotation.x = Math.PI / 2;
    sock.position.z = -0.004;
    g.add(sock);
    if (dev) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.016, 0.006, 10, 64), M.led);
      ring.position.z = 0.008;
      g.add(ring);
    }
    const cap = new THREE.Group();
    g.add(cap);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, 0.05, 48), M.cap);
    cyl.rotation.x = Math.PI / 2;
    cyl.position.z = 0.022;
    cap.add(cyl);
    const ic = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.95, 40),
      new THREE.MeshBasicMaterial({
        map: iconTex(k, dev ? "#7FE9FF" : "#E3EEF4"),
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    ic.position.z = 0.0475;
    cap.add(ic);
    buttons.push(cap);
  });

  /* wordmark */
  const wm = decal(0.4, 0.0625, wordmarkTex(dev ? "#9FB3C6" : "#3F6B88"));
  wm.position.set(0, dev ? -0.63 : -0.6, front + 0.002);
  body.add(wm);

  /* back */
  const back = -D / 2 - 0.0015;
  if (dev) {
    const hc = mkCanvas(512, 832);
    const hx = hc.getContext("2d");
    hx.strokeStyle = "rgba(255,255,255,.07)";
    hx.lineWidth = 2;
    for (let i = -900; i < 900; i += 16) {
      hx.beginPath();
      hx.moveTo(i, 0);
      hx.lineTo(i + 832, 832);
      hx.stroke();
    }
    hx.strokeStyle = "rgba(69,227,255,.16)";
    hx.lineWidth = 3;
    [
      [60, 120, 60, 300, 160, 400],
      [452, 700, 452, 520, 340, 440],
      [120, 760, 260, 760, 300, 700],
    ].forEach((p) => {
      hx.beginPath();
      hx.moveTo(p[0], p[1]);
      hx.lineTo(p[2], p[3]);
      hx.lineTo(p[4], p[5]);
      hx.stroke();
      hx.beginPath();
      hx.arc(p[4], p[5], 6, 0, TAU);
      hx.stroke();
    });
    const hatch = decal(W - 0.2, H - 0.3, tex(hc), { metalness: 0.4, roughness: 0.5 });
    hatch.position.z = back - 0.001;
    hatch.rotation.y = Math.PI;
    body.add(hatch);
    const em = decal(0.4, 0.4, yetiTex("rgba(69,227,255,.55)"));
    em.position.set(0, 0.12, back - 0.003);
    em.rotation.y = Math.PI;
    body.add(em);
  } else {
    const em = decal(0.4, 0.4, yetiTex());
    em.position.set(0, 0.12, back);
    em.rotation.y = Math.PI;
    body.add(em);
    [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ].forEach(([sx, sy2]) => {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 16), M.screw);
      s.rotation.x = Math.PI / 2;
      s.position.set(sx * 0.33, sy2 * 0.6, back - 0.002);
      body.add(s);
    });
  }
  const bwm = decal(0.4, 0.0625, wordmarkTex(dev ? "#6F8499" : "#2E5470"));
  bwm.position.set(0, -0.46, back - 0.004);
  bwm.rotation.y = Math.PI;
  body.add(bwm);

  /* usb-c */
  const port = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.02, 0.06, 3, 0.009), M.port);
  port.position.set(0, -H / 2 - 0.004 + (dev ? 0 : 0.002), 0);
  body.add(port);
  const tongue = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.004, 0.014),
    std("#8C969F", { metalness: 1, roughness: 0.3 }),
  );
  tongue.position.set(0, -H / 2 - 0.012, 0);
  body.add(tongue);

  /* lanyard + charm */
  const lan = new THREE.Group();
  lan.position.set(-W / 2 + (dev ? 0.02 : 0.04), H / 2 - (dev ? 0.08 : 0.22), 0.02);
  body.add(lan);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 10, 28), dev ? M.screw : M.cap);
  ringM.rotation.y = Math.PI / 2;
  lan.add(ringM);
  const pivot = new THREE.Group();
  lan.add(pivot);
  const drop = dev ? 0.95 : 0.85;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(-0.07, -0.15, 0.04),
    new THREE.Vector3(-0.12, -drop * 0.55, 0.07),
    new THREE.Vector3(-0.13, -drop, 0.08),
  ]);
  [0, 0.022].forEach((o) => {
    const c2 = new THREE.CatmullRomCurve3(
      curve.points.map((p) => p.clone().add(new THREE.Vector3(o, 0, -o))),
    );
    pivot.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 40, 0.011, 8), M.rope));
  });
  const charm = new THREE.Group();
  charm.position.set(-0.12, -drop - 0.14, 0.08);
  pivot.add(charm);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.035, 48), dev ? M.armor : M.shell);
  disc.rotation.x = Math.PI / 2;
  charm.add(disc);
  const cf = decal(0.25, 0.25, yetiTex(dev ? "rgba(69,227,255,.55)" : null), { roughness: 0.4 });
  cf.position.z = 0.019;
  charm.add(cf);
  const cb = cf.clone();
  cb.position.z = -0.019;
  cb.rotation.y = Math.PI;
  charm.add(cb);
  const cr = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 10, 24), dev ? M.screw : M.cap);
  cr.position.y = 0.15;
  cr.rotation.y = Math.PI / 2;
  charm.add(cr);

  /* soft contact shadow */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.75),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      color: 0x0a1a28,
      opacity: 0.3,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -H / 2 - 0.36;
  root.add(shadow);

  root.userData = {
    body,
    H,
    buttons,
    lanyard: pivot,
    shadow,
    screen: { ctx: sctx, tex: stex },
  };
  return root;
}

function disposeObject(root) {
  const seen = new Set();
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m || seen.has(m)) return;
      seen.add(m);
      if (m.map) m.map.dispose();
      m.dispose();
    });
  });
}

/* ---------- scene ---------- */
export function createFucheyScene({ canvas, container, edition, reduced, onReady, onError }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  const fill = new THREE.DirectionalLight(0xdfeaff, 0.5);
  fill.position.set(-4, 1, 3);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(-2, 2, -5);
  scene.add(key, fill, rim);

  const shadowTex = makeShadowTex();
  const painters = screenPainters();
  const devices = {};

  /* state */
  let disposed = false;
  let ready = false;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let time = 0;

  let current = edition;
  let previous = null;
  let swapStart = 0;
  const screenStart = { companion: 0, dev: 0 };
  let bgMix = edition === "dev" ? 1 : 0;

  let dragging = false;
  let dragYaw = 0;
  let dragPitch = 0;
  let yawVel = 0;
  let pitchVel = 0;
  let lastX = 0;
  let lastY = 0;
  let lastMove = 0;
  let travel = 0;
  let hopStart = -10;
  let tiltX = 0;
  let tiltY = 0;
  let tiltTX = 0;
  let tiltTY = 0;

  /* sizing */
  function resize() {
    const r = container.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    // Pull back on narrow frames so the device + lanyard always fit.
    const z = Math.max(4.9, 3.55 / aspect);
    camera.position.set(0, 0.12, z);
    camera.lookAt(-0.08, -0.12, 0);
    camera.updateProjectionMatrix();
    if (ready && !raf) frame(0);
  }

  /* input */
  // Drag turns the device and it stays where you leave it; a flick keeps it
  // spinning for a moment before friction settles it.
  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    travel = 0;
    yawVel = 0;
    pitchVel = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    lastMove = performance.now();
    canvas.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dYaw = dx * 0.012;
    const dPitch = dy * 0.006;
    travel += Math.abs(dx) + Math.abs(dy);
    dragYaw += dYaw;
    dragPitch = clamp(dragPitch + dPitch, -0.7, 0.7);
    const step = Math.max(8, now - lastMove) / 1000;
    yawVel = lerp(yawVel, dYaw / step, 0.5);
    pitchVel = lerp(pitchVel, dPitch / step, 0.5);
    lastX = e.clientX;
    lastY = e.clientY;
    lastMove = now;
  }

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    // Holding still before letting go means "put it down here", not a flick.
    if (performance.now() - lastMove > 90) {
      yawVel = 0;
      pitchVel = 0;
    }
    yawVel = clamp(yawVel, -14, 14);
    pitchVel = clamp(pitchVel, -4, 4);
    if (e?.type === "pointerup" && travel < 6) hop();
  }

  // The device leans toward the mouse, measured from the centre of its stage.
  function onWindowPointer(e) {
    if (e.pointerType !== "mouse") return;
    const r = container.getBoundingClientRect();
    const hw = Math.max(1, r.width / 2);
    const hh = Math.max(1, r.height / 2);
    tiltTX = clamp((e.clientX - (r.left + hw)) / (hw * 1.6), -1, 1);
    tiltTY = clamp((e.clientY - (r.top + hh)) / (hh * 1.6), -1, 1);
  }

  function onWindowLeave() {
    tiltTX = 0;
    tiltTY = 0;
  }

  // Arrow keys turn the device when the canvas has focus.
  function onKeyDown(e) {
    const turn = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!turn) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        hop();
      }
      return;
    }
    e.preventDefault();
    dragYaw += turn[0] * 0.3;
    dragPitch = clamp(dragPitch + turn[1] * 0.15, -0.7, 0.7);
    if (!raf) frame(0);
  }

  function hop() {
    if (reduced) return;
    if (time - hopStart > 0.9) hopStart = time;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  canvas.addEventListener("keydown", onKeyDown);
  window.addEventListener("pointermove", onWindowPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", onWindowLeave);

  /* frame */
  function frame(dt) {
    time += dt;
    const m = reduced ? 0 : 1;

    // 0 → 1 over a swap: first half spins the old device out, second half spins the new one in.
    const s = reduced ? 1 : clamp((time - swapStart) / 1.1);
    const out = ease(s / 0.5);
    const inn = ease((s - 0.5) / 0.5);
    if (previous && s >= 1) previous = null;

    bgMix = lerp(bgMix, current === "dev" ? 1 : 0, 1 - Math.exp(-dt * 3));

    if (!dragging) {
      // Momentum from a flick, then the yaw stays put; pitch eases back
      // upright so the screen never ends up facing the floor.
      dragYaw += yawVel * dt;
      dragPitch = clamp(dragPitch + pitchVel * dt, -0.7, 0.7);
      const f = Math.exp(-dt * 3.2);
      yawVel *= f;
      pitchVel *= f;
      dragPitch *= Math.exp(-dt * 0.9);
    }
    const tk = 1 - Math.exp(-dt * 4);
    tiltX += (tiltTX - tiltX) * tk;
    tiltY += (tiltTY - tiltY) * tk;

    const hp = clamp((time - hopStart) / 0.9);
    const hopping = hp > 0 && hp < 1;
    const hopY = hopping ? Math.sin(hp * Math.PI) * 0.2 : 0;
    const hopSpin = hopping ? ease(hp) * TAU : 0;

    const idleYaw = -0.4 + Math.sin(time * 0.45) * 0.3 * m;
    const idlePitch = 0.05 + Math.sin(time * 0.7) * 0.03 * m;
    const float = Math.sin(time * 1.2) * 0.035 * m;

    ["companion", "dev"].forEach((ed, i) => {
      const d = devices[ed];
      if (!d) return;
      let scale = 0;
      let spin = 0;
      if (ed === current) {
        scale = reduced ? 1 : inn;
        spin = reduced ? 0 : -(1 - inn) * 2.2;
      } else if (ed === previous && !reduced) {
        scale = 1 - out;
        spin = out * 2.2;
      }
      d.visible = scale > 0.002;
      if (!d.visible) return;

      d.scale.setScalar(Math.max(0.0001, scale));
      d.position.y = float + hopY;
      d.rotation.set(
        idlePitch + dragPitch + tiltY * 0.22,
        idleYaw + spin + dragYaw + tiltX * 0.55 + hopSpin,
        0,
        "YXZ",
      );

      const ud = d.userData;
      ud.lanyard.rotation.z = (Math.sin(time * 1.3 + i) * 0.05 + Math.sin(time * 0.7) * 0.02) * m;
      ud.lanyard.rotation.x = Math.sin(time * 1.1 + i) * 0.04 * m;
      ud.shadow.material.opacity = lerp(0.28, 0.5, bgMix) * scale * (1 - hopY * 1.6);
      ud.shadow.position.y = -ud.H / 2 - 0.36 - float - hopY;

      const u = reduced ? 1.5 : Math.max(0, time - screenStart[ed]) % LOOP[ed];
      const pr = [0, 0, 0];
      PRESSES[ed].forEach(([pt, bi]) => {
        const q = (u - pt) / 0.28;
        if (q > 0 && q < 1) pr[bi] = Math.sin(q * Math.PI);
      });
      ud.buttons.forEach((b, bi) => {
        b.position.z = -0.022 * pr[bi];
      });

      painters[ed](ud.screen.ctx, u, reduced ? 0 : time);
      ud.screen.tex.needsUpdate = true;
    });

    rim.color.setRGB(lerp(1, 0.35, bgMix), lerp(1, 0.85, bgMix), 1);
    rim.intensity = lerp(1.2, 2.6, bgMix);
    key.intensity = lerp(1.6, 1.2, bgMix);
    scene.environmentIntensity = lerp(0.95, 0.55, bgMix);

    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(dt);
    schedule();
  }

  function schedule() {
    if (!raf && ready && visible && !document.hidden && !disposed) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  function onVisibility() {
    schedule();
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    },
    { rootMargin: "80px" },
  );
  io.observe(container);
  document.addEventListener("visibilitychange", onVisibility);

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* boot: wait for the fonts and the yeti sprite used by the canvas textures */
  const yetiReady = (yeti.decode ? yeti.decode() : Promise.resolve()).catch(() => {});
  const fontsReady = Promise.race([
    Promise.all([
      ...[
        '400 20px Michroma',
        '600 20px Sora',
        '400 20px Sora',
        '500 20px "JetBrains Mono"',
        '400 20px "JetBrains Mono"',
      ].map((f) => document.fonts.load(f)),
      yetiReady,
    ]).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  fontsReady.then(() => {
    if (disposed) return;
    try {
      devices.companion = buildDevice("companion", shadowTex);
      devices.dev = buildDevice("dev", shadowTex);
      scene.add(devices.companion, devices.dev);
      ready = true;
      // Start halfway through a swap so the first device spins straight in.
      time = 0;
      swapStart = -0.55;
      frame(0);
      schedule();
      onReady?.();
    } catch (error) {
      console.error("Fuchey 3D failed to start:", error);
      onError?.();
    }
  });

  return {
    setEdition(next) {
      if (next === current) return;
      previous = current;
      current = next;
      swapStart = time;
      screenStart[next] = time + 0.55;
      if (!raf) frame(0);
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("lostpointercapture", endDrag);
      canvas.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", onWindowPointer);
      document.documentElement.removeEventListener("pointerleave", onWindowLeave);
      Object.values(devices).forEach(disposeObject);
      shadowTex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
