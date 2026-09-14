// ============================================================================
// Bee Innovations — 3D Experience
// Recognizable, simplified models of four maker tools, built entirely from
// Three.js primitives (no external model files) — plus shared visual effects
// and the light maker-studio backdrop.
// ============================================================================

import * as THREE from "three";
import { BRAND, WORD_COLOR } from "./brand.js";

// ----------------------------------------------------------------------------
// Shared materials — brand colors (see brand.js) drive every accent; only
// genuinely neutral hardware (bare metal, resistor bodies, natural wood)
// stays a realistic material tone rather than a brand hue.
// ----------------------------------------------------------------------------

const metalMat = new THREE.MeshStandardMaterial({ color: 0xb7bcc4, metalness: 0.85, roughness: 0.28 });
const darkPlasticMat = new THREE.MeshStandardMaterial({ color: BRAND.text, metalness: 0.2, roughness: 0.55 });
const chipMat = new THREE.MeshStandardMaterial({ color: BRAND.text, metalness: 0.25, roughness: 0.45 });
const pinMat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, metalness: 0.9, roughness: 0.25 });
// Arduino PCB: dark brand-navy substrate (a black-PCB look) instead of the
// generic green board, so the board itself reads as Bee Innovations, not a
// stock Arduino render.
const pcbArduinoMat = new THREE.MeshStandardMaterial({ color: 0x1d1c38, metalness: 0.15, roughness: 0.55 });
// micro:bit PCB: light neutral slate so the lime LED matrix pops.
const pcbMicrobitMat = new THREE.MeshStandardMaterial({ color: BRAND.textMuted, metalness: 0.12, roughness: 0.55 });
const frameMat = new THREE.MeshStandardMaterial({ color: BRAND.text, metalness: 0.5, roughness: 0.4 });
const railMat = new THREE.MeshStandardMaterial({ color: 0xa3a7ad, metalness: 0.9, roughness: 0.3 });
const resistorMat = new THREE.MeshStandardMaterial({ color: 0xe4c98a, roughness: 0.6 });
const capacitorMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, metalness: 0.3, roughness: 0.5 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.75, metalness: 0.05 });

// Per-machine accent materials — each machine's own trim/status-light color
// matches the brand color of the word it writes, so the object visibly
// carries over into the finished text (continuity from creation to result).
const arduinoAccentMat = new THREE.MeshStandardMaterial({
  color: WORD_COLOR.arduino,
  metalness: 0.3,
  roughness: 0.35,
  emissive: WORD_COLOR.arduino,
  emissiveIntensity: 0.5,
});
const microbitAccentMat = new THREE.MeshStandardMaterial({
  color: WORD_COLOR.microbit,
  metalness: 0.1,
  roughness: 0.4,
  emissive: WORD_COLOR.microbit,
  emissiveIntensity: 0.35,
});
const printerAccentMat = new THREE.MeshStandardMaterial({
  color: WORD_COLOR.printer,
  metalness: 0.35,
  roughness: 0.4,
  emissive: WORD_COLOR.printer,
  emissiveIntensity: 0.45,
});
const woodAccentMat = new THREE.MeshStandardMaterial({
  color: WORD_COLOR.woodworking,
  metalness: 0.4,
  roughness: 0.4,
  emissive: WORD_COLOR.woodworking,
  emissiveIntensity: 0.3,
});

