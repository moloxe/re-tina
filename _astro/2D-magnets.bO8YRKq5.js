import{t as e}from"./_lib.D4YYebGq.js";var t=new e({height:window.innerHeight*window.devicePixelRatio,functions:`
    const scale: f32 = 80f;
    fn zone(xy: vec2f) -> f32 {
        let z = pow(sin(xy.y * scale) * 0.5 + 0.5, 10f);
        return smoothstep(1.5f / U.height, 0., z);
    }
    `,main:`
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
  `}),n=t.registerUniform(`mode`);window.addEventListener(`mousemove`,e=>{let t=Math.min(1,e.clientX/window.innerWidth);n.set(Math.round(t*10)/10)}),t.start();