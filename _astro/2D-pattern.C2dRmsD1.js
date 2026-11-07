import{t as e}from"./_lib.D4YYebGq.js";new e({height:window.innerHeight*window.devicePixelRatio,functions:`
    fn toPolar2D(v: vec2f) -> vec2f {
      return vec2f(length(v), atan2(v.y, v.x));
    }

    fn toCartesian2D(v: vec2f) -> vec2f {
      return vec2f(v.x * cos(v.y), v.x * sin(v.y));
    }

    fn turn(x: f32) -> f32 {
      return pow(abs(cos(x)), 2.0);
    }

    fn dWave(xy: vec2f, A: f32, time: f32) -> f32 {
      let d = xy.y - A * (
        asin(sin(xy.x)) * turn(time * 0.1) +
        sin(xy.x)       * turn(time * 0.1 + PI / 2f)
      );
      return d;
    }

    fn dFilledWave(xy: vec2f, A: f32, w: f32, time: f32) -> f32 {
      let d1 = dWave(xy + vec2f(0f,  w), A, time);
      let d2 = dWave(xy + vec2f(0f, -w), A, time);
      return d1 * d2;
    }

    fn dShape(input_xy: vec2f, offset: f32, time: f32) -> f32 {
      var xy = input_xy;
      let A = 0.06 * turn(time * 0.1) + 0.03 * turn(time * 0.1 + PI / 2.0);
      let w = A * PI / 2.0;
      let f = 1.0 / A;
      let s = A * TWO_PI;
      xy.y = xy.y - s * round(xy.y / s);
      xy = xy * vec2f(f, 1.0) + vec2f(-offset, 0.0);
      return dFilledWave(xy, A, w, time);
    }
  `,main:`
    var xy = uv * 2.0 - 1.0;
    xy.x *= (U.width / U.height);

    var polar = toPolar2D(xy);
    let sections = 8.0;
    let angle_mod = PI / (sections / 2.0);
    polar.y = polar.y - floor(polar.y / angle_mod) * angle_mod;
    xy = toCartesian2D(polar);

    let time = U.time;

    var c1 = hsv2rgb(vec3f(0.0, 1.0, 1.0));
    c1 *= step(dShape(xy, time, time), 0.0);
    
    var c2 = hsv2rgb(vec3f(0.5, 1.0, 1.0));
    c2 *= step(dShape(xy, -time, time), 0.0);

    return vec4f(max(c1, c2), 1.0);
  `}).start();