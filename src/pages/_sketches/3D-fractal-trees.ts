import ReTina from '@ReTina'

// https://x.com/zozuar/status/1763906851337326736

const rt = new ReTina({
  fps: 60,
  showFps: true,
  height: 480,
  functions: /* wgsl */ `
    fn rotate2D(a : f32) -> mat2x2<f32> {
        return mat2x2<f32>(cos(a), sin(a), -sin(a), cos(a));
    }`,
})

rt.registerMaterial({
  sdFunc: /* wgsl */ `
    var p  = pos; p.y = -p.y;
    var e  = 7.0;
    var v  = 7.0;
    var uu = 1e-6;
    for (var j = 7.0; j < 21.0; j += 1.0) {
        let rot    = rotate2D(j + sin(1.0 / uu) / v);
        let xz_rot = rot * p.xz;
        p = vec3<f32>(abs(xz_rot.x) - 0.53,
                      p.y,
                      abs(xz_rot.y) - 0.53);
        p.y = 1.8 - p.y;
        let cyl = length(p.xz) - 0.02 / uu;
        e = min(e, max(cyl, p.y) / v);
        uu  = dot(p, p);
        v  /= uu;
        p  /= uu + 0.01;
    }
    return e * 1.5f;
  `,
})

rt.camera.fov = 60
rt.camera.pos.y = -1
rt.camera.pos.z = 2

rt.setControlsToFree()
rt.start()
