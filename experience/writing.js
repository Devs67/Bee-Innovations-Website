// ============================================================================
// Bee Innovations — 3D Experience
// Text-construction systems for "CREATE WHAT YOU IMAGINE". Each word keeps
// the visual identity of the tool that built it:
//   - buildStrokeText(word, "circuit") → CREATE: copper trace lines + nodes
//   - buildStrokeText(word, "carved")  → IMAGINE: grooves sunk into a wood plank
//   - buildPrintedText(word)           → YOU: solid extruded bars, grown
//     bottom-up like FDM layers
//   - buildLEDText(word)               → WHAT: a lit dot-matrix grid
// All four share the same small single-stroke "plotter" font (GLYPHS) except
// the LED grid, which uses a real 5x7 bitmap font (a stroke font doesn't
// read as pixels).
// ============================================================================

import * as THREE from "three";
import { WORD_COLOR } from "./brand.js";

// ----------------------------------------------------------------------------
// Single-stroke font — every letter CREATE/WHAT/YOU/IMAGINE needs except the
// LED word. Grid: x 0..~5-6, y 0 (baseline) .. 9 (cap height).
// ----------------------------------------------------------------------------

const GLYPHS = {
  C: { width: 5.0, strokes: [[[5, 7.6], [3.2, 9], [1, 8.3], [0, 6.3], [0, 2.7], [1, 0.7], [3.2, 0], [5, 1.4]]] },
  R: { width: 4.6, strokes: [[[0, 0], [0, 9]], [[0, 9], [3.6, 9], [4.2, 7.7], [3.6, 5.2], [0, 5.2]], [[0, 5.2], [4.2, 0]]] },
  E: { width: 4.4, strokes: [[[4.2, 9], [0, 9], [0, 0], [4.2, 0]], [[0, 4.7], [3, 4.7]]] },
  A: { width: 5.2, strokes: [[[0, 0], [2.6, 9], [5.2, 0]], [[1.1, 3.1], [4.1, 3.1]]] },
  T: { width: 5.0, strokes: [[[0, 9], [5, 9]], [[2.5, 9], [2.5, 0]]] },
  Y: { width: 5.0, strokes: [[[0, 9], [2.5, 4.7]], [[5, 9], [2.5, 4.7]], [[2.5, 4.7], [2.5, 0]]] },
  O: { width: 5.4, strokes: [[[2.7, 9], [4.6, 7.8], [5.4, 4.5], [4.6, 1.2], [2.7, 0], [0.8, 1.2], [0, 4.5], [0.8, 7.8], [2.7, 9]]] },
  U: { width: 5.2, strokes: [[[0, 9], [0, 2.6], [1, 0.4], [2.6, 0], [4.2, 0.4], [5.2, 2.6], [5.2, 9]]] },
  I: { width: 2.6, strokes: [[[1.3, 0], [1.3, 9]]] },
  M: { width: 5.6, strokes: [[[0, 0], [0, 9], [2.8, 3.2], [5.6, 9], [5.6, 0]]] },
  G: { width: 5.2, strokes: [[[5, 7.6], [3.2, 9], [1, 8.3], [0, 6.3], [0, 2.7], [1, 0.7], [3.2, 0], [5, 1.4], [5, 4.2], [3, 4.2]]] },
  N: { width: 5.2, strokes: [[[0, 0], [0, 9]], [[0, 9], [5.2, 0]], [[5.2, 0], [5.2, 9]]] },
};

const LETTER_GAP = 0.9;

function seededJitter(seed, amplitude) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * amplitude;
}

