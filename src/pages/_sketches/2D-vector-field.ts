import ReTina from '@ReTina'

const rt = new ReTina({
  functions: /* wgsl */ `
    const scale: vec2f = vec2f(3.0, 3.0);

    fn getTarget(ori: vec2f) -> vec2f {
      let x = ori.x;
      let y = ori.y;
      return vec2f(
        x * x - y * y - 4f,
        2f * x * y
      );
    }

    fn getAngularDist(angle1: f32, angle2: f32) -> f32 {
      var angle = angle1 - angle2;
      if (angle > PI) {
        angle -= 2.0 * PI;
      } else if (angle <= -PI) {
        angle += 2.0 * PI;
      }
      return angle;
    }
  `,
  main: /* wgsl */ `
    var xy = uv * 2f - 1f;
    xy *= vec2f(U.width / U.height, -1f);

    let ori = xy * scale;
    var tar = getTarget(ori);

    let t = sin(U.time) * 0.5 + 0.5;
    tar = (1f - t) * ori + t * tar;

    let angleO = atan2(ori.y, ori.x);
    let angleT = atan2(tar.y, tar.x);

    let eDist = length(ori - tar);
    var aDist = getAngularDist(angleO, angleT);
    aDist = aDist / (2f * PI);

    let hue = aDist;
    let bri = min(0.9f, log(1f + eDist));
    let c = hsv2rgb(vec3f(hue, 0.9, bri));

    return vec4f(c, 1f);
  `,
})

rt.start()
