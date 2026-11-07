import ReTina from '@ReTina'

const rt = new ReTina()

rt.registerMaterial({
  color: { r: 0, g: 0.9, b: 0.8 },
  sdFunc: /* wgsl */ `
    let bounce = pow(sin(U.time * .2), 2.);
    let d1 = sdTorus(pos, vec2(.8, .2));
    let d2 = sdBox(pos, vec3(.6));
    return d1 * bounce + d2 * (1. - bounce);
  `,
})

rt.camera.fov = 100
rt.camera.spherical.radius = 2
rt.start({
  onFrame() {
    rt.camera.spherical.phi += 0.006
    rt.camera.spherical.theta += 0.006
  },
})