function enableShadows(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// ----------------------------------------------------------------------------
// 1. Arduino UNO
// ----------------------------------------------------------------------------

export function createArduino() {
  const group = new THREE.Group();

  const pcb = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 1.7), pcbArduinoMat);
  group.add(pcb);

  const usb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.4), metalMat);
  usb.position.set(-1.24, 0.13, -0.5);
  group.add(usb);

  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 16), darkPlasticMat);
  jack.rotation.z = Math.PI / 2;
  jack.position.set(-1.24, 0.09, 0.35);
  group.add(jack);
  const jackRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 16), metalMat);
  jackRing.rotation.y = Math.PI / 2;
  jackRing.position.set(-1.4, 0.09, 0.35);
  group.add(jackRing);

  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.5), chipMat);
  chip.position.set(0.15, 0.065, 0.15);
  group.add(chip);
  // Chip pin rows (tiny ridges) as one instanced strip on each long side
  const chipPinGeo = new THREE.BoxGeometry(0.02, 0.02, 0.05);
  const chipPins = new THREE.InstancedMesh(chipPinGeo, pinMat, 24);
  const dummy = new THREE.Object3D();
  let cpi = 0;
  for (let i = 0; i < 12; i++) {
    dummy.position.set(0.15 - 0.3 + i * 0.055, 0.07, 0.41);
    dummy.updateMatrix();
    chipPins.setMatrixAt(cpi++, dummy.matrix);
  }
  for (let i = 0; i < 12; i++) {
    dummy.position.set(0.15 - 0.3 + i * 0.055, 0.07, -0.11);
    dummy.updateMatrix();
    chipPins.setMatrixAt(cpi++, dummy.matrix);
  }
  chipPins.instanceMatrix.needsUpdate = true;
  group.add(chipPins);

  // Header pins along both long edges and one short edge
  const pinGeo = new THREE.BoxGeometry(0.035, 0.14, 0.035);
  const pins = new THREE.InstancedMesh(pinGeo, pinMat, 28);
  let idx = 0;
  for (let i = 0; i < 12; i++) {
    dummy.position.set(-1 + i * 0.19, 0.1, 0.78);
    dummy.updateMatrix();
    pins.setMatrixAt(idx++, dummy.matrix);
  }
  for (let i = 0; i < 12; i++) {
    dummy.position.set(-1 + i * 0.19, 0.1, -0.78);
    dummy.updateMatrix();
    pins.setMatrixAt(idx++, dummy.matrix);
  }
  for (let i = 0; i < 4; i++) {
    dummy.position.set(1.05, 0.1, -0.3 + i * 0.2);
    dummy.updateMatrix();
    pins.setMatrixAt(idx++, dummy.matrix);
  }
  pins.instanceMatrix.needsUpdate = true;
  group.add(pins);

  // Small capacitors
  [
    [0.85, -0.4],
    [0.95, 0.55],
    [-0.55, 0.6],
  ].forEach(([x, z]) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.09, 12), capacitorMat);
    cap.position.set(x, 0.075, z);
    group.add(cap);
  });

  // Small resistors
  [
    [0.55, -0.55],
    [0.7, -0.62],
  ].forEach(([x, z]) => {
    const res = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.045), resistorMat);
    res.position.set(x, 0.05, z);
    group.add(res);
  });

  // Subtle circuit traces on the PCB surface, in the brand blue that
  // CREATE's writing traces also use — the board visibly carries the same
  // color that goes on to build the word.
  const traceGeo = new THREE.PlaneGeometry(0.5, 0.015);
  [
    [0.4, -0.5, 0],
    [0.4, -0.35, 0.3],
    [-0.2, 0.5, 0.4],
    [0.1, -0.15, Math.PI / 6],
  ].forEach(([x, z, rot]) => {
    const trace = new THREE.Mesh(traceGeo, arduinoAccentMat);
    trace.rotation.x = -Math.PI / 2;
    trace.rotation.z = rot;
    trace.position.set(x, 0.032, z);
    group.add(trace);
  });

  // Status LEDs — brand blue / lime / pink instead of a generic red-amber-green trio
  [
    [0.55, BRAND.blue],
    [0.72, BRAND.lime],
    [0.89, BRAND.pink],
  ].forEach(([x, hex]) => {
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.3 })
    );
    led.position.set(x, 0.05, -0.6);
    group.add(led);
  });

  enableShadows(group);
  return { group };
}

// ----------------------------------------------------------------------------
// 2. BBC micro:bit
// ----------------------------------------------------------------------------

