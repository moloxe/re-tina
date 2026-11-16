import ReTina from '@ReTina'

const params = new URLSearchParams(window.location.search)
const only = params.get('only') // 'd1' | 'd2' | 'd3'
const fixPow = params.get('fixPow') === '1'
const debugSteps = params.get('debugSteps') === '1'
const noCone = params.get('noCone') === '1'
const noInterlace = params.get('noInterlace') === '1'
const nanCheck = params.get('nanCheck') === '1'

const rt = new ReTina({
  useInterlacing: !noInterlace,
  height: 300,
  raymarch: {
    debugSteps,
    coneTile: noCone ? false : undefined,
  },
  main: nanCheck
    ? /* wgsl */ `
        let scene = calcScene(uv);
        if (scene.dist < 0.0) {
          return vec4f(0.0, 0.0, 0.25, 1.0);
        }
        let c = scene.color.rgb;
        let finite = (c.r >= -1e20 && c.r <= 1e20) && (c.g >= -1e20 && c.g <= 1e20) && (c.b >= -1e20 && c.b <= 1e20);
        if (!finite) {
          return vec4f(1.0, 0.0, 1.0, 1.0);
        }
        return vec4f(c, 1.0);
      `
    : undefined,
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
  `,
})

const sinExpr = (expr: string) => (fixPow ? `abs(sin(${expr}))` : `sin(${expr})`)
const sdReturn =
  only === 'd1'
    ? 'return d1;'
    : only === 'd2'
      ? 'return d2;'
      : only === 'd3'
        ? 'return d3;'
        : 'return (d1 * f1 + d2 * f2 + d3 * f3 + d4 * f4);'

rt.registerMaterial({
  sdFunc: /* wgsl */ `
    let t = U.time * 0.2 - 0.3f;
    let bounce = pow(${sinExpr('t * 0.5')}, 2.);
    let d1 = sdD1(pos, t) * 0.8;
    let d2 = sdD2(pos) * 0.7;
    let d3 = sdD3(pos);
    let d4 = d2;
    // ---
    let f1 = pow(${sinExpr('t')}, 10f);
    let f2 = pow(${sinExpr('t + 1. / 4. * PI')}, 16f);
    let f3 = pow(${sinExpr('t + 2. / 4. * PI')}, 16f);
    let f4 = pow(${sinExpr('t + 3. / 4. * PI')}, 16f);
    ${sdReturn}
  `,
  lightFunc: /* wgsl */ `
    let lambertian = dot(normal, -rd);
    let h = rgb2hsv(normal * 0.5 + 0.5).x;
    let bri = 0.1 + lambertian * 0.5;
    let hsv = vec3f(h, 0.8, bri);
    let spec = pow(${fixPow ? 'max(lambertian, 0.0)' : 'lambertian'}, 100f);
    let finalColor = hsv2rgb(hsv) + spec;
    return vec4f(finalColor, 1.);
  `,
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

rt.start()
