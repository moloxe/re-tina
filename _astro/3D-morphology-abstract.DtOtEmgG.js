var e=`import ReTina from '@ReTina'

const rt = new ReTina({
  functions: /* wgsl */ \`
    fn sdD1(pos: vec3f, t: f32) -> f32 {
      return (pos.y - (
        snoise3d(vec3f(pos.xz * 0.1, t * 2f)) +
        snoise3d(vec3f(pos.xz * 0.2, t * 1f))
      ));
    }
    fn sdD2(pos: vec3f) -> f32 {
      return (sin(pos.y) - (cos(pos.x) + cos(pos.y) + cos(pos.z)));
    }
    // https://www.shadertoy.com/view/WcXGW2
    fn sdD3(_p: vec3f) -> f32 {
      var p = _p - vec3f(U.camPosX - 1f, U.camPosY - 1.2f, U.camPosZ - 1.2f);
      p = rotate(p, vec3f(0.5, -0.6, 0));
      var d = sdSphere(p, 1.02);
      let mouth = sdCutSphere((p + vec3f(0.0, 0.18, -0.65)), 0.38, 0.0);
      d = opSmoothSubtraction(mouth, d, 0.1);
      let lEye = sdSphere(p + vec3f(0.22, -0.3, -0.88), 0.14);
      d = opSmoothSubtraction(lEye, d, 0.1);
      let rEye = sdSphere(p + vec3f(-0.22, -0.3, -0.88), 0.14);
      d = opSmoothSubtraction(rEye, d, 0.1);
      return d;
    }
  \`,
})

rt.registerMaterial({
  sdFunc: /* wgsl */ \`
    let t = U.time * 0.2 - 0.3f;
    let bounce = pow(sin(t * 0.5), 2.);
    let d1 = sdD1(pos, t) * 0.8;
    let d2 = sdD2(pos) * 0.7;
    let d3 = sdD3(pos);
    let d4 = d2;
    // ---
    let f1 = pow(sin(t), 10f);
    let f2 = pow(sin(t + 1. / 4. * PI), 16f);
    let f3 = pow(sin(t + 2. / 4. * PI), 16f);
    let f4 = pow(sin(t + 3. / 4. * PI), 16f);
    return (d1 * f1 + d2 * f2 + d3 * f3 + d4 * f4);
  \`,
  lightFunc: /* wgsl */ \`
    let lambertian = dot(normal, -rd);
    let bri = 0.1 + lambertian * 0.5;
    let finalColor = hsv2rgb(vec3<f32>(rgb2hsv(normal * 0.5 + 0.5).x, 0.8, bri)) + vec3f(pow(lambertian, 64f));
    return vec4<f32>(finalColor, 1.);
  \`,
})

rt.camera = {
  pos: {
    x: 27.3,
    y: 8.7,
    z: -16.66239690942345,
  },
  spherical: {
    radius: 0,
    theta: 0.40271877655055244,
    phi: -0.7647831800262793,
  },
  fov: 120,
}

rt.setControlsToFree()

rt.start()
`;export{e as default};