// ============================================================================
// Bee Innovations — 3D Experience: "CREATE WHAT YOU IMAGINE"
// A light, premium maker-studio scene where four tools each build one word
// of the phrase in their own visual language, then return to frame the
// finished phrase before the camera rises into the Bee Innovations brand
// moment and the real site takes over. Native ES modules, no bundler.
// ============================================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildStrokeText, buildPrintedText, buildLEDText, createCircuitLetterPaths, animateCircuitText } from "./writing.js";
import {
  createMicrobit,
  createPrinter,
  createWoodworkingTool,
  createParticles,
  createGlowTexture,
  GlowDabPool,
  createBackdropTexture,
} from "./tools.js";
import { loadArduino, activateArduino, animateArduinoEntrance, animateArduinoExit } from "./arduino-hero.js";
import { BRAND, WORD_COLOR } from "./brand.js";

// ----------------------------------------------------------------------------
// Small math helpers
// ----------------------------------------------------------------------------

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const inverseLerp = (a, b, t) => clamp01((t - a) / (b - a));
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (t) => t * t * (3 - 2 * t);

// ----------------------------------------------------------------------------
// Core setup
// ----------------------------------------------------------------------------

const canvas = document.getElementById("experience-canvas");
const loadingEl = document.getElementById("experience-loading");
const pauseBtn = document.getElementById("experience-pause-btn");
const replayBtn = document.getElementById("experience-replay-btn");
const brandEl = document.getElementById("experience-brand");

const scene = new THREE.Scene();
const backdropTexture = createBackdropTexture();
scene.background = backdropTexture;
scene.fog = new THREE.Fog(BRAND.bgAlt, 9, 20);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
let camLookSmoothed = new THREE.Vector3(0, 1.2, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const isMobileInit = window.innerWidth < 700;
renderer.shadowMap.enabled = true;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.5;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.58;
controls.enabled = false;

// ----------------------------------------------------------------------------
// Lighting — bright, soft "studio" setup for the light backdrop
// ----------------------------------------------------------------------------

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe4e7ee, 0.9);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(4, 6, 4);
keyLight.castShadow = true;
const shadowRes = isMobileInit ? 512 : 1024;
keyLight.shadow.mapSize.set(shadowRes, shadowRes);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 18;
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.bias = -0.0015;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xeaf2ff, 0.35);
fillLight.position.set(-5, 3, -3);
scene.add(fillLight);

