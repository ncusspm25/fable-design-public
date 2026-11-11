import * as THREE from 'three';

const { PI, sin, cos, sqrt, exp, hypot } = Math;
const TAU = PI * 2;

export function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function texture(size, draw, space = THREE.SRGBColorSpace) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = space;
  result.anisotropy = 4;
  return result;
}

function pixelTexture(size, paint, colorSpace) {
  return texture(size, (context) => {
    const pixels = context.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        pixels.data.set(paint(x / size, y / size), (y * size + x) * 4);
      }
    }
    context.putImageData(pixels, 0, 0);
  }, colorSpace);
}

function add(parent, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function profile(parent, points, material, wobble = 0) {
  const segments = 144;
  const geometry = new THREE.LatheGeometry(points.map(point => new THREE.Vector2(...point)), segments);
  if (wobble) {
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const angle = Math.atan2(x, z);
      const ripple = sin(angle * 3 + .7) + .31 * sin(angle * 7 + y * 3.6);
      const scale = 1 + wobble * ripple;
      positions.setXYZ(i, x * scale, y + wobble * sin(angle * 4) * Math.min(hypot(x, z), 1), z * scale);
    }
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;
    const seam = new THREE.Vector3();
    const end = segments * points.length;
    for (let i = 0; i < points.length; i++) {
      const j = end + i;
      seam.set(
        normals.getX(i) + normals.getX(j),
        normals.getY(i) + normals.getY(j),
        normals.getZ(i) + normals.getZ(j),
      ).normalize();
      normals.setXYZ(i, seam.x, seam.y, seam.z);
      normals.setXYZ(j, seam.x, seam.y, seam.z);
    }
  }
  return add(parent, geometry, material);
}

function tube(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return add(parent, new THREE.TubeGeometry(curve, 40, radius, 10), material);
}

function disc(parent, material, y = 0, segments = 128) {
  const mesh = add(parent, new THREE.CircleGeometry(1, segments), material, 0, y);
  mesh.rotation.x = -PI / 2;
  return mesh;
}

function ceramicMaps(interior = false) {
  const random = randomFrom(interior ? 6207 : 2506);
  const field = new Uint8Array(384 * 384);
  const map = pixelTexture(384, (u, v) => {
    const wide = sin(u * TAU * 4 + sin(v * 15)) * cos(v * 17 + u * TAU * 2);
    const rings = sin(v * 137 + sin(u * TAU * 3) * 1.1) * .85;
    const grit = (random() - .5) * 9;
    const speckle = random() > .985 ? -(19 + random() * 44) : 0;
    const value = wide * 6 + rings + grit + speckle;
    field[Math.round(v * 384) * 384 + Math.round(u * 384)] = 128 + rings + grit + speckle;
    const band = interior ? 0 : Math.max(0, Math.min(1, (v - .71 - .026 * sin(u * TAU * 3)) / .17));
    return [159 + value - band * 40, 161 + value - band * 48, 135 + value * .82 - band * 50, 255];
  });
  const bumpMap = pixelTexture(384, (u, v) => {
    const gray = field[Math.round(v * 384) * 384 + Math.round(u * 384)];
    return [gray, gray, gray, 255];
  }, THREE.NoColorSpace);
  return { map, bumpMap };
}

