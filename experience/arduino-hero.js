// ============================================================================
// Bee Innovations — 3D Experience
// Loads the production Arduino UNO GLB (Blender-authored, materials/hierarchy
// preserved) and drives its hero-sequence behavior: a restrained LED/circuit
// "power on" once it settles, plus small entrance/exit flourishes layered on
// top of the shared tool easing in experience.js. The GLB is used as-is —
// nothing here rebuilds the model with Three.js primitives.
// ============================================================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_URL = "./assets/models/arduino-uno.glb";

// The GLB is authored at real-world scale (~0.069m across). The rest of this
// scene's "tools" live at a stylized scale of a couple of units across, so
// the loaded model is scaled up once at load time to match — the asset file
// itself is never touched.
const DISPLAY_SCALE = 30;

const ANIMATION_TARGET_NAMES = [
  "Arduino_UNO_Root",
  "PCB_Board",
  "USB_Connector",
  "Barrel_Jack",
  "Reset_Button",
  "ATmega328",
  "LEDs",
  "Headers",
  "Copper_Traces",
  "Copper_Pads",
];

let cachedLoad = null;

/**
 * Loads experience/assets/models/arduino-uno.glb (cached — safe to call more
 * than once) and returns handles to its named animation targets:
 * { root, parts: { <name>: Object3D|null }, ledMaterials: Material[] }
 */
export function loadArduino() {
  if (cachedLoad) return cachedLoad;
  cachedLoad = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        const root = gltf.scene.getObjectByName("Arduino_UNO_Root") || gltf.scene;
        root.scale.setScalar(DISPLAY_SCALE);

        const parts = {};
        ANIMATION_TARGET_NAMES.forEach((name) => {
          parts[name] = root.getObjectByName(name) || null;
        });

        // Collect the LED emissive materials once, remembering each one's
        // authored (Blender) emissive strength so activation can scale
        // relative to it instead of hard-coding a magic number here.
        const ledMaterials = [];
        if (parts.LEDs) {
          parts.LEDs.traverse((obj) => {
            if (!obj.isMesh) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if (m && m.isMeshStandardMaterial && !ledMaterials.includes(m)) {
                m.userData.baseEmissiveIntensity = m.emissiveIntensity;
                m.emissiveIntensity = 0; // starts "off" until activateArduino ramps it up
                ledMaterials.push(m);
              }
            });
          });
        }

        resolve({ root, parts, ledMaterials });
      },
      undefined,
      (err) => reject(err)
    );
  });
  return cachedLoad;
}

/**
 * Drives the brief "power on" + restrained ongoing pulse once the Arduino
 * has settled: LEDs ramp up from off, then hold a gentle breathing glow.
 * p: 0→1 activation progress (ramp completes by p=1, keep calling after that
 * so the breathing pulse continues for as long as the board is on screen).
 */
export function activateArduino(model, p, elapsed = 0) {
  if (!model || !model.ledMaterials.length) return;
  const clamped = THREE.MathUtils.clamp(p, 0, 1);
  const rampIn = 1 - Math.pow(1 - clamped, 3); // easeOutCubic
  const breathe = 1 + Math.sin(elapsed * 3.2) * 0.12;
  model.ledMaterials.forEach((m) => {
    const base = m.userData.baseEmissiveIntensity ?? 1;
    m.emissiveIntensity = base * rampIn * breathe;
  });
}

/**
 * Small settle-bounce layered on top of the shared enter easing in
 * experience.js — call after the shared position/rotation/scale for the
 * frame has already been set. p: 0→1 through the enter window.
 */
export function animateArduinoEntrance(group, p) {
  const clamped = THREE.MathUtils.clamp(p, 0, 1);
  const bounce = 1 + Math.sin(clamped * Math.PI) * 0.05 * (1 - clamped);
  group.scale.multiplyScalar(bounce);
}

/**
 * A light extra spin-away layered on top of the shared exit slide, so the
 * board doesn't just translate off-screen flat. p: 0→1 through the exit window.
 */
export function animateArduinoExit(group, p) {
  group.rotation.y += THREE.MathUtils.clamp(p, 0, 1) * 0.35;
}
