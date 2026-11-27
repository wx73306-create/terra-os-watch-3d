import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.querySelector('#stage');
const screen = document.querySelector('#screen');
const status = document.querySelector('#status');
const auto = document.querySelector('#auto');
const home = document.querySelector('#home');
screen.srcdoc = new TextDecoder().decode(decodeBase64(document.querySelector('#watch-ui').textContent));

showWatch().catch(error => {
  console.error(error);
  status.textContent = '3D 模型载入失败。请用支持 WebGL 2 的浏览器打开。';
});

async function showWatch() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(studio, 0.045);
  scene.environment = reflections.texture;
  scene.environmentIntensity = 0.58;
  studio.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff7ec, 2.05);
  key.position.set(-28, 45, 52);
  scene.add(key, new THREE.HemisphereLight(0xe4e9f2, 0x373536, 0.58));
  const edge = new THREE.DirectionalLight(0xdbe6ff, 1.15);
  edge.position.set(44, 10, -36);
  scene.add(edge);

  const glb = decodeBase64(document.querySelector('#watch-model').textContent);
  const gltf = await new GLTFLoader().parseAsync(glb.buffer, '');
  const model = await gltf.parser.getDependency('node', 85);
  model.removeFromParent();
  model.position.set(0, 0, 0);
  model.scale.setScalar(1);
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
  );
  model.quaternion.setFromRotationMatrix(basis);
  scene.add(model);
  // Calibrate the browser's highlight on the exported rubber, retaining its color and maps.
  const strap = await gltf.parser.getDependency('node', 77);
  strap.material = strap.material.clone();
  strap.material.roughness = 0.69;
  strap.material.specularIntensity *= 0.28;

  const display = await gltf.parser.getDependency('node', 34);
  display.material = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.42 });

  const { corners, normal, mask, outline } = fitScreen(display);
  screen.style.clipPath = outline;
  display.add(mask);
  const midpoint = corners[0].clone().lerp(corners[2], 0.5);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 500);
  const controls = new OrbitControls(camera, stage);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.11;
  controls.rotateSpeed = 0.8;
  controls.minDistance = 51;
  controls.maxDistance = 215;

  function front() {
    controls.target.set(midpoint.x, -1, -7);
    const portrait = Math.min(stage.clientWidth / stage.clientHeight, 1);
    const distance = portrait < 0.72 ? 108 : 112;
    camera.position.copy(controls.target).add(new THREE.Vector3(12, 10, distance));
    controls.update();
  }

  function resize() {
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
  }

  const targets = new Map();
  for (const [key, indices] of [['Enter', [31, 33]], [' ', [0, 1, 35, 36]]]) {
    for (const index of indices) {
      const part = await gltf.parser.getDependency('node', index);
      part.traverse(node => { if (node.isMesh) targets.set(node, key); });
    }
  }

  function sendKey(key) {
    const doc = screen.contentDocument;
    const watch = doc?.querySelector('.watch-wrap');
    if (!watch) return;
    watch.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }

  const ray = new THREE.Raycaster();
  function partAt(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const point = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(point, camera);
    return targets.get(ray.intersectObject(model, true)[0]?.object);
  }

  let gesture;
  stage.addEventListener('pointerdown', event => {
    controls.autoRotate = false;
    auto.setAttribute('aria-pressed', 'false');
    gesture = [event.clientX, event.clientY];
  });
  stage.addEventListener('pointerup', event => {
    if (!gesture) return;
    if (Math.hypot(event.clientX - gesture[0], event.clientY - gesture[1]) < 5) {
      const key = partAt(event);
      if (key) sendKey(key);
    }
    gesture = undefined;
  });
  stage.addEventListener('pointercancel', () => { gesture = undefined; });
  home.addEventListener('click', () => {
    controls.autoRotate = false;
    auto.setAttribute('aria-pressed', 'false');
    front();
  });
  auto.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    auto.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  document.querySelector('#crown').addEventListener('click', () => sendKey('Enter'));
  document.querySelector('#action').addEventListener('click', () => sendKey(' '));
  document.querySelector('#previous').addEventListener('click', () => sendKey('ArrowUp'));
  document.querySelector('#next').addEventListener('click', () => sendKey('ArrowDown'));

  resize();
  front();
  new ResizeObserver(resize).observe(stage);
  status.hidden = true;
  document.querySelectorAll('button').forEach(button => button.disabled = false);
  let lastTime;
  renderer.setAnimationLoop(time => {
    controls.update(lastTime === undefined ? 0 : Math.min(0.05, (time - lastTime) / 1000));
    lastTime = time;
    const visible = camera.position.clone().sub(midpoint).normalize().dot(normal) > 0.035;
    mask.visible = visible;
    renderer.render(scene, camera);
    screen.classList.toggle('visible', visible);
    if (!visible) return;
    const projected = corners.map(corner => {
      const p = corner.clone().project(camera);
      return [(p.x + 1) * stage.clientWidth / 2, (1 - p.y) * stage.clientHeight / 2];
    });
    screen.style.transform = screenMatrix(projected);
  });
}

