import ReTina from '@ReTina'

const rt = new ReTina({
  showFps: true,
  height: 400,
  fps: 40,
  useInterlacing: true,
  main: /* wgsl */ `
    let scene = calcScene(uv);
    var color = scene.color.rgb;
    if scene.dist < 0 {
      var seed = toSpherical(scene.rd);
      seed.z += U.time * 0.1; seed.y += U.time * 0.1;
      seed = toCartesian(seed);
      let n = (
        (snoise3d(vec3f(seed * 10.)) + 1f) / 2f +
        (snoise3d(vec3f(seed * 20.)) + 1f) / 2f
      ) / 2f;
      let nebula = hsv2rgb(vec3f(n, 0.4, 6. * (n - 0.6)));
      color = mix(
        vec3f(0, 0, 0.1),
        nebula,
        min(pow(max(scene.rd.y + 0.8, 0.), 8.), 1.)
      );
    }
    return vec4f(color, 1);
  `,
})

// Floor
rt.registerMaterial({
  sdFunc: /* wgsl */ `
    var d1 = max(pos.y, -(pos.y + 0.1));
    d1 = max(d1, -sdSphere(pos, 3.));
    let t = U.time * 0.2;
    let n = snoise3d(vec3f(pos.x * 0.2, pos.z * 0.2 + t, t));
    let d2 = max(-pos.y, pos.y - n * 0.8 - 1.);
    let shape = smoothstep(0., 2.0, abs(pos.x) - 5f);
    return mix(d1, d2, shape);
  `,
})

// Platform
rt.registerMaterial({
  color: { r: 1, g: 0, b: 1 },
  sdFunc: /* wgsl */ `
    let t = U.time;
    pos = pos - vec3f(3., 0.6 - sin(t) * 0.2, 0);
    pos = rotate(pos, vec3f(0, t, 0));
    return sdBox(pos, vec3f(1, 0.1, 1));
  `,
})

// Wall
rt.registerMaterial({
  pos: { x: -4, y: 1, z: 0 },
  sdFunc: /* wgsl */ `
    return sdBox(pos, vec3f(0.01, 1., 2.));
  `,
})

const SPHERE_RADIUS = 0.4
const spheres = new Array(4).fill(0).map(() =>
  rt.registerMaterial({
    sdFunc: `return sdSphere(pos, ${SPHERE_RADIUS});`,
    enableCollisions: true,
  })
)

let checkingCols = 0
async function updateSpheres() {
  const t = performance.now() / 1000
  for (let i = 0; i < spheres.length; i++) {
    const angle = -t / 2 + (2 * Math.PI * i) / spheres.length
    const x = Math.cos(angle) * 1.5 - 4
    const y = Math.sin(angle) * 1.5 + 3
    const z = -0.5
    spheres[i].setPos({ x, y, z })
  }
  // --- Collision check ---
  if (!rt.isBuilt() || checkingCols > 0) return
  for (let i = 0; i < spheres.length; i++) {
    const sphere = spheres[i]
    const pos = sphere.getPos()
    checkingCols++
    const result = await sphere.checkCollision(pos)
    let color = { r: 1, g: 1, b: 1 }
    if (result.materialIndex !== -1 && result.collisionDist <= SPHERE_RADIUS) {
      color = { r: 0.3, g: 0.9, b: 0.3 }
    }
    sphere.setColor(color)
    checkingCols--
  }
}

rt.setControlsTo3rdPerson({
  initPos: { x: 0, y: 2, z: 4 },
  respawnY: -10,
})

rt.start({
  onFrame: () => {
    updateSpheres()
  },
})
