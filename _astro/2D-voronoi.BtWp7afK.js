import{t as e}from"./_lib.D4YYebGq.js";var t=new e({functions:`
    const nPoints = 8;
    const power = 2f;
    fn pdist(d: vec2f) -> f32 {
      return pow(
        pow(d.x, power) +
        pow(d.y, power), 1 / power);
    }
  `,main:`
    let xy = uv * vec2f(U.width, U.height);
    var minD = 1e9;
    var minIndex = -1;
    let t = (U.time + U.moved) * 0.004;
    for (var i: i32 = 0; i < i32(nPoints); i++) {
      var x = fract(snoise(vec2f(t, f32(i)      ))) * U.width;
      var y = fract(snoise(vec2f(t, f32(i) + 1e3))) * U.height;
      let d = abs(xy - vec2f(x, y));
      let dist = pdist(min(d, vec2f(U.width, U.height) - d));
      if dist < minD {
        minD = dist;
        minIndex = i;
      }
    }
    let hue = f32(minIndex) / nPoints;
    let bri = 1f - log(minD) / 8f;
    var color = hsv2rgb(vec3f(hue, .4, bri));
    let bg = hsv2rgb(vec3(.6, .3, .08));
    color = mix(bg, color, bri);
    return vec4f(color, 1f);
  `}),n=t.registerUniform(`moved`,0),r=0,i=0,a=0;t.start({onBuild(){function e(e,t){r+=((i-e)**2+(a-t)**2)**.5/64,[i,a]=[e,t]}document.addEventListener(`mousemove`,t=>{e(t.clientX,t.clientY)}),document.addEventListener(`touchmove`,t=>{let n=t.changedTouches[0];e(n.clientX,n.clientY)})},onFrame(){let e=n.get();n.set(e+(r-e)*.01)}});