function fitScreen(display) {
  // The KeyShot display mesh contains a tilted, planar front and a thick side wall.
  const planeY = z => 0.201697 + 0.0699268 * z;
  const geometry = display.geometry;
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  const front = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const edgeA = new THREE.Vector3(), edgeB = new THREE.Vector3();
  const onFace = p => Math.abs(p.y - planeY(p.z)) < 0.002;
  for (let i = 0; i < indices.count; i += 3) {
    a.fromBufferAttribute(positions, indices.getX(i));
    b.fromBufferAttribute(positions, indices.getX(i + 1));
    c.fromBufferAttribute(positions, indices.getX(i + 2));
    if (!onFace(a) || !onFace(b) || !onFace(c)) continue;
    if (edgeA.subVectors(b, a).cross(edgeB.subVectors(c, a)).y <= 0) continue;
    front.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  }
  if (!front.length) throw new Error('KeyShot display face was not found.');

  const cutGeometry = new THREE.BufferGeometry();
  cutGeometry.setAttribute('position', new THREE.Float32BufferAttribute(front, 3));
  cutGeometry.computeBoundingBox();
  const { min, max } = cutGeometry.boundingBox;
  display.updateWorldMatrix(true, false);
  const corners = [
    [max.x, max.z], [min.x, max.z], [min.x, min.z], [max.x, min.z],
  ].map(([x,z]) => display.localToWorld(new THREE.Vector3(x, planeY(z), z)));
  const normal = new THREE.Vector3(0, 1, -0.0699268).transformDirection(display.matrixWorld);

  const punch = new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
    blending: THREE.NoBlending, polygonOffset: true, polygonOffsetFactor: -0.1,
    polygonOffsetUnits: -1,
  });
  const mask = new THREE.Mesh(cutGeometry, punch);
  mask.renderOrder = 100;

  const points = [];
  for (let i = 0; i < front.length; i += 3) {
    points.push([(max.x - front[i]) / (max.x - min.x), (max.z - front[i+2]) / (max.z - min.z)]);
  }
  const outline = 'polygon(' + convexHull(points).map(([x,y]) => {
    // Leave a subpixel overlap around the GPU cutout to avoid a seam at its antialiased edge.
    const percent = value => ((0.5 + (value - 0.5) * 1.009) * 100).toFixed(4) + '%';
    return percent(x) + ' ' + percent(y);
  }).join(',') + ')';
  return { corners, normal, mask, outline };
}

function convexHull(points) {
  const sorted = points.sort(([ax,ay],[bx,by]) => ax - bx || ay - by);
  function chain(vertices) {
    const result = [];
    for (const [x,y] of vertices) {
      while (result.length >= 2) {
        const [a,b] = result.at(-2);
        const [c,d] = result.at(-1);
        if ((c-a)*(y-b) - (d-b)*(x-a) > 1e-7) break;
        result.pop();
      }
      result.push([x,y]);
    }
    result.pop();
    return result;
  }
  return [...chain(sorted), ...chain(sorted.reverse())];
}

function screenMatrix([[x0,y0], [x1,y1], [x2,y2], [x3,y3]]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const determinant = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(determinant) < 0.00001) return 'scale(0)';
  const g = (sx * dy2 - dx2 * sy) / determinant;
  const h = (dx1 * sy - sx * dy1) / determinant;
  return 'matrix3d(' + [
    (x1 - x0 + g * x1) / 480, (y1 - y0 + g * y1) / 480, 0, g / 480,
    (x3 - x0 + h * x3) / 352, (y3 - y0 + h * y3) / 352, 0, h / 352,
    0, 0, 1, 0, x0, y0, 0, 1,
  ].join(',') + ')';
}

function decodeBase64(value) {
  return Uint8Array.fromBase64 ? Uint8Array.fromBase64(value) : Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
}
