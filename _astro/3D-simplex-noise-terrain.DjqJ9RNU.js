var e=`import ReTina from '@ReTina'

const rt = new ReTina({
  useInterlacing: true,
  height: 256,
  main: /* wgsl */ \`
    let scene = calcScene(uv);
    var color = vec3f(0);
    if scene.dist > 0 {
        color = round(scene.color.rgb * 16) / 16;
    }
    return vec4f(color, 1);
  \`,
  functions: /* wgsl */ \`
    fn getLightPos() -> vec3f {
      return vec3f(0, 2, U.camPosZ - 10);
    }
  \`,
})

rt.registerMaterial({
  sdFunc: 'return sdSphere((pos - getLightPos()), 1);',
  lightFunc: 'return vec4f(1);',
})

rt.registerMaterial({
  sdFunc: /* wgsl */ \`
    let terrain = (pos.y - snoise3d(vec3f(pos.xz, pos.y - U.time / 10))) / 6;
    let capsule = sdCapsule(pos, vec3f(U.camPosX, U.camPosY, U.camPosZ), getLightPos(), 0.2);
    return opSmoothSubtraction(capsule, terrain, .1);
  \`,
  lightFunc: /* wgsl */ \`
    let minBright = 0.1;
    let diffuseColor = color;
    let shininess = 1024f;
    let lightPos = getLightPos();
    let lightColor = vec3f(0.8, 0.9, 0.9);
    let power = 128f;
    let light = blinnPhong(
      // Environment
      rd, normal, minBright,
      // Material
      pos, diffuseColor, shininess,
      // Light
      lightPos, lightColor, power,
    );
    return vec4f(light, 1);
  \`,
})

rt.start({
  onFrame() {
    const t = performance.now() / 1000
    rt.camera.pos = { x: 0, y: 0.6, z: -t / 4 }
    rt.camera.spherical = { radius: 0.1, theta: Math.sin(t / 2) / 2, phi: -0.3 }
  },
})
`;export{e as default};