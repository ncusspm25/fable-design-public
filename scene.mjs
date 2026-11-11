import * as THREE from 'three';
import { makeBowl, makeKettle, makeSieve, makeWhisk, randomFrom } from './models.mjs';

const { PI, sin, cos, sqrt } = Math;
const TAU = PI * 2;
const mix = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

function ease(start, end, progress) {
  const x = clamp((progress - start) / (end - start), 0, 1);
  return x * x * (3 - 2 * x);
}

function makeStudio(renderer, scene) {
  const room = new THREE.Scene();
  room.background = new THREE.Color('#38453a');
  const panels = [
    { position: [-3, 5, 4], size: [4.7, 5.0], color: '#fff2d9', strength: 3.8 },
    { position: [4, 3, -4], size: [1.9, 5.5], color: '#e5f2cf', strength: 3.9 },
    { position: [-3, 3, -4], size: [2.7, 4.3], color: '#d5e1c3', strength: 1.5 },
    { position: [3.8, 1, 5], size: [3.1, 4.0], color: '#d6e0c6', strength: 1.5 },
  ];
  for (const { position, size, color, strength } of panels) {
    const light = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide,
    }));
    light.position.set(...position);
    light.lookAt(0, 0, 0);
    room.add(light);
  }
  const environment = new THREE.PMREMGenerator(renderer);
  scene.environment = environment.fromScene(room, .026).texture;
  environment.dispose();
  for (const panel of room.children) {
    panel.geometry.dispose();
    panel.material.dispose();
  }

  scene.add(new THREE.HemisphereLight('#e8e8c7', '#485a35', .91));
  for (const [color, intensity, x, y, z] of [
    ['#fff1d9', 2.55, -4, 5, 5],
    ['#e1f1ce', 2.55, 3.5, 4, -4],
    ['#d9e5d0', .55, 3.0, .8, 5],
  ]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }
}

