var e=`import ReTina, { loadImage } from '@ReTina'

const imgUrl = import.meta.env.DEV ? '/img/tina.jpeg' : '/re-tina/img/tina.jpeg'
const img = await loadImage(imgUrl)

const rt = new ReTina({
  fps: 24,
  height: 128,
  texs: [{ width: img.width, height: img.height }],
  usePrevFrameTex: true,
  functions: /* wgsl */ \`
    fn isPixAlive(pos: vec2f) -> vec3f {
      return step(vec3f(0.5), getPrevFrameTexSample(pos).rgb);
    }
    fn golRule(_isAlive: f32, _nCount: f32) -> f32 {
      let isAlive = round(_isAlive) > 0.5;
      let nCount = round(_nCount);
      if isAlive {
        if nCount == 2 || nCount == 3 {
          return 1f;
        }
      } else if nCount == 3 {
        return 1f;
      }
      return 0f;
    }
  \`,
  main: /* wgsl */ \`
    if (U.time < 1) {
      return getTex0Sample(uv);
    } else {
      let res = vec2f(U.width, U.height);
      var nCount = vec3f(0);
      for (var i = -1; i <= 1; i = i + 1) {
        for (var j = -1; j <= 1; j = j + 1) {
          if (i == 0 && j == 0) {
            continue;
          }
          let pos = uv + vec2f(f32(i), f32(j)) / res;
          nCount += isPixAlive(pos);
        }
      }
      let isAlive = isPixAlive(uv);
      let newState = vec3f(
        golRule(isAlive.x, nCount.x),
        golRule(isAlive.y, nCount.y),
        golRule(isAlive.z, nCount.z)
      );
      return vec4f(newState, 1);
    }
  \`,
})

rt.start({
  onBuild() {
    rt.setTex(0, img.textureData)
  },
})
`;export{e as default};