function teaMaps() {
  const random = randomFrom(29153);
  const tea = pixelTexture(512, (u, v) => {
    const x = u - .5;
    const y = v - .5;
    const radius = hypot(x, y);
    const turn = Math.atan2(y, x);
    const waviness = sin(radius * 64 - turn * 3 + sin(turn * 3) * 1.8) * sin(radius * 14);
    const edge = exp(-(((radius - .475) / .043) ** 2));
    const tone = waviness * .85 + 9 * (-x - y) - edge * 10 + (random() - .5) * 5;
    return [59 + tone, 86 + tone * 1.1, 34 + tone * .65, 255];
  });

  const foam = texture(512, (context, size) => {
    const pixels = context.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size - .5) * 2;
        const v = (y / size - .5) * 2;
        const radius = hypot(u, v);
        const angle = Math.atan2(v, u);
        const eddy = sin(radius * 12 - angle * 3 + sin(angle * 3) * 1.3) * .11;
        const clouds = .13 * cos(u * 8 + sin(v * 8)) * sin(v * 10 - cos(u * 4));
        const density = Math.max(0, Math.min(1, (1.04 - radius + eddy + clouds) * 1.72));
        const speck = (random() - .5) * 14;
        const tone = density * 21 + speck;
        const alpha = Math.min(249, density * 260 * Math.min(1, (1 - radius) * 28));
        pixels.data.set([140 + tone, 165 + tone, 77 + tone * .8, Math.max(0, alpha)], (y * size + x) * 4);
      }
    }
    context.putImageData(pixels, 0, 0);
    for (let i = 0; i < 7600; i++) {
      const angle = random() * TAU;
      const radius = sqrt(random()) * .475;
      const x = (.5 + cos(angle) * radius) * size;
      const y = (.5 + sin(angle) * radius) * size;
      if (radius > .40 && random() > .4) continue;
      const sizeBias = (1 - radius * .8) * (random() ** 3);
      const bubble = .55 + sizeBias * 5.5;
      const alpha = .18 + random() * .49;
      context.beginPath();
      context.ellipse(x, y, bubble, bubble * (.90 + random() * .15), angle, 0, TAU);
      context.fillStyle = 'rgba(89, 120, 45, ' + alpha * .57 + ')';
      context.fill();
      context.lineWidth = .64 + sizeBias * .55;
      context.strokeStyle = 'rgba(231, 240, 170, ' + alpha + ')';
      context.stroke();
      if (bubble > 2.2) {
        context.beginPath();
        context.arc(x, y, bubble * .77, 3.55, 5.00);
        context.strokeStyle = 'rgba(235, 246, 190, ' + alpha * .8 + ')';
        context.stroke();
      }
    }
  });
  return { tea, foam };
}

function contactShadow(parent) {
  const map = texture(128, (context, size) => {
    const middle = size / 2;
    const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
    gradient.addColorStop(0, '#071508df');
    gradient.addColorStop(.31, '#071508b0');
    gradient.addColorStop(.66, '#07150844');
    gradient.addColorStop(1, '#07150800');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
  const shadow = add(parent, new THREE.PlaneGeometry(4.5, 3.25), new THREE.MeshBasicMaterial({
    map, transparent: true, opacity: .78, depthWrite: false,
  }), .19, -1.015, -.15);
  shadow.rotation.x = -PI / 2;
}

export function makeBowl() {
  const root = new THREE.Group();
  const glaze = ceramicMaps();
  const ceramic = new THREE.MeshPhysicalMaterial({
    ...glaze, bumpScale: .022, roughness: .50, clearcoat: .22,
    clearcoatRoughness: .32, envMapIntensity: .72,
  });
  const interior = new THREE.MeshPhysicalMaterial({
    ...ceramicMaps(true), bumpScale: .016, roughness: .54,
    clearcoat: .16, clearcoatRoughness: .36, envMapIntensity: .73,
  });
  const foot = new THREE.MeshStandardMaterial({
    color: '#806249', roughness: .88, bumpMap: glaze.bumpMap, bumpScale: .04,
  });
  const rim = [1.196, .055];
  contactShadow(root);
  profile(root, [
    [0, -.922], [.53, -.922], [.63, -.897], [.73, -.857], [.86, -.773],
    [.973, -.666], [1.064, -.536], [1.143, -.393], [1.203, -.241],
    [1.235, -.103], [1.237, -.012], [1.220, .031], rim,
  ], ceramic, .014);
  const innerWall = profile(root, [
    rim, [1.173, .048], [1.142, .019], [1.129, -.123], [1.106, -.262], [1.062, -.394],
    [.995, -.516], [.905, -.632], [.792, -.713], [.638, -.775], [.447, -.794], [0, -.798],
  ], interior, .014);
  innerWall.name = 'Matcha bowl interior';
  profile(root, [
    [0, -1.005], [.43, -1.005], [.51, -1.003], [.56, -.978], [.575, -.942], [.57, -.915], [.51, -.899], [0, -.902],
  ], foot, .010);

  const matcha = new THREE.MeshStandardMaterial({
    color: '#789535', roughness: .96, bumpMap: glaze.bumpMap, bumpScale: .07,
  });
  const mound = add(root, new THREE.SphereGeometry(1, 48, 24), matcha, -.06, -.785, -.04);
  const grounds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), matcha, 260);
  const fleck = new THREE.Object3D();
  const tint = new THREE.Color();
  const random = randomFrom(30849);
  for (let i = 0; i < grounds.count; i++) {
    const radius = sqrt(random());
    const theta = TAU * random();
    fleck.position.set(.57 * radius * cos(theta), .086 * sqrt(1 - radius * radius), .54 * radius * sin(theta));
    fleck.rotation.set(random() * PI, random() * PI, random() * PI);
    fleck.scale.setScalar(.006 + random() * .013);
    fleck.updateMatrix();
    grounds.setMatrixAt(i, fleck.matrix);
    grounds.setColorAt(i, tint.setHSL(.15 + random() * .055, .42, .29 + random() * .33));
  }
  grounds.position.set(-.06, -.785, -.04);
  root.add(grounds);

  const maps = teaMaps();
  const liquid = disc(root, new THREE.MeshPhysicalMaterial({
    map: maps.tea, roughness: .32, clearcoat: .33, clearcoatRoughness: .20, envMapIntensity: .30,
  }));
  const foam = disc(root, new THREE.MeshBasicMaterial({
    map: maps.foam, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  }));
  foam.renderOrder = 1;
  return { root, mound, grounds, liquid, foam };
}

