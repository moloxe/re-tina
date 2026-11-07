var e=`import ReTina from '@ReTina'

const rt = new ReTina({
  showFps: true,
})

rt.camera.pos.x = -0.25
rt.camera.spherical.theta = -0.4
rt.camera.fov = 60

const SPHERE_RADIUS = 0.05
const spheres = new Array(5).fill(0).map(() =>
  rt.registerMaterial({
    sdFunc: \`return sdSphere(pos, \${SPHERE_RADIUS});\`,
    enableCollisions: true,
  })
)

rt.registerMaterial({
  pos: { x: 0, y: -0.3, z: -0.5 },
  sdFunc: /* wgsl */ \`
    return sdBox(pos, vec3f(0.01, 0.15, 0.1));
  \`,
})

let checkingCols = 0
async function updateSpheres() {
  const t = performance.now() / 1000
  for (let i = 0; i < spheres.length; i++) {
    const angle = t / 2 + (2 * Math.PI * i) / spheres.length
    const x = Math.cos(angle) * 0.2
    const y = Math.sin(angle) * 0.2 + 0.02
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

rt.start({
  onFrame() {
    updateSpheres()
  },
})
`;export{e as default};