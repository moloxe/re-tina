import ReTina from '@ReTina'

// Inspired by: @ilithya_rocks https://www.instagram.com/p/DfCsMFADR1I/

const rt = new ReTina({
  height: window.innerHeight * window.devicePixelRatio,
  functions: /* wgsl */ `
    const scale: f32 = 80f;
    fn zone(xy: vec2f) -> f32 {
        let z = pow(sin(xy.y * scale) * 0.5 + 0.5, 10f);
        return smoothstep(1.5f / U.height, 0., z);
    }
    `,
  main: /* wgsl */ `
    let t = U.time * 0.1;
    var xy = uv * 2f - 1f;
    xy *= vec2f(U.width / U.height, -1f);
    // ---
    let tar = xy + snoise3d(vec3f(xy, t));
    xy = U.mode * xy + (1f - U.mode) * tar;
    // ---
    let xyDesfase = xy + 0.004f;
    // ---
    let bwActual = zone(xy);
    let bwDesfase = zone(xyDesfase);
    // ---
    let color = vec3f(
      bwActual,
      smoothstep(1f, 2f, bwActual + bwDesfase),
      bwDesfase
    );
    return vec4f(color, 1f);
  `,
})

const mode = rt.registerUniform('mode')
window.addEventListener('mousemove', (event: MouseEvent) => {
  const newMode = Math.min(1, event.clientX / window.innerWidth)
  mode.set(Math.round(newMode * 10) / 10)
})

rt.start()