/** Build every stroke of `word` (glyph-space units, centered on x=0, jittered for a hand-built feel). */
function buildWordStrokes(word, jitter = 0.05) {
  const letters = [...word].map((ch) => GLYPHS[ch]).filter(Boolean);
  const totalWidth = letters.reduce((s, g) => s + g.width, 0) + LETTER_GAP * Math.max(0, letters.length - 1);
  const strokes = [];
  let cursorX = -totalWidth / 2;
  let seed = 0;
  letters.forEach((glyph) => {
    glyph.strokes.forEach((stroke) => {
      const points = stroke.map(([x, y]) => {
        seed += 1;
        return { x: cursorX + x + seededJitter(seed, jitter), y: y + seededJitter(seed + 0.5, jitter) };
      });
      strokes.push(points);
    });
    cursorX += glyph.width + LETTER_GAP;
  });
  return { strokes, totalWidth };
}

function strokeLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return len;
}

/** Prepare a word's strokes at a given world scale, with cumulative-length budgets for progressive reveal. */
function prepareWord(word, { scale = 0.09, jitter = 0.5 } = {}) {
  const { strokes, totalWidth } = buildWordStrokes(word, jitter);
  const scaled = strokes.map((pts) => pts.map((p) => ({ x: p.x * scale, y: p.y * scale })));
  const withLen = scaled.map((points) => {
    const cumLens = [0];
    for (let i = 1; i < points.length; i++) cumLens.push(cumLens[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    return { points, cumLens, total: cumLens[cumLens.length - 1] };
  });
  const avg = withLen.reduce((s, st) => s + st.total, 0) / Math.max(1, withLen.length);
  const lift = avg * 0.25;
  const totalBudget = withLen.reduce((s, st) => s + st.total, 0) + lift * Math.max(0, withLen.length - 1);
  return { strokes: withLen, totalBudget, lift, width: totalWidth * scale };
}

function partialPoints(stroke, remaining) {
  const { points, cumLens } = stroke;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (cumLens[i] <= remaining) {
      out.push(points[i]);
    } else {
      const segLen = cumLens[i] - cumLens[i - 1];
      const t = segLen > 0 ? (remaining - cumLens[i - 1]) / segLen : 0;
      const prev = points[i - 1];
      out.push({ x: prev.x + (points[i].x - prev.x) * t, y: prev.y + (points[i].y - prev.y) * t });
      break;
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Shared: build a smooth 3D tube along a 2D point list (used by circuit + carved).
// ----------------------------------------------------------------------------

function tubeFromPoints(points, z, radius) {
  if (points.length < 2) return null;
  const curvePoints = points.map((p) => new THREE.Vector3(p.x, p.y, z));
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const segments = Math.max(2, points.length * 3);
  return new THREE.TubeGeometry(curve, segments, radius, 6, false);
}

// ============================================================================
// 1 & 4. Stroke-based text — "circuit" (CREATE) and "carved" (IMAGINE)
// ============================================================================

/**
 * Builds a word out of the single-stroke font as real 3D geometry.
 * style: "circuit" → thin glowing copper trace lines + solder-node dots.
 *        "carved"  → grooves sunk into a wood plank (plank included), with a
 *                    thin highlight edge and a wood-chip particle spawner.
 * Returns { group, totalBudget, update(progress) → tipWorldLocal|null }.
 */
export function buildStrokeText(word, style = "circuit", { scale = 0.09 } = {}) {
  const prepared = prepareWord(word, { scale });
  const group = new THREE.Group();

  const isCarved = style === "carved";
  // CREATE = brand blue circuit traces; IMAGINE = a dark carved groove with a
  // brand-pink highlight edge, so each word keeps the color of the machine
  // that made it.
  const traceMat = isCarved
    ? new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.9, metalness: 0.05 })
    : new THREE.MeshStandardMaterial({
        color: WORD_COLOR.arduino,
        metalness: 0.55,
        roughness: 0.3,
        emissive: WORD_COLOR.arduino,
        emissiveIntensity: 0.55,
      });
  const highlightMat = new THREE.MeshStandardMaterial({
    color: WORD_COLOR.woodworking,
    roughness: 0.5,
    metalness: 0.1,
    emissive: WORD_COLOR.woodworking,
    emissiveIntensity: 0.25,
  });

  let plank = null;
  if (isCarved) {
    const plankWidth = prepared.width + 1.4;
    const grain = createWoodGrainTexture();
    plank = new THREE.Mesh(
      new THREE.BoxGeometry(plankWidth, 1.15, 0.18),
      new THREE.MeshStandardMaterial({ map: grain, color: 0xc8935a, roughness: 0.85, metalness: 0.02 })
    );
    plank.position.z = -0.12;
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);
  }

  const meshes = [];
  const nodeMeshes = [];
  if (!isCarved) {
    const nodeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: WORD_COLOR.arduino,
      emissive: WORD_COLOR.arduino,
      emissiveIntensity: 1.4,
    });
    prepared.strokes.forEach(() => {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.visible = false;
      group.add(node);
      nodeMeshes.push(node);
    });
  }

  const chipPool = isCarved ? new WoodChipPool(16) : null;
  if (chipPool) group.add(chipPool.group);

  function update(progress, dt) {
    meshes.forEach((m) => group.remove(m));
    meshes.length = 0;

    const target = THREE.MathUtils.clamp(progress, 0, 1) * prepared.totalBudget;
    let consumed = 0;
    let tip = null;

    prepared.strokes.forEach((stroke, i) => {
      const remaining = target - consumed;
      let pts = null;
      if (remaining <= 0) {
        if (nodeMeshes[i]) nodeMeshes[i].visible = false;
      } else if (remaining >= stroke.total) {
        pts = stroke.points;
        if (nodeMeshes[i]) nodeMeshes[i].visible = true;
      } else {
        pts = partialPoints(stroke, remaining);
        if (nodeMeshes[i]) nodeMeshes[i].visible = true;
        tip = pts[pts.length - 1];
      }
      consumed += stroke.total + prepared.lift;

      if (pts && pts.length >= 2) {
        const z = isCarved ? -0.02 : 0.03;
        const radius = isCarved ? 0.02 : 0.028;
        const geo = tubeFromPoints(pts, z, radius);
        if (geo) {
          // No shadow casting: the text reads as signage/light, not a solid
        // object, and a shadow silhouette this far above the ground would
        // just smear a distracting ghost copy onto it.
        const mesh = new THREE.Mesh(geo, traceMat);
          group.add(mesh);
          meshes.push(mesh);
        }
        if (isCarved) {
          const hlGeo = tubeFromPoints(pts, z + 0.018, radius * 0.55);
          if (hlGeo) {
            const hl = new THREE.Mesh(hlGeo, highlightMat);
            group.add(hl);
            meshes.push(hl);
          }
        }
      }
      if (nodeMeshes[i] && stroke.points.length) {
        const p0 = stroke.points[0];
        nodeMeshes[i].position.set(p0.x, p0.y, 0.04);
      }
    });

    if (chipPool && tip && progress < 1 && dt) {
      if (Math.random() < 0.6) chipPool.spawn(new THREE.Vector3(tip.x, tip.y, 0.05));
      chipPool.update(dt);
    } else if (chipPool && dt) {
      chipPool.update(dt);
    }

    return tip ? { x: tip.x, y: tip.y, active: progress < 1 } : { x: 0, y: 0, active: false };
  }

  return { group, plank, width: prepared.width, update };
}

