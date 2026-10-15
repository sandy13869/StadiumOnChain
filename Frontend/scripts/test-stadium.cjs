// Controlled camera/input checks: no browser, headset, wallet or network needed.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const THREE = require("three");
function compile(file, imports) {
  const exports = {};
  const source = fs.readFileSync(
    path.join(__dirname, "../src/components/stadium", file),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(output, {
    exports,
    ...imports.globals,
    require(name) {
      return imports[name] ?? require(name);
    },
  });
  return exports;
}
const config = compile("stadiumConfig.ts", {});
function events(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, fn) {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
  };
}
function setup(mode) {
  const camera = new THREE.PerspectiveCamera();
  const canvas = events({
    tagName: "CANVAS",
    focus() {
      doc.activeElement = canvas;
    },
    setPointerCapture() {},
  });
  const doc = events({
    activeElement: canvas,
    pointerLockElement: null,
    exitPointerLock() {
      doc.pointerLockElement = null;
    },
  });
  const win = events();
  const effects = [];
  const frames = [];
  let locomotion;
  const imports = {
    globals: { document: doc, window: win },
    react: {
      useRef: (value) => ({ current: value }),
      useEffect: (effect) => effects.push(effect),
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "@react-three/fiber": {
      useThree: () => ({ camera, gl: { domElement: canvas } }),
      useFrame: (fn) => frames.push(fn),
    },
    "@react-three/drei": {
      OrbitControls: "orbit",
      PointerLockControls: "pointer",
    },
    "@react-three/xr": {
      XROrigin: "origin",
      useXRControllerLocomotion: (...args) => {
        locomotion = args;
      },
    },
    "./stadiumConfig": config,
  };
  const { DesktopNavigation, HeadsetNavigation } = compile(
    "StadiumNavigation.tsx",
    imports,
  );
  const output =
    mode === "xr"
      ? HeadsetNavigation({ seatIndex: 2 })
      : DesktopNavigation({ mode, seatIndex: 0, reset: 0, onLock() {} });
  if (mode === "xr") output.props.ref.current = new THREE.Group();
  const cleanups = effects.map((effect) => effect()).filter(Boolean);
  return {
    camera,
    canvas,
    doc,
    win,
    output,
    locomotion,
    frame: (dt) => frames.forEach((fn) => fn({}, dt)),
    cleanup: () => cleanups.forEach((fn) => fn()),
  };
}
test("walk bounds stay inside the bowl at human eye height", () => {
  assert.deepEqual(
    Array.from(config.clampWalkPosition(-1000, 1000)),
    [-65, 1.7, 45],
  );
  assert.deepEqual(
    Array.from(config.clampWalkPosition(20, -10)),
    [20, 1.7, -10],
  );
});
test("diagonal movement has the same speed and opposing keys cancel", () => {
  assert.equal(
    Math.hypot(...config.movementAxes(new Set(["KeyW", "KeyD"]))),
    1,
  );
  assert.deepEqual(
    Array.from(config.movementAxes(new Set(["KeyW", "KeyS", "KeyA", "KeyD"]))),
    [0, 0],
  );
});
test("a seated view does not pull the camera back each frame", () => {
  const s = setup("seat");
  s.camera.position.set(1, 2, 3);
  s.frame(0.016);
  assert.deepEqual(s.camera.position.toArray(), [1, 2, 3]);
  s.cleanup();
});
test("dragging rotates a seated viewer without moving their seat", () => {
  const s = setup("seat");
  const start = s.camera.position.clone();
  const rotation = s.camera.quaternion.clone();
  s.canvas.dispatch("pointerdown", {
    button: 0,
    clientX: 0,
    clientY: 0,
    pointerId: 1,
  });
  s.canvas.dispatch("pointermove", { clientX: 100, clientY: 20 });
  assert.ok(s.camera.position.equals(start));
  assert.ok(s.camera.quaternion.angleTo(rotation) > 0.1);
  s.cleanup();
});
test("walking requires mouse capture and stops on window blur", () => {
  const s = setup("walk");
  assert.equal(s.output.props.children[1].props.domElement, s.canvas);
  const z = s.camera.position.z;
  s.win.dispatch("keydown", {
    target: s.canvas,
    code: "KeyW",
    preventDefault() {},
  });
  s.frame(0.05);
  assert.equal(s.camera.position.z, z);
  s.doc.pointerLockElement = s.canvas;
  s.frame(0.05);
  assert.ok(s.camera.position.z < z);
  const stopped = s.camera.position.clone();
  s.win.dispatch("blur");
  s.frame(0.05);
  assert.ok(s.camera.position.equals(stopped));
  s.cleanup();
});
test("XR places the viewer at the selected row and uses snap turns without smooth locomotion", () => {
  const s = setup("xr");
  const seat = config.SEATS[2];
  assert.deepEqual(s.output.props.ref.current.position.toArray(), [
    seat.position[0],
    seat.position[1] - 1.6,
    seat.position[2],
  ]);
  assert.equal(s.locomotion[1], false);
  assert.equal(s.locomotion[2].type, "snap");
  assert.equal(s.locomotion[2].degrees, 30);
  s.cleanup();
});
