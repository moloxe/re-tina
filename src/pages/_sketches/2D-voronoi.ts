import ReTina from '@ReTina'

const rt = new ReTina({
  functions: /* wgsl */ `
    const nPoints = 8;
    const power = 2f;
    fn pdist(d: vec2f) -> f32 {
      return pow(
        pow(d.x, power) +
        pow(d.y, power), 1 / power);
    }
  `,
  main: /* wgsl */ `
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
  `,
})

const moved = rt.registerUniform('moved', 0)
let targetMoved = 0
let prevX = 0
let prevY = 0

rt.start({
  onBuild() {
    function onMove(clientX: number, clientY: number) {
      targetMoved +=
        ((prevX - clientX) ** 2 + (prevY - clientY) ** 2) ** 0.5 / 64
      ;[prevX, prevY] = [clientX, clientY]
    }
    document.addEventListener('mousemove', (event) => {
      onMove(event.clientX, event.clientY)
    })
    document.addEventListener('touchmove', (event) => {
      const touch = event.changedTouches[0]
      onMove(touch.clientX, touch.clientY)
    })
  },
  onFrame() {
    const currentMoved = moved.get()
    moved.set(currentMoved + (targetMoved - currentMoved) * 0.01)
  },
})