// ----------------------------------------------------------------------------
// Small wood-chip pool: tiny tumbling cubes spawned along the carving path.
// ----------------------------------------------------------------------------

class WoodChipPool {
  constructor(count = 16) {
    this.group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.03, 0.02, 0.02);
    const mat = new THREE.MeshStandardMaterial({ color: 0xdba86b, roughness: 0.9 });
    this.pool = [];
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({ mesh, life: 0, vel: new THREE.Vector3() });
    }
    this._cursor = 0;
  }

  spawn(position) {
    const slot = this.pool[this._cursor];
    this._cursor = (this._cursor + 1) % this.pool.length;
    slot.mesh.position.copy(position);
    slot.mesh.visible = true;
    slot.life = 0.6;
    slot.vel.set((Math.random() - 0.5) * 0.4, Math.random() * 0.3 + 0.1, (Math.random() - 0.5) * 0.2);
  }

  update(dt) {
    this.pool.forEach((slot) => {
      if (slot.life <= 0) return;
      slot.life -= dt;
      slot.vel.y -= dt * 0.6;
      slot.mesh.position.addScaledVector(slot.vel, dt);
      slot.mesh.rotation.x += dt * 6;
      if (slot.life <= 0) slot.mesh.visible = false;
    });
  }
}

let woodGrainTexture = null;
function createWoodGrainTexture() {
  if (woodGrainTexture) return woodGrainTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c8935a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * canvas.height;
    ctx.strokeStyle = `rgba(120,75,35,${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 6);
    }
    ctx.stroke();
  }
  woodGrainTexture = new THREE.CanvasTexture(canvas);
  woodGrainTexture.wrapS = THREE.RepeatWrapping;
  return woodGrainTexture;
}

// ============================================================================
// 2. Printed text (YOU) — solid bars grown bottom-up like FDM layers
// ============================================================================

let layerLineTexture = null;
function createLayerLineTexture() {
  if (layerLineTexture) return layerLineTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 32, 32);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  for (let y = 2; y < 32; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(32, y);
    ctx.stroke();
  }
  layerLineTexture = new THREE.CanvasTexture(canvas);
  layerLineTexture.wrapS = THREE.RepeatWrapping;
  layerLineTexture.wrapT = THREE.RepeatWrapping;
  layerLineTexture.repeat.set(1, 3);
  return layerLineTexture;
}

/**
 * Builds YOU from solid extruded bars along the stroke font, each one
 * growing upward from its base — an FDM print reads as layers stacking, not
 * a pen tracing a path. Returns { group, update(progress) → nozzle tip }.
 */
export function buildPrintedText(word, { scale = 0.1, barSize = 0.16 } = {}) {
  const prepared = prepareWord(word, { scale, jitter: 0.02 });
  const group = new THREE.Group();

  // Flatten every stroke into individual point-pair segments — each becomes
  // one bar, so letters build in small discrete "prints" rather than one
  // continuous sweep.
  const segments = [];
  prepared.strokes.forEach((stroke) => {
    for (let i = 1; i < stroke.points.length; i++) {
      const a = stroke.points[i - 1];
      const b = stroke.points[i];
      segments.push({ a, b, len: Math.hypot(b.x - a.x, b.y - a.y) });
    }
  });
  const totalLen = segments.reduce((s, seg) => s + seg.len, 0) || 1;
  let acc = 0;
  segments.forEach((seg) => {
    seg.start = acc / totalLen;
    acc += seg.len;
    seg.end = acc / totalLen;
  });

  const material = new THREE.MeshStandardMaterial({
    color: WORD_COLOR.printer,
    roughness: 0.55,
    metalness: 0.05,
    map: createLayerLineTexture(),
  });

  const bars = segments.map((seg) => {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const len = Math.max(0.05, Math.hypot(dx, dy));
    const geo = new THREE.BoxGeometry(barSize, len, barSize);
    geo.translate(0, len / 2, 0); // pivot at the bottom so it can grow upward
    const mesh = new THREE.Mesh(geo, material);
    // No cast shadow: at this height above the ground it would only draw a
    // distracting ghost copy of the word far below; receiving keeps the
    // subtle self-shading from the printer's own shadow passing over it.
    mesh.receiveShadow = true;
    mesh.position.set(seg.a.x, seg.a.y, 0);
    mesh.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    mesh.scale.y = 0;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  });

  function update(progress) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    let tip = null;
    bars.forEach((bar, i) => {
      const seg = segments[i];
      if (p <= seg.start) {
        bar.visible = false;
        return;
      }
      bar.visible = true;
      const growP = THREE.MathUtils.clamp((p - seg.start) / Math.max(0.001, seg.end - seg.start), 0, 1);
      bar.scale.y = growP;
      if (p < 1 && growP < 1) {
        tip = { x: seg.a.x + (seg.b.x - seg.a.x) * growP, y: seg.a.y + (seg.b.y - seg.a.y) * growP };
      }
    });
    return tip ? { ...tip, active: true } : { x: 0, y: 0, active: false };
  }

  return { group, width: prepared.width, update };
}

// ============================================================================
// 3. LED matrix text (WHAT) — a real 5x7 dot-matrix bitmap font
// ============================================================================

const LED_FONT = {
  W: ["10001", "10001", "10001", "10001", "10101", "10101", "11011"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
};

/**
 * Builds a word from a 5x7 LED bitmap font as one InstancedMesh (one draw
 * call). Pixels light up progressively, left to right. Returns
 * { group, update(progress) → last-lit pixel position }.
 */
export function buildLEDText(word, { pixelSize = 0.075, gap = 0.03, scale = 1 } = {}) {
  const letters = [...word].map((ch) => LED_FONT[ch]).filter(Boolean);
  const cols = 5;
  const rows = 7;
  const cellW = (pixelSize + gap) * scale;
  const cellH = (pixelSize + gap) * scale;
  const letterGap = cellW * 1.6;
  const letterWidth = cols * cellW;
  const totalWidth = letters.length * letterWidth + (letters.length - 1) * letterGap;

  const pixels = [];
  let cursorX = -totalWidth / 2;
  letters.forEach((bitmap) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (bitmap[r][c] === "1") {
          pixels.push({
            x: cursorX + c * cellW,
            y: (rows - 1 - r) * cellH,
          });
        }
      }
    }
    cursorX += letterWidth + letterGap;
  });

  const geometry = new THREE.BoxGeometry(pixelSize * scale, pixelSize * scale, pixelSize * 0.6 * scale);
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, pixels.length));
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count * 3), 3);

  const OFF = new THREE.Color(0xc7cad1);
  const ON = new THREE.Color(WORD_COLOR.microbit);
  const dummy = new THREE.Object3D();
  pixels.forEach((p, i) => {
    dummy.position.set(p.x, p.y, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, OFF);
  });
  mesh.instanceMatrix.needsUpdate = true;
  // Deliberately no shadow casting: dozens of tiny instances would only
  // smear a faint, distracting silhouette onto the ground far below.
  mesh.receiveShadow = false;

  // A soft glow halo behind each lit pixel, added/removed as it lights up —
  // gives the matrix a genuine "backlit LED" glow instead of flat color.
  const glowGeo = new THREE.PlaneGeometry(pixelSize * scale * 2.4, pixelSize * scale * 2.4);
  const glowTex = createPixelGlowTexture();
  const glows = pixels.map((p) => {
    const spr = new THREE.Mesh(
      glowGeo,
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    );
    spr.position.set(p.x, p.y, 0.04);
    spr.visible = false;
    return spr;
  });

  const group = new THREE.Group();
  group.add(mesh);
  glows.forEach((g) => group.add(g));

  // Sort lighting order left-to-right (by x) so the sweep reads naturally.
  const order = pixels.map((p, i) => i).sort((a, b) => pixels[a].x - pixels[b].x);

  function update(progress) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const litCount = Math.round(p * order.length);
    let tip = null;
    order.forEach((idx, i) => {
      const lit = i < litCount;
      mesh.setColorAt(idx, lit ? ON : OFF);
      glows[idx].visible = lit;
      glows[idx].material.opacity = lit ? 0.8 : 0;
      if (i === litCount - 1) tip = pixels[idx];
    });
    mesh.instanceColor.needsUpdate = true;
    return tip ? { ...tip, active: p < 1 } : { x: 0, y: 0, active: false };
  }

  return { group, width: totalWidth, update };
}

let pixelGlowTexture = null;
function createPixelGlowTexture() {
  if (pixelGlowTexture) return pixelGlowTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(200,235,110,0.95)");
  grad.addColorStop(1, "rgba(163,230,53,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  pixelGlowTexture = new THREE.CanvasTexture(canvas);
  return pixelGlowTexture;
}