const accentLight = new THREE.PointLight(BRAND.blue, 1.1, 10, 2);
accentLight.position.set(0, 2, 2.5);
scene.add(accentLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(9, 48),
  new THREE.MeshStandardMaterial({ color: BRAND.border, roughness: 0.9, metalness: 0.02 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.9;
ground.receiveShadow = true;
scene.add(ground);

const particles = createParticles(isMobileInit ? 70 : 140);
scene.add(particles);

const flashSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({ map: createGlowTexture(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
);
flashSprite.position.set(0, 1.2, 4);
flashSprite.scale.setScalar(0.1);
scene.add(flashSprite);
let flashLife = 0;
function triggerFlash() {
  flashLife = 0.5;
}

// ============================================================================
// PHRASE ROWS — persistent, never cleared once written
// ============================================================================

const ROWS = {
  arduino: { y: 3.5, word: "CREATE" },
  microbit: { y: 2.05, word: "WHAT" },
  printer: { y: 0.55, word: "YOU" },
  woodworking: { y: -1.1, word: "IMAGINE" },
};

const phraseGroup = new THREE.Group();
scene.add(phraseGroup);

// ============================================================================
// Tools
// ============================================================================

// The Arduino is the real production GLB (see arduino-hero.js), loaded async.
// `group` exists immediately (empty) so it can be added to the scene and
// manipulated by the shared timeline code below like every other tool; the
// loaded model is parented into it once ready, and `ready` gates the parts
// of the timeline that need the actual asset (see the arduinoReady guard in
// animate() and the phase.key === "arduino" branches below).
const arduinoTool = { group: new THREE.Group(), model: null, ready: false };
const arduinoReady = loadArduino()
  .then((model) => {
    arduinoTool.model = model;
    arduinoTool.group.add(model.root);
    arduinoTool.ready = true;
  })
  .catch((err) => {
    console.error("[experience] failed to load arduino-uno.glb", err);
  });

const microbitTool = createMicrobit();
const printerTool = createPrinter();
const woodTool = createWoodworkingTool();
const TOOLS = { arduino: arduinoTool, microbit: microbitTool, printer: printerTool, woodworking: woodTool };
Object.values(TOOLS).forEach((t) => {
  t.group.visible = false;
  scene.add(t.group);
});

const TOOL_SCALE = { arduino: 1.0, microbit: 1.05, printer: 0.72, woodworking: 1.1 };

function performPos(key) {
  const y = ROWS[key].y;
  const dy = key === "printer" ? 1.45 : key === "woodworking" ? 0.5 : 0.85;
  return [0, y - dy, key === "woodworking" ? 1.2 : 1.6];
}

const FINALE_POS = {
  arduino: [-2.9, 3.5, -0.5],
  microbit: [2.9, 3.5, -0.5],
  printer: [-3.1, -1.1, -0.5],
  woodworking: [3.1, -1.1, -0.5],
};
// x rotation must stay POSITIVE for arduino/microbit: their components/LEDs
// sit at local +Y, and a positive X-rotation tips that +Y face toward the
// camera (+Z); negative tips the bare underside toward the camera instead.
const FINALE_ROT = {
  arduino: [0.5, 0.5, 0],
  microbit: [0.45, -0.5, 0],
  printer: [0, 0.55, 0],
  woodworking: [0.2, -0.6, -1.0],
};

// Cursor / trail effects reused across circuit + printer + carving writes.
// Its color always matches the currently-active machine's own brand color
// (set in driveWritingFX), so the "pen" and the ink it lays down never
// disagree with each other.
const cursor = new THREE.Mesh(
  new THREE.SphereGeometry(0.055, 12, 12),
  new THREE.MeshStandardMaterial({ color: WORD_COLOR.arduino, emissive: WORD_COLOR.arduino, emissiveIntensity: 1.6 })
);
cursor.visible = false;
scene.add(cursor);

const printBeads = new GlowDabPool(18, 0.1);
scene.add(printBeads.group);

// ============================================================================
// TIMELINE
// ============================================================================

const OFFSCREEN_X = 8.5;
const ENTRY_SCALE = 0.8;

const PHASES = [
  { key: "arduino", technique: "circuit", enter: [0, 1.8], write: [1.8, 5.0], pause: [5.0, 5.8], exit: [5.8, 7.2], from: "left", to: "right" },
  { key: "microbit", technique: "led", enter: [7.2, 9.0], write: [9.0, 11.8], pause: [11.8, 12.6], exit: [12.6, 14.0], from: "right", to: "left" },
  { key: "printer", technique: "printed", enter: [14.0, 16.0], write: [16.0, 19.6], pause: [19.6, 20.4], exit: [20.4, 21.8], from: "left", to: "right" },
  { key: "woodworking", technique: "carved", enter: [21.8, 23.6], write: [23.6, 28.2], pause: [28.2, 29.0], exit: [29.0, 30.4], from: "right", to: "left" },
];
const CONSTRUCTION_END = 30.4;
const ECOSYSTEM_ASSEMBLE_END = CONSTRUCTION_END + 3.0; // 33.4
const ECOSYSTEM_HOLD_END = ECOSYSTEM_ASSEMBLE_END + 2.6; // 36.0
const BRAND_RISE_END = ECOSYSTEM_HOLD_END + 3.4; // 39.4
const BRAND_HOLD_END = BRAND_RISE_END + 1.8; // 41.2
const SEQUENCE_DURATION = BRAND_HOLD_END;

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------

let appState = "sequence"; // 'sequence' | 'hero'
let paused = false;
let seqTime = 0;
let animClock = 0;
let activeKey = null;
let navigated = false;

const wordInstances = {}; // key -> { group, update, finalized }
const pointer = { x: 0, y: 0 };
const dragOffset = { x: 0, y: 0 };
let dragging = false;
let dragStart = { x: 0, y: 0 };

function currentPhase() {
  if (seqTime < CONSTRUCTION_END) return PHASES.find((p) => seqTime < p.exit[1]) || PHASES[PHASES.length - 1];
  return null;
}

// ----------------------------------------------------------------------------
// Word construction — creates the persistent text the first time each
// phase's write window begins, then updates it as progress advances.
// ----------------------------------------------------------------------------

function ensureWord(key) {
  if (wordInstances[key]) return wordInstances[key];
  const row = ROWS[key];
  const phase = PHASES.find((p) => p.key === key);
  let built;
  if (phase.technique === "circuit") {
    const paths = createCircuitLetterPaths(row.word, { scale: 0.088 });
    built = { group: paths.group, width: paths.width, update: (p, dt, elapsed) => animateCircuitText(paths, p, dt, elapsed) };
  } else if (phase.technique === "carved") built = buildStrokeText(row.word, "carved", { scale: 0.088 });
  else if (phase.technique === "printed") built = buildPrintedText(row.word, { scale: 0.095 });
  else built = buildLEDText(row.word, { pixelSize: 0.12, gap: 0.045 });

  built.group.position.set(0, row.y, 0);
  phraseGroup.add(built.group);
  const inst = { ...built, finalized: false };
  wordInstances[key] = inst;
  return inst;
}

const toolExtra = { printer: 0, woodworking: 0 };

function driveWritingFX(key, tip, dt) {
  if (!tip || !tip.active) {
    cursor.visible = false;
    return;
  }
  const row = ROWS[key];
  const worldTip = new THREE.Vector3(tip.x, row.y + tip.y, 0.1);
  cursor.position.copy(worldTip);
  cursor.visible = key === "arduino" || key === "microbit";
  if (cursor.visible) {
    cursor.material.color.setHex(WORD_COLOR[key]);
    cursor.material.emissive.setHex(WORD_COLOR[key]);
  }

  if (key === "printer") {
    const headX = THREE.MathUtils.clamp(tip.x * 0.9, -0.85, 0.85);
    printerTool.printHead.position.x = headX;
    toolExtra.printer = headX;
    printBeads.spawn(worldTip, { life: 0.7, scale: 0.5 });
  }
  if (key === "woodworking") {
    toolExtra.woodworking = damp(toolExtra.woodworking, THREE.MathUtils.clamp(tip.x, -1.4, 1.4), 8, dt || 0.016);
  }
}

// ----------------------------------------------------------------------------
// Per-phase visuals
// ----------------------------------------------------------------------------

let cameraPhase = { kind: "row", rowY: ROWS.arduino.y };

function activatePhase(phase) {
  Object.values(TOOLS).forEach((t) => (t.group.visible = false));
  TOOLS[phase.key].group.visible = true;
  cursor.visible = false;
  toolExtra.printer = 0;
  toolExtra.woodworking = 0;
  printerTool.printHead.position.x = 0;
  activeKey = phase.key;
}

function updateConstructionVisuals(dt) {
  const phase = currentPhase();
  if (activeKey !== phase.key) activatePhase(phase);

  const tool = TOOLS[phase.key];
  const isArduino = phase.key === "arduino" && tool.ready;

  // ARDUINO_ACTIVATE: a brief LED/circuit "power on" as it finishes settling
  // into place, then a restrained ongoing pulse for as long as it's on
  // screen — independent of which enter/write/pause/exit branch runs below.
  if (isArduino) {
    const activateP = THREE.MathUtils.clamp(inverseLerp(1.2, 2.3, seqTime), 0, 1);
    activateArduino(tool.model, activateP, animClock);
  }

  const base = performPos(phase.key);
  // x rotation must stay POSITIVE for arduino/microbit — their components
  // and LEDs sit at local +Y, and only a positive X-rotation tips that face
  // toward the camera instead of showing the bare underside.
  const rot =
    phase.key === "printer"
      ? [0, 0.15, 0]
      : phase.key === "woodworking"
        ? [0.25, -0.55, -0.3]
        : phase.key === "arduino"
          ? [0.5, 0.15, 0]
          : [0.45, -0.15, 0];
  const scale = TOOL_SCALE[phase.key];
  const sideFrom = phase.from === "left" ? -1 : 1;
  const sideTo = phase.to === "left" ? -1 : 1;

  if (seqTime < phase.enter[1]) {
    const p = easeOutCubic(inverseLerp(phase.enter[0], phase.enter[1], seqTime));
    tool.group.position.set(lerp(sideFrom * OFFSCREEN_X, base[0], p), base[1] + Math.sin(p * Math.PI) * 0.25, base[2]);
    tool.group.rotation.set(rot[0], rot[1] + sideFrom * 0.8 * (1 - p), rot[2]);
    tool.group.scale.setScalar(lerp(scale * ENTRY_SCALE, scale, p));
    if (isArduino) animateArduinoEntrance(tool.group, p);
    cameraPhase = { kind: "enter", rowY: ROWS[phase.key].y, sideSign: sideFrom };
  } else if (seqTime < phase.write[1]) {
    const woodX = phase.key === "woodworking" ? toolExtra.woodworking * 0.6 : 0;
    tool.group.position.set(base[0] + woodX, base[1] + Math.sin(animClock * 1.1) * 0.03, base[2]);
    tool.group.rotation.set(rot[0], rot[1], rot[2]);
    tool.group.scale.setScalar(scale);
    const inst = ensureWord(phase.key);
    const p = inverseLerp(phase.write[0], phase.write[1], seqTime);
    const tip = inst.update(p, dt, animClock);
    driveWritingFX(phase.key, tip, dt);
    // CAMERA: gently move closer while CREATE is being constructed.
    const pushIn = isArduino ? lerp(0, 0.6, easeInOutCubic(p)) : 0;
    cameraPhase = { kind: "row", rowY: ROWS[phase.key].y, pushIn };
  } else if (seqTime < phase.pause[1]) {
    tool.group.position.set(base[0], base[1] + Math.sin(animClock * 1.1) * 0.03, base[2]);
    const inst = ensureWord(phase.key);
    if (!inst.finalized) {
      inst.update(1, dt, animClock);
      inst.finalized = true;
    }
    cursor.visible = false;
    // CAMERA: pull back once CREATE is complete.
    const pushIn = isArduino ? lerp(0.6, 0, easeOutCubic(inverseLerp(phase.pause[0], phase.pause[1], seqTime))) : 0;
    cameraPhase = { kind: "row", rowY: ROWS[phase.key].y, pushIn };
  } else {
    const p = easeInCubic(inverseLerp(phase.exit[0], phase.exit[1], seqTime));
    cursor.visible = false;
    tool.group.position.set(lerp(base[0], sideTo * OFFSCREEN_X, p), base[1] + Math.sin((1 - p) * Math.PI) * 0.18, base[2]);
    tool.group.rotation.y = rot[1] + sideTo * 0.6 * p;
    tool.group.scale.setScalar(lerp(scale, scale * ENTRY_SCALE, p));
    if (isArduino) animateArduinoExit(tool.group, p);
    cameraPhase = { kind: "row", rowY: ROWS[phase.key].y };
  }
}

// ----------------------------------------------------------------------------
// Ecosystem finale: all tools return and frame the completed phrase
// ----------------------------------------------------------------------------

function updateEcosystem(dt) {
  Object.values(TOOLS).forEach((t) => (t.group.visible = true));
  activeKey = null;

  Object.keys(TOOLS).forEach((key) => {
    const tool = TOOLS[key];
    const target = FINALE_POS[key];
    const rot = FINALE_ROT[key];
    if (seqTime < ECOSYSTEM_ASSEMBLE_END) {
      const p = easeOutCubic(inverseLerp(CONSTRUCTION_END, ECOSYSTEM_ASSEMBLE_END, seqTime));
      const startX = performPos(key)[0] + (key === "arduino" || key === "printer" ? -OFFSCREEN_X * 0.4 : OFFSCREEN_X * 0.4);
      tool.group.position.set(lerp(startX, target[0], p), lerp(target[1] - 0.6, target[1], p), lerp(target[2] - 1.2, target[2], p));
      tool.group.rotation.set(rot[0] * p, rot[1] * p, rot[2] * p);
      tool.group.scale.setScalar(TOOL_SCALE[key] * lerp(0.7, 1, p));
    } else {
      tool.group.position.set(target[0], target[1] + Math.sin(animClock * 0.8 + key.length) * 0.04, target[2]);
      tool.group.rotation.set(rot[0], rot[1], rot[2]);
      tool.group.scale.setScalar(TOOL_SCALE[key]);
    }
  });

  cameraPhase = { kind: "ecosystem" };
}

// ----------------------------------------------------------------------------
// Cinematic camera
// ----------------------------------------------------------------------------

let framingBias = { fov: 42, zBias: 0 };

function updateCamera(dt) {
  const desired = new THREE.Vector3(0, 1.2, 5.4);
  const look = new THREE.Vector3(0, 1.2, 0);

  if (cameraPhase.kind === "row") {
    desired.set(0, cameraPhase.rowY - 0.15, 6.1 - (cameraPhase.pushIn || 0));
    look.set(0, cameraPhase.rowY - 0.55, 0);
  } else if (cameraPhase.kind === "enter") {
    desired.set(cameraPhase.sideSign * 0.5, cameraPhase.rowY - 0.15, 6.4);
    look.set(0, cameraPhase.rowY - 0.55, 0);
  } else if (cameraPhase.kind === "ecosystem") {
    desired.set(0, 1.2, 11.5);
    look.set(0, 1.2, 0);
  } else if (cameraPhase.kind === "brand") {
    const p = cameraPhase.p;
    desired.set(0, lerp(1.2, 6.2, p), lerp(11.5, 13.5, p));
    look.set(0, lerp(1.2, 1.6, p), 0);
  }

  desired.z += framingBias.zBias;
  if (cameraPhase.kind !== "brand") {
    desired.x += pointer.x * 0.3;
    desired.y += -pointer.y * 0.15;
    desired.x += dragOffset.x;
    look.x += dragOffset.x * 1.1;
    look.y += dragOffset.y * 0.5;
  }
  desired.z += Math.sin(animClock * 0.12) * 0.1;

  camera.position.x = damp(camera.position.x, desired.x, 3.5, dt);
  camera.position.y = damp(camera.position.y, desired.y, 3.5, dt);
  camera.position.z = damp(camera.position.z, desired.z, 3.5, dt);
  camLookSmoothed.x = damp(camLookSmoothed.x, look.x, 3.5, dt);
  camLookSmoothed.y = damp(camLookSmoothed.y, look.y, 3.5, dt);
  camLookSmoothed.z = damp(camLookSmoothed.z, look.z, 3.5, dt);
  camera.lookAt(camLookSmoothed);
}

// ----------------------------------------------------------------------------
// Brand rise + handoff to the real site
// ----------------------------------------------------------------------------

let brandFlashFired = false;

function updateBrandRise() {
  if (seqTime < ECOSYSTEM_HOLD_END) return;
  if (!brandFlashFired) {
    brandFlashFired = true;
    triggerFlash();
  }
  const p = clamp01(inverseLerp(ECOSYSTEM_HOLD_END, BRAND_RISE_END, seqTime));
  cameraPhase = { kind: "brand", p: easeInOutCubic(p) };
  if (brandEl) brandEl.style.opacity = String(smoothstep(clamp01((p - 0.25) / 0.6)));

  if (seqTime >= BRAND_HOLD_END && !navigated) {
    navigated = true;
    if (brandEl) brandEl.classList.add("is-leaving");
    setTimeout(() => {
      window.location.href = "../home.html";
    }, 700);
  }
}

function replaySequence() {
  seqTime = 0;
  activeKey = null;
  paused = false;
  navigated = false;
  brandFlashFired = false;
  Object.keys(wordInstances).forEach((key) => {
    phraseGroup.remove(wordInstances[key].group);
    delete wordInstances[key];
  });
  if (brandEl) {
    brandEl.style.opacity = "0";
    brandEl.classList.remove("is-leaving");
  }
  syncPauseButton();
}

// ----------------------------------------------------------------------------
// Interaction
// ----------------------------------------------------------------------------

window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  if (dragging) {
    const dx = (event.clientX - dragStart.x) / window.innerWidth;
    const dy = (event.clientY - dragStart.y) / window.innerHeight;
    dragOffset.x = THREE.MathUtils.clamp(dx * 1.2, -0.35, 0.35);
    dragOffset.y = THREE.MathUtils.clamp(dy * 1.2, -0.35, 0.35);
  }
});
canvas.addEventListener("pointerdown", (event) => {
  dragging = true;
  dragStart = { x: event.clientX, y: event.clientY };
});
window.addEventListener("pointerup", () => {
  dragging = false;
});

function syncPauseButton() {
  if (!pauseBtn) return;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  pauseBtn.setAttribute("aria-pressed", String(paused));
}
if (pauseBtn) pauseBtn.addEventListener("click", () => { paused = !paused; syncPauseButton(); });
if (replayBtn) replayBtn.addEventListener("click", replaySequence);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    paused = !paused;
    syncPauseButton();
    event.preventDefault();
  }
});

