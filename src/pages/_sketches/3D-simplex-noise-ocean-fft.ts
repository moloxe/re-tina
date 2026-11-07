import ReTina, { getFFTGetter } from '@ReTina'

const bufferSize = 1024
const noiseGate = '0.8f'
const soundLevel = '80f'

const rt = new ReTina({
  showFps: true,
  height: 600,
  useInterlacing: true,
  buffers: [{ size: bufferSize * 4 }],
  main: /* wgsl */ `
    let scene = calcScene(uv);
    var color = hsv2rgb(vec3f(0.6, 0.4, 0.1));
    let t = U.time;

    if scene.dist > 0 {
      color = max(scene.color.rgb, color);
    } else {
      let rd = scene.rd;
      let starStatic = smoothstep(0.85, 1f, snoise3d(vec3f(rd * 100.)));
      let starMoving = smoothstep(0.85, 1f,
        snoise3d(rotate(rd, vec3f(-t, t, 0) * 0.01) * 50.)
      );
      color = color + (starStatic + starMoving);
    }

    var xy = uv * 2f - 1f; xy *= vec2f(U.width / U.height, -1f);
    let pMoon = vec2f(0, 0.65);
    let dMoon = smoothstep(.01, 0., length(xy - pMoon) - 0.08);
    let dHalo = smoothstep(.04, 0., length(xy - pMoon) - 0.08);
    var cTex = snoise(vec2f(xy * 10.)) * 2f;
    cTex = snoise3d(vec3f(xy * 10., cTex + t * 0.2)) +
           snoise3d(vec3f(xy * 20., cTex + t * 0.2));
    var cMoon = (dHalo - dMoon * cTex * 0.2) * (lightColor + 0.1);
    color = cMoon + color * (1. - dMoon);

    color = pow(color, vec3f(1.2));
    color = max(color, vec3f(0, 0.05, 0.15));
    return vec4f(color, 1.0);
  `,
  functions: /* wgsl */ `
    const lakeColor = vec3f(0.0, 1f, 0.7) * 0.4;
    const lightColor = vec3f(1.0, 0.9, 0.9);
    const lightPos = vec3f(0, 200.0, -400.0);
    fn sdFFTBars(pos: vec3f) -> f32 {
      var dBars = 1e9;
      let nBars = 28i;
      for (var i = 0i; i <= nBars; i++) {
        let val = getBuffer0(i);
        let h = max(val - ${noiseGate}, 0) * ${soundLevel};
        let ang = ((-f32(i) - 0.5f) / f32(nBars + 1i)) * TWO_PI;
        let x = sin(ang) * 20f;
        let z = -50f + cos(ang) * 20f;
        let bPos1 = vec3f(x, -8f, z);
        let bPos2 = vec3f(x, h - 8f, z);
        let bDist = sdCapsule(pos, bPos1, bPos2, 1.4f);
        dBars = opSmoothUnion(dBars, bDist, 3.5f);
      }
      return dBars;
    }
    fn lakeLight(pos: vec3f, normal: vec3f, rd: vec3f, lightPos: vec3f) -> vec3f {
      let viewDir = -rd;
      let lightDir = normalize(lightPos - pos);
      let lambertian = dot(normal, lightDir);

      var specular1 = 0.;
      var specular2 = 0.;
      if lambertian > 0. {
          let halfDir = normalize(lightDir + viewDir);
          let specAngle = max(dot(halfDir, normal), 0.);
          specular1 = min(pow(specAngle + 0.02, 100f), 1.);
          specular2 = min(pow(specAngle + 0.001, 1000f), 1.);
      }

      let colorLinear = (
          lakeColor * lambertian * lightColor * 1.2 +
          specular1 * lakeColor  * lightColor * 0.5 +
          specular2 * lightColor * 2f);

      return colorLinear;
    }
  `,
})

const nBars = 28
const nyquist = 22050
const minFreq = 65
const maxFreq = 14000