function bambooMaps() {
  const random = randomFrom(2217);
  return pixelTexture(256, (u, v) => {
    const curl = sin(v * 6 + u * TAU) * .07 + sin(v * 29) * .014;
    const fiber = 4 * sin(u * TAU * 19 + curl) + 3 * sin(u * TAU * 41 + curl * 2);
    const light = 6 * cos(u * TAU * 5 + sin(v * 5));
    const score = sin(v * 44) * 1.7 + (random() - .5) * 7;
    return [177 + fiber + light + score, 130 + fiber * .74 + light + score, 72 + fiber * .45 + light + score, 255];
  });
}

function tinesGeometry() {
  const vertices = [];
  const indices = [];
  const colors = [];
  const tint = new THREE.Color();
  const random = randomFrom(9043);
  const steps = 26;
  const sides = 6;
  const rings = [
    { count: 48, profile: [[.162,.269],[.205,.205],[.28,.047],[.395,-.18],[.51,-.39],[.551,-.63],[.532,-.755],[.467,-.786],[.440,-.760]] },
    { count: 22, profile: [[.129,.267],[.162,.15],[.206,-.07],[.271,-.26],[.315,-.49],[.286,-.644],[.220,-.701]] },
  ];

  for (const [layer, ring] of rings.entries()) {
    const curve = new THREE.CatmullRomCurve3(ring.profile.map(([radius, y]) => new THREE.Vector3(radius, y, 0)));
    for (let i = 0; i < ring.count; i++) {
      const theta = TAU * (i + layer * .40) / ring.count;
      const width = .023 + random() * .008;
      const lean = (random() - .5) * .056;
      const length = .96 + random() * .08;
      const radial = .959 + random() * .075;
      const base = vertices.length / 3;
      const strength = (layer === 0 ? .52 : .42) + random() * .13;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const point = curve.getPoint(t);
        const angle = theta + lean * t * t + .025 * sin(t * PI);
        const radius = point.x * (1 + (radial - 1) * t);
        const y = .27 + (point.y - .27) * (1 + (length - 1) * t);
        const taper = Math.max(.13, 1 - t ** 1.45);
        tint.setHSL(.098 + .014 * t, .54, strength + .19 * t, THREE.SRGBColorSpace);
        for (let k = 0; k < sides; k++) {
          const a = TAU * k / sides;
          const across = cos(a) * width * taper;
          const outward = sin(a) * (.012 * taper + .001);
          vertices.push(
            (radius + outward) * cos(angle) - across * sin(angle),
            y,
            (radius + outward) * sin(angle) + across * cos(angle),
          );
          colors.push(tint.r, tint.g, tint.b);
          if (j < steps) {
            const here = base + j * sides + k;
            const next = base + j * sides + (k + 1) % sides;
            indices.push(here, here + sides, next, next, here + sides, next + sides);
          }
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function makeWhisk() {
  const root = new THREE.Group();
  const bamboo = new THREE.MeshPhysicalMaterial({
    map: bambooMaps(), roughness: .52, clearcoat: .15, envMapIntensity: .6,
  });
  profile(root, [
    [0, .216], [.166, .216], [.193, .247], [.207, .36], [.218, .57], [.235, .83],
    [.244, 1.04], [.24, 1.174], [.228, 1.228], [.211, 1.25], [0, 1.25],
  ], bamboo, .012);
  const random = randomFrom(87033);
  const endGrain = pixelTexture(128, (u, v) => {
    const radius = hypot(u - .5, v - .5);
    const ring = 4.2 * sin(radius * 143 + 1.2 * sin(u * 15 + v * 16));
    const tone = ring + (random() - .5) * 13 - 14 * radius;
    return [187 + tone, 151 + tone, 95 + tone * .85, 255];
  });
  disc(root, new THREE.MeshStandardMaterial({ map: endGrain, roughness: .66 }), 1.251).scale.setScalar(.212);
  const binding = new THREE.MeshStandardMaterial({ color: '#302b21', roughness: .79 });
  for (const y of [.265, .275, .289]) {
    const ring = add(root, new THREE.TorusGeometry(.195, .008, 7, 72), binding, 0, y);
    ring.rotation.x = PI / 2;
  }
  const head = add(root, tinesGeometry(), new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: .58, envMapIntensity: .59,
  }));
  head.name = 'Bamboo whisk tines';
  return { root, head };
}

export function makeSieve() {
  const root = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({
    color: '#aaa89c', roughness: .29, metalness: .76, envMapIntensity: 1.4,
  });
  profile(root, [
    [.395, -.048], [.426, -.040], [.464, -.002], [.48, .055],
    [.474, .079], [.444, .079], [.433, .052], [.424, -.008], [.395, -.025], [.395, -.048],
  ], metal);
  const screen = texture(256, (context, size) => {
    context.strokeStyle = '#b1b3a4b8';
    context.lineWidth = 1;
    for (let n = 0; n < size; n += 5) {
      context.beginPath();
      context.moveTo(n, 0); context.lineTo(n, size);
      context.moveTo(0, n); context.lineTo(size, n);
      context.stroke();
    }
  });
  const mesh = disc(root, new THREE.MeshBasicMaterial({
    map: screen, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }), -.026);
  mesh.scale.setScalar(.402);
  tube(root, [[-.46,.04,0],[-.71,.075,-.01],[-1.01,.10,-.035],[-1.33,.15,-.05]], .029, metal);
  return root;
}

export function makeKettle() {
  const root = new THREE.Group();
  const iron = new THREE.MeshPhysicalMaterial({
    color: '#303b35', roughness: .37, metalness: .57, envMapIntensity: 1.4, clearcoat: .21,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: '#626a55', roughness: .31, metalness: .72, envMapIntensity: 1.35,
  });
  profile(root, [
    [0, -.47], [.35, -.47], [.43, -.40], [.47, -.25], [.465, .04], [.436, .23],
    [.39, .30], [.32, .328], [.31, .35], [0, .35],
  ], iron);
  profile(root, [[0,.35],[.33,.35],[.37,.37],[.33,.404],[.17,.439],[0,.439]], edge);
  profile(root, [[0,.44],[.061,.44],[.085,.498],[.076,.54],[0,.553]], iron);
  tube(root, [[-.36,.19,0],[-.58,.27,0],[-.66,.06,0],[-.62,-.22,0],[-.43,-.34,0]], .055, iron);
  tube(root, [[.36,-.21,0],[.64,-.14,.045],[.82,.16,.065],[1.05,.35,.09],[1.25,.337,.10],[1.43,.224,.115]], .047, edge);
  const opening = add(root, new THREE.SphereGeometry(.040, 18, 10), iron, 1.430, .225, .115);
  opening.name = 'Matcha kettle spout';
  opening.scale.set(.45, .83, .98);
  return { root, tip: new THREE.Vector3(1.442, .211, .115) };
}