export function createMicrobit() {
  const group = new THREE.Group();

  const w = 2.0;
  const h = 1.6;
  const r = 0.18;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const pcb = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), pcbMicrobitMat);
  pcb.rotation.x = -Math.PI / 2;
  group.add(pcb);

  // The board's own 5x5 matrix uses the same lime as the WHAT lettering it
  // goes on to build.
  const ledGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10);
  const leds = new THREE.InstancedMesh(ledGeo, microbitAccentMat, 25);
  const dummy = new THREE.Object3D();
  let li = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      dummy.position.set(-0.5 + col * 0.25, 0.06, -0.5 + row * 0.25);
      dummy.updateMatrix();
      leds.setMatrixAt(li++, dummy.matrix);
    }
  }
  leds.instanceMatrix.needsUpdate = true;
  group.add(leds);

  const padGeo = new THREE.BoxGeometry(0.09, 0.02, 0.16);
  const pads = new THREE.InstancedMesh(padGeo, pinMat, 12);
  for (let i = 0; i < 12; i++) {
    dummy.position.set(-0.9 + i * 0.165, 0.03, -0.78);
    dummy.updateMatrix();
    pads.setMatrixAt(i, dummy.matrix);
  }
  pads.instanceMatrix.needsUpdate = true;
  group.add(pads);

  [-0.85, 0.85].forEach((x) => {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), darkPlasticMat);
    btn.position.set(x, 0.05, 0.62);
    group.add(btn);
  });

  enableShadows(group);
  return { group };
}

// ----------------------------------------------------------------------------
// 3. Desktop 3D Printer (simplified FDM)
// ----------------------------------------------------------------------------

export function createPrinter() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.5), frameMat);
  group.add(base);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 1.1), darkPlasticMat);
  bed.position.set(0, 0.55, 0.05);
  group.add(bed);
  const bedRim = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.02, 1.14), printerAccentMat);
  bedRim.position.set(0, 0.58, 0.05);
  group.add(bedRim);

  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.9, 0.09), railMat);
    rail.position.set(side * 1.0, 1.0, -0.6);
    group.add(rail);
  });

  const gantry = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.1), frameMat);
  gantry.position.set(0, 1.55, -0.6);
  group.add(gantry);

  const printHead = new THREE.Group();
  printHead.position.set(0, 1.15, -0.1);
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.26), frameMat);
  printHead.add(carriage);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), metalMat);
  nozzle.position.set(0, -0.2, 0);
  nozzle.rotation.x = Math.PI;
  printHead.add(nozzle);
  const nozzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), printerAccentMat);
  nozzleGlow.position.set(0, -0.28, 0);
  printHead.add(nozzleGlow);
  group.add(printHead);

  const spool = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 10, 20), printerAccentMat);
  spool.position.set(0, 1.7, -0.65);
  spool.rotation.y = Math.PI / 2;
  group.add(spool);

  const strandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.6, -0.65),
    new THREE.Vector3(0.05, 1.35, -0.35),
    new THREE.Vector3(0, 1.15, -0.15),
  ]);
  const strand = new THREE.Mesh(new THREE.TubeGeometry(strandCurve, 12, 0.015, 6, false), printerAccentMat);
  group.add(strand);

  enableShadows(group);
  return { group, printHead, nozzleAnchor: nozzleGlow };
}

// ----------------------------------------------------------------------------
// 4. Woodworking tool — chisel + mallet (replaces the 3D pen)
// ----------------------------------------------------------------------------

export function createWoodworkingTool() {
  const group = new THREE.Group();

  // Chisel: wooden handle + brass ferrule + steel blade
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.55, 12), woodMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.55, 0, 0);
  group.add(handle);

  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), woodAccentMat);
  ferrule.rotation.z = Math.PI / 2;
  ferrule.position.set(-0.27, 0, 0);
  group.add(ferrule);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.09, 0.03), metalMat);
  blade.position.set(0.15, 0, 0);
  group.add(blade);

  const edge = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 4), metalMat);
  edge.rotation.z = -Math.PI / 2;
  edge.rotation.y = Math.PI / 4;
  edge.position.set(0.53, 0, 0);
  group.add(edge);

  // Small mallet resting nearby
  const mallet = new THREE.Group();
  const malletHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 12), woodMat);
  malletHead.rotation.z = Math.PI / 2;
  mallet.add(malletHead);
  const malletHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 10), woodMat);
  malletHandle.position.set(0, -0.4, 0);
  mallet.add(malletHandle);
  mallet.position.set(-0.65, -0.22, 0.32);
  mallet.rotation.z = 0.5;
  group.add(mallet);

  enableShadows(group);
  return { group, tipAnchor: edge };
}