// ----------------------------------------------------------------------------
// Responsive
// ----------------------------------------------------------------------------

function applyFraming() {
  const mobile = window.innerWidth < 700 || window.innerWidth / window.innerHeight < 0.85;
  framingBias = { fov: mobile ? 54 : 42, zBias: mobile ? 1.6 : 0 };
  return mobile;
}
function onResize() {
  const mobile = applyFraming();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = framingBias.fov;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.75 : 2));
}
window.addEventListener("resize", onResize);
applyFraming();
camera.fov = framingBias.fov;
camera.position.set(0, ROWS.arduino.y - 0.1, 4.6 + framingBias.zBias);
camera.updateProjectionMatrix();

// ----------------------------------------------------------------------------
// Master render loop
// ----------------------------------------------------------------------------

let lastTime = performance.now();

function animate() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  // Hold the timeline at t=0 (clean backdrop, no title, Arduino off-screen)
  // until the GLB has actually loaded, so the hero sequence never plays out
  // an entrance/build for an asset that isn't there yet.
  const running = !paused && arduinoTool.ready;

  if (running) {
    animClock += dt;
    seqTime = Math.min(seqTime + dt, SEQUENCE_DURATION);
  }

  if (seqTime < CONSTRUCTION_END) {
    updateConstructionVisuals(dt);
  } else if (seqTime < ECOSYSTEM_HOLD_END) {
    updateEcosystem(dt);
  } else {
    updateEcosystem(0);
    updateBrandRise();
  }
  updateCamera(dt);

  const inRowPause = (() => {
    const phase = currentPhase();
    return phase && seqTime >= phase.pause[0] && seqTime < phase.pause[1];
  })();
  const pauseLambda = inRowPause ? 1.2 : 5;
  dragOffset.x = damp(dragOffset.x, 0, dragging ? 0 : pauseLambda, dt);
  dragOffset.y = damp(dragOffset.y, 0, dragging ? 0 : pauseLambda, dt);

  if (running) particles.rotation.y += dt * 0.008;
  printBeads.update(dt, camera);

  if (flashLife > 0) {
    flashLife -= dt;
    const t = Math.max(0, flashLife / 0.5);
    flashSprite.material.opacity = t * 0.5;
    if (flashLife <= 0) flashSprite.material.opacity = 0;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
syncPauseButton();

arduinoReady.finally(() => {
  requestAnimationFrame(() => {
    loadingEl.classList.add("is-hidden");
    setTimeout(() => loadingEl.remove(), 700);
  });
});
