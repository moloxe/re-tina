import{t as e}from"./getFFTGetter.B1DvvLCV.js";import{t}from"./_lib.D4YYebGq.js";var n=2048,r=new t({buffers:[{size:n*4}],usePrevFrameTex:!0,main:`
    var coord = uv * vec2f(U.width, U.height); coord.x += 1.;
    let prev = getPrevFrameTexSample(coord / vec2f(U.width, U.height));
    let freq = 1.0 - uv.y;
    let idx = i32(pow(freq, 2f) * ${n});
    let fftVal = getBuffer0(idx) / 255.;
    if coord.x > U.width - 1. {
      let bri = pow(fftVal, 1.4);
      let sat = step(0.5, 1. - bri);
      return vec4f(hsv2rgb(vec3f(sat * 0.2 + 0.3, sat, bri)), 1.);
    }
    return prev;
  `}),i=await e({bufferSize:n});r.start({onFrame(){let e=i();r.setBuffer(0,new Float32Array(e))}});