// ----------------------------------------------------------------------------
// Shared effects: glow texture, fading "dab" pool, ambient particles
// ----------------------------------------------------------------------------

let sharedGlowTexture = null;
export function createGlowTexture() {
  if (sharedGlowTexture) return sharedGlowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,214,168,0.9)");
  grad.addColorStop(0.4, "rgba(251,146,60,0.45)");
  grad.addColorStop(1, "rgba(251,146,60,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  sharedGlowTexture = new THREE.CanvasTexture(canvas);
  return sharedGlowTexture;
}

export class GlowDabPool {
  constructor(count = 24, size = 0.09) {
    this.group = new THREE.Group();
    this.pool = [];
    const geometry = new THREE.PlaneGeometry(size, size);
    const texture = createGlowTexture();
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({ mesh, life: 0, maxLife: 0.5 });
    }
    this._cursor = 0;
  }

  spawn(position, { life = 0.5, scale = 1 } = {}) {
    const slot = this.pool[this._cursor];
    this._cursor = (this._cursor + 1) % this.pool.length;
    slot.mesh.position.copy(position);
    slot.mesh.scale.setScalar(scale);
    slot.mesh.visible = true;
    slot.life = life;
    slot.maxLife = life;
  }

  update(dt, camera) {
    for (const slot of this.pool) {
      if (slot.life <= 0) continue;
      slot.life -= dt;
      const t = Math.max(0, slot.life / slot.maxLife);
      slot.mesh.material.opacity = t * 0.85;
      if (camera) slot.mesh.quaternion.copy(camera.quaternion);
      if (slot.life <= 0) slot.mesh.visible = false;
    }
  }
}

export function createParticles(count = 140) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = Math.random() * 6 - 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: BRAND.blue,
    size: 0.025,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

// ----------------------------------------------------------------------------
// Light maker-studio backdrop: the site's own white/near-white tones, a faint
// technical grid, blueprint lines, and tiny circuit-trace doodles. Rendered
// as the scene's flat background texture.
// ----------------------------------------------------------------------------

export function createBackdropTexture() {
  const w = 2048;
  const h = 1152;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Base tone: the site's own white → off-white → border-tinted gradient
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#ffffff");
  base.addColorStop(0.55, "#fbfbfd");
  base.addColorStop(1, "#eef0f5");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Faint technical grid
  ctx.strokeStyle = "rgba(75,79,92,0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Faint blueprint-style construction lines, in brand blue
  ctx.strokeStyle = "rgba(59,130,246,0.07)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const y = 120 + i * 210 + Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (Math.random() - 0.5) * 60);
    ctx.stroke();
  }

  // Sparse faint circuit-trace doodles in the corners
  function drawCircuitDoodle(cx, cy, scale) {
    ctx.strokeStyle = "rgba(59,130,246,0.09)";
    ctx.lineWidth = 2;
    let x = cx;
    let y = cy;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      if (Math.random() > 0.5) x += (Math.random() > 0.5 ? 1 : -1) * 30 * scale;
      else y += (Math.random() > 0.5 ? 1 : -1) * 30 * scale;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(59,130,246,0.12)";
    ctx.beginPath();
    ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  drawCircuitDoodle(150, 150, 1.4);
  drawCircuitDoodle(w - 180, 200, 1.2);
  drawCircuitDoodle(220, h - 160, 1.1);
  drawCircuitDoodle(w - 220, h - 180, 1.3);

  // Very subtle paper grain
  const imgData = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 6;
    imgData.data[i] += n;
    imgData.data[i + 1] += n;
    imgData.data[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
