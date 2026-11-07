var e=`import ReTina, { getFFTGetter } from '@ReTina'

const bufferSize = 2048

const rt = new ReTina({
  buffers: [{ size: bufferSize * 4 }],
  usePrevFrameTex: true,
  main: /* wgsl */ \`
    var coord = uv * vec2f(U.width, U.height); coord.x += 1.;
    let prev = getPrevFrameTexSample(coord / vec2f(U.width, U.height));
    let freq = 1.0 - uv.y;
    let idx = i32(pow(freq, 2f) * \${bufferSize});
    let fftVal = getBuffer0(idx) / 255.;
    if coord.x > U.width - 1. {
      let bri = pow(fftVal, 1.4);
      let sat = step(0.5, 1. - bri);
      return vec4f(hsv2rgb(vec3f(sat * 0.2 + 0.3, sat, bri)), 1.);
    }
    return prev;
  \`,
})

const getFFT = await getFFTGetter({ bufferSize })

rt.start({
  onFrame() {
    const fftBuffer = getFFT()
    rt.setBuffer(0, new Float32Array(fftBuffer))
  },
})
`;export{e as default};