function makeParticles(scene) {
  const count = 780;
  const particles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: '#a0b75a', roughness: .96 }), count);
  particles.frustumCulled = false;
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(particles);

  const random = randomFrom(83419);
  const tint = new THREE.Color();
  const dummy = new THREE.Object3D();
  const shapes = Array.from({ length: count }, (_, i) => {
    const a = random() * TAU;
    const r = sqrt(random());
    particles.setColorAt(i, tint.setHSL(.17 + random() * .045, .31 + random() * .38, .36 + random() * .31));
    return {
      x: cos(a) * r * .31, z: sin(a) * r * .29,
      start: .24 + random() * .34, end: .63 + random() * .31,
      spread: (random() - .5) * .34, size: .004 + random() ** 2 * .014,
      twist: random() * TAU,
    };
  });

  return (progress, sieve, bowl) => {
    particles.visible = progress > .24 && progress < .94;
    if (!particles.visible) return;
    for (const [i, shape] of shapes.entries()) {
      const t = clamp((progress - shape.start) / (shape.end - shape.start), 0, 1);
      const fall = t ** 1.62;
      dummy.position.set(
        mix(sieve.position.x + shape.x, bowl.position.x - .06 + shape.x * 1.45, fall) + shape.spread * sin(t * PI),
        mix(sieve.position.y - .06, bowl.position.y - .72, fall),
        mix(sieve.position.z + shape.z, bowl.position.z + shape.z * 1.3, fall),
      );
      dummy.scale.setScalar(shape.size * ease(0, .13, t) * (1 - ease(.93, 1, t)));
      dummy.rotation.set(shape.twist + t * 3, t * 5, shape.twist);
      dummy.updateMatrix();
      particles.setMatrixAt(i, dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
  };
}

function makeWater(scene) {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 10, 25, true);
  const position = geometry.attributes.position;
  const base = position.array.slice();
  const stream = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
    color: '#dbe6ba', roughness: .16, clearcoat: .75, clearcoatRoughness: .14,
    opacity: .73, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    envMapIntensity: 1.15,
  }));
  stream.name = 'Matcha water stream';
  stream.frustumCulled = false;
  scene.add(stream);

  const rings = Array.from({ length: 3 }, () => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .014, 7, 48), new THREE.MeshBasicMaterial({
      color: '#d7e2a3', transparent: true, depthWrite: false, opacity: 0,
    }));
    ring.name = 'Matcha impact ripple';
    ring.rotation.x = -PI / 2;
    ring.renderOrder = 2;
    scene.add(ring);
    return ring;
  });
  const mouth = new THREE.Vector3();

  return (progress, kettle, surfaceY) => {
    const strength = ease(.16, .30, progress) * (1 - ease(.72, .85, progress));
    stream.visible = strength > .001;
    kettle.root.updateMatrix();
    mouth.copy(kettle.tip).applyMatrix4(kettle.root.matrix);
    const { x, z } = mouth;
    const y = surfaceY + .01;
    if (stream.visible) {
      for (let i = 0; i < position.count; i++) {
        const t = .5 - base[i * 3 + 1];
        const radius = (.020 - .007 * t + .002 * sin(t * 22 - progress * 100)) * strength;
        position.setXYZ(i,
          x + base[i * 3] * radius,
          mix(mouth.y, y, t ** 1.15),
          z + base[i * 3 + 2] * radius,
        );
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    for (const [i, ring] of rings.entries()) {
      ring.visible = stream.visible;
      const pulse = (progress * 5 + i / rings.length) % 1;
      ring.position.set(x, y + .013 + i * .001, z);
      ring.scale.setScalar(.04 + pulse * .31);
      ring.material.opacity = sin(pulse * PI) * strength * .37;
    }
  };
}

export function createMatchaScene(canvas, events) {
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.3, 2.3, 2.3, -2.3, .1, 35);
  const bowl = makeBowl();
  const whisk = makeWhisk();
  const kettle = makeKettle();
  const sieve = makeSieve();
  scene.add(bowl.root, whisk.root, kettle.root, sieve);
  makeStudio(renderer, scene);
  const powder = makeParticles(scene);
  const water = makeWater(scene);

  const stages = Object.fromEntries(events.map(event => [event.id, event.webProgress]));
  function phase(name, progress) {
    const { before, after } = stages[name];
    return clamp((progress - before) / (after - before), 0, 1);
  }

  let width = 0;
  let height = 0;
  let framing;
  function resize(nextWidth, nextHeight) {
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    if (!width || !height) return;
    const ratio = width / height;
    camera.left = -2.3 * ratio;
    camera.right = 2.3 * ratio;
    const narrow = width < 768;
    framing = {
      narrow,
      side: narrow ? 0 : 4.6 * ratio * .197,
      fit: narrow ? Math.min(1, ratio / .77) : clamp(.85 + (ratio - .85) * .43, .8, 1.12),
    };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6, 1550 / width));
    renderer.setSize(width, height, false);
  }

  function render(progress) {
    if (!width || !height) return;
    const sift = phase('sift', progress);
    const pour = phase('pour', progress);
    const whisking = phase('whisk', progress);
    const serve = phase('serve', progress);
    const settle = ease(0, .77, serve);

    const close = ease(.20, .69, whisking);
    const detail = ease(0, .30, serve) * (1 - ease(.30, .74, serve));
    const zoom = framing.fit * (1 + .09 * close + .12 * settle + .42 * detail);
    const aimX = -framing.side / zoom;
    const aimY = framing.narrow
      ? mix(-1.48, -1.86, settle) - .17 * close - .22 * detail
      : mix(-.14, -.63, settle) - .13 * detail;
    const heightAboveTarget = mix(5.12, 7.18, .48 * close + .52 * settle + .14 * detail);
    camera.position.set(aimX, aimY + heightAboveTarget, 7.3);
    camera.lookAt(aimX, aimY, 0);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();

    bowl.root.position.set(mix(.08, 0, settle), -.54, 0);
    bowl.root.rotation.y = mix(-.19, .13, settle);
    const settledPowder = .45 + .55 * ease(.35, .88, sift);
    bowl.mound.scale.set(.54 * settledPowder, .108 * settledPowder, .51 * settledPowder);
    bowl.grounds.scale.set(settledPowder, settledPowder, settledPowder);

    const fill = ease(.10, .86, pour);
    const level = mix(-.77, -.385, fill);
    const radius = mix(.59, 1.043, sqrt(fill));
    bowl.mound.visible = fill < .45;
    bowl.grounds.visible = fill < .45;
    bowl.liquid.visible = fill > .001;
    bowl.liquid.position.y = level;
    bowl.liquid.scale.setScalar(radius);
    const froth = ease(.10, .84, whisking);
    bowl.foam.visible = froth > .001;
    bowl.foam.position.y = level + .008;
    bowl.foam.scale.setScalar(radius * mix(.56, 1, froth));
    bowl.foam.material.opacity = froth * .96;
    bowl.foam.rotation.z = .32 * whisking + .08 * sin(whisking * TAU * 2.0) * (1 - settle);

    const sieveIn = ease(.10, .30, sift) * (1 - ease(.71, .99, sift));
    sieve.visible = sieveIn > .001;
    sieve.position.set(
      -.28 - (1 - sieveIn) * 2.20 + .057 * sin(sift * TAU * 7) * sieveIn,
      .71 + (1 - sieveIn) * .23,
      -.08,
    );
    sieve.rotation.z = -.12 + .09 * sin(sift * TAU * 7) * sieveIn;
    powder(sift, sieve, bowl.root);

    // The spout holds above the tea from the first drop through the last.
    const kettleIn = ease(.03, .15, pour) * (1 - ease(.85, .98, pour));
    kettle.root.visible = kettleIn > .001;
    kettle.root.position.set(-1.45 - (1 - kettleIn) * 1.6, .73 + (1 - kettleIn) * .21, -.13);
    kettle.root.rotation.z = -.20 * kettleIn;
    water(pour, kettle, bowl.root.position.y + level);

    const shift = ease(.08, .84, sift);
    const approach = ease(0, .23, whisking);
    const dip = ease(.12, .35, whisking) * (1 - ease(.76, .97, whisking));
    const work = ease(.28, .40, whisking) * (1 - ease(.70, .80, whisking));
    const retreat = ease(0, .26, serve);
    const rise = ease(.04, .32, serve);
    const sweep = sin(whisking * TAU * 10.5);
    const cross = sin(whisking * TAU * 21);
    // The tines extend below the pivot. Keep their tips near the tea surface.
    const brushingHeight = bowl.root.position.y + level + .75;
    const hoverHeight = mix(.74 + .25 * shift, .74, approach);
    whisk.root.visible = rise < .985;
    whisk.root.position.set(
      mix(.88 + (framing.narrow ? .34 : .48) * shift, bowl.root.position.x, approach) + .30 * sweep * work + 1.64 * retreat,
      mix(hoverHeight, brushingHeight, dip) + .025 * cross * work + 1.18 * rise,
      mix(-.39, bowl.root.position.z, approach) + .10 * cross * work,
    );
    whisk.root.rotation.set(-.11 + .08 * cross * work, .08 + .14 * work, mix(-.38, -.04, approach) + .08 * sweep * work - .24 * retreat);
    whisk.head.scale.set(1 + .023 * work * cos(whisking * TAU * 21), 1, 1);
    renderer.render(scene, camera);
  }
  return { resize, render };
}