// Rangos de bins logarítmicos por banda musical (Bark / ISO 1/3 Octave)
const binRanges = Array.from({ length: nBars + 1 }, (_, i) => {
  const f0 = minFreq * Math.pow(maxFreq / minFreq, i / (nBars + 1))
  const f1 = minFreq * Math.pow(maxFreq / minFreq, (i + 1) / (nBars + 1))
  const b0 = Math.max(1, Math.floor((f0 / nyquist) * bufferSize))
  const b1 = Math.max(
    b0 + 1,
    Math.min(bufferSize - 1, Math.ceil((f1 / nyquist) * bufferSize))
  )
  return [b0, b1] as const
})

// Estado persistente: balística temporal y noise floor adaptativo
const smoothedValues = new Float32Array(nBars + 1)
const noiseFloor = new Float32Array(nBars + 1)
for (let i = 0; i <= nBars; i++) {
  const rel = i / nBars
  noiseFloor[i] = 0.16 * Math.pow(1 - rel, 0.6) + 0.04
}

const gpuBuffer = new Float32Array(bufferSize)

const getFFT = await getFFTGetter({ bufferSize })

rt.registerMaterial({
  sdFunc: /* wgsl */ `
    let water = pos.y;
    let dFFTBars = sdFFTBars(pos);
    return opSmoothUnion(water, dFFTBars, 6f);
  `,
  lightFunc: /* wgsl */ `
    let t = U.time;
    let wave1 = snoise3d(vec3f(pos.x * 0.6  + t * 0.6, pos.z * 0.6, t * 2f)) * 0.06;
    let wave2 = snoise3d(vec3f(pos.x * 0.2  + t * 0.6, pos.z * 0.2, t * 0.1)) * 0.1;
    let _normal = normalize(normal + wave1 + wave2);
    let color1 = lakeLight(pos, _normal, rd, lightPos);
    let color2 = lakeLight(pos, _normal, rd, vec3f(-lightPos.x, 1f, -lightPos.z));
    let finalColor = max(color1, color2);
    return vec4f(finalColor, 1.0);
  `,
})

rt.camera.fov = 60
rt.camera.pos.y = 8
rt.camera.spherical = { radius: 3, theta: 0, phi: -0.1 }

rt.start({
  onFrame() {
    const fftBuffer = getFFT()
    if (!fftBuffer) return

    for (let i = 0; i <= nBars; i++) {
      const [b0, b1] = binRanges[i]
      let sum = 0
      let peak = 0
      const count = b1 - b0 + 1
      for (let b = b0; b <= b1; b++) {
        const v = fftBuffer[b] / 255
        sum += v
        if (v > peak) peak = v
      }
      const avg = sum / count
      const raw = 0.7 * peak + 0.3 * avg

      // Seguimiento adaptativo del piso de ruido en reposo
      if (raw < noiseFloor[i]) {
        noiseFloor[i] = noiseFloor[i] * 0.92 + raw * 0.08
      } else {
        noiseFloor[i] = noiseFloor[i] * 0.999 + raw * 0.001
      }

      // Noise gate con umbral dinámico por encima del piso de ruido
      const gateThreshold = noiseFloor[i] + 0.035
      let active = 0
      if (raw > gateThreshold) {
        active = (raw - gateThreshold) / (1.0 - gateThreshold)
      }

      // Pre-énfasis / Tilt espectral para balancear agudos frente a graves
      const tilt = 1.0 + 0.85 * Math.pow(i / nBars, 0.65)
      // Expansión dinámica para gran sensibilidad en volúmenes suaves y medios
      const target = Math.min(1.0, Math.pow(active, 0.75) * tilt * 1.5)

      // Balística de audio profesional: Attack instantáneo y Decay suave
      if (target > smoothedValues[i]) {
        smoothedValues[i] += (target - smoothedValues[i]) * 0.45
      } else {
        smoothedValues[i] += (target - smoothedValues[i]) * 0.11
      }

      // En reposo absoluto apagar completamente (cero movimiento residual)
      if (smoothedValues[i] < 0.002) {
        smoothedValues[i] = 0
      }

      gpuBuffer[i] = smoothedValues[i]
    }

    rt.setBuffer(0, gpuBuffer)
  },
})
