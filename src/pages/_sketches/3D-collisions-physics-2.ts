import ReTina from '@ReTina'

const rt = new ReTina({
  showFps: true,
  height: 512,
  useInterlacing: true,
  functions: /* wgsl */ `
    fn sdD1(pos: vec3f, t: f32) -> f32 {
      return (pos.y - (
        snoise3d(vec3f(pos.xz * 0.1, t * 2f)) +
        snoise3d(vec3f(pos.xz * 0.2, t * 1f))
      ));
    }
    fn sdD2(pos: vec3f) -> f32 {
      return (sin(pos.y) - (cos(pos.x) + cos(pos.y) + cos(pos.z)));
    }
  `,
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

// Dynamic Morphology World (without smiley face)
rt.registerMaterial({
  sdFunc: /* wgsl */ `
    let t = U.time * 0.2 - 0.3f;
    // --- WORLD
    let d1 = sdD1(pos, t) * 0.8;
    let d2 = sdD2(pos) * 0.7;
    let f1 = pow(sin(t), 10f);
    let f2 = pow(sin(t + 1. / 4. * PI), 16f);
    let f3 = pow(sin(t + 2. / 4. * PI), 16f);
    let f4 = pow(sin(t + 3. / 4. * PI), 16f);
    let world = (d1 * f1 + d2 * f2 + d1 * f3 + d2 * f4);
    // --- VIEW CAPSULE
    let camPos = vec3f(U.camPosX, U.camPosY, U.camPosZ);
    let ro = camPos + rotateXY(vec3f(0., 0., U.camSphericalR), U.camSphericalP, U.camSphericalT);
    let offset = vec3f(0, -0.4, 0);
    let playerHead = camPos + offset;
    let viewCapsule = sdCapsule(pos, playerHead, ro, 0.6f);
    // ---
    return opSmoothSubtraction(viewCapsule, world, 0.1);
  `,
  lightFunc: /* wgsl */ `
    let lambertian = dot(normal, -rd);
    let bri = 0.1 + lambertian * 0.5;
    let finalColor = hsv2rgb(vec3<f32>(rgb2hsv(normal * 0.5 + 0.5).x, 0.8, bri)) + vec3f(pow(lambertian, 64f));
    return vec4<f32>(finalColor, 1.);
  `,
})

rt.setControlsTo3rdPerson({
  initPos: { x: 0, y: 4, z: 4 },
})

rt.start()
