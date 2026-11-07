import ReTina from '@ReTina'

const rt = new ReTina({
  functions: /* wgsl */ `
    const PER_MIN = 0.5;
    fn getFreq() -> f32 {
      return (PER_MIN / 60.) * U.beat;
    }
    fn sawtooth(time: f32, frequency: f32) -> f32 {
        return fract(time * frequency);
    }
    fn integral_sawtooth(time: f32, frequency: f32) -> f32 {
        let x = time * frequency;
        return (0.5 * (floor(x) + (fract(x) * fract(x)))) / frequency;
    }
  `,
})

rt.registerMaterial({
  sdFunc: /* wgsl */ `
    let t = integral_sawtooth(U.time, getFreq()) * 0.4;
    pos = rotate(pos, vec3<f32>(0, t, -t));
    pos += vec3<f32>(cos(-t) * 16, 2.4, sin(-t) * 16);
    return (sin(pos.y) - (cos(pos.x) + cos(pos.y) + cos(pos.z))) * .6;
  `,
  lightFunc: /* wgsl */ `
    let lamb = dot(normal, -rd);
    let aoFactor = calculateDFAO(pos, normal);
    var c = (normal * .5 + .5) * sqrt(lamb) * aoFactor;
    let dist = length(pos - ro);
    let t = 1. - sawtooth(U.time, getFreq());
    let bri = pow(max(0, sin(dist * PI / 6.)), 6.) * 0.4 + t * 0.8;
    c *= bri;
    return vec4(c, 1.);
  `,
})

const beat = rt.registerUniform('beat', 60)

let lastClick = 0
window.addEventListener('click', () => {
  const now = performance.now()
  if (lastClick !== 0) {
    const diff = now - lastClick
    const newBeat = Math.round(60000 / diff)
    beat.set(newBeat)
  }
  lastClick = now
})

rt